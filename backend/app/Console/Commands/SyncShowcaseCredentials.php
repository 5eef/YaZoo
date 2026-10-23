<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SyncShowcaseCredentials extends Command
{
    protected $signature = 'yazoo:sync-showcase-credentials {--confirmation= : Confirmation exacte de la cible showcase}';

    protected $description = 'Ancienne synchronisation des credentials DEMO desactivee pour preserver les comptes.';

    public function handle(): int
    {
        $this->error('Synchronisation des mots de passe desactivee. Utilisez la recuperation individuelle du compte.');

        return self::FAILURE;
    }
}
