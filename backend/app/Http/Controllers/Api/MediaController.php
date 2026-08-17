<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MediaAsset;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class MediaController extends Controller
{
    /**
     * Stream a media file stored in MongoDB GridFS.
     */
    public function show(string $fileId): StreamedResponse
    {
        $asset = $this->resolveAsset($fileId, MediaAsset::VISIBILITY_PUBLIC);

        return $this->stream($asset, $fileId);
    }

    /**
     * Stream private media only to its owner or an administrator.
     */
    public function showPrivate(Request $request, string $fileId): StreamedResponse
    {
        $asset = $this->resolveAsset($fileId, MediaAsset::VISIBILITY_PRIVATE);
        abort_unless(
            $request->user()?->is_admin || (int) $request->user()?->id === (int) $asset->owner_id,
            Response::HTTP_NOT_FOUND,
        );

        return $this->stream($asset, $fileId);
    }

    private function resolveAsset(string $fileId, string $visibility): MediaAsset
    {
        $path = 'mongodb:'.$fileId;
        $asset = MediaAsset::query()
            ->where('disk', 'mongodb')
            ->where('path_hash', hash('sha256', $path))
            ->where('path', $path)
            ->where('visibility', $visibility)
            ->whereIn('state', [MediaAsset::STATE_ACTIVE, MediaAsset::STATE_CLEAN])
            ->first();

        abort_if($asset === null, Response::HTTP_NOT_FOUND);

        return $asset;
    }

    private function stream(MediaAsset $asset, string $fileId): StreamedResponse
    {
        try {
            $file = MediaStorage::openMongoDownload($fileId);
        } catch (Throwable) {
            abort(Response::HTTP_NOT_FOUND);
        }

        $filename = basename(str_replace('\\', '/', (string) ($asset->original_name ?: $file['filename'])));
        $filename = $filename !== '' ? $filename : $fileId;
        $fallback = preg_replace('/[^A-Za-z0-9._-]/', '_', $filename) ?: 'media-'.$fileId;

        return response()->stream(
            function () use ($file): void {
                stream_copy_to_stream($file['stream'], fopen('php://output', 'wb'));
                fclose($file['stream']);
            },
            Response::HTTP_OK,
            array_filter([
                'Content-Type' => $file['mime_type'],
                'Content-Length' => $file['size'],
                'Content-Disposition' => HeaderUtils::makeDisposition(
                    HeaderUtils::DISPOSITION_INLINE,
                    $filename,
                    $fallback,
                ),
                'X-Content-Type-Options' => 'nosniff',
            ]),
        );
    }
}
