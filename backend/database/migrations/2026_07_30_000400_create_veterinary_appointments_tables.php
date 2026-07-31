<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('veterinarian_availability_slots', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('veterinarian_id')->constrained()->cascadeOnDelete();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->boolean('is_available')->default(true);
            $table->timestamps();
            $table->index(['veterinarian_id', 'is_available', 'starts_at'], 'vet_slots_lookup_idx');
        });

        Schema::create('veterinarian_appointments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('veterinarian_id')->constrained()->cascadeOnDelete();
            $table->foreignId('availability_slot_id')->nullable()->constrained('veterinarian_availability_slots')->nullOnDelete();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->string('animal_type', 80);
            $table->string('reason', 500);
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->string('status', 20)->default('pending');
            $table->text('status_note')->nullable();
            $table->foreignId('status_changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('status_changed_at')->nullable();
            $table->timestamps();
            $table->index(['veterinarian_id', 'status', 'starts_at'], 'vet_appointments_schedule_idx');
            $table->index(['client_id', 'status', 'starts_at'], 'vet_client_history_idx');
        });

        Schema::create('veterinarian_appointment_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('veterinarian_appointment_id');
            $table->unique('veterinarian_appointment_id', 'vet_appt_reviews_appointment_unique');
            $table->foreign('veterinarian_appointment_id', 'vet_appt_reviews_appointment_fk')
                ->references('id')
                ->on('veterinarian_appointments')
                ->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->string('comment', 1000)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veterinarian_appointment_reviews');
        Schema::dropIfExists('veterinarian_appointments');
        Schema::dropIfExists('veterinarian_availability_slots');
    }
};
