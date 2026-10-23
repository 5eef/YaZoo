<?php

namespace App\Http\Requests\Report;

use App\Models\Report;
use App\Support\RequestInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'reportable_type' => ['required', 'string', Rule::in(['animal', 'product', 'service', 'veterinarian', 'post'])],
            'reportable_id' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', Rule::in(Report::REASONS)],
            'details' => ['nullable', 'string', 'max:2000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'reportable_type' => RequestInput::trim($this->input('reportable_type')),
            'details' => $this->filled('details') ? RequestInput::trim($this->input('details')) : null,
        ]);
    }
}
