<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

class SafeMediaUpload implements ValidationRule
{
    /** @var array<string, list<string>> */
    private const TYPES = [
        'jpg' => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'png' => ['image/png'],
        'webp' => ['image/webp'],
        'gif' => ['image/gif'],
        'mp4' => ['video/mp4'],
        'webm' => ['video/webm', 'audio/webm'],
        'mov' => ['video/quicktime'],
    ];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile || ! $value->isValid()) {
            $fail(__('messages.uploads.invalid_media'));

            return;
        }

        $extension = strtolower($value->getClientOriginalExtension());
        $mime = strtolower((string) $value->getMimeType());
        $allowedMimes = self::TYPES[$extension] ?? [];

        if (! in_array($mime, $allowedMimes, true)) {
            $fail(__('messages.uploads.invalid_media'));

            return;
        }

        if (str_starts_with($mime, 'image/') && @getimagesize($value->getRealPath()) === false) {
            $fail(__('messages.uploads.invalid_media'));
        }
    }
}
