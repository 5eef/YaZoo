<?php

namespace App\Http\Requests\Concerns;

trait PreservesPartialInput
{
    protected function prepareForValidation(): void
    {
        $provided = $this->all();
        parent::prepareForValidation();
        $normalized = array_intersect_key($this->input(), $provided);
        // Keep explicit null distinct from creation defaults and empty strings.
        foreach ($provided as $key => $value) {
            if ($value === null || is_bool($value)) {
                $normalized[$key] = $value;
            }
        }
        if (array_key_exists('contact_visibility', $provided)) {
            $normalized['whatsapp_enabled'] = $provided['contact_visibility'] === 'whatsapp';
        }
        $this->replace($normalized);
    }

    protected function partialRules(array $rules): array
    {
        foreach ($rules as &$fieldRules) {
            if (in_array('required', $fieldRules, true)) {
                array_unshift($fieldRules, 'sometimes');
            }
        }

        return $rules;
    }
}
