<?php

namespace Database\Seeders;

use App\Models\Conversation;
use App\Models\Post;
use App\Models\ServiceListing;
use App\Models\User;
use App\Models\Veterinarian;
use App\Models\VeterinarianAvailabilitySlot;
use App\Support\ShowcaseBootstrapGuard;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/** Applied only by the guarded showcase bootstrap, never by production seeders. */
class AfwajShowcaseSeeder extends Seeder
{
    public const VIDEO_FILES = ['afwaj-reel-1.mp4', 'afwaj-reel-2.mp4'];

    public static function ensureMedia(): void
    {
        foreach (self::VIDEO_FILES as $file) {
            $contents = file_get_contents(database_path('seeders/assets/social/'.$file));
            if ($contents === false || strlen($contents) > 250000 || substr($contents, 4, 4) !== 'ftyp') {
                throw new RuntimeException('Media AFWAJ invalide: '.$file);
            }
            Storage::disk('public')->put('showcase/demo/'.$file, $contents);
        }
    }

    public function run(): void
    {
        if (! app()->runningUnitTests()) {
            app(ShowcaseBootstrapGuard::class)->assertAllowed((string) config('operations.showcase_bootstrap_confirmation'));
        }
        self::ensureMedia();
        $client = User::query()->where('email', 'client.fes@yazoo.test')->firstOrFail();
        $client->update(['name' => 'Client DEMO AFWAJ', 'bio' => 'Compte fictif pour le jury, sans accès administrateur.']);

        $cities = [
            ['Sefrou', 33.8305, -4.8353],
            ['Fès', 34.0331, -5.0003],
            ['Meknès', 33.8935, -5.5473],
        ];
        foreach (Veterinarian::query()->with('user')->orderBy('id')->get() as $index => $vet) {
            [$city, $latitude, $longitude] = $cities[$index];
            $vet->update([
                'name' => 'Vétérinaire DEMO '.$city,
                'clinic_name' => 'Cabinet fictif DEMO AFWAJ '.$city,
                'city' => $city,
                'address' => 'Adresse fictive de démonstration — '.$city,
                'description' => 'Profil fictif AFWAJ 2026. Consultation préventive, vaccination et suivi : aucun soin réel ni partenaire commercial.',
                'latitude' => $latitude,
                'longitude' => $longitude,
                'location_url' => null,
            ]);
            $vet->user->update(['name' => $vet->name, 'city' => $city, 'bio' => $vet->description]);
            // Free slots near the demo date, in addition to existing appointment examples.
            foreach ([1, 2, 3] as $day) {
                VeterinarianAvailabilitySlot::query()->create([
                    'veterinarian_id' => $vet->id,
                    'starts_at' => now()->addDays($day)->setTime(10, 0),
                    'ends_at' => now()->addDays($day)->setTime(10, 30),
                    'is_available' => true,
                ]);
            }
            $client->following()->syncWithoutDetaching([$vet->user_id]);
            $conversation = Conversation::query()->create([
                'participant_one_id' => min($client->id, $vet->user_id),
                'participant_two_id' => max($client->id, $vet->user_id),
            ]);
            $conversation->messages()->create(['user_id' => $client->id, 'body' => 'DEMO AFWAJ : comment préparer la consultation fictive de mon chat ?', 'read_at' => now()]);
            $conversation->messages()->create(['user_id' => $vet->user_id, 'body' => 'Échange fictif : choisissez un créneau disponible dans le profil. Aucun rendez-vous réel ne sera organisé.']);
        }

        // Keep the existing supported service categories and verified owners.
        foreach (ServiceListing::query()->orderBy('id')->get() as $index => $service) {
            $city = $cities[$index % 3][0];
            $service->update(['title' => 'DEMO AFWAJ — '.$service->title, 'city' => $city, 'address' => 'Adresse fictive — '.$city]);
        }
        foreach (User::query()->where('is_admin', false)->get() as $user) {
            if (! str_contains($user->name, 'DEMO')) {
                $user->update(['name' => 'DEMO — '.$user->name, 'bio' => 'Personnage fictif AFWAJ 2026. '.$user->bio]);
            }
        }
        foreach (Post::query()->get() as $post) {
            $post->update(['content' => '[DEMO AFWAJ — scène fictive] '.$post->content]);
        }
        $authors = Veterinarian::query()->with('user')->orderBy('id')->get();
        foreach (self::VIDEO_FILES as $index => $file) {
            $author = $authors[$index]->user;
            $post = $author->posts()->create([
                'content' => '[DEMO AFWAJ 2026] Animation synthétique du parcours de soins à '.$author->city.'. Aucun partenaire réel.',
                'media_path' => 'showcase/demo/'.$file,
                'media_kind' => 'video',
                'visibility' => 'public',
                'moderation_status' => 'active',
                'location' => $author->city,
                'tags' => ['demo', 'afwaj2026'],
            ]);
            $post->likes()->create(['user_id' => $client->id]);
            $post->comments()->create(['user_id' => $client->id, 'body' => 'Commentaire fictif pour illustrer les interactions YaZoo.']);
        }
        foreach (['image', 'video'] as $kind) {
            $authors[0]->user->stories()->create([
                'content' => 'DEMO AFWAJ — Story fictive '.$kind,
                'media_path' => $kind === 'image' ? 'marketplace/demo/cafe_chat.png' : 'showcase/demo/'.self::VIDEO_FILES[0],
                'media_kind' => $kind,
                'location' => 'Sefrou',
                // Fixed showcase expiry; regular user stories keep their normal lifetime.
                'expires_at' => '2027-01-01 00:00:00',
            ]);
        }
    }
}
