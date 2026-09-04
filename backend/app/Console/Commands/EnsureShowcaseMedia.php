<?php

namespace App\Console\Commands;

use Database\Seeders\MarketplaceTestSeeder;
use Illuminate\Console\Command;
use RuntimeException;
use Throwable;

class EnsureShowcaseMedia extends Command
{
    protected $signature = 'yazoo:ensure-showcase-media
        {--images= : Dossier en lecture seule contenant exactement les 21 images PNG}';

    protected $description = 'Rehydrate les medias versionnes du showcase sans modifier la base.';

    public function handle(MarketplaceTestSeeder $seeder): int
    {
        try {
            if (config('operations.deployment_profile') !== 'showcase') {
                throw new RuntimeException('La rehydratation des medias exige YAZOO_DEPLOYMENT_PROFILE=showcase.');
            }

            $imagesPath = trim((string) $this->option('images'));
            if ($imagesPath === '') {
                throw new RuntimeException("L'option --images est obligatoire.");
            }

            $result = $seeder->ensureShowcaseMedia($imagesPath);
            $this->info(sprintf(
                'Medias showcase verifies: %d crees, %d actualises, %d inchanges.',
                $result['created'],
                $result['updated'],
                $result['unchanged'],
            ));

            return self::SUCCESS;
        } catch (Throwable $exception) {
            $this->error('Rehydratation des medias showcase refusee: '.$exception->getMessage());

            return self::FAILURE;
        }
    }
}
