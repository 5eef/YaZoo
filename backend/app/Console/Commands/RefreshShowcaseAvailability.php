<?php

namespace App\Console\Commands;

use App\Services\ShowcaseAvailability;
use App\Support\ShowcaseBootstrapGuard;
use App\Support\ShowcaseBootstrapState;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class RefreshShowcaseAvailability extends Command
{
    protected $signature = 'yazoo:refresh-showcase-availability {--confirmation=}';

    protected $description = 'Maintient 14 jours de disponibilites fictives AFWAJ sans modifier les rendez-vous.';

    public function handle(ShowcaseBootstrapGuard $guard, ShowcaseAvailability $availability, ShowcaseBootstrapState $state): int
    {
        try {
            // Scheduled invocations use server configuration; never put the
            // confirmation in scheduler command lines or process listings.
            $guard->assertAllowed((string) ($this->option('confirmation') ?? config('operations.showcase_bootstrap_confirmation')));
            if (! $state->isComplete()) {
                throw new \RuntimeException('AFWAJ bootstrap required.');
            }
            $created = $availability->refresh();
            Cache::store('database')->forever('yazoo:showcase-availability:last-success', now()->toISOString());
            Log::info('Showcase availability refreshed.', ['created' => $created]);
            $this->info("Disponibilites DEMO ajoutees: {$created}.");

            return self::SUCCESS;
        } catch (Throwable $exception) {
            Log::warning('Showcase availability refresh failed.', ['exception' => $exception::class]);
            $this->error('Renouvellement refuse: verifier la cible showcase et les profils fictifs autorises.');

            return self::FAILURE;
        }
    }
}
