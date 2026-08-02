<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_assets', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('disk', 64);
            $table->text('path');
            $table->char('path_hash', 64);
            $table->string('kind', 32);
            $table->string('state', 32)->default('active');
            $table->string('visibility', 16)->default('public');
            $table->string('role', 64)->nullable();
            $table->nullableMorphs('attachable');
            $table->string('mime_type', 190)->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->string('original_name', 255)->nullable();
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->unique(['disk', 'path_hash']);
            $table->index(['owner_id', 'state']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_assets');
    }
};
