<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservation_reviews', function (Blueprint $table): void {
            if (! Schema::hasColumn('reservation_reviews', 'reviewable_type')) {
                $table->nullableMorphs('reviewable');
            }

            if (! Schema::hasColumn('reservation_reviews', 'status')) {
                $table->string('status')->default('published')->index();
            }

            if (! Schema::hasColumn('reservation_reviews', 'moderated_by')) {
                $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            }

            if (! Schema::hasColumn('reservation_reviews', 'moderated_at')) {
                $table->timestamp('moderated_at')->nullable();
            }

            if (! Schema::hasColumn('reservation_reviews', 'moderation_reason')) {
                $table->text('moderation_reason')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('reservation_reviews', function (Blueprint $table): void {
            if (Schema::hasColumn('reservation_reviews', 'moderation_reason')) {
                $table->dropColumn('moderation_reason');
            }

            if (Schema::hasColumn('reservation_reviews', 'moderated_at')) {
                $table->dropColumn('moderated_at');
            }

            if (Schema::hasColumn('reservation_reviews', 'moderated_by')) {
                $table->dropConstrainedForeignId('moderated_by');
            }

            if (Schema::hasColumn('reservation_reviews', 'status')) {
                $table->dropIndex('reservation_reviews_status_index');
                $table->dropColumn('status');
            }

            if (Schema::hasColumn('reservation_reviews', 'reviewable_type')) {
                $table->dropMorphs('reviewable');
            }
        });
    }
};
