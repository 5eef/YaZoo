<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['products', 'service_listings', 'veterinarians'] as $tableName) {
            Schema::table($tableName, fn (Blueprint $table) => $table->index(['moderation_status', 'created_at'], "{$tableName}_kpi_status_idx"));
        }
        Schema::table('animals', fn (Blueprint $table) => $table->index(['legal_status', 'created_at'], 'animals_kpi_status_idx'));
        Schema::table('reservations', fn (Blueprint $table) => $table->index(['reservation_status', 'created_at'], 'reservations_kpi_status_idx'));
        Schema::table('professional_verifications', fn (Blueprint $table) => $table->index(['status', 'created_at'], 'professional_kpi_status_idx'));
    }

    public function down(): void
    {
        foreach (['products', 'service_listings', 'veterinarians'] as $tableName) {
            Schema::table($tableName, fn (Blueprint $table) => $table->dropIndex("{$tableName}_kpi_status_idx"));
        }
        Schema::table('animals', fn (Blueprint $table) => $table->dropIndex('animals_kpi_status_idx'));
        Schema::table('reservations', fn (Blueprint $table) => $table->dropIndex('reservations_kpi_status_idx'));
        Schema::table('professional_verifications', fn (Blueprint $table) => $table->dropIndex('professional_kpi_status_idx'));
    }
};
