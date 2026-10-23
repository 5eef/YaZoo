<?php

namespace Tests\Feature\Reservation;

use App\Models\ServiceListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ReservationMessageTest extends TestCase
{
    use RefreshDatabase;

    public static function notes(): array
    {
        return [
            'message without note' => [['message' => 'Synthetic booking instructions'], 'Synthetic booking instructions'],
            'blank note must not erase message' => [['note' => '  ', 'message' => 'Keep these instructions'], 'Keep these instructions'],
            'explicit zero note takes precedence' => [['note' => '0', 'message' => 'Other instructions'], '0'],
        ];
    }

    #[DataProvider('notes')]
    public function test_reservation_preserves_message_and_explicit_note_precedence(array $input, string $expected): void
    {
        $service = ServiceListing::factory()->create(['type' => 'training', 'status' => 'active']);
        Sanctum::actingAs(User::factory()->create());
        $id = $this->postJson('/api/reservations', [
            'category' => 'training', 'reservable_id' => $service->id,
            ...$input,
        ])->assertCreated()->assertJsonPath('data.note', $expected)->json('data.id');
        $this->assertDatabaseHas('reservations', ['id' => $id, 'note' => $expected]);
    }

    public function test_invalid_note_type_is_rejected_without_creating_a_reservation(): void
    {
        $service = ServiceListing::factory()->create(['type' => 'training', 'status' => 'active']);
        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/reservations', [
            'category' => 'training', 'reservable_id' => $service->id,
            'note' => ['invalid'], 'message' => 'Must not bypass validation',
        ])->assertUnprocessable()->assertJsonValidationErrors('note');
        $this->assertDatabaseCount('reservations', 0);
    }
}
