<?php

namespace App\Support\Sms;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

class SmsSender
{
    public function isAvailable(): bool
    {
        return match ((string) config('services.sms.driver', 'disabled')) {
            'twilio' => filled(config('services.sms.twilio.sid'))
                && filled(config('services.sms.twilio.token'))
                && filled(config('services.sms.twilio.from')),
            'orange' => filled(config('services.sms.orange.base_url'))
                && filled(config('services.sms.orange.token')),
            'log' => ! app()->isProduction(),
            default => false,
        };
    }

    /**
     * Send an SMS using the configured provider.
     */
    public function send(string $phone, string $message): void
    {
        $driver = (string) config('services.sms.driver', 'disabled');

        if (! $this->isAvailable()) {
            throw new ServiceUnavailableHttpException(
                300,
                __('messages.auth.sms_unavailable'),
            );
        }

        if ($driver === 'twilio') {
            $this->sendViaTwilio($phone, $message);

            return;
        }

        if ($driver === 'orange') {
            $this->sendViaOrange($phone, $message);

            return;
        }

        if ($driver === 'log' && ! app()->isProduction()) {
            $this->sendViaLog($phone);

            return;
        }

        throw new ServiceUnavailableHttpException(
            300,
            __('messages.auth.sms_unavailable'),
        );
    }

    protected function sendViaLog(string $phone): void
    {
        Log::info('YaZoo OTP SMS skipped outside production', [
            'phone' => $this->maskPhone($phone),
        ]);
    }

    protected function sendViaTwilio(string $phone, string $message): void
    {
        $sid = (string) config('services.sms.twilio.sid', '');
        $token = (string) config('services.sms.twilio.token', '');
        $from = (string) config('services.sms.twilio.from', '');

        if ($sid === '' || $token === '' || $from === '') {
            throw new ServiceUnavailableHttpException(300, __('messages.auth.sms_unavailable'));
        }

        Http::asForm()
            ->connectTimeout((int) config('services.sms.connect_timeout_seconds', 5))
            ->timeout((int) config('services.sms.timeout_seconds', 10))
            ->withBasicAuth($sid, $token)
            ->post(sprintf('https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json', $sid), [
                'From' => $from,
                'To' => $phone,
                'Body' => $message,
            ])
            ->throw();
    }

    protected function sendViaOrange(string $phone, string $message): void
    {
        $baseUrl = (string) config('services.sms.orange.base_url', '');
        $token = (string) config('services.sms.orange.token', '');
        $sender = (string) config('services.sms.orange.sender', 'YaZoo');

        if ($baseUrl === '' || $token === '') {
            throw new ServiceUnavailableHttpException(300, __('messages.auth.sms_unavailable'));
        }

        Http::withToken($token)
            ->connectTimeout((int) config('services.sms.connect_timeout_seconds', 5))
            ->timeout((int) config('services.sms.timeout_seconds', 10))
            ->post(rtrim($baseUrl, '/').'/messages', [
                'sender' => $sender,
                'recipient' => $phone,
                'message' => $message,
            ])
            ->throw();
    }

    protected function maskPhone(string $phone): string
    {
        $length = strlen($phone);

        if ($length <= 6) {
            return str_repeat('*', $length);
        }

        return substr($phone, 0, 4)
            .str_repeat('*', max(0, $length - 6))
            .substr($phone, -2);
    }
}
