<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\Animal;
use App\Models\Product;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminBusinessKpiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_receives_honest_period_kpis_and_gmv_is_not_called_revenue(): void
    {
        Cache::clear();
        $admin = User::factory()->create(['is_admin' => true]);
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        ActivityLog::query()->create([
            'user_id' => $buyer->id,
            'actor_id' => $buyer->id,
            'action' => 'login',
            'category' => 'auth',
            'description' => 'Authenticated activity',
            'created_at' => now()->subDay(),
        ]);

        $animal = Animal::factory()->create(['legal_status' => 'approved']);
        $animal->forceFill(['created_at' => now()->subHours(10), 'moderated_at' => now()->subHours(8)])->saveQuietly();
        $product = Product::factory()->create(['moderation_status' => 'active']);
        $product->forceFill(['created_at' => now()->subHours(8), 'moderated_at' => now()->subHours(4)])->saveQuietly();

        Reservation::factory()->create([
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'reservation_status' => 'completed',
            'total_price' => 100,
        ]);
        Reservation::factory()->create([
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'reservation_status' => 'completed',
            'total_price' => 50,
        ]);

        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/stats?days=30')
            ->assertOk()
            ->assertJsonPath('active_users_7_days', 1)
            ->assertJsonPath('moderation_average_hours', 3)
            ->assertJsonPath('moderation_median_hours', 3)
            ->assertJsonPath('reservations_completed', 2)
            ->assertJsonPath('completed_reservation_gmv_mad', 150)
            ->assertJsonPath('active_sellers', 1)
            ->assertJsonPath('active_buyers', 1)
            ->assertJsonPath('revenue_yazoo', 'not_measured');
    }

    public function test_period_is_restricted_and_non_admin_is_denied(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/admin/stats?days=30')->assertForbidden();

        Sanctum::actingAs(User::factory()->create(['is_admin' => true]));
        $this->getJson('/api/admin/stats?days=365')->assertUnprocessable();
    }

    public function test_stats_are_cached_for_a_short_period(): void
    {
        Cache::clear();
        $admin = User::factory()->create(['is_admin' => true]);
        Sanctum::actingAs($admin);
        $first = $this->getJson('/api/admin/stats?days=7')->assertOk()->json();
        User::factory()->create();
        $second = $this->getJson('/api/admin/stats?days=7')->assertOk()->json();

        $this->assertSame($first, $second);
    }
}
