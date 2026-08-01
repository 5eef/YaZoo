<?php

namespace App\Console\Commands;

use Database\Seeders\MarketplaceTestSeeder;
use Illuminate\Console\Command;
use Throwable;

class SeedMarketplaceDemo extends Command
{
    protected $signature = 'yazoo:seed-marketplace-demo
        {--images= : Dossier contenant exactement les 21 images PNG de démonstration}
        {--dry-run : Valide l’environnement et les images sans aucune écriture}
        {--fail-after= : Point d’échec réservé aux tests de rollback}';

    protected $description = 'Crée ou met à jour le jeu local idempotent du Marché YaZoo.';

    public function handle(MarketplaceTestSeeder $seeder): int
    {
        $imagesPath = trim((string) $this->option('images'));

        if ($imagesPath === '') {
            $this->error("L'option --images est obligatoire.");

            return self::FAILURE;
        }

        try {
            $result = $seeder->seedFrom(
                $imagesPath,
                (bool) $this->option('dry-run'),
                filled($this->option('fail-after')) ? (string) $this->option('fail-after') : null,
            );

            $this->table(
                ['Fichier', 'Existence', 'Taille', 'Dimensions', 'Future annonce'],
                collect($result['images'])->map(fn (array $image): array => [
                    $image['file'],
                    $image['exists'] ? 'oui' : 'non',
                    $image['bytes'],
                    $image['dimensions'],
                    $image['listing'],
                ])->all(),
            );

            if ($result['dryRun']) {
                $this->info('Dry-run réussi : aucune écriture en base ou dans le stockage.');

                return self::SUCCESS;
            }

            $this->table(
                ['Entité', 'Créés', 'Mis à jour', 'Inchangés'],
                collect($result['stats'])->map(fn (array $counts, string $entity): array => [
                    $entity,
                    $counts['created'],
                    $counts['updated'],
                    $counts['unchanged'],
                ])->values()->all(),
            );
            $this->info('Peuplement local du Marché YaZoo terminé avec succès.');

            return self::SUCCESS;
        } catch (Throwable $exception) {
            $this->error('Peuplement refusé ou annulé : '.$exception->getMessage());

            return self::FAILURE;
        }
    }
}
