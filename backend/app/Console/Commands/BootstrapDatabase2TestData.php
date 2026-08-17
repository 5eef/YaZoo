<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\DatabaseTargetGuard;
use Database\Seeders\MarketplaceTestSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use RuntimeException;
use Throwable;

class BootstrapDatabase2TestData extends Command
{
    private const MARKER = 'database2-test-data-v1';

    protected $signature = 'yazoo:bootstrap-database2-test-data
        {--confirmation= : Exact non-sensitive DATABASE #2 confirmation}';

    protected $description = 'Populate an explicitly guarded DATABASE #2 with the local marketplace test accounts and media.';

    public function handle(MarketplaceTestSeeder $seeder, DatabaseTargetGuard $databaseTargetGuard): int
    {
        try {
            $confirmation = trim((string) $this->option('confirmation'));
            $password = (string) config('operations.database2_test_account_password');
            $releaseAdminEmail = strtolower(trim((string) config('operations.release_admin.email')));
            $this->assertTarget($databaseTargetGuard, $confirmation);
            $this->validateSecrets($password, $releaseAdminEmail);

            $lock = Cache::lock('operations:database2-test-data-bootstrap', 300);
            if (! $lock->get()) {
                throw new RuntimeException('Another DATABASE #2 test-data bootstrap owns the distributed lock.');
            }

            try {
                if (DB::table('operation_markers')->where('key', self::MARKER)->exists()) {
                    $this->info('DATABASE #2 test data is already complete; bootstrap made no changes.');

                    return self::SUCCESS;
                }

                $unexpectedEmails = User::query()
                    ->pluck('email')
                    ->diff($seeder->demoEmails())
                    ->values();
                if ($unexpectedEmails->isNotEmpty()) {
                    throw new RuntimeException('DATABASE #2 contains accounts outside the authorized local test dataset.');
                }

                $result = $seeder->seedDatabase2(
                    (string) config('operations.database2_test_data_images_path'),
                    $confirmation,
                    $password,
                    $releaseAdminEmail,
                );

                DB::table('operation_markers')->insert([
                    'key' => self::MARKER,
                    'completed_at' => now(),
                    'metadata' => json_encode([
                        'users' => count($seeder->demoEmails()),
                        'images' => count($result['images']),
                    ], JSON_THROW_ON_ERROR),
                ]);
            } finally {
                $lock->release();
            }

            $this->info('DATABASE #2 test accounts, marketplace data, and persistent media are ready.');

            return self::SUCCESS;
        } catch (Throwable $exception) {
            $this->error('DATABASE #2 test-data bootstrap refused: '.$exception->getMessage());

            return self::FAILURE;
        }
    }

    private function assertTarget(DatabaseTargetGuard $databaseTargetGuard, string $confirmation): void
    {
        if (! app()->environment(['production', 'testing'])) {
            throw new RuntimeException('DATABASE #2 test-data bootstrap is restricted to production and automated tests.');
        }

        if (! (bool) config('operations.database2_test_data_bootstrap_enabled')) {
            throw new RuntimeException('YAZOO_DATABASE2_TEST_DATA_BOOTSTRAP_ENABLED must be true.');
        }

        $failures = $databaseTargetGuard->failures();
        if ($failures !== []) {
            throw new RuntimeException(implode(' ', $failures));
        }

        $expected = trim((string) config('operations.database2_test_data_bootstrap_confirmation'));
        if ($expected === '' || $confirmation === '' || ! hash_equals($expected, $confirmation)) {
            throw new RuntimeException('The DATABASE #2 test-data confirmation is invalid.');
        }
    }

    private function validateSecrets(string $password, string $releaseAdminEmail): void
    {
        $validator = Validator::make([
            'password' => $password,
            'release_admin_email' => $releaseAdminEmail,
        ], [
            'password' => ['required', 'string', Password::min(20)->letters()->mixedCase()->numbers()->symbols()],
            'release_admin_email' => ['required', 'email:rfc', 'in:'.implode(',', app(MarketplaceTestSeeder::class)->demoEmails())],
        ]);

        if ($validator->fails()) {
            throw new RuntimeException('DATABASE #2 test account credentials are incomplete or invalid.');
        }
    }
}
