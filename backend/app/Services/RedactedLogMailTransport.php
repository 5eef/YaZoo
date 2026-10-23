<?php

namespace App\Services;

use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;

final class RedactedLogMailTransport extends AbstractTransport
{
    public function __construct(private readonly LoggerInterface $logger)
    {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        $this->logger->info('mail.delivery_skipped', ['transport' => 'log']);
    }

    public function __toString(): string
    {
        return 'log';
    }
}
