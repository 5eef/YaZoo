<?php

namespace Tests\Integration;

use App\Models\User;
use App\Models\Veterinarian;
use App\Models\VeterinarianAppointment;
use App\Models\VeterinarianAvailabilitySlot;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class VeterinarianAppointmentMySqlConcurrencyTest extends TestCase
{
    /** @var array<int, int> */
    private array $userIds = [];

    /** @var array<int, int> */
    private array $veterinarianIds = [];

    /** @var array<int, int> */
    private array $slotIds = [];

    /** @var array<int, int> */
    private array $appointmentIds = [];

    protected function setUp(): void
    {
        parent::setUp();

        if (
            config('database.default') !== 'mysql'
            || ! filter_var(env('YAZOO_MYSQL_CONCURRENCY_TEST', false), FILTER_VALIDATE_BOOL)
        ) {
            $this->markTestSkipped('Requires the explicitly enabled DATABASE #2 MySQL/MariaDB environment.');
        }
    }

    protected function tearDown(): void
    {
        if (config('database.default') === 'mysql') {
            DB::table('notifications')->whereIn('notifiable_id', $this->userIds)->delete();
            VeterinarianAppointment::query()->whereIn('id', $this->appointmentIds)->delete();
            VeterinarianAvailabilitySlot::query()->whereIn('id', $this->slotIds)->delete();
            Veterinarian::query()->whereIn('id', $this->veterinarianIds)->delete();
            DB::table('personal_access_tokens')
                ->where('tokenable_type', (new User)->getMorphClass())
                ->whereIn('tokenable_id', $this->userIds)
                ->delete();
            User::query()->whereIn('id', $this->userIds)->delete();
        }

        parent::tearDown();
    }

    public function test_competing_status_transitions_commit_only_one_terminal_choice(): void
    {
        [$vetUser, $veterinarian] = $this->veterinarian();
        $client = $this->user();
        $appointment = VeterinarianAppointment::query()->create([
            'veterinarian_id' => $veterinarian->id,
            'client_id' => $client->id,
            'animal_type' => 'chat',
            'reason' => 'Concurrent transition '.Str::uuid(),
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHour(),
            'status' => 'pending',
        ]);
        $this->appointmentIds[] = $appointment->id;
        $token = $vetUser->createToken('mysql-concurrency-'.Str::uuid())->plainTextToken;

        $statuses = $this->runConcurrently([
            ['PATCH', "/api/veterinarian-appointments/{$appointment->id}/status", ['status' => 'confirmed'], $token],
            ['PATCH', "/api/veterinarian-appointments/{$appointment->id}/status", ['status' => 'rejected'], $token],
        ]);

        sort($statuses);
        $this->assertSame([200, 422], $statuses);
        $this->assertContains($appointment->fresh()->status, ['confirmed', 'rejected']);
    }

    public function test_booking_and_slot_deletion_never_leave_an_appointment_without_its_slot(): void
    {
        [$vetUser, $veterinarian] = $this->veterinarian();
        $client = $this->user();
        $slot = VeterinarianAvailabilitySlot::query()->create([
            'veterinarian_id' => $veterinarian->id,
            'starts_at' => now()->addDays(2),
            'ends_at' => now()->addDays(2)->addHour(),
            'is_available' => true,
        ]);
        $this->slotIds[] = $slot->id;
        $vetToken = $vetUser->createToken('mysql-concurrency-vet-'.Str::uuid())->plainTextToken;
        $clientToken = $client->createToken('mysql-concurrency-client-'.Str::uuid())->plainTextToken;

        $statuses = $this->runConcurrently([
            ['DELETE', "/api/veterinarian-availability/{$slot->id}", [], $vetToken],
            ['POST', "/api/veterinarians/{$veterinarian->id}/appointments", [
                'availability_slot_id' => $slot->id,
                'animal_type' => 'chien',
                'reason' => 'Concurrent booking '.Str::uuid(),
            ], $clientToken],
        ]);

        sort($statuses);
        $this->assertContains($statuses, [[201, 422], [204, 404], [204, 422]]);

        $createdAppointment = VeterinarianAppointment::query()
            ->where('availability_slot_id', $slot->id)
            ->first();
        if ($createdAppointment) {
            $this->appointmentIds[] = $createdAppointment->id;
            $this->assertNotNull($slot->fresh());
        } else {
            $this->assertNull($slot->fresh());
        }
    }

    /**
     * @param  array<int, array{string, string, array<string, mixed>, string}>  $requests
     * @return array<int, int>
     */
    private function runConcurrently(array $requests): array
    {
        $barrier = sys_get_temp_dir().DIRECTORY_SEPARATOR.'yazoo-vet-concurrency-'.Str::uuid();
        mkdir($barrier, 0700, true);
        $worker = base_path('tests/Integration/fixtures/veterinarian_appointment_concurrency_worker.php');
        $environment = $this->childEnvironment();
        $processes = collect($requests)->map(fn (array $request): Process => new Process([
            PHP_BINARY,
            $worker,
            $request[0],
            $request[1],
            base64_encode(json_encode($request[2], JSON_THROW_ON_ERROR)),
            $request[3],
            $barrier,
        ], base_path(), $environment))->all();

        try {
            foreach ($processes as $process) {
                $process->setTimeout(30);
                $process->start();
            }

            $deadline = microtime(true) + 15;
            while (count(glob($barrier.DIRECTORY_SEPARATOR.'ready-*') ?: []) < count($processes) && microtime(true) < $deadline) {
                usleep(20_000);
            }

            $this->assertCount(count($processes), glob($barrier.DIRECTORY_SEPARATOR.'ready-*') ?: []);
            file_put_contents($barrier.DIRECTORY_SEPARATOR.'start', 'start', LOCK_EX);

            return collect($processes)->map(function (Process $process): int {
                $process->wait();
                $this->assertSame(0, $process->getExitCode(), $process->getErrorOutput());

                return (int) trim($process->getOutput());
            })->all();
        } finally {
            foreach (glob($barrier.DIRECTORY_SEPARATOR.'*') ?: [] as $temporaryFile) {
                unlink($temporaryFile);
            }
            rmdir($barrier);
        }
    }

    /** @return array<string, string> */
    private function childEnvironment(): array
    {
        return [
            'APP_ENV' => 'testing',
            'APP_KEY' => (string) config('app.key'),
            'CACHE_STORE' => 'array',
            'DB_CONNECTION' => 'mysql',
            'DB_HOST' => (string) config('database.connections.mysql.host'),
            'DB_PORT' => (string) config('database.connections.mysql.port'),
            'DB_DATABASE' => (string) config('database.connections.mysql.database'),
            'DB_USERNAME' => (string) config('database.connections.mysql.username'),
            'DB_PASSWORD' => (string) config('database.connections.mysql.password'),
            'MAIL_MAILER' => 'array',
            'QUEUE_CONNECTION' => 'sync',
            'SESSION_DRIVER' => 'array',
        ];
    }

    /** @return array{User, Veterinarian} */
    private function veterinarian(): array
    {
        $user = $this->user();
        $veterinarian = Veterinarian::query()->create([
            'user_id' => $user->id,
            'name' => 'Concurrency vet '.Str::uuid(),
            'is_active' => true,
            'moderation_status' => Veterinarian::MODERATION_STATUS_ACTIVE,
        ]);
        $this->veterinarianIds[] = $veterinarian->id;

        return [$user, $veterinarian];
    }

    private function user(): User
    {
        $user = User::factory()->create();
        $this->userIds[] = $user->id;

        return $user;
    }
}
