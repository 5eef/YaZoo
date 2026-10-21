<?php

namespace Tests\Unit;

use App\Services\SafeResendTransport;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Resend\Transporters\HttpTransporter;
use Resend\ValueObjects\ApiKey;
use Resend\ValueObjects\Transporter\BaseUri;
use Resend\ValueObjects\Transporter\Headers;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mime\Email;

class ResendTransportTest extends TestCase
{
    public static function responses(): array
    {
        return ['accepted' => [200], 'quota' => [429], 'unavailable' => [503]];
    }

    #[DataProvider('responses')]
    public function test_https_transport_sends_once_without_live_delivery(int $status): void
    {
        $history = [];
        $handler = HandlerStack::create(new MockHandler([
            new Response($status, ['Content-Type' => 'application/json'], $status === 200
                ? '{"id":"synthetic-delivery-id"}'
                : json_encode(['name' => 'provider_error', 'message' => 'synthetic provider failure', 'statusCode' => $status])),
        ]));
        $handler->push(Middleware::history($history));
        $client = new \Resend\Client(new HttpTransporter(
            new Client(['handler' => $handler, 'connect_timeout' => 3, 'timeout' => 10]),
            BaseUri::from('api.resend.com'),
            Headers::withAuthorization(ApiKey::from('test-placeholder')),
        ));
        $transport = new SafeResendTransport($client);
        $email = (new Email)->from('sender@example.test')->to('recipient@example.test')->subject('Synthetic transport test')->text('No real delivery');
        try {
            $transport->send($email);
            $this->assertSame(200, $status);
        } catch (TransportException $exception) {
            $this->assertNotSame(200, $status);
            $this->assertSame('Resend delivery failed.', $exception->getMessage());
            $this->assertNull($exception->getPrevious());
        }
        $this->assertCount(1, $history);
        $this->assertSame('https', $history[0]['request']->getUri()->getScheme());
        $this->assertSame('api.resend.com', $history[0]['request']->getUri()->getHost());
        $this->assertSame('/emails', $history[0]['request']->getUri()->getPath());
    }

    public function test_timeout_is_sanitized_without_retry(): void
    {
        $history = [];
        $handler = HandlerStack::create(new MockHandler([
            new ConnectException('Sensitive network diagnostic', new Request('POST', 'https://api.resend.com/emails')),
        ]));
        $handler->push(Middleware::history($history));
        $transport = new SafeResendTransport(new \Resend\Client(new HttpTransporter(
            new Client(['handler' => $handler]),
            BaseUri::from('api.resend.com'),
            Headers::withAuthorization(ApiKey::from('test-placeholder')),
        )));
        try {
            $transport->send((new Email)->from('sender@example.test')->to('recipient@example.test')->text('Synthetic'));
            $this->fail('A timeout must fail delivery.');
        } catch (TransportException $exception) {
            $this->assertSame('Resend delivery failed.', $exception->getMessage());
            $this->assertNull($exception->getPrevious());
        }
        $this->assertCount(1, $history);
    }
}
