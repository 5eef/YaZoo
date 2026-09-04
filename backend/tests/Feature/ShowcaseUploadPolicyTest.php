<?php

namespace Tests\Feature;

use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ShowcaseUploadPolicyTest extends TestCase
{
    public function test_showcase_rejects_user_uploads_when_ephemeral_uploads_are_disabled(): void
    {
        config([
            'operations.deployment_profile' => 'showcase',
            'operations.showcase_uploads_enabled' => false,
        ]);

        $this->postJson('/api/contact', [
            'attachment' => UploadedFile::fake()->create('demo.txt', 1, 'text/plain'),
        ])->assertStatus(409)
            ->assertJsonPath('error', 'showcase.uploads_disabled');
    }
}
