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
        Schema::table('animals', function (Blueprint $table): void {
            $table->index(['user_id', 'created_at'], 'animals_user_created_idx');
            $table->index(['category', 'listing_status', 'created_at'], 'animals_marketplace_idx');
            $table->index(['location', 'created_at'], 'animals_location_created_idx');
            $table->index(['price', 'created_at'], 'animals_price_created_idx');
            $table->index(['is_for_adoption', 'created_at'], 'animals_adoption_created_idx');
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->index(['user_id', 'created_at'], 'products_user_created_idx');
            $table->index(['category', 'listing_status', 'created_at'], 'products_marketplace_idx');
            $table->index(['condition_status', 'created_at'], 'products_condition_created_idx');
            $table->index(['location', 'created_at'], 'products_location_created_idx');
            $table->index(['price', 'created_at'], 'products_price_created_idx');
            $table->index(['stock', 'listing_status'], 'products_stock_status_idx');
        });

        Schema::table('posts', function (Blueprint $table): void {
            $table->index(['created_at'], 'posts_created_idx');
            $table->index(['user_id', 'created_at'], 'posts_user_created_idx');
        });

        Schema::table('comments', function (Blueprint $table): void {
            $table->index(['post_id', 'created_at'], 'comments_post_created_idx');
        });

        Schema::table('messages', function (Blueprint $table): void {
            $table->index(['conversation_id', 'created_at'], 'messages_conversation_created_idx');
            $table->index(['conversation_id', 'read_at'], 'messages_conversation_read_idx');
        });

        Schema::table('notifications', function (Blueprint $table): void {
            $table->index(['notifiable_type', 'notifiable_id', 'read_at', 'created_at'], 'notifications_inbox_idx');
        });

        Schema::table('community_members', function (Blueprint $table): void {
            $table->index(['community_id', 'status', 'created_at'], 'community_members_pending_idx');
            $table->index(['user_id', 'status'], 'community_members_user_status_idx');
        });

        Schema::table('reservations', function (Blueprint $table): void {
            $table->index(['reservable_type', 'reservable_id', 'reservation_status'], 'reservations_reservable_status_idx');
            $table->index(['seller_id', 'reservation_status', 'created_at'], 'reservations_seller_status_created_idx');
            $table->index(['buyer_id', 'reservation_status', 'created_at'], 'reservations_buyer_status_created_idx');
            $table->index(['delivery_status', 'created_at'], 'reservations_delivery_created_idx');
            $table->index(['completed_at'], 'reservations_completed_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // InnoDB may remove an implicit FK index when a composite index replaces it.
        // Restore a single-column index before dropping the composite FK support.
        foreach ([
            'animals' => ['user_id'],
            'products' => ['user_id'],
            'posts' => ['user_id'],
            'comments' => ['post_id'],
            'messages' => ['conversation_id'],
            'community_members' => ['community_id', 'user_id'],
            'reservations' => ['seller_id', 'buyer_id'],
        ] as $tableName => $columns) {
            foreach ($columns as $column) {
                if (! Schema::hasIndex($tableName, [$column])) {
                    Schema::table($tableName, fn (Blueprint $table) => $table->index($column, "{$tableName}_{$column}_rollback_index"));
                }
            }
        }

        Schema::table('animals', function (Blueprint $table): void {
            $table->dropIndex('animals_user_created_idx');
            $table->dropIndex('animals_marketplace_idx');
            $table->dropIndex('animals_location_created_idx');
            $table->dropIndex('animals_price_created_idx');
            $table->dropIndex('animals_adoption_created_idx');
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->dropIndex('products_user_created_idx');
            $table->dropIndex('products_marketplace_idx');
            $table->dropIndex('products_condition_created_idx');
            $table->dropIndex('products_location_created_idx');
            $table->dropIndex('products_price_created_idx');
            $table->dropIndex('products_stock_status_idx');
        });

        Schema::table('posts', function (Blueprint $table): void {
            $table->dropIndex('posts_created_idx');
            $table->dropIndex('posts_user_created_idx');
        });

        Schema::table('comments', function (Blueprint $table): void {
            $table->dropIndex('comments_post_created_idx');
        });

        Schema::table('messages', function (Blueprint $table): void {
            $table->dropIndex('messages_conversation_created_idx');
            $table->dropIndex('messages_conversation_read_idx');
        });

        Schema::table('notifications', function (Blueprint $table): void {
            $table->dropIndex('notifications_inbox_idx');
        });

        Schema::table('community_members', function (Blueprint $table): void {
            $table->dropIndex('community_members_pending_idx');
            $table->dropIndex('community_members_user_status_idx');
        });

        Schema::table('reservations', function (Blueprint $table): void {
            $table->dropIndex('reservations_reservable_status_idx');
            $table->dropIndex('reservations_seller_status_created_idx');
            $table->dropIndex('reservations_buyer_status_created_idx');
            $table->dropIndex('reservations_delivery_created_idx');
            $table->dropIndex('reservations_completed_idx');
        });
    }
};
