<?php

namespace App\Http\Requests\Marketplace;

use App\Http\Requests\Concerns\PreservesPartialInput;
use App\Models\Animal;
use Illuminate\Validation\Rule;

class UpdateAnimalRequest extends StoreAnimalRequest
{
    use PreservesPartialInput;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var Animal|null $animal */
        $animal = $this->route('animal');

        return $animal !== null && ($this->user()?->can('update', $animal) ?? false);
    }

    public function rules(): array
    {
        $rules = $this->partialRules(parent::rules());
        $rules['accepts_animal_rules'] = $this->has('accepts_animal_rules')
            ? ['accepted']
            : ['sometimes'];
        $rules['category'] = ['sometimes', 'required', Rule::in(Animal::CATEGORIES)];

        return $rules;
    }
}
