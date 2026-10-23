<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Veterinarian;
use App\Models\VeterinarianAvailabilitySlot;
use App\Services\ShowcaseAvailability;
use App\Support\OperationsSchedule;
use App\Support\ShowcaseBootstrapGuard;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class ShowcaseAvailabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_refresh_is_idempotent_rolls_forward_and_preserves_existing_slots(): void
    {
        config(['operations.showcase_bootstrap_enabled' => true, 'operations.deployment_profile' => 'showcase']);
        $this->travelTo(now()->setDate(2026, 10, 14)->startOfDay());
        foreach (ShowcaseAvailability::EMAILS as $email) {
            $user = User::factory()->create(['email' => $email, 'is_admin' => false]);
            Veterinarian::factory()->create(['user_id' => $user->id, 'name' => 'DEMO', 'description' => 'Profil fictif', 'is_active' => true, 'moderation_status' => 'active']);
        }
        $other = Veterinarian::factory()->create();
        $service = app(ShowcaseAvailability::class);
        $this->assertGreaterThan(0, $service->refresh());
        $this->assertSame(0, $service->refresh());
        $this->assertSame(0, $other->availabilitySlots()->count());
        // Exercise the exact command used on each container start, twice.
        $guard = \Mockery::mock(ShowcaseBootstrapGuard::class);
        $guard->shouldReceive('assertAllowed')->twice()->with('test-only');
        $this->app->instance(ShowcaseBootstrapGuard::class, $guard);
        Cache::store('database')->forever('yazoo_showcase_bootstrap_v2', 'complete');
        $this->artisan('yazoo:refresh-showcase-availability', ['--confirmation' => 'test-only'])->assertSuccessful();
        $this->artisan('yazoo:refresh-showcase-availability', ['--confirmation' => 'test-only'])->assertSuccessful();
        $this->assertSame(0, $service->refresh());
        $vet = Veterinarian::query()->where('name', 'DEMO')->firstOrFail();
        $slot = $vet->availabilitySlots()->orderBy('starts_at')->firstOrFail();
        $appointment = $vet->appointments()->create([
            'client_id' => User::factory()->create()->id, 'availability_slot_id' => $slot->id,
            'starts_at' => $slot->starts_at, 'ends_at' => $slot->ends_at,
            'animal_type' => 'cat', 'reason' => 'Test', 'status' => 'confirmed',
        ]);
        $snapshot = $appointment->fresh()->getAttributes();
        $this->travel(2)->days();
        $this->assertGreaterThan(0, $service->refresh());
        $this->assertSame(0, $service->refresh());
        $this->assertEquals($snapshot, $appointment->fresh()->getAttributes());
        $this->assertNotNull($slot->fresh());
        $duplicates = VeterinarianAvailabilitySlot::query()->selectRaw('veterinarian_id, starts_at, COUNT(*) as total')->groupBy('veterinarian_id', 'starts_at')->havingRaw('COUNT(*) > 1')->get();
        $this->assertCount(0, $duplicates);
        $this->travelBack();
    }

    public function test_refresh_is_disabled_by_default(): void
    {
        config(['operations.showcase_bootstrap_enabled' => false]);
        $this->expectException(\RuntimeException::class);
        app(ShowcaseAvailability::class)->refresh();
    }

    public function test_daily_refresh_is_scheduled_only_for_showcase_and_contains_no_confirmation(): void
    {
        config(['operations.deployment_profile' => 'showcase', 'operations.showcase_bootstrap_enabled' => true]);
        $schedule = new Schedule;
        OperationsSchedule::register($schedule);
        $event = collect($schedule->events())->first(fn ($event) => $event->description === 'showcase:refresh-availability');
        $this->assertNotNull($event);
        $this->assertSame('45 4 * * *', $event->expression);
        $this->assertSame('Africa/Casablanca', $event->timezone);
        $this->assertTrue($event->withoutOverlapping);
        $this->assertTrue($event->onOneServer);
        $this->assertStringNotContainsString('--confirmation', $event->command);
        config(['operations.deployment_profile' => 'production']);
        $schedule = new Schedule;
        OperationsSchedule::register($schedule);
        $this->assertFalse(collect($schedule->events())->contains(fn ($event) => $event->description === 'showcase:refresh-availability'));
    }

    public function test_missing_bootstrap_refuses_refresh_without_writing_slots(): void
    {
        $guard = \Mockery::mock(ShowcaseBootstrapGuard::class);
        $guard->shouldReceive('assertAllowed')->once()->with('configured-test-only');
        $this->app->instance(ShowcaseBootstrapGuard::class, $guard);
        config(['operations.showcase_bootstrap_confirmation' => 'configured-test-only']);
        $this->artisan('yazoo:refresh-showcase-availability')->assertFailed();
        $this->assertSame(0, VeterinarianAvailabilitySlot::count());
    }
}
