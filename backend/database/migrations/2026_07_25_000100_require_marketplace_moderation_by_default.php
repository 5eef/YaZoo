<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['products', 'service_listings', 'veterinarians'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->string('moderation_status')->default('pending_review')->change();
            });

            DB::table($tableName)
                ->where('moderation_status', 'active')
                ->whereNull('moderated_by')
                ->update([
                    'moderation_status' => 'pending_review',
                    'moderation_note' => 'Revue requise apres durcissement de la moderation.',
                ]);
        }
    }

    public function down(): void
    {
        foreach (['products', 'service_listings', 'veterinarians'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->string('moderation_status')->default('active')->change();
            });
        }
    }
};
