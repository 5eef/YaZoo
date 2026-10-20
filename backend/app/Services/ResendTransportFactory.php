<?php

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Mail\Transport\ResendTransport;
use Resend\Transporters\HttpTransporter;
use Resend\ValueObjects\ApiKey;
use Resend\ValueObjects\Transporter\BaseUri;
use Resend\ValueObjects\Transporter\Headers;

final class ResendTransportFactory
{
    public function make(array $config = []): ResendTransport
    {
        $transporter = new HttpTransporter(
            new Client([
                'connect_timeout' => 3,
                'timeout' => 10,
                'allow_redirects' => false,
            ]),
            BaseUri::from('api.resend.com'),
            Headers::withAuthorization(ApiKey::from((string) ($config['key'] ?? config('services.resend.key')))),
        );

        // No automatic retry: a timeout may follow a successful provider acceptance.
        return new ResendTransport(new \Resend\Client($transporter));
    }
}
