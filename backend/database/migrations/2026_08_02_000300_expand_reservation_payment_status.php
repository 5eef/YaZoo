<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->string('payment_status', 32)->default('pending')->change();
        });
    }

    public function down(): void
    {
        if (DB::table('reservations')->whereRaw('CHAR_LENGTH(payment_status) > 20')->exists()) {
            throw new RuntimeException('Cannot safely reduce reservations.payment_status while longer values exist.');
        }

        Schema::table('reservations', function (Blueprint $table): void {
            $table->string('payment_status', 20)->default('pending')->change();
        });
    }
};
