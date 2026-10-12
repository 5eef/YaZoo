<?php

namespace App\Http\Requests\ServiceListing;

use App\Http\Requests\Concerns\PreservesPartialInput;

class UpdateServiceListingRequest extends StoreServiceListingRequest
{
    use PreservesPartialInput;

    public function rules(): array
    {
        return $this->partialRules(parent::rules());
    }
}
