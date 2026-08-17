<?php

namespace Tests\Feature;

use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MediaAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private const FILE_ID = '507f1f77bcf86cd799439011';

    public function test_gridfs_id_without_a_relational_asset_is_not_publicly_accessible(): void
    {
        $this->getJson('/api/media/'.self::FILE_ID)->assertNotFound();
    }

    public function test_private_asset_is_not_exposed_by_the_public_route(): void
    {
        $owner = User::factory()->create();
        $this->asset($owner, MediaAsset::VISIBILITY_PRIVATE);

        $this->getJson('/api/media/'.self::FILE_ID)->assertNotFound();
    }

    public function test_private_route_hides_asset_from_an_unrelated_user(): void
    {
        $owner = User::factory()->create();
        $this->asset($owner, MediaAsset::VISIBILITY_PRIVATE);
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/media/private/'.self::FILE_ID)->assertNotFound();
    }

    private function asset(User $owner, string $visibility): MediaAsset
    {
        $path = 'mongodb:'.self::FILE_ID;

        return $owner->ownedMediaAssets()->create([
            'disk' => 'mongodb',
            'path' => $path,
            'path_hash' => hash('sha256', $path),
            'kind' => 'image',
            'state' => MediaAsset::STATE_ACTIVE,
            'visibility' => $visibility,
            'mime_type' => 'image/jpeg',
            'original_name' => 'private-photo.jpg',
        ]);
    }
}
