<?php

namespace App\Http\Requests\Auth;

use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
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
            'email' => ['nullable', 'email'],
            'password' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:30'],
            'otp_code' => ['nullable', 'digits:6'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $hasPhoneOtp = filled($this->input('phone')) && filled($this->input('otp_code'));
            $hasLegacyCredentials = filled($this->input('email')) && filled($this->input('password'));

            if (! $hasPhoneOtp && ! $hasLegacyCredentials) {
                $validator->errors()->add('phone', __('messages.auth.otp_required_login'));
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
            'phone' => is_string($this->phone) ? PhoneNumber::normalize($this->phone) : $this->phone,
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
            'email' => 'email',
            'password' => 'mot de passe',
            'phone' => 'telephone',
            'otp_code' => 'code OTP',
            'device_name' => "nom de l'appareil",
        ];
    }
}
