<?php

use App\Services\ShowcaseAvailability;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

require dirname(__DIR__, 3).'/vendor/autoload.php';

$application = require dirname(__DIR__, 3).'/bootstrap/app.php';
$kernel = $application->make(Kernel::class);

[$script, $method, $uri, $encodedPayload, $token, $barrierDirectory] = array_pad($argv, 6, null);

if (! is_string($barrierDirectory) || ! is_dir($barrierDirectory)) {
    fwrite(STDERR, 'Invalid concurrency barrier.'.PHP_EOL);
    exit(2);
}

$readyFile = $barrierDirectory.DIRECTORY_SEPARATOR.'ready-'.getmypid();
file_put_contents($readyFile, 'ready', LOCK_EX);
$startFile = $barrierDirectory.DIRECTORY_SEPARATOR.'start';
$deadline = microtime(true) + 15;

while (! is_file($startFile) && microtime(true) < $deadline) {
    usleep(20_000);
}

if (! is_file($startFile)) {
    fwrite(STDERR, 'Concurrency barrier timed out.'.PHP_EOL);
    exit(3);
}

try {
    if ($method === 'SHOWCASE_REFRESH') {
        $application->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (! $application->environment('testing') || config('database.default') !== 'mysql'
            || ! in_array(config('database.connections.mysql.database'), ['yazoo_vet_test', 'yazoo_concurrency'], true)) {
            throw new RuntimeException('Generation concurrency requires an allowlisted disposable test database.');
        }
        config(['operations.showcase_bootstrap_enabled' => true, 'operations.deployment_profile' => 'showcase']);
        fwrite(STDOUT, (string) app(ShowcaseAvailability::class)->refresh());
        exit(0);
    }
    $payload = json_decode(base64_decode((string) $encodedPayload, true), true, flags: JSON_THROW_ON_ERROR);
    $request = Request::create(
        (string) $uri,
        (string) $method,
        server: [
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer '.(string) $token,
            'CONTENT_TYPE' => 'application/json',
        ],
        content: json_encode($payload, JSON_THROW_ON_ERROR),
    );
    $response = $kernel->handle($request);
    fwrite(STDOUT, (string) $response->getStatusCode().PHP_EOL);
    $kernel->terminate($request, $response);

    exit(0);
} catch (Throwable $exception) {
    fwrite(STDERR, $exception::class.': '.$exception->getMessage().PHP_EOL);
    exit(1);
}
