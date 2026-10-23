<?php

namespace App\Http\Requests\Feed;

use App\Rules\SafeMediaUpload;
use App\Support\RequestInput;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreStoryRequest extends FormRequest
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
            'content' => ['nullable', 'string', 'max:1200'],
            'location' => ['nullable', 'string', 'max:255'],
            'media_file' => ['required', 'file', new SafeMediaUpload, 'max:20480'],
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'content' => RequestInput::trim($this->input('content')),
            'location' => RequestInput::trim($this->input('location')),
        ]);
    }
}
