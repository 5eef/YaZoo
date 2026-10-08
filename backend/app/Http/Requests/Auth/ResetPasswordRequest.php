<?php

namespace App\Http\Requests\Auth;

use App\Support\RequestInput;
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
            'channel' => RequestInput::lower($this->input('channel')),
            'identifier' => RequestInput::trim($this->input('identifier')),
            'token' => RequestInput::trim($this->input('token')),
            'otp_code' => RequestInput::trim($this->input('otp_code')),
        ]);
    }
}
