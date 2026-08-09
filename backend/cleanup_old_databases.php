<?php

use Dotenv\Dotenv;
use MongoDB\Client;

require_once __DIR__.'/vendor/autoload.php';

const YAZOO_CLEANUP_CONFIRMATION = 'DROP_LEGACY_YAZOO_DATABASES';
const YAZOO_LEGACY_MYSQL_DATABASE = 'yazoo2';
const YAZOO_LEGACY_MONGO_DATABASE = 'yazoo_media';

class YazooCleanupGuardException extends RuntimeException {}

/**
 * Database identifiers cannot be bound as prepared-statement parameters.
 */
function yazooCleanupSafeDatabaseIdentifier(string $identifier): string
{
    // PCRE \w stays ASCII-only here because the pattern has no unicode/UCP flag.
    if (! preg_match('/\A\w{1,64}\z/', $identifier)) {
        throw new InvalidArgumentException('Unsafe database identifier.');
    }

    return $identifier;
}

function yazooCleanupQuoteMysqlIdentifier(string $identifier): string
{
    return '`'.yazooCleanupSafeDatabaseIdentifier($identifier).'`';
}

/**
 * @param  array<int, string>  $arguments
 * @return array{execute: bool, confirmation: string|null}
 */
function yazooCleanupParseOptions(array $arguments): array
{
    $options = [
        'execute' => false,
        'confirmation' => null,
    ];

    foreach (array_slice($arguments, 1) as $argument) {
        if ($argument === '--execute') {
            $options['execute'] = true;

            continue;
        }

        if (str_starts_with($argument, '--confirm=')) {
            $options['confirmation'] = substr($argument, strlen('--confirm='));

            continue;
        }

        throw new InvalidArgumentException("Unknown option: {$argument}");
    }

    return $options;
}

/**
 * @param  array<string, string>  $environment
 */
function yazooCleanupValidateExecution(array $environment, ?string $confirmation): void
{
    $applicationEnvironment = strtolower(trim($environment['APP_ENV'] ?? ''));

    if (! in_array($applicationEnvironment, ['local', 'development', 'testing'], true)) {
        throw new YazooCleanupGuardException('Cleanup is allowed only in an explicitly local environment.');
    }

    if (($environment['YAZOO_ALLOW_LEGACY_DATABASE_CLEANUP'] ?? '') !== 'true') {
        throw new YazooCleanupGuardException('YAZOO_ALLOW_LEGACY_DATABASE_CLEANUP=true is required.');
    }

    if (! hash_equals(YAZOO_CLEANUP_CONFIRMATION, $confirmation ?? '')) {
        throw new YazooCleanupGuardException('The exact destructive-operation confirmation is required.');
    }

    $mysqlHost = strtolower(trim($environment['DB_HOST'] ?? '127.0.0.1'));

    if (! in_array($mysqlHost, ['127.0.0.1', 'localhost', '::1'], true)) {
        throw new YazooCleanupGuardException('Cleanup refuses a non-loopback MySQL host.');
    }

    if (($environment['DB_DATABASE'] ?? '') === YAZOO_LEGACY_MYSQL_DATABASE) {
        throw new YazooCleanupGuardException('Cleanup refuses to drop the configured active MySQL database.');
    }

    $mongoUri = $environment['MEDIA_MONGODB_URI'] ?? '';
    $mongoHost = parse_url($mongoUri, PHP_URL_HOST);

    if (! is_string($mongoHost) || ! in_array(strtolower($mongoHost), ['127.0.0.1', 'localhost', '::1'], true)) {
        throw new YazooCleanupGuardException('Cleanup requires a loopback MEDIA_MONGODB_URI.');
    }

    if (($environment['MEDIA_MONGODB_DATABASE'] ?? YAZOO_LEGACY_MONGO_DATABASE) === YAZOO_LEGACY_MONGO_DATABASE) {
        throw new YazooCleanupGuardException('Cleanup refuses to drop the configured active MongoDB database.');
    }
}

function yazooCleanupLog(string $message): void
{
    fwrite(STDOUT, sprintf('[%s] %s%s', gmdate(DATE_ATOM), $message, PHP_EOL));
}

/**
 * @param  array<int, string>  $arguments
 */
function yazooCleanupMain(array $arguments): int
{
    try {
        $options = yazooCleanupParseOptions($arguments);

        yazooCleanupLog('Legacy cleanup plan: MySQL='.YAZOO_LEGACY_MYSQL_DATABASE.', MongoDB='.YAZOO_LEGACY_MONGO_DATABASE.'.');

        if (! $options['execute']) {
            yazooCleanupLog('DRY RUN ONLY. No database connection was opened and no data was changed.');
            yazooCleanupLog('Execution additionally requires a local environment gate and the exact confirmation phrase.');

            return 0;
        }

        Dotenv::createImmutable(__DIR__)->safeLoad();
        /** @var array<string, string> $environment */
        $environment = $_ENV;
        yazooCleanupValidateExecution($environment, $options['confirmation']);

        $pdo = new PDO(
            sprintf(
                'mysql:host=%s;port=%s;charset=utf8mb4',
                $environment['DB_HOST'] ?? '127.0.0.1',
                $environment['DB_PORT'] ?? '3306',
            ),
            $environment['DB_USERNAME'] ?? 'root',
            $environment['DB_PASSWORD'] ?? '',
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
        );

        $mongoClient = new Client($environment['MEDIA_MONGODB_URI']);
        $mongoClient->selectDatabase('admin')->command(['ping' => 1]);

        $pdo->exec(sprintf(
            'DROP DATABASE IF EXISTS %s',
            yazooCleanupQuoteMysqlIdentifier(YAZOO_LEGACY_MYSQL_DATABASE),
        ));
        yazooCleanupLog('MySQL legacy database removed if present: '.YAZOO_LEGACY_MYSQL_DATABASE.'.');

        $mongoClient->dropDatabase(yazooCleanupSafeDatabaseIdentifier(YAZOO_LEGACY_MONGO_DATABASE));
        yazooCleanupLog('MongoDB legacy database removed if present: '.YAZOO_LEGACY_MONGO_DATABASE.'.');

        return 0;
    } catch (InvalidArgumentException|YazooCleanupGuardException $exception) {
        fwrite(STDERR, 'Cleanup refused: '.$exception->getMessage().PHP_EOL);

        return 2;
    } catch (Throwable $exception) {
        fwrite(STDERR, 'Cleanup failed before completing all targets. Review database state manually.'.PHP_EOL);

        return 1;
    }
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    exit(yazooCleanupMain($_SERVER['argv'] ?? []));
}
