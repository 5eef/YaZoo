<?php

namespace App\Http\Requests\Veterinarian;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'availability_slot_id' => ['required', 'integer', 'exists:veterinarian_availability_slots,id'],
            'animal_type' => ['required', 'string', 'max:80'],
            'reason' => ['required', 'string', 'max:500'],
        ];
    }
}
