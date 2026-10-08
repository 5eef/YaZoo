<?php

namespace App\Http\Requests\Privacy;

use App\Models\PrivacyConsent;
use App\Models\User;
use App\Support\RequestInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePrivacyConsentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', Rule::in(PrivacyConsent::TYPES)],
            'accepted' => ['required', 'boolean'],
            'locale' => ['nullable', 'string', Rule::in(User::SUPPORTED_LOCALES)],
        ];
    }

    protected function prepareForValidation(): void
    {
        $payload = [
            'type' => RequestInput::trim($this->input('type')),
            'locale' => $this->filled('locale') ? RequestInput::trim($this->input('locale')) : 'fr',
        ];

        if ($this->has('accepted')) {
            $payload['accepted'] = filter_var(
                $this->input('accepted'),
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE,
            ) ?? false;
        }

        $this->merge($payload);
    }
}
