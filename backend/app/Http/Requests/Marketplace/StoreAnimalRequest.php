<?php

namespace App\Http\Requests\Marketplace;

use App\Models\Animal;
use App\Support\MarketplaceContact;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAnimalRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'category' => ['required', Rule::in(Animal::CATEGORIES)],
            'type' => ['required', 'string', 'max:100'],
            'breed' => ['nullable', 'string', 'max:150'],
            'age' => ['nullable', 'integer', 'min:0', 'max:100'],
            'sex' => ['required', Rule::in(['male', 'female', 'unknown'])],
            'location' => ['required', 'string', 'max:150'],
            'contact_visibility' => ['required', Rule::in(MarketplaceContact::VISIBILITIES)],
            'contact_phone' => ['nullable', 'string', 'max:50', 'required_if:contact_visibility,phone,whatsapp'],
            'contact_email' => ['nullable', 'email', 'max:255', 'required_if:contact_visibility,email'],
            'whatsapp_enabled' => ['nullable', 'boolean'],
            'photo_url' => ['nullable', 'string', 'max:2048'],
            'photo' => ['nullable', 'image', 'max:5120'],
            'gallery_urls' => ['nullable', 'array', 'max:6'],
            'gallery_urls.*' => ['string', 'max:2048'],
            'gallery_files' => ['nullable', 'array', 'max:6'],
            'gallery_files.*' => ['image', 'max:5120'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'is_for_adoption' => ['required', 'boolean'],
            'listing_status' => ['required', Rule::in(Animal::LISTING_STATUSES)],
            'description' => ['required', 'string', 'min:20', 'max:5000'],
            'accepts_animal_rules' => ['required', 'accepted'],
            'seller_type' => ['required', 'string', Rule::in(Animal::SELLER_TYPES)],
            'origin' => ['nullable', 'string', 'max:190'],
            'identification_number' => ['nullable', 'string', 'max:120'],
            'health_certificate_path' => ['nullable', 'string', 'max:2048'],
            'vaccination_book_path' => ['nullable', 'string', 'max:2048'],
            'onssa_authorization_number' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $fields = [
            'name',
            'category',
            'type',
            'breed',
            'location',
            'contact_visibility',
            'contact_phone',
            'contact_email',
            'photo_url',
            'listing_status',
            'description',
            'seller_type',
            'origin',
            'identification_number',
            'health_certificate_path',
            'vaccination_book_path',
            'onssa_authorization_number',
        ];
        $normalized = [];

        foreach ($fields as $field) {
            $value = $this->input($field);
            $normalized[$field] = is_string($value) ? trim($value) : $value;
        }

        $galleryUrls = collect($this->input('gallery_urls', []))
            ->filter(fn ($value) => is_string($value))
            ->map(fn ($value) => trim($value))
            ->filter()
            ->values()
            ->all();

        $normalized['gallery_urls'] = $galleryUrls;
        $normalized['is_for_adoption'] = filter_var(
            $this->input('is_for_adoption'),
            FILTER_VALIDATE_BOOLEAN,
            FILTER_NULL_ON_FAILURE
        );
        if ($this->has('accepts_animal_rules')) {
            $normalized['accepts_animal_rules'] = filter_var(
                $this->input('accepts_animal_rules'),
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE
            );
        }
        $normalized['category'] = $normalized['category'] ?: 'other';
        $normalized['listing_status'] = $normalized['listing_status'] ?: 'available';
        $normalized['seller_type'] = $normalized['seller_type'] ?: 'individual';
        $normalized['contact_visibility'] = $normalized['contact_visibility'] ?: 'messages_only';
        $normalized['whatsapp_enabled'] = $normalized['contact_visibility'] === 'whatsapp';

        if (! $normalized['photo_url'] && ! empty($galleryUrls)) {
            $normalized['photo_url'] = $galleryUrls[0];
        }

        $this->merge($normalized);
    }
}
