<?php

namespace Tests\Feature;

use App\Mail\ContactMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ContactApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_message_is_sent_to_the_configured_recipient(): void
    {
        Mail::fake();
        config([
            'services.contact.recipient' => 'contact@yazoo.test',
            'mail.from.address' => 'noreply@yazoo.test',
            'mail.from.name' => 'YaZoo',
        ]);

        $this->postJson('/api/contact', [
            'email' => 'visitor@example.test',
            'objet' => 'Question',
            'message' => 'Bonjour YaZoo',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Message envoye avec succes.');

        Mail::assertSent(
            ContactMessage::class,
            fn (ContactMessage $mail): bool => $mail->hasTo('contact@yazoo.test')
                && $mail->senderEmail === 'visitor@example.test'
                && $mail->contactSubject === 'Question'
                && $mail->contactBody === 'Bonjour YaZoo',
        );
    }

    public function test_contact_endpoint_fails_closed_without_a_recipient(): void
    {
        Mail::fake();
        config(['services.contact.recipient' => '']);

        $this->postJson('/api/contact', [
            'email' => 'visitor@example.test',
            'message' => 'Bonjour YaZoo',
        ])
            ->assertStatus(503)
            ->assertJsonPath('message', 'Le service de contact est temporairement indisponible.');

        Mail::assertNothingSent();
    }
}
