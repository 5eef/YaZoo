<?php

namespace App\Http\Requests\Auth;

use App\Support\RequestInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestPasswordResetRequest extends FormRequest
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
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'channel' => RequestInput::lower($this->input('channel')),
            'identifier' => RequestInput::trim($this->input('identifier')),
        ]);
    }
}
