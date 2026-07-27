<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('data_deletion_requests', function (Blueprint $table): void {
            $table->unsignedInteger('processing_attempts')->default(0)->after('status');
            $table->string('failure_code', 100)->nullable()->after('processing_attempts');
            $table->timestamp('processing_started_at')->nullable()->after('failure_code');
            $table->timestamp('completed_at')->nullable()->after('processing_started_at');
        });
    }

    public function down(): void
    {
        Schema::table('data_deletion_requests', function (Blueprint $table): void {
            $table->dropColumn([
                'processing_attempts',
                'failure_code',
                'processing_started_at',
                'completed_at',
            ]);
        });
    }
};
