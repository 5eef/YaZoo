<?php

namespace Tests\Feature;

use Tests\TestCase;

class PublicFeatureConfigTest extends TestCase
{
    public function test_native_navigation_reads_existing_public_feature_flags_without_secrets(): void
    {
        config(['features.social_feed' => true, 'features.communities' => true, 'features.product_marketplace' => false, 'features.animal_listings_public' => false]);
        $response = $this->getJson('/api/legal/config')->assertOk();
        $response->assertJsonPath('features.social_feed', true)
            ->assertJsonPath('features.communities', true)
            ->assertJsonPath('features.product_marketplace', false)
            ->assertJsonPath('features.animal_listings_public', false);
        $this->assertSame(['social_feed', 'communities', 'product_marketplace', 'animal_listings_public'], array_keys($response->json('features')));
    }
}
