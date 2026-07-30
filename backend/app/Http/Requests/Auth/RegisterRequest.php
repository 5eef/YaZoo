<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'phone' => ['nullable', 'string', 'max:30', Rule::unique('users', 'phone')],
            'otp_code' => ['nullable', 'digits:6'],
            'country' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'device_name' => ['nullable', 'string', 'max:120'],
            'preferred_locale' => ['nullable', 'string', Rule::in(User::SUPPORTED_LOCALES)],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $hasPhone = filled($this->input('phone'));
            $hasEmail = filled($this->input('email'));
            $hasOtp = filled($this->input('otp_code'));
            $hasLegacyPassword = filled($this->input('password')) && filled($this->input('password_confirmation'));

            if (! $hasPhone && ! $hasEmail) {
                $validator->errors()->add('phone', __('messages.auth.contact_required_register'));
            }

            if ($hasOtp && ! $hasPhone) {
                $validator->errors()->add('phone', __('validation.required', ['attribute' => 'telephone']));
            }

            if (! $hasOtp && ! $hasLegacyPassword) {
                $validator->errors()->add('otp_code', __('messages.auth.otp_required_register'));
            }
        });
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => is_string($this->email) ? trim($this->email) : $this->email,
            'phone' => PhoneNumber::normalize($this->phone),
            'preferred_locale' => is_string($this->preferred_locale)
                ? trim($this->preferred_locale)
                : $this->preferred_locale,
        ]);
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nom',
            'email' => 'email',
            'password' => 'mot de passe',
            'password_confirmation' => 'confirmation du mot de passe',
            'phone' => 'telephone',
            'otp_code' => 'code OTP',
            'country' => 'pays',
            'city' => 'ville',
            'device_name' => "nom de l'appareil",
            'preferred_locale' => 'langue preferee',
        ];
    }
}
