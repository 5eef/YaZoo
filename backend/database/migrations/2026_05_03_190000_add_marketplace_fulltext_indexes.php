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

        Schema::table('animals', function (Blueprint $table): void {
            $table->fullText(['name', 'type', 'breed', 'description'], 'animals_search_fulltext_idx');
            $table->fullText(['type'], 'animals_type_fulltext_idx');
            $table->fullText(['location'], 'animals_location_fulltext_idx');
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->fullText(['name', 'description'], 'products_search_fulltext_idx');
            $table->fullText(['location'], 'products_location_fulltext_idx');
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

        Schema::table('animals', function (Blueprint $table): void {
            $table->dropFullText('animals_search_fulltext_idx');
            $table->dropFullText('animals_type_fulltext_idx');
            $table->dropFullText('animals_location_fulltext_idx');
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->dropFullText('products_search_fulltext_idx');
            $table->dropFullText('products_location_fulltext_idx');
        });
    }
};
