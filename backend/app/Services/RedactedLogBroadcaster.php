<?php

namespace App\Services;

use Illuminate\Broadcasting\Broadcasters\LogBroadcaster;

final class RedactedLogBroadcaster extends LogBroadcaster
{
    public function broadcast(array $channels, $event, array $payload = [])
    {
        $this->logger->info('broadcast.delivery_skipped', [
            'transport' => 'log',
            'channel_count' => count($channels),
        ]);
    }
}
