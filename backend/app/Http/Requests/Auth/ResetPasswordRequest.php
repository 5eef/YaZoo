<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'channel' => ['required', Rule::in(['email', 'phone'])],
            'identifier' => ['required', 'string', 'max:255'],
            'token' => ['nullable', 'required_if:channel,email', 'string', 'size:64'],
            'otp_code' => ['nullable', 'required_if:channel,phone', 'digits:6'],
            'password' => [
                'required',
                'string',
                'confirmed',
                'min:8',
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'channel' => strtolower(trim((string) $this->input('channel'))),
            'identifier' => trim((string) $this->input('identifier')),
            'token' => trim((string) $this->input('token')),
            'otp_code' => trim((string) $this->input('otp_code')),
        ]);
    }
}
