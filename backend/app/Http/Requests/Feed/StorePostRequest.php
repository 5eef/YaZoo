<?php

namespace App\Http\Requests\Feed;

use App\Models\Post;
use App\Rules\SafeMediaUpload;
use App\Support\RequestInput;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePostRequest extends FormRequest
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
            'content' => ['nullable', 'string', 'max:5000'],
            'community_id' => ['nullable', 'integer', 'exists:communities,id'],
            'location' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:50'],
            'media_file' => ['nullable', 'file', new SafeMediaUpload, 'max:20480'],
            'visibility' => ['nullable', 'string', Rule::in(Post::VISIBILITIES)],
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $tags = $this->input('tags', []);
        if (is_array($tags)) {
            $tags = collect($tags)
                ->filter(fn ($tag) => ! is_string($tag) || trim($tag) !== '')
                ->map(fn ($tag) => is_string($tag) ? trim($tag) : $tag)
                ->values()
                ->all();
        }

        $this->merge([
            'content' => RequestInput::trim($this->input('content')),
            'community_id' => $this->input('community_id') ?: null,
            'location' => RequestInput::trim($this->input('location')),
            'tags' => $tags,
            'visibility' => $this->input('visibility') ?: Post::VISIBILITY_PUBLIC,
        ]);
    }

    /**
     * Configure post-specific validation after basic rules.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $hasContent = RequestInput::trim($this->input('content')) !== '';
            $hasMedia = $this->hasFile('media_file');

            if (! $hasContent && ! $hasMedia) {
                $validator->errors()->add(
                    'content',
                    'Le post doit contenir du texte ou un media image/video.',
                );
            }
        });
    }
}
