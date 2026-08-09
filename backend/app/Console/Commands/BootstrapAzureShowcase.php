<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\ShowcaseBootstrapGuard;
use Database\Seeders\DemoContentSeeder;
use Database\Seeders\MarketplaceTestSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Throwable;

class BootstrapAzureShowcase extends Command
{
    private const MARKER_KEY = 'yazoo_showcase_bootstrap_v1';

    protected $signature = 'yazoo:bootstrap-azure-showcase
        {--images= : Dossier en lecture seule contenant exactement les 21 images PNG}
        {--confirmation= : Confirmation exacte de la cible Azure autorisee}
        {--dry-run : Valide tous les garde-fous sans ecrire}';

    protected $description = 'Peuple une base Azure showcase vide avec des donnees fictives, sous garde-fous stricts.';

    public function handle(
        ShowcaseBootstrapGuard $guard,
        MarketplaceTestSeeder $marketplaceSeeder,
        DemoContentSeeder $socialSeeder,
    ): int {
        $imagesPath = trim((string) $this->option('images'));
        $confirmation = trim((string) $this->option('confirmation'));
        $isTestExecution = app()->runningUnitTests() && app()->environment('testing');

        try {
            if ($imagesPath === '') {
                throw new RuntimeException("L'option --images est obligatoire.");
            }

            if ($isTestExecution) {
                $expectedConfirmation = (string) config('operations.showcase_bootstrap_confirmation');

                if ($expectedConfirmation === '' || ! hash_equals($expectedConfirmation, $confirmation)) {
                    throw new RuntimeException('La confirmation du bootstrap showcase est invalide.');
                }
            } else {
                $guard->assertAllowed($confirmation);
            }

            $password = (string) config('operations.showcase_password');

            if (strlen($password) < 20) {
                throw new RuntimeException('Le mot de passe showcase doit contenir au moins 20 caracteres.');
            }

            $mfaSecret = strtoupper(trim((string) config('operations.showcase_mfa_secret')));
            $mfaRecoveryCodes = array_values(array_unique(array_filter(array_map(
                static fn (string $code): string => strtoupper(trim($code)),
                explode(',', (string) config('operations.showcase_mfa_recovery_codes')),
            ))));

            if (
                preg_match('/^[A-Z2-7]{32,64}$/', $mfaSecret) !== 1
                || count($mfaRecoveryCodes) !== 8
                || collect($mfaRecoveryCodes)->contains(
                    static fn (string $code): bool => preg_match('/^[A-F0-9]{10}$/', $code) !== 1,
                )
            ) {
                throw new RuntimeException('La configuration MFA showcase est invalide.');
            }

            if ($this->option('dry-run')) {
                $marketplaceResult = $marketplaceSeeder->seedFrom(
                    $imagesPath,
                    true,
                    null,
                    $isTestExecution ? null : $confirmation,
                );

                $this->info(sprintf(
                    'Dry-run showcase valide: %d images verifiees, aucune ecriture.',
                    count($marketplaceResult['images']),
                ));

                return self::SUCCESS;
            }

            if (Cache::store('database')->get(self::MARKER_KEY) === 'complete') {
                $this->info('Le bootstrap showcase est deja termine; aucune ecriture supplementaire.');

                return self::SUCCESS;
            }

            $unexpectedEmails = User::query()
                ->pluck('email')
                ->diff($marketplaceSeeder->demoEmails())
                ->values();

            if ($unexpectedEmails->isNotEmpty()) {
                throw new RuntimeException(
                    'La base contient deja des comptes hors du jeu marketplace autorise; bootstrap refuse.',
                );
            }

            $marketplaceResult = $marketplaceSeeder->seedFrom(
                $imagesPath,
                false,
                null,
                $isTestExecution ? null : $confirmation,
            );

            DB::transaction(function () use ($socialSeeder, $password, $mfaSecret, $mfaRecoveryCodes): void {
                if (User::query()->where('email', 'admin@yazoo.ma')->exists()) {
                    throw new RuntimeException('Un contenu social showcase partiel existe sans marqueur de fin.');
                }

                $socialSeeder->run();

                $expectedCounts = [
                    'users' => 20,
                    'posts' => 3,
                    'comments' => 2,
                    'likes' => 4,
                ];

                foreach ($expectedCounts as $table => $expectedCount) {
                    $actualCount = DB::table($table)->count();

                    if ($actualCount !== $expectedCount) {
                        throw new RuntimeException("Jeu showcase incomplet pour {$table}: {$actualCount}/{$expectedCount}.");
                    }
                }

                $passwordHash = Hash::make($password);
                User::query()->update(['password' => $passwordHash]);

                $admin = User::query()
                    ->where('email', 'bough.youssef@gmail.com')
                    ->where('is_admin', true)
                    ->firstOrFail();
                $admin->forceFill([
                    'admin_mfa_secret' => $mfaSecret,
                    'admin_mfa_recovery_codes' => array_map(
                        static fn (string $code): string => Hash::make($code),
                        $mfaRecoveryCodes,
                    ),
                    'admin_mfa_confirmed_at' => now(),
                ])->save();

                Cache::store('database')->forever(self::MARKER_KEY, 'complete');
            }, 1);

            $this->info('Bootstrap Azure showcase termine: comptes, marketplace et contenu social sont prets.');

            return self::SUCCESS;
        } catch (Throwable $exception) {
            $this->error('Bootstrap Azure showcase refuse ou annule: '.$exception->getMessage());

            return self::FAILURE;
        }
    }
}
