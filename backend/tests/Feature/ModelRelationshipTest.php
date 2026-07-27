<?php

namespace Tests\Feature;

use App\DTOs\Payments\PaymentResult;
use App\Models\Favorite;
use App\Models\PrivacyConsent;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModelRelationshipTest extends TestCase
{
    use RefreshDatabase;

    public function test_favorite_and_privacy_consent_relationships_resolve_their_owners(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();
        $favorite = Favorite::query()->create([
            'user_id' => $user->id,
            'favoritable_type' => Product::class,
            'favoritable_id' => $product->id,
        ]);
        $consent = PrivacyConsent::query()->create([
            'user_id' => $user->id,
            'type' => 'privacy',
            'accepted' => true,
            'locale' => 'fr',
            'accepted_at' => now(),
        ]);

        $this->assertTrue($favorite->user->is($user));
        $this->assertTrue($favorite->favoritable->is($product));
        $this->assertTrue($consent->user->is($user));
        $this->assertTrue($consent->accepted);
    }

    public function test_payment_result_preserves_a_safe_gateway_outcome(): void
    {
        $result = new PaymentResult(
            provider: 'cmi',
            success: false,
            status: 'failed',
            message: 'Paiement refuse',
            payload: ['reason' => 'declined'],
        );

        $this->assertSame('cmi', $result->provider);
        $this->assertFalse($result->success);
        $this->assertSame('failed', $result->status);
        $this->assertSame('Paiement refuse', $result->message);
        $this->assertSame(['reason' => 'declined'], $result->payload);
    }
}
