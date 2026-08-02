<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$coverageDir = $root.DIRECTORY_SEPARATOR.'coverage';
$bootstrapCacheDir = $root.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'cache';

// Coverage must run against phpunit.xml testing env, not stale production caches.
foreach (['config.php', 'events.php'] as $cacheFile) {
    $path = $bootstrapCacheDir.DIRECTORY_SEPARATOR.$cacheFile;

    if (is_file($path)) {
        unlink($path);
    }
}

foreach (glob($bootstrapCacheDir.DIRECTORY_SEPARATOR.'routes-*.php') ?: [] as $routeCacheFile) {
    if (is_file($routeCacheFile)) {
        unlink($routeCacheFile);
    }
}

if (! is_dir($coverageDir)) {
    mkdir($coverageDir, 0777, true);
}

$phpunit = escapeshellarg($root.DIRECTORY_SEPARATOR.'vendor'.DIRECTORY_SEPARATOR.'phpunit'.DIRECTORY_SEPARATOR.'phpunit'.DIRECTORY_SEPARATOR.'phpunit');
$clover = escapeshellarg($coverageDir.DIRECTORY_SEPARATOR.'clover.xml');
$junit = escapeshellarg($coverageDir.DIRECTORY_SEPARATOR.'junit.xml');
$html = escapeshellarg($coverageDir);
$coverageArgs = sprintf('--coverage-clover=%s --coverage-html=%s --log-junit=%s', $clover, $html, $junit);
$coverageMemory = '-dmemory_limit=512M';

$hasCoverageExtension = extension_loaded('xdebug') || extension_loaded('pcov');
$xdebugDll = $root.DIRECTORY_SEPARATOR.'tools'.DIRECTORY_SEPARATOR.'coverage'.DIRECTORY_SEPARATOR.'php_xdebug-3.5.1-8.5-nts-vs17-x86_64.dll';
$phpdbgName = PHP_OS_FAMILY === 'Windows' ? 'phpdbg.exe' : 'phpdbg';
$phpdbgCandidates = [
    dirname(PHP_BINARY).DIRECTORY_SEPARATOR.$phpdbgName,
    PHP_BINDIR.DIRECTORY_SEPARATOR.$phpdbgName,
];
$locatedPhpdbg = trim((string) shell_exec(PHP_OS_FAMILY === 'Windows' ? 'where phpdbg 2>NUL' : 'command -v phpdbg 2>/dev/null'));

if ($locatedPhpdbg !== '') {
    $phpdbgCandidates = array_merge($phpdbgCandidates, preg_split('/\r?\n/', $locatedPhpdbg) ?: []);
}

$phpdbgBinary = null;

foreach ($phpdbgCandidates as $candidate) {
    if (is_file($candidate)) {
        $phpdbgBinary = $candidate;
        break;
    }
}

if (! $hasCoverageExtension && PHP_OS_FAMILY === 'Windows' && is_file($xdebugDll)) {
    $command = sprintf(
        '%s %s -dzend_extension=%s -dxdebug.mode=coverage %s %s',
        escapeshellarg(PHP_BINARY),
        $coverageMemory,
        escapeshellarg($xdebugDll),
        $phpunit,
        $coverageArgs,
    );
} elseif (! $hasCoverageExtension && $phpdbgBinary !== null) {
    $command = sprintf('%s %s -qrr %s %s', escapeshellarg($phpdbgBinary), $coverageMemory, $phpunit, $coverageArgs);
} else {
    putenv('XDEBUG_MODE=coverage');

    $command = sprintf('%s %s %s %s', escapeshellarg(PHP_BINARY), $coverageMemory, $phpunit, $coverageArgs);
}

passthru($command, $exitCode);

exit($exitCode);
