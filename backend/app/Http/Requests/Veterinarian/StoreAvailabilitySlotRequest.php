<?php

namespace App\Http\Requests\Veterinarian;

use Illuminate\Foundation\Http\FormRequest;

class StoreAvailabilitySlotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'starts_at' => ['required', 'date', 'after:now'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
        ];
    }
}
