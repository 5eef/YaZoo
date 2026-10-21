<?php

namespace App\Services;

use Illuminate\Mail\Transport\ResendTransport;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;

final class SafeResendTransport extends ResendTransport
{
    protected function doSend(SentMessage $message): void
    {
        try {
            parent::doSend($message);
        } catch (\Throwable) {
            // Do not retain provider diagnostics in queue failures or application logs.
            throw new TransportException('Resend delivery failed.');
        }
    }
}
