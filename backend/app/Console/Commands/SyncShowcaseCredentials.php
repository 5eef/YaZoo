<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\ShowcaseBootstrapGuard;
use Database\Seeders\MarketplaceTestSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Throwable;

class SyncShowcaseCredentials extends Command
{
    protected $signature = 'yazoo:sync-showcase-credentials {--confirmation= : Confirmation exacte de la cible showcase}';

    protected $description = 'Synchronise uniquement les mots de passe des comptes fictifs non-admin AFWAJ.';

    public function handle(ShowcaseBootstrapGuard $guard, MarketplaceTestSeeder $seeder): int
    {
        try {
            $guard->assertAllowed(trim((string) $this->option('confirmation')));
            if (Cache::store('database')->get('yazoo_showcase_bootstrap_v2') !== 'complete') {
                throw new RuntimeException('Le bootstrap AFWAJ v2 doit etre termine.');
            }
            $password = (string) config('operations.showcase_password');
            $emails = array_merge($seeder->demoEmails(), [
                'sara.adoption@yazoo.ma', 'youssef.shop@yazoo.ma', 'imane.client@yazoo.ma',
                'nadia.community@yazoo.ma', 'hamza.member@yazoo.ma',
            ]);
            $updated = DB::transaction(function () use ($emails, $password): int {
                $updated = 0;
                foreach (User::query()->whereIn('email', $emails)->where('is_admin', false)->lockForUpdate()->get() as $user) {
                    if (! str_contains($user->name, 'DEMO') || ! str_contains((string) $user->bio, 'fictif')) {
                        throw new RuntimeException('Un compte autorise ne porte pas les marqueurs fictifs AFWAJ; aucune modification.');
                    }
                    if (! Hash::check($password, $user->password)) {
                        // Query update preserves timestamps and all other user attributes.
                        DB::table('users')->where('id', $user->id)->update(['password' => Hash::make($password)]);
                        $updated++;
                    }
                }

                return $updated;
            });
            $this->info("Credentials DEMO non-admin synchronises: {$updated} modification(s). Administrateurs inchanges.");

            return self::SUCCESS;
        } catch (Throwable) {
            // Database errors can contain bindings; never print exceptions here.
            $this->error('Synchronisation refusee: verifier cible, confirmation, secret et bootstrap AFWAJ v2. Aucune donnee hors credentials DEMO modifiee.');

            return self::FAILURE;
        }
    }
}
