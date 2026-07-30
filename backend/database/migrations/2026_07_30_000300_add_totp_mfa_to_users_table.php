<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->text('admin_mfa_secret')->nullable()->after('remember_token');
            $table->json('admin_mfa_recovery_codes')->nullable()->after('admin_mfa_secret');
            $table->timestamp('admin_mfa_confirmed_at')->nullable()->after('admin_mfa_recovery_codes');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['admin_mfa_secret', 'admin_mfa_recovery_codes', 'admin_mfa_confirmed_at']);
        });
    }
};
