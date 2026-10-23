<?php

namespace App\Http\Requests\Reservation;

use App\Models\Reservation;
use App\Support\RequestInput;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReservationRequest extends FormRequest
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
            'category' => ['nullable', Rule::in(['animal', 'product', 'pet_sitting', 'training'])],
            'reservable_id' => ['nullable', 'integer', 'min:1'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:99'],
            'note' => ['nullable', 'string', 'max:1500'],
            'message' => ['nullable', 'string', 'max:1500'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
            'scheduled_at' => ['nullable', 'date'],
            'scheduled_end_at' => ['nullable', 'date', 'after_or_equal:scheduled_at'],
            'payment_method' => ['nullable', Rule::in(Reservation::PAYMENT_METHODS)],
            'delivery_method' => ['nullable', Rule::in(Reservation::DELIVERY_METHODS)],
            'delivery_contact_name' => ['nullable', 'string', 'max:255'],
            'delivery_phone' => ['nullable', 'string', 'max:50'],
            'delivery_city' => ['required_if:delivery_method,delivery', 'nullable', 'string', 'max:255'],
            'delivery_address' => ['required_if:delivery_method,delivery', 'nullable', 'string', 'max:1000'],
            'delivery_notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $note = RequestInput::trim($this->input('note'));

        $this->merge([
            'note' => $note === '' ? null : $note,
            'message' => RequestInput::trim($this->input('message')),
            'contact_phone' => RequestInput::trim($this->input('contact_phone')),
            'payment_method' => RequestInput::trim($this->input('payment_method') ?: 'cash_on_pickup'),
            'delivery_method' => RequestInput::trim($this->input('delivery_method') ?: 'pickup'),
            'delivery_contact_name' => RequestInput::trim($this->input('delivery_contact_name')),
            'delivery_phone' => RequestInput::trim($this->input('delivery_phone')),
            'delivery_city' => RequestInput::trim($this->input('delivery_city')),
            'delivery_address' => RequestInput::trim($this->input('delivery_address')),
            'delivery_notes' => RequestInput::trim($this->input('delivery_notes')),
        ]);
    }
}
