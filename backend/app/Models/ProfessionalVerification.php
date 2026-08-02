<?php

namespace App\Models;

use App\Models\Concerns\HasMediaAssets;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfessionalVerification extends Model
{
    use HasFactory, HasMediaAssets;

    public const BUSINESS_TYPES = [
        'veterinarian',
        'pet_shop',
        'breeder',
        'seller',
        'trainer',
        'shelter',
        'service_provider',
        'association',
        'other',
    ];

    public const STATUSES = [
        'pending',
        'approved',
        'rejected',
        'expired',
    ];

    public const DOCUMENT_TYPES = [
        'cin',
        'ice',
        'license',
        'onssa_authorization',
        'professional_card',
        'association_document',
        'veterinarian_license',
        'other',
    ];

    protected $fillable = [
        'user_id',
        'business_type',
        'legal_name',
        'ice',
        'onssa_authorization_number',
        'professional_license_number',
        'document_path',
        'document_type',
        'document_original_name',
        'document_mime',
        'document_size',
        'document_expires_at',
        'status',
        'pending_key',
        'verified_by',
        'verified_at',
        'admin_note',
        'review_reason',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'document_expires_at' => 'date',
            'verified_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function effectiveStatus(): string
    {
        if ($this->document_expires_at && $this->document_expires_at->isPast()) {
            return 'expired';
        }

        return $this->status;
    }

    public function wasReviewedByAdmin(): bool
    {
        if (! $this->reviewed_by || ! $this->reviewed_at) {
            return false;
        }

        if (
            $this->relationLoaded('reviewer')
            && $this->reviewer
            && array_key_exists('is_admin', $this->reviewer->getAttributes())
        ) {
            return (bool) $this->reviewer->is_admin;
        }

        return $this->reviewer()->where('is_admin', true)->exists();
    }

    public function hasValidVeterinarianCredentials(): bool
    {
        return $this->business_type === 'veterinarian'
            && $this->document_type === 'veterinarian_license'
            && filled($this->professional_license_number)
            && filled($this->document_path)
            && $this->document_expires_at !== null
            && $this->document_expires_at->isFuture();
    }
}
