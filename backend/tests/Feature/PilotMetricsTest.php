<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PilotMetricsTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_successful_care_discovery_is_counted_without_identifiers(): void
    {
        config(['features.pilot_metrics' => true]);
        $this->getJson('/api/marketplace/public/veterinarians?search=private')->assertOk();
        $this->getJson('/api/marketplace/public/veterinarians/999')->assertNotFound();
        $this->getJson('/api/marketplace/public/products')->assertOk();
        $this->assertDatabaseCount('pilot_daily_counters', 1);
        $row = (array) DB::table('pilot_daily_counters')->first();
        $this->assertEqualsCanonicalizing(['day', 'event', 'count'], array_keys($row));
        $this->assertSame('professional_discovery', $row['event']);
        $this->assertEquals(1, $row['count']);
    }

    public function test_measurement_can_be_disabled_for_showcase(): void
    {
        config(['features.pilot_metrics' => false]);
        $this->getJson('/api/marketplace/public/services')->assertOk();
        $this->assertDatabaseCount('pilot_daily_counters', 0);
    }
}
