<?php

namespace App\Http\Requests\Community;

use App\Http\Requests\Concerns\PreservesPartialInput;
use App\Models\Community;

class UpdateCommunityRequest extends StoreCommunityRequest
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
        /** @var Community|null $community */
        $community = $this->route('community');

        return $community !== null && ($this->user()?->can('update', $community) ?? false);
    }
}
