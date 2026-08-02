<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * @var list<string>
     */
    private array $tables = [
        'posts',
        'products',
        'service_listings',
        'veterinarians',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
                if (! Schema::hasColumn($tableName, 'moderation_status')) {
                    $table->string('moderation_status')->default('active');
                }

                if (! Schema::hasColumn($tableName, 'moderation_note')) {
                    $table->text('moderation_note')->nullable();
                }

                if (! Schema::hasColumn($tableName, 'moderated_by')) {
                    $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
                }

                if (! Schema::hasColumn($tableName, 'moderated_at')) {
                    $table->timestamp('moderated_at')->nullable();
                }
            });
        }

        Schema::table('animals', function (Blueprint $table): void {
            if (! Schema::hasColumn('animals', 'moderated_by')) {
                $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            }

            if (! Schema::hasColumn('animals', 'moderated_at')) {
                $table->timestamp('moderated_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
                if (Schema::hasColumn($tableName, 'moderated_by')) {
                    $table->dropConstrainedForeignId('moderated_by');
                }

                foreach (['moderated_at', 'moderation_note', 'moderation_status'] as $column) {
                    if (Schema::hasColumn($tableName, $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        Schema::table('animals', function (Blueprint $table): void {
            if (Schema::hasColumn('animals', 'moderated_by')) {
                $table->dropConstrainedForeignId('moderated_by');
            }

            if (Schema::hasColumn('animals', 'moderated_at')) {
                $table->dropColumn('moderated_at');
            }
        });
    }
};
