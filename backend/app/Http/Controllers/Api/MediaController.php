<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Community;
use App\Models\MediaAsset;
use App\Models\Post;
use App\Models\Story;
use App\Support\ByteRange;
use App\Support\ContentVisibility;
use App\Support\MediaStorage;
use App\Support\StoredMediaResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class MediaController extends Controller
{
    public function showPost(Request $request, Post $post): BinaryFileResponse|StreamedResponse
    {
        abort_unless(ContentVisibility::canViewPost($request->user(), $post), Response::HTTP_NOT_FOUND);
        $path = $post->media_path ?: $post->image_path;
        abort_unless(is_string($path) && $path !== '' && ! str_contains($path, '..') && ! str_starts_with($path, '/') && ! preg_match('#^https?://#i', $path), Response::HTTP_NOT_FOUND);
        $asset = MediaAsset::query()->where('attachable_type', $post->getMorphClass())->where('attachable_id', $post->id)->where('path', $path)->first();
        abort_if($asset && ! in_array($asset->state, [MediaAsset::STATE_ACTIVE, MediaAsset::STATE_CLEAN], true), Response::HTTP_NOT_FOUND);
        if ($asset?->disk === 'r2') {
            return StoredMediaResponse::make('r2', $path, $asset->mime_type, $asset->original_name ?: basename($path));
        }
        if (MediaStorage::isMongoReference($path)) {
            abort_unless($asset, Response::HTTP_NOT_FOUND);

            $response = $this->stream($asset, MediaStorage::extractMongoFileId($path));
            $response->headers->set('Cache-Control', 'private, no-store');

            return $response;
        }
        abort_if($asset && ! in_array($asset->disk, ['private', (string) config('media.filesystem_disk', 'public')], true), Response::HTTP_NOT_FOUND);
        $disk = Storage::disk($asset?->disk ?? (string) config('media.filesystem_disk', 'public'));
        abort_unless($disk->exists($path), Response::HTTP_NOT_FOUND);

        return response()->file($disk->path($path), [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => 'inline',
        ])->setPrivate();
    }

    /**
     * Stream a media file stored in MongoDB GridFS.
     */
    public function show(string $fileId): StreamedResponse
    {
        $asset = $this->resolveAsset($fileId, MediaAsset::VISIBILITY_PUBLIC);
        abort_if($asset->attachable_type === (new Post)->getMorphClass(), Response::HTTP_NOT_FOUND);
        if ($asset->disk === 'r2' && $asset->attachable_type) {
            $subject = $asset->attachable;
            abort_unless($subject, 404);
            $viewer = request()->user('sanctum');
            if (method_exists($subject, 'isPubliclyVisible') && ! $subject->isPubliclyVisible()) {
                abort_unless($viewer && ($viewer->is_admin || (int) $viewer->id === (int) $asset->owner_id), 404);
            }
            if ($subject instanceof Story) {
                abort_if($subject->expires_at->isPast(), 404);
            }
            if ($subject instanceof Community && $subject->is_private) {
                abort_unless($viewer && Community::query()->visibleTo($viewer)->whereKey($subject->id)->exists(), 404);
            }
        }

        return $asset->disk === 'r2'
            ? StoredMediaResponse::make('r2', $asset->path, $asset->mime_type, $asset->original_name ?: basename($asset->path))
            : $this->stream($asset, $fileId);
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

        return $asset->disk === 'r2'
            ? StoredMediaResponse::make('r2', $asset->path, $asset->mime_type, $asset->original_name ?: basename($asset->path))
            : $this->stream($asset, $fileId);
    }

    private function resolveAsset(string $fileId, string $visibility): MediaAsset
    {
        if (Str::isUuid($fileId)) {
            $asset = MediaAsset::query()->whereKey($fileId)->where('disk', 'r2')
                ->where('visibility', $visibility)
                ->whereIn('state', [MediaAsset::STATE_ACTIVE, MediaAsset::STATE_CLEAN])->first();
            abort_if($asset === null, 404);

            // Documents have their own authorization/MFA protected download route.
            abort_if($asset->kind === 'document', 404);

            return $asset;
        }
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

        $size = $file['size'];
        $start = 0;
        $length = $size;
        $status = Response::HTTP_OK;
        $rangeHeaders = [];
        $head = request()->isMethod('HEAD');
        if (! $head && request()->hasHeader('Range') && is_int($size)) {
            try {
                [$start, $end] = ByteRange::parse((string) request()->header('Range'), $size);
                if (fseek($file['stream'], $start) !== 0) {
                    throw new \InvalidArgumentException('Unseekable media.');
                }
                $length = $end - $start + 1;
                $status = Response::HTTP_PARTIAL_CONTENT;
                $rangeHeaders['Content-Range'] = "bytes {$start}-{$end}/{$size}";
            } catch (\InvalidArgumentException) {
                fclose($file['stream']);
                abort(Response::HTTP_REQUESTED_RANGE_NOT_SATISFIABLE, '', ['Content-Range' => "bytes */{$size}"]);
            }
        }
        if ($head) {
            fclose($file['stream']);
        }

        return response()->stream(
            function () use ($file, $head, $length): void {
                if ($head) {
                    return;
                }
                $output = fopen('php://output', 'wb');
                try {
                    stream_copy_to_stream($file['stream'], $output, $length ?? -1);
                } finally {
                    fclose($file['stream']);
                    fclose($output);
                }
            },
            $status,
            array_filter([
                ...$rangeHeaders,
                'Content-Type' => $file['mime_type'],
                'Content-Length' => $length,
                'Accept-Ranges' => 'bytes',
                'Cache-Control' => $asset->visibility === MediaAsset::VISIBILITY_PRIVATE ? 'private, no-store' : 'public, max-age=300',
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
