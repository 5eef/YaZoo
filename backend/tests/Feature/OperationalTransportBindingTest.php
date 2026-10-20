<?php

namespace Tests\Feature;

use App\Services\RedactedLogBroadcaster;
use App\Services\RedactedLogMailTransport;
use Illuminate\Mail\Transport\ResendTransport;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class OperationalTransportBindingTest extends TestCase
{
    public function test_application_uses_redacted_fallbacks_and_native_resend_transport(): void
    {
        config(['services.resend.key' => 'test-placeholder']);
        $this->assertInstanceOf(RedactedLogBroadcaster::class, Broadcast::connection('log'));
        $this->assertInstanceOf(RedactedLogMailTransport::class, Mail::mailer('log')->getSymfonyTransport());
        $this->assertInstanceOf(ResendTransport::class, Mail::mailer('resend')->getSymfonyTransport());
    }
}
