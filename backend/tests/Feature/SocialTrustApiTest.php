<?php

namespace Tests\Feature;

use App\Models\Animal;
use App\Models\Product;
use App\Models\ProfessionalVerification;
use App\Models\Reservation;
use App\Models\ReservationReview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SocialTrustApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_review_is_refused_before_reservation_is_completed(): void
    {
        [$buyer, , $reservation] = $this->completedProductReservation('approved');

        Sanctum::actingAs($buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/reviews", [
            'rating' => 5,
            'comment' => 'Experience claire et utile.',
        ])->assertUnprocessable();
    }

    public function test_review_is_refused_for_non_participant(): void
    {
        [, , $reservation] = $this->completedProductReservation();

        Sanctum::actingAs(User::factory()->create(), ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/reviews", [
            'rating' => 5,
            'comment' => 'Experience claire et utile.',
        ])->assertForbidden();
    }

    public function test_review_is_refused_when_duplicate_or_rating_is_invalid(): void
    {
        [$buyer, , $reservation] = $this->completedProductReservation();

        Sanctum::actingAs($buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/reviews", [
            'rating' => 6,
            'comment' => 'Experience claire et utile.',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('rating');

        $this->postJson("/api/reservations/{$reservation->id}/reviews", [
            'rating' => 5,
            'comment' => 'Experience claire et utile.',
        ])->assertCreated();

        $this->postJson("/api/reservations/{$reservation->id}/reviews", [
            'rating' => 4,
            'comment' => 'Deuxieme avis impossible.',
        ])->assertUnprocessable();
    }

    public function test_review_is_refused_for_self_review(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['user_id' => $user->id]);
        $reservation = Reservation::factory()->create([
            'buyer_id' => $user->id,
            'seller_id' => $user->id,
            'reservable_type' => Product::class,
            'reservable_id' => $product->id,
            'reservation_status' => 'completed',
            'payment_status' => 'paid',
            'completed_at' => now(),
        ]);

        Sanctum::actingAs($user, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/reviews", [
            'rating' => 5,
            'comment' => 'Auto evaluation interdite.',
        ])->assertUnprocessable();
    }

    public function test_valid_review_after_completion_feeds_public_aggregates(): void
    {
        [$buyer, $seller, $reservation, $product] = $this->completedProductReservation();
        $otherProduct = Product::factory()->create();
        $otherAnimal = Animal::factory()->create();

        Sanctum::actingAs($buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/reviews", [
            'rating' => 4,
            'comment' => 'Produit conforme et vendeur reactif.',
            'reviewable_type' => Animal::class,
            'reviewable_id' => $otherAnimal->id,
        ])->assertCreated()
            ->assertJsonPath('data.reviews.myReview.rating', 4);

        $this->assertDatabaseHas('reservation_reviews', [
            'reservation_id' => $reservation->id,
            'reviewer_id' => $buyer->id,
            'reviewee_id' => $seller->id,
            'reviewable_type' => Product::class,
            'reviewable_id' => $product->id,
            'status' => ReservationReview::STATUS_PUBLISHED,
        ]);

        $this->assertDatabaseMissing('reservation_reviews', [
            'reservation_id' => $reservation->id,
            'reviewable_type' => Animal::class,
            'reviewable_id' => $otherAnimal->id,
        ]);

        $this->getJson("/api/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.reviewsCount', 1)
            ->assertJsonPath('data.averageRating', 4);

        $this->getJson("/api/products/{$otherProduct->id}")
            ->assertOk()
            ->assertJsonPath('data.reviewsCount', 0)
            ->assertJsonPath('data.averageRating', null);
    }

    public function test_review_does_not_create_item_aggregate_when_reservable_mapping_is_not_supported(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $reservedUserRecord = User::factory()->create();
        $reservation = Reservation::factory()->create([
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'reservable_type' => User::class,
            'reservable_id' => $reservedUserRecord->id,
            'reservation_status' => 'completed',
            'payment_status' => 'paid',
            'completed_at' => now(),
        ]);

        Sanctum::actingAs($buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/reviews", [
            'rating' => 4,
            'comment' => 'Avis vendeur sans agregat item fiable.',
        ])->assertCreated();

        $this->assertDatabaseHas('reservation_reviews', [
            'reservation_id' => $reservation->id,
            'reviewable_type' => null,
            'reviewable_id' => null,
        ]);
    }

    public function test_hidden_review_is_not_counted_in_public_average(): void
    {
        [$buyer, , $reservation, $product] = $this->completedProductReservation();
        $admin = User::factory()->create(['is_admin' => true]);

        Sanctum::actingAs($buyer, ['*']);
        $reviewId = $this->postJson("/api/reservations/{$reservation->id}/reviews", [
            'rating' => 5,
            'comment' => 'Avis publie puis masque.',
        ])->assertCreated()->json('data.reviews.myReview.id');

        Sanctum::actingAs($admin, ['*']);
        $this->patchJson("/api/admin/reviews/{$reviewId}/status", [
            'status' => ReservationReview::STATUS_HIDDEN,
            'moderation_reason' => 'Contenu non conforme.',
        ])->assertOk()
            ->assertJsonPath('review.status', ReservationReview::STATUS_HIDDEN);

        Sanctum::actingAs($buyer, ['*']);
        $this->getJson("/api/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.reviewsCount', 0)
            ->assertJsonPath('data.averageRating', null);
    }

    public function test_non_public_review_statuses_are_not_counted_in_public_average(): void
    {
        $seller = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'price' => 120,
        ]);

        foreach ([ReservationReview::STATUS_PUBLISHED, ReservationReview::STATUS_REPORTED, ReservationReview::STATUS_PENDING_MODERATION] as $status) {
            $buyer = User::factory()->create();
            $reservation = Reservation::factory()->create([
                'buyer_id' => $buyer->id,
                'seller_id' => $seller->id,
                'reservable_type' => Product::class,
                'reservable_id' => $product->id,
                'reservation_status' => 'completed',
                'payment_status' => 'paid',
                'unit_price' => 120,
                'total_price' => 120,
                'completed_at' => now(),
            ]);

            ReservationReview::query()->create([
                'reservation_id' => $reservation->id,
                'reviewer_id' => $buyer->id,
                'reviewee_id' => $seller->id,
                'reviewable_type' => Product::class,
                'reviewable_id' => $product->id,
                'rating' => $status === ReservationReview::STATUS_PUBLISHED ? 5 : 1,
                'comment' => 'Avis de controle des statuts publics.',
                'status' => $status,
            ]);
        }

        Sanctum::actingAs(User::factory()->create(), ['*']);

        $this->getJson("/api/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.reviewsCount', 1)
            ->assertJsonPath('data.averageRating', 5);
    }

    public function test_professional_verification_status_is_propagated_without_document_path(): void
    {
        $seller = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $product = Product::factory()->create(['user_id' => $seller->id]);

        ProfessionalVerification::query()->create([
            'user_id' => $seller->id,
            'business_type' => 'pet_shop',
            'document_path' => 'professional-verifications/private.pdf',
            'status' => 'approved',
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        Sanctum::actingAs(User::factory()->create(), ['*']);

        $response = $this->getJson("/api/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.author.isProfessionalVerified', true)
            ->assertJsonPath('data.author.professionalBadge', 'verified_pet_shop')
            ->assertJsonPath('data.author.professionalVerificationStatus', 'approved');

        $payload = $response->getContent();
        $this->assertStringNotContainsString('document_path', $payload);
        $this->assertStringNotContainsString('professional-verifications/private.pdf', $payload);
    }

    public function test_pending_or_rejected_professional_verification_is_not_verified(): void
    {
        $seller = User::factory()->create();
        $animal = Animal::factory()->create(['user_id' => $seller->id]);
        ProfessionalVerification::query()->create([
            'user_id' => $seller->id,
            'business_type' => 'breeder',
            'status' => 'pending',
        ]);

        Sanctum::actingAs(User::factory()->create(), ['*']);

        $this->getJson("/api/animals/{$animal->id}")
            ->assertOk()
            ->assertJsonPath('data.author.isProfessionalVerified', false)
            ->assertJsonPath('data.author.professionalVerificationStatus', 'pending');
    }

    public function test_authenticated_user_can_save_and_remove_favorite_idempotently(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();

        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/favorites', [
            'type' => 'products',
            'id' => $product->id,
        ])->assertCreated()
            ->assertJsonPath('data.isFavorited', true);

        $this->postJson('/api/favorites', [
            'type' => 'products',
            'id' => $product->id,
        ])->assertOk()
            ->assertJsonPath('data.isFavorited', true);

        $this->assertSame(1, $user->favorites()->count());

        $this->getJson("/api/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.isFavorited', true);

        $this->deleteJson("/api/favorites/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.isFavorited', false);

        $this->getJson("/api/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.isFavorited', false);
    }

    public function test_favorite_rejects_raw_or_unknown_types_and_missing_objects(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['*']);

        $this->postJson('/api/favorites', [
            'type' => Product::class,
            'id' => 1,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('type');

        $this->postJson('/api/favorites', [
            'type' => 'products',
            'id' => 999999,
        ])->assertNotFound();
    }

    public function test_user_cannot_delete_another_users_favorite(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $product = Product::factory()->create();

        $owner->favorites()->create([
            'favoritable_type' => Product::class,
            'favoritable_id' => $product->id,
        ]);

        Sanctum::actingAs($other, ['*']);

        $this->deleteJson("/api/favorites/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.isFavorited', false);

        $this->assertSame(1, $owner->favorites()->count());
    }

    public function test_admin_review_moderation_requires_admin_and_valid_status(): void
    {
        [$buyer, , $reservation] = $this->completedProductReservation();
        $admin = User::factory()->create(['is_admin' => true]);
        $standard = User::factory()->create();

        Sanctum::actingAs($buyer, ['*']);
        $reviewId = $this->postJson("/api/reservations/{$reservation->id}/reviews", [
            'rating' => 5,
            'comment' => 'Avis a moderer par admin.',
        ])->assertCreated()->json('data.reviews.myReview.id');

        $this->getJson('/api/admin/reviews')->assertForbidden();

        Sanctum::actingAs($standard, ['*']);
        $this->patchJson("/api/admin/reviews/{$reviewId}/status", [
            'status' => ReservationReview::STATUS_HIDDEN,
        ])->assertForbidden();

        Sanctum::actingAs($admin, ['*']);
        $this->patchJson("/api/admin/reviews/{$reviewId}/status", [
            'status' => 'deleted',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->patchJson("/api/admin/reviews/{$reviewId}/status", [
            'status' => ReservationReview::STATUS_HIDDEN,
            'moderation_reason' => 'Hors charte.',
        ])->assertOk()
            ->assertJsonPath('review.status', ReservationReview::STATUS_HIDDEN);

        $this->assertDatabaseHas('reservation_reviews', [
            'id' => $reviewId,
            'status' => ReservationReview::STATUS_HIDDEN,
            'moderated_by' => $admin->id,
        ]);
    }

    public function test_guest_cannot_save_favorite(): void
    {
        $product = Product::factory()->create();

        $this->postJson('/api/favorites', [
            'type' => 'products',
            'id' => $product->id,
        ])->assertUnauthorized();
    }

    /**
     * @return array{0: User, 1: User, 2: Reservation, 3: Product}
     */
    private function completedProductReservation(string $status = 'completed'): array
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'price' => 120,
        ]);
        $reservation = Reservation::factory()->create([
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'reservable_type' => Product::class,
            'reservable_id' => $product->id,
            'reservation_status' => $status,
            'payment_status' => $status === 'completed' ? 'paid' : 'pending',
            'unit_price' => 120,
            'total_price' => 120,
            'completed_at' => $status === 'completed' ? now() : null,
        ]);

        return [$buyer, $seller, $reservation, $product];
    }
}
