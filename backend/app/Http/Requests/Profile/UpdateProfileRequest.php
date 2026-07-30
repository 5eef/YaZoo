<?php

namespace App\Http\Requests\Profile;

use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $routeUser = $this->routeUser();

        return $routeUser !== null && ($this->user()?->is($routeUser) ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $routeUser = $this->routeUser();

        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => [
                'sometimes',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($routeUser?->id),
            ],
            'phone' => [
                'nullable',
                'string',
                'max:30',
                Rule::unique('users', 'phone')->ignore($routeUser?->id),
            ],
            'country' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'preferred_locale' => ['nullable', 'string', Rule::in(User::SUPPORTED_LOCALES)],
            'avatar' => ['nullable', 'string', 'max:2048'],
            'cover_photo' => ['nullable', 'string', 'max:2048'],
            'avatar_file' => ['nullable', 'file', 'image', 'max:10240'],
            'cover_photo_file' => ['nullable', 'file', 'image', 'max:12288'],
            'remove_avatar' => ['nullable', 'boolean'],
            'remove_cover_photo' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $fields = [
            'name',
            'email',
            'phone',
            'country',
            'city',
            'bio',
            'preferred_locale',
            'avatar',
            'cover_photo',
        ];

        $normalized = [];

        foreach ($fields as $field) {
            if (! $this->exists($field)) {
                continue;
            }

            $value = $this->input($field);
            $normalized[$field] = is_string($value) ? trim($value) : $value;
        }

        if (array_key_exists('phone', $normalized)) {
            $normalized['phone'] = PhoneNumber::normalize($normalized['phone']);
        }

        $this->merge($normalized);
    }

    private function routeUser(): ?User
    {
        $routeUser = $this->route('user');

        if ($routeUser instanceof User) {
            return $routeUser;
        }

        return User::query()->whereKey($routeUser)->first();
    }
}
