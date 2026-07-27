<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('professional_verifications', function (Blueprint $table): void {
            $table->string('pending_key', 190)->nullable()->after('status');
        });

        DB::table('professional_verifications')
            ->where('status', 'pending')
            ->orderByDesc('id')
            ->get()
            ->groupBy(fn (object $row): string => $row->user_id.':'.$row->business_type)
            ->each(function ($rows, string $key): void {
                $latest = $rows->first();
                DB::table('professional_verifications')->where('id', $latest->id)->update([
                    'pending_key' => $key,
                ]);

                $duplicateIds = $rows->skip(1)->pluck('id');
                if ($duplicateIds->isNotEmpty()) {
                    DB::table('professional_verifications')->whereIn('id', $duplicateIds)->update([
                        'status' => 'rejected',
                        'review_reason' => 'Superseded duplicate pending request.',
                    ]);
                }
            });

        Schema::table('professional_verifications', function (Blueprint $table): void {
            $table->unique('pending_key', 'professional_verifications_pending_key_unique');
        });
    }

    public function down(): void
    {
        Schema::table('professional_verifications', function (Blueprint $table): void {
            $table->dropUnique('professional_verifications_pending_key_unique');
            $table->dropColumn('pending_key');
        });
    }
};
