<?php

$pilot = (bool) env('STARTUP_PILOT', env('YAZOO_DEPLOYMENT_PROFILE') !== 'showcase');

return [
    'pilot_metrics' => (bool) env('PILOT_METRICS', false),
    'startup_pilot' => $pilot,
    'animal_listings_public' => (bool) env('ANIMAL_LISTINGS_PUBLIC', ! $pilot),
    'product_marketplace' => (bool) env('PRODUCT_MARKETPLACE', true),
    'communities' => (bool) env('COMMUNITIES', true),
    'social_feed' => (bool) env('SOCIAL_FEED', true),
    'payments' => (bool) env('PAYMENTS', false),
];
