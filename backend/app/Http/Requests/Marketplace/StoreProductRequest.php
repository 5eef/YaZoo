<?php

namespace App\Http\Requests\Marketplace;

use App\Models\Product;
use App\Support\MarketplaceContact;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
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
            'category' => ['required', Rule::in(Product::CATEGORIES)],
            'description' => ['required', 'string', 'max:5000'],
            'price' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'image_url' => ['nullable', 'string', 'max:2048'],
            'image' => ['nullable', 'image', 'max:5120'],
            'gallery_urls' => ['nullable', 'array', 'max:6'],
            'gallery_urls.*' => ['string', 'max:2048'],
            'gallery_files' => ['nullable', 'array', 'max:6'],
            'gallery_files.*' => ['image', 'max:5120'],
            'location' => ['required', 'string', 'max:150'],
            'contact_visibility' => ['required', Rule::in(MarketplaceContact::VISIBILITIES)],
            'contact_phone' => ['nullable', 'string', 'max:50', 'required_if:contact_visibility,phone,whatsapp'],
            'contact_email' => ['nullable', 'email', 'max:255', 'required_if:contact_visibility,email'],
            'whatsapp_enabled' => ['nullable', 'boolean'],
            'stock' => ['required', 'integer', 'min:0', 'max:100000'],
            'listing_status' => ['required', Rule::in(Product::LISTING_STATUSES)],
            'condition_status' => ['required', Rule::in(['new', 'used'])],
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
            'description',
            'image_url',
            'location',
            'contact_visibility',
            'contact_phone',
            'contact_email',
            'listing_status',
            'condition_status',
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
        $normalized['category'] = $normalized['category'] ?: 'other';
        $normalized['listing_status'] = $normalized['listing_status'] ?: 'available';
        $normalized['contact_visibility'] = $normalized['contact_visibility'] ?: 'messages_only';
        $normalized['whatsapp_enabled'] = $normalized['contact_visibility'] === 'whatsapp';

        if (! $normalized['image_url'] && ! empty($galleryUrls)) {
            $normalized['image_url'] = $galleryUrls[0];
        }

        $this->merge($normalized);
    }
}
