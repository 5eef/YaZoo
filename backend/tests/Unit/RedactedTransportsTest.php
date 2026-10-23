<?php

namespace Tests\Unit;

use App\Services\RedactedLogBroadcaster;
use App\Services\RedactedLogMailTransport;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mime\Email;

class RedactedTransportsTest extends TestCase
{
    public function test_broadcast_logs_no_channel_identity_or_payload(): void
    {
        $logger = $this->createMock(LoggerInterface::class);
        $logger->expects($this->once())->method('info')->with('broadcast.delivery_skipped', [
            'transport' => 'log', 'channel_count' => 1,
        ]);
        (new RedactedLogBroadcaster($logger))->broadcast(['private-conversations.123'], 'message.sent', [
            'body' => 'Private content must never reach logs',
            'token' => 'synthetic-sensitive-token',
        ]);
    }

    public function test_mail_logs_no_addresses_tokens_subject_or_body(): void
    {
        $logger = $this->createMock(LoggerInterface::class);
        $logger->expects($this->once())->method('info')->with('mail.delivery_skipped', ['transport' => 'log']);
        $transport = new RedactedLogMailTransport($logger);
        $transport->send((new Email)->from('sender@example.test')->to('private@example.test')
            ->subject('Sensitive subject')->text('https://example.test/reset?token=synthetic-sensitive-token'));
        $this->assertSame('log', (string) $transport);
    }
}
