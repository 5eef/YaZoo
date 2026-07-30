<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Admin\BusinessKpiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminStatsController extends Controller
{
    public function __construct(private readonly BusinessKpiService $kpis) {}

    public function __invoke(Request $request): JsonResponse
    {
        abort_unless((bool) $request->user()?->is_admin, 403);

        $validated = $request->validate(['days' => ['nullable', 'integer', 'in:7,30,90']]);
        $days = (int) ($validated['days'] ?? 30);

        return response()->json($this->kpis->get($days));
    }
}
