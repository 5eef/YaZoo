<?php

namespace App\Services;

use App\Models\Story;
use App\Models\User;
use App\Repositories\StoryRepository;
use App\Support\MediaStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;
use Illuminate\Support\Collection;

class StoryService
{
    protected const MAX_STORIES_PER_GROUP = 12;

    public function __construct(
        protected StoryRepository $stories,
    ) {}

    /**
     * @return array{groups: Collection<int, array<string, mixed>>, meta: array<string, mixed>}
     */
    public function activeGroups(User $viewer, int $perPage): array
    {
        $paginator = $this->stories->activeUserGroups($viewer, $perPage);
        $userIds = collect($paginator->items())
            ->pluck('user_id')
            ->map(fn ($userId) => (int) $userId)
            ->values()
            ->all();
        $storyLimit = max(count($userIds), 1) * self::MAX_STORIES_PER_GROUP;
        $storiesByUser = $this->stories
            ->activeStoriesForUsers($userIds, (int) $viewer->id, $storyLimit)
            ->groupBy('user_id');

        $groups = collect($userIds)
            ->map(function (int $userId) use ($storiesByUser, $viewer): ?array {
                $orderedStories = ($storiesByUser->get($userId) ?? collect())
                    ->sortBy('created_at')
                    ->values();

                if ($orderedStories->isEmpty()) {
                    return null;
                }

                $isOwn = $orderedStories->first()?->user?->is($viewer) ?? false;
                $hasUnviewed = ! $isOwn && $orderedStories->contains(
                    fn (Story $story): bool => ! $story->views->contains('user_id', $viewer->id),
                );

                return [
                    'id' => 'user-'.$orderedStories->first()->user_id,
                    'user' => $orderedStories->first()->user,
                    'is_own' => $isOwn,
                    'has_unviewed' => $hasUnviewed,
                    'last_story_at' => $orderedStories->last()?->created_at,
                    'stories' => $orderedStories,
                ];
            })
            ->filter()
            ->sort($this->storyGroupSorter())
            ->values();

        return [
            'groups' => $groups,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'last_page' => $paginator->lastPage(),
                'total_groups' => $paginator->total(),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function create(User $user, array $validated, UploadedFile $mediaFile): Story
    {
        $mediaPath = MediaStorage::storeUploadedFile($mediaFile, 'feed/stories');

        try {
            $story = DB::transaction(fn (): Story => $user->stories()->create([
                'content' => $validated['content'] ?? null,
                'location' => $validated['location'] ?? null,
                'media_path' => $mediaPath,
                'media_kind' => MediaStorage::detectMediaKind($mediaFile),
                'expires_at' => now()->addDay(),
            ]));
        } catch (Throwable $exception) {
            MediaStorage::deleteStoredFiles([$mediaPath]);

            throw $exception;
        }

        return $this->stories->loadStoryForResponse($story);
    }

    public function markAsViewed(User $viewer, Story $story): Story
    {
        if (! $viewer->is($story->user)) {
            $story->views()->firstOrCreate(
                ['user_id' => $viewer->id],
                ['viewed_at' => now()],
            );
        }

        return $this->stories->loadStoryForResponse($story);
    }

    public function delete(Story $story): void
    {
        $mediaPath = $story->media_path;
        DB::transaction(fn () => $story->delete());
        MediaStorage::deleteStoredFiles([$mediaPath]);
    }

    protected function storyGroupSorter(): callable
    {
        return function (array $left, array $right): int {
            if ($left['is_own'] !== $right['is_own']) {
                return $left['is_own'] ? -1 : 1;
            }

            if ($left['has_unviewed'] !== $right['has_unviewed']) {
                return $left['has_unviewed'] ? -1 : 1;
            }

            return $right['last_story_at'] <=> $left['last_story_at'];
        };
    }
}
