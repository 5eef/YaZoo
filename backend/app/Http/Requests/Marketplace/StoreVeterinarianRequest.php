<?php

namespace App\Http\Requests\Marketplace;

use Illuminate\Foundation\Http\FormRequest;

class StoreVeterinarianRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'clinic_name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:3000'],
            'city' => ['nullable', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:50'],
            'whatsapp' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'specialties' => ['nullable', 'array'],
            'specialties.*' => ['string', 'max:120'],
            'working_hours' => ['nullable', 'array'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'dimensions:max_width=6000,max_height=6000', 'max:5120'],
            'image_path' => ['nullable', 'url:http,https', 'max:1000'],
            'image_asset_id' => ['nullable', 'uuid'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'location_url' => ['nullable', 'url', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name')),
            'clinic_name' => trim((string) $this->input('clinic_name')) ?: null,
            'description' => trim((string) $this->input('description')) ?: null,
            'city' => trim((string) $this->input('city')) ?: null,
            'address' => trim((string) $this->input('address')) ?: null,
            'phone' => trim((string) $this->input('phone')) ?: null,
            'whatsapp' => trim((string) $this->input('whatsapp')) ?: null,
            'email' => trim((string) $this->input('email')) ?: null,
            'location_url' => trim((string) $this->input('location_url')) ?: null,
            'is_active' => $this->boolean('is_active', true),
        ]);

        if ($this->exists('image_path')) {
            $this->merge([
                'image_path' => trim((string) $this->input('image_path')) ?: null,
            ]);
        }
    }
}
