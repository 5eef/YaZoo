<?php

namespace App\Http\Requests\ServiceListing;

use App\Models\ServiceListing;
use App\Support\MarketplaceContact;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreServiceListingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(ServiceListing::TYPES)],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'animal_types' => ['nullable', 'array'],
            'animal_types.*' => ['string', 'max:80'],
            'city' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'price_type' => ['nullable', Rule::in(ServiceListing::PRICE_TYPES)],
            'availability' => ['nullable', 'array'],
            'contact_visibility' => ['required', Rule::in(MarketplaceContact::VISIBILITIES)],
            'contact_phone' => ['nullable', 'string', 'max:50', 'required_if:contact_visibility,phone,whatsapp'],
            'contact_email' => ['nullable', 'email', 'max:255', 'required_if:contact_visibility,email'],
            'whatsapp_enabled' => ['nullable', 'boolean'],
            'media' => ['nullable', 'array'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'type' => trim((string) $this->input('type')),
            'title' => trim((string) $this->input('title')),
            'description' => trim((string) $this->input('description')),
            'city' => trim((string) $this->input('city')),
            'address' => trim((string) $this->input('address')),
            'price_type' => $this->input('price_type') ?: 'negotiable',
            'contact_visibility' => trim((string) ($this->input('contact_visibility') ?: 'messages_only')),
            'contact_phone' => trim((string) $this->input('contact_phone')),
            'contact_email' => trim((string) $this->input('contact_email')),
            'whatsapp_enabled' => $this->input('contact_visibility') === 'whatsapp',
        ]);
    }
}
