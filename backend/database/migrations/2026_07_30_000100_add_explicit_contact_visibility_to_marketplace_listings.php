<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('animals', function (Blueprint $table): void {
            $table->string('contact_visibility', 20)->default('messages_only')->after('contact_phone');
            $table->string('contact_email')->nullable()->after('contact_visibility');
            $table->boolean('whatsapp_enabled')->default(false)->after('contact_email');
            $table->index('contact_visibility');
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->string('contact_visibility', 20)->default('messages_only')->after('location');
            $table->string('contact_phone', 50)->nullable()->after('contact_visibility');
            $table->string('contact_email')->nullable()->after('contact_phone');
            $table->boolean('whatsapp_enabled')->default(false)->after('contact_email');
            $table->index('contact_visibility');
        });

        Schema::table('service_listings', function (Blueprint $table): void {
            $table->string('contact_visibility', 20)->default('messages_only')->after('availability');
            $table->index('contact_visibility');
        });
    }

    public function down(): void
    {
        Schema::table('service_listings', function (Blueprint $table): void {
            $table->dropIndex(['contact_visibility']);
            $table->dropColumn('contact_visibility');
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->dropIndex(['contact_visibility']);
            $table->dropColumn([
                'contact_visibility',
                'contact_phone',
                'contact_email',
                'whatsapp_enabled',
            ]);
        });

        Schema::table('animals', function (Blueprint $table): void {
            $table->dropIndex(['contact_visibility']);
            $table->dropColumn([
                'contact_visibility',
                'contact_email',
                'whatsapp_enabled',
            ]);
        });
    }
};
