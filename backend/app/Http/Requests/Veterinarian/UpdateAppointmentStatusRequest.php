<?php

namespace App\Http\Requests\Veterinarian;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAppointmentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(['confirmed', 'rejected', 'cancelled', 'completed'])],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }
}
