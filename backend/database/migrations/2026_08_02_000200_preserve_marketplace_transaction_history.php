<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('animals', fn (Blueprint $table) => $table->softDeletes());
        Schema::table('products', fn (Blueprint $table) => $table->softDeletes());
        Schema::table('reservations', fn (Blueprint $table) => $table->json('transaction_snapshot')->nullable());

        Schema::table('moderation_actions', function (Blueprint $table): void {
            $table->dropForeign(['admin_id']);
            $table->foreign('admin_id')->references('id')->on('users')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('moderation_actions', function (Blueprint $table): void {
            $table->dropForeign(['admin_id']);
            $table->foreign('admin_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::table('reservations', fn (Blueprint $table) => $table->dropColumn('transaction_snapshot'));
        Schema::table('products', fn (Blueprint $table) => $table->dropSoftDeletes());
        Schema::table('animals', fn (Blueprint $table) => $table->dropSoftDeletes());
    }
};
