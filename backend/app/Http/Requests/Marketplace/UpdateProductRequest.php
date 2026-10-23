<?php

namespace App\Http\Requests\Marketplace;

use App\Http\Requests\Concerns\PreservesPartialInput;
use App\Models\Product;

class UpdateProductRequest extends StoreProductRequest
{
    use PreservesPartialInput;

    public function rules(): array
    {
        return $this->partialRules(parent::rules());
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var Product|null $product */
        $product = $this->route('product');

        return $product !== null && ($this->user()?->can('update', $product) ?? false);
    }
}
