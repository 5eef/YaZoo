<?php

namespace App\Http\Requests\Marketplace;

use App\Http\Requests\Concerns\PreservesPartialInput;

class UpdateVeterinarianRequest extends StoreVeterinarianRequest
{
    use PreservesPartialInput;

    public function rules(): array
    {
        return $this->partialRules(parent::rules());
    }
}
