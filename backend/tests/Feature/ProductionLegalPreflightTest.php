<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class ProductionLegalPreflightTest extends TestCase
{
    public function test_remote_addr_proxy_sentinel_is_allowed_only_for_showcase(): void
    {
        foreach (['showcase', 'production'] as $profile) {
            config(['operations.deployment_profile' => $profile, 'app.trusted_proxies' => 'REMOTE_ADDR']);
            Artisan::call('yazoo:preflight-production', ['--configuration-only' => true]);
            $output = Artisan::output();
            if ($profile === 'showcase') {
                $this->assertStringNotContainsString('TRUSTED_PROXIES must contain', $output);
            } else {
                $this->assertStringContainsString('TRUSTED_PROXIES must contain', $output);
            }
        }
    }

    public function test_production_rejects_a_valid_length_but_weak_application_key(): void
    {
        config(['app.key' => 'base64:'.base64_encode(str_repeat('a', 32))]);
        $this->artisan('yazoo:preflight-production', ['--configuration-only' => true])
            ->expectsOutputToContain('APP_KEY must not use a weak repeated-byte key.')
            ->assertFailed();
    }

    public function test_production_rejects_placeholder_database_identity_and_payment_credentials(): void
    {
        config([
            'database.default' => 'mysql',
            'database.connections.mysql.database' => '<production-database>',
            'database.connections.mysql.username' => 'YOUR_DB_USER',
            'payments.providers.cmi.enabled' => true,
            'payments.providers.cmi.client_id' => 'placeholder',
            'payments.providers.cmi.store_key' => 'changeme',
        ]);
        $this->artisan('yazoo:preflight-production', ['--configuration-only' => true])
            ->expectsOutputToContain('DB_DATABASE is required and must not use a placeholder.')
            ->expectsOutputToContain('DB_USERNAME is required and must not use a placeholder.')
            ->expectsOutputToContain('CMI_CLIENT_ID is required and must not use a placeholder.')
            ->expectsOutputToContain('CMI_STORE_KEY is required and must not use a placeholder.')
            ->assertFailed();
    }

    public function test_production_rejects_weak_database_passwords_and_angle_placeholders(): void
    {
        config(['database.default' => 'mysql', 'database.connections.mysql.password' => 'password', 'legal.entity_name' => '<legal-entity>']);
        $this->artisan('yazoo:preflight-production', ['--configuration-only' => true])
            ->expectsOutputToContain('DB_PASSWORD must be a non-default secret of at least 12 characters.')
            ->expectsOutputToContain('LEGAL_ENTITY_NAME is required and must not use a placeholder.')
            ->assertFailed();
    }

    public function test_deployment_preflight_rejects_https_local_and_placeholder_hosts(): void
    {
        foreach (['https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://<production-host>', 'https://app.example.com', 'https://api.invalid', 'https://api.test', 'https://10.0.0.1', 'https://169.254.169.254'] as $url) {
            config(['app.url' => $url]);
            $this->artisan('yazoo:preflight-production', ['--configuration-only' => true])->assertFailed();
        }
    }

    public function test_deployment_preflight_rejects_debug_http_cookie_and_cors_misconfiguration(): void
    {
        config([
            'app.env' => 'local',
            'app.debug' => true,
            'app.url' => 'http://localhost',
            'session.secure' => false,
            'cors.supports_credentials' => true,
            'cors.allowed_origins' => ['*'],
            'app.key' => 'base64:placeholder',
            'app.trusted_proxies' => '*',
        ]);
        $this->artisan('yazoo:preflight-production', ['--configuration-only' => true])
            ->expectsOutputToContain('APP_ENV must be production for deployment preflight.')
            ->expectsOutputToContain('APP_DEBUG must be false for deployment preflight.')
            ->expectsOutputToContain('APP_URL must be an HTTPS URL without credentials.')
            ->expectsOutputToContain('Credentialed CORS requires explicit allowed origins without wildcard patterns.')
            ->expectsOutputToContain('Production session cookies must be Secure and HttpOnly.')
            ->expectsOutputToContain('APP_KEY must be a valid key for the configured cipher.')
            ->expectsOutputToContain('TRUSTED_PROXIES must contain explicit IP addresses or bounded CIDR ranges.')
            ->assertFailed();
    }

    public function test_deployment_preflight_rejects_unfilled_legal_identity_without_querying_live_data(): void
    {
        foreach (['À RENSEIGNER', 'A RENSEIGNER', 'TODO', 'placeholder'] as $value) {
            config(['operations.deployment_profile' => 'production', 'legal.entity_name' => $value]);
            $this->artisan('yazoo:preflight-production', ['--configuration-only' => true])
                ->expectsOutputToContain('LEGAL_ENTITY_NAME is required and must not use a placeholder.')
                ->assertFailed();
        }
    }
}
