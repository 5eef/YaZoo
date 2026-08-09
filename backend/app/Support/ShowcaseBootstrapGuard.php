<?php

namespace App\Support;

use RuntimeException;

class ShowcaseBootstrapGuard
{
    public function assertAllowed(string $confirmation): void
    {
        if (! config('operations.showcase_bootstrap_enabled')) {
            throw new RuntimeException('Le bootstrap showcase est desactive.');
        }

        if (! app()->environment('production')) {
            throw new RuntimeException('Le bootstrap showcase exige APP_ENV=production.');
        }

        $expectedConfirmation = (string) config('operations.showcase_bootstrap_confirmation');

        if ($expectedConfirmation === '' || ! hash_equals($expectedConfirmation, $confirmation)) {
            throw new RuntimeException('La confirmation du bootstrap showcase est invalide.');
        }

        $appUrl = (string) config('app.url');
        $scheme = strtolower((string) parse_url($appUrl, PHP_URL_SCHEME));
        $host = strtolower((string) parse_url($appUrl, PHP_URL_HOST));
        $expectedAppHost = strtolower((string) config('operations.showcase_app_host'));

        if ($scheme !== 'https' || $expectedAppHost === '' || $host !== $expectedAppHost) {
            throw new RuntimeException('La cible applicative showcase ne correspond pas a la Web App autorisee.');
        }

        $connection = (string) config('database.default');
        $driver = (string) config("database.connections.{$connection}.driver");
        $database = (string) config("database.connections.{$connection}.database");
        $databaseHost = strtolower(rtrim((string) config("database.connections.{$connection}.host"), '.'));
        $expectedDatabase = (string) config('operations.showcase_database_name');
        $expectedDatabaseHost = strtolower(rtrim((string) config('operations.showcase_database_host'), '.'));

        if (
            $driver !== 'mysql'
            || $expectedDatabase === ''
            || $database !== $expectedDatabase
            || $expectedDatabaseHost === ''
            || $databaseHost !== $expectedDatabaseHost
        ) {
            throw new RuntimeException('La cible MySQL showcase ne correspond pas a la base autorisee.');
        }

        $password = (string) config('operations.showcase_password');

        if (strlen($password) < 20) {
            throw new RuntimeException('Le mot de passe showcase doit contenir au moins 20 caracteres.');
        }

        $mfaSecret = strtoupper(trim((string) config('operations.showcase_mfa_secret')));
        if (! preg_match('/^[A-Z2-7]{32,64}$/', $mfaSecret)) {
            throw new RuntimeException('Le secret MFA showcase doit etre une valeur Base32 forte.');
        }

        $recoveryCodes = array_values(array_unique(array_filter(array_map(
            static fn (string $code): string => strtoupper(trim($code)),
            explode(',', (string) config('operations.showcase_mfa_recovery_codes')),
        ))));

        if (count($recoveryCodes) !== 8 || collect($recoveryCodes)->contains(
            static fn (string $code): bool => preg_match('/^[A-F0-9]{10}$/', $code) !== 1,
        )) {
            throw new RuntimeException('Le bootstrap showcase exige exactement huit codes MFA de recuperation uniques.');
        }
    }
}
