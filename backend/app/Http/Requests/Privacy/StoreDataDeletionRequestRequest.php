<?php

namespace App\Http\Requests\Privacy;

use App\Support\RequestInput;
use Illuminate\Foundation\Http\FormRequest;

class StoreDataDeletionRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'reason' => ['nullable', 'string', 'max:2000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'reason' => $this->filled('reason') ? RequestInput::trim($this->input('reason')) : null,
        ]);
    }
}
