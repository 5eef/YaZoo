<?php

namespace Tests\Feature;

use App\Models\Animal;
use App\Models\Community;
use App\Models\Product;
use App\Models\ServiceListing;
use App\Models\User;
use App\Models\Veterinarian;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PartialUpdateContractsTest extends TestCase
{
    use RefreshDatabase;

    public function test_veterinarian_city_only_false_and_explicit_null(): void
    {
        $owner = User::factory()->approvedProfessional('veterinarian')->create();
        $vet = Veterinarian::factory()->create(['user_id' => $owner->id, 'phone' => '+212600000000', 'is_active' => false]);
        Sanctum::actingAs($owner);
        $this->patchJson('/api/veterinarians/'.$vet->id, ['city' => 'Fes'])->assertOk();
        $this->assertSame($vet->name, $vet->fresh()->name);
        $this->assertFalse($vet->fresh()->is_active);
        $this->assertSame($vet->phone, $vet->fresh()->phone);
        $this->patchJson('/api/veterinarians/'.$vet->id, ['phone' => null, 'is_active' => false])->assertOk();
        $this->assertNull($vet->fresh()->phone);
        $this->assertFalse($vet->fresh()->is_active);
        $this->patchJson('/api/veterinarians/'.$vet->id, ['name' => ''])->assertUnprocessable();
    }

    public function test_service_omitted_fields_false_and_null_remain_distinct(): void
    {
        $owner = User::factory()->approvedProfessional('service_provider')->create();
        $service = ServiceListing::factory()->create(['user_id' => $owner->id, 'city' => 'Fes', 'whatsapp_enabled' => true]);
        Sanctum::actingAs($owner);
        $this->patchJson('/api/services/'.$service->id, ['title' => 'QA updated'])->assertOk();
        $this->assertSame($service->description, $service->fresh()->description);
        $this->assertTrue($service->fresh()->whatsapp_enabled);
        $this->patchJson('/api/services/'.$service->id, ['city' => null, 'whatsapp_enabled' => false])->assertOk();
        $this->assertNull($service->fresh()->city);
        $this->assertFalse($service->fresh()->whatsapp_enabled);
    }

    public function test_animal_product_community_and_profile_preserve_omitted_fields(): void
    {
        $owner = User::factory()->approvedProfessional('breeder')->create(['bio' => 'QA bio']);
        Sanctum::actingAs($owner);
        $animal = Animal::factory()->create(['user_id' => $owner->id, 'breed' => 'QA breed', 'is_for_adoption' => true]);
        $this->putJson('/api/animals/'.$animal->id, ['name' => 'QA changed'])->assertOk();
        $this->assertSame($animal->category, $animal->fresh()->category);
        $this->assertSame('QA breed', $animal->fresh()->breed);
        $this->assertTrue($animal->fresh()->is_for_adoption);
        $this->putJson('/api/animals/'.$animal->id, ['breed' => null, 'is_for_adoption' => false])->assertOk();
        $this->assertNull($animal->fresh()->breed);
        $this->assertFalse($animal->fresh()->is_for_adoption);
        $seller = User::factory()->approvedProfessional('seller')->create();
        Sanctum::actingAs($seller);
        $product = Product::factory()->create(['user_id' => $seller->id]);
        $this->putJson('/api/products/'.$product->id, ['name' => 'QA changed'])->assertOk();
        $this->assertSame($product->price, $product->fresh()->price);
        $this->assertSame($product->category, $product->fresh()->category);
        Sanctum::actingAs($owner);
        $community = Community::factory()->create(['user_id' => $owner->id, 'is_private' => true, 'description' => 'QA retained']);
        $this->putJson('/api/communities/'.$community->id, ['name' => 'QA changed'])->assertOk();
        $this->assertSame('QA retained', $community->fresh()->description);
        $this->assertTrue($community->fresh()->is_private);
        $this->putJson('/api/communities/'.$community->id, ['description' => null, 'is_private' => false])->assertOk();
        $this->assertNull($community->fresh()->description);
        $this->assertFalse($community->fresh()->is_private);
        $this->patchJson('/api/users/'.$owner->id, ['city' => 'Fes'])->assertOk();
        $this->assertSame($owner->name, $owner->fresh()->name);
        $this->assertSame('QA bio', $owner->fresh()->bio);
        $this->patchJson('/api/users/'.$owner->id, ['bio' => null])->assertOk();
        $this->assertNull($owner->fresh()->bio);
    }
}
