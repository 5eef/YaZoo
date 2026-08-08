<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('data_deletion_requests', function (Blueprint $table): void {
            $table->json('purge_manifest')->nullable()->after('processing_started_at');
            $table->timestamp('database_anonymized_at')->nullable()->after('purge_manifest');
            $table->timestamp('purge_completed_at')->nullable()->after('database_anonymized_at');
        });
    }

    public function down(): void
    {
        Schema::table('data_deletion_requests', function (Blueprint $table): void {
            $table->dropColumn([
                'purge_manifest',
                'database_anonymized_at',
                'purge_completed_at',
            ]);
        });
    }
};
