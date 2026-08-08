<?php

use App\Models\DataDeletionRequest;
use App\Models\User;
use App\Services\Privacy\AccountDeletionService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;

require dirname(__DIR__, 3).'/vendor/autoload.php';

$application = require dirname(__DIR__, 3).'/bootstrap/app.php';
$application->make(Kernel::class)->bootstrap();

[$script, $operation, $requestId, $reviewerId, $barrierDirectory] = array_pad($argv, 5, null);

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
    if ($operation === 'process') {
        $request = DataDeletionRequest::query()->findOrFail((int) $requestId);
        $reviewer = User::query()->findOrFail((int) $reviewerId);
        $processed = $application->make(AccountDeletionService::class)->process($request, $reviewer);
        fwrite(STDOUT, $processed->status.PHP_EOL);

        exit(0);
    }

    if ($operation === 'dispatch') {
        exit(Artisan::call('yazoo:dispatch-account-deletion-retries'));
    }

    fwrite(STDERR, 'Unknown concurrency operation.'.PHP_EOL);
    exit(2);
} catch (Throwable $exception) {
    fwrite(STDERR, $exception::class.PHP_EOL);
    exit(1);
}
