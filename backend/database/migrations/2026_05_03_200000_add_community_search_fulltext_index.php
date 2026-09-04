<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (
            ! (bool) config('operations.fulltext_search_enabled')
            || ! in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb'], true)
        ) {
            return;
        }

        Schema::table('communities', function (Blueprint $table): void {
            $table->fullText(['name', 'description'], 'communities_search_fulltext_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (
            ! (bool) config('operations.fulltext_search_enabled')
            || ! in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb'], true)
        ) {
            return;
        }

        Schema::table('communities', function (Blueprint $table): void {
            $table->dropFullText('communities_search_fulltext_idx');
        });
    }
};
