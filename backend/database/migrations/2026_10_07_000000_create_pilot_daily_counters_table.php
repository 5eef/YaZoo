<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pilot_daily_counters', function (Blueprint $table): void {
            $table->date('day');
            $table->string('event', 64);
            $table->unsignedBigInteger('count')->default(0);
            $table->primary(['day', 'event']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pilot_daily_counters');
    }
};
