<?php

namespace Tests\Feature;

use App\Mail\AccountRecoveryMail;
use App\Mail\VerifyEmailMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\Transport\ResendTransport;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResendProductionTest extends TestCase
{
    use RefreshDatabase;

    public function test_plain_text_account_emails_preserve_url_query_separators(): void
    {
        $user = User::factory()->make();
        $url = 'https://yazoo.example/verify?expires=123&signature=synthetic';

        foreach ([new VerifyEmailMail($user, $url, 30), new AccountRecoveryMail($user, $url, 15)] as $mail) {
            $body = $mail->render();
            $this->assertStringContainsString($url, $body);
            $this->assertStringNotContainsString('&amp;', $body);
        }
    }

    public function test_resend_preflight_checks_api_configuration_without_smtp_credentials(): void
    {
        foreach (['showcase', 'production'] as $profile) {
            config([
                'operations.deployment_profile' => $profile,
                'mail.default' => 'resend',
                'services.resend.key' => 'synthetic-not-a-secret',
                'mail.from.address' => 'sender@yazoo.test',
                'mail.from.name' => 'YaZoo',
                'mail.mailers.smtp.username' => null,
                'mail.mailers.smtp.password' => null,
            ]);
            Artisan::call('yazoo:preflight-production', ['--configuration-only' => true]);
            $output = Artisan::output();
            foreach (['RESEND_API_KEY', 'MAIL_HOST', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_FROM_ADDRESS', 'MAIL_FROM_NAME'] as $name) {
                $this->assertStringNotContainsString($name, $output);
            }

            config(['services.resend.key' => null]);
            Artisan::call('yazoo:preflight-production', ['--configuration-only' => true]);
            $this->assertStringContainsString('RESEND_API_KEY is required', Artisan::output());
            $this->assertStringNotContainsString('synthetic-not-a-secret', Artisan::output());
        }
    }

    public function test_showcase_resolves_resend_without_changing_the_default_mailer(): void
    {
        config(['operations.deployment_profile' => 'showcase', 'services.resend.key' => 'test-placeholder']);
        $default = config('mail.default');
        $this->assertInstanceOf(ResendTransport::class, Mail::mailer('resend')->getSymfonyTransport());
        $this->assertSame($default, config('mail.default'));
    }

    public function test_verification_failure_is_generic_and_logs_only_exception_class(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);
        Sanctum::actingAs($user, ['*']);
        Mail::shouldReceive('to')->once()->andThrow(new \RuntimeException('Sensitive provider diagnostic'));
        Log::shouldReceive('warning')->once()->with('account.verification_delivery_failed', ['exception' => \RuntimeException::class]);
        $response = $this->postJson('/api/auth/email/verification-notification')->assertOk();
        $this->assertStringNotContainsString('Sensitive', $response->getContent());
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_verification_queues_once_and_verified_users_receive_no_more_mail(): void
    {
        Mail::fake();
        $user = User::factory()->create(['email_verified_at' => null]);
        Sanctum::actingAs($user, ['*']);
        $this->postJson('/api/auth/email/verification-notification')->assertOk();
        Mail::assertQueued(VerifyEmailMail::class, 1);
        Mail::assertQueued(VerifyEmailMail::class, fn (VerifyEmailMail $mail) => $mail->tries === 1);
        $user->forceFill(['email_verified_at' => now()])->save();
        $this->postJson('/api/auth/email/verification-notification')->assertOk();
        Mail::assertQueued(VerifyEmailMail::class, 1);
    }
}
