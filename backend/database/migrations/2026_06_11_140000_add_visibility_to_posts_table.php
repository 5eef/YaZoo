<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            if (! Schema::hasColumn('posts', 'visibility')) {
                $table->string('visibility', 24)->default('public')->after('tags')->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            if (Schema::hasColumn('posts', 'visibility')) {
                $table->dropIndex('posts_visibility_index');
                $table->dropColumn('visibility');
            }
        });
    }
};
