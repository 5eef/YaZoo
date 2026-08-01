<?php

namespace Tests\Feature\Marketplace;

use App\Models\Animal;
use App\Models\Favorite;
use App\Models\Message;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProfessionalVerification;
use App\Models\Reservation;
use App\Models\ReservationReview;
use App\Models\ServiceListing;
use App\Models\User;
use App\Models\Veterinarian;
use App\Models\VeterinarianAppointment;
use App\Models\VeterinarianAppointmentReview;
use App\Models\VeterinarianAvailabilitySlot;
use App\Services\MarketplacePublishingResolver;
use Database\Seeders\MarketplaceTestSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class MarketplaceDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    private string $imagesPath;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.url' => 'http://localhost']);
        Storage::fake('public');
        Storage::fake('private');
        $this->imagesPath = storage_path('framework/testing/marketplace-demo-'.Str::uuid());
        File::ensureDirectoryExists($this->imagesPath);
        $this->writeImages();
    }

    protected function tearDown(): void
    {
        if (isset($this->imagesPath) && str_starts_with($this->imagesPath, storage_path('framework/testing/marketplace-demo-'))) {
            File::deleteDirectory($this->imagesPath);
        }

        parent::tearDown();
    }

    public function test_command_refuses_production_environment(): void
    {
        app()['env'] = 'production';
        config(['app.url' => 'https://yazoo-api.azurewebsites.net']);

        $exit = Artisan::call('yazoo:seed-marketplace-demo', ['--images' => $this->imagesPath]);

        $this->assertSame(1, $exit);
        $this->assertDatabaseCount('users', 0);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_missing_image_stops_before_any_write(): void
    {
        File::delete($this->imagesPath.DIRECTORY_SEPARATOR.'vétérinaire3.png');

        $exit = Artisan::call('yazoo:seed-marketplace-demo', ['--images' => $this->imagesPath]);

        $this->assertSame(1, $exit);
        $this->assertDatabaseCount('users', 0);
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertSame([], Storage::disk('private')->allFiles());
    }

    public function test_it_creates_the_complete_demo_and_is_idempotent(): void
    {
        $this->assertSame(0, Artisan::call('yazoo:seed-marketplace-demo', ['--images' => $this->imagesPath]));

        $emails = $this->demoEmails();
        $users = User::query()->whereIn('email', array_keys($emails))->get()->keyBy('email');
        $this->assertCount(14, $users);
        $this->assertSame(14, $users->pluck('email')->unique()->count());
        $this->assertSame(14, $users->pluck('phone')->unique()->count());
        $this->assertSame(14, count(array_unique(array_values($emails))));

        foreach ($emails as $email => $password) {
            $this->assertTrue(Hash::check($password, $users[$email]->password), "Mot de passe invalide pour {$email}");
            $this->assertNotSame($password, $users[$email]->password);
        }

        $admin = $users['bough.youssef@gmail.com'];
        $this->assertTrue($admin->is_admin);
        $this->assertTrue(Hash::check('sefrou123456', $admin->password));
        $this->assertNull($admin->admin_mfa_secret);

        $verifications = ProfessionalVerification::query()
            ->with(['reviewer', 'user.latestProfessionalVerification.reviewer'])
            ->get();
        $this->assertCount(12, $verifications);
        $this->assertTrue($verifications->every(fn (ProfessionalVerification $verification): bool => $verification->status === 'approved'
            && $verification->pending_key === null
            && $verification->reviewed_by === $admin->id
            && $verification->reviewed_at !== null
            && $verification->wasReviewedByAdmin()
            && Storage::disk('private')->exists($verification->document_path)
        ));

        $veterinarianVerifications = $verifications->where('business_type', 'veterinarian');
        $this->assertCount(3, $veterinarianVerifications);
        $this->assertTrue($veterinarianVerifications->every(fn (ProfessionalVerification $verification): bool => $verification->document_type === 'veterinarian_license'
            && filled($verification->professional_license_number)
            && $verification->hasValidVeterinarianCredentials()
            && $verification->user->hasApprovedVeterinarianVerification()
        ));

        $animals = Animal::query()->whereNotNull('photo_url')->get();
        $products = Product::query()->whereNotNull('image_url')->get();
        $services = ServiceListing::query()->get();
        $veterinarians = Veterinarian::query()->get();
        $this->assertCount(2, $animals);
        $this->assertCount(6, $products);
        $this->assertCount(10, $services);
        $this->assertCount(3, $veterinarians);
        $this->assertTrue($animals->every->isPubliclyVisible());
        $this->assertTrue($products->every->isPubliclyVisible());
        $this->assertTrue($services->every->isPubliclyVisible());
        $this->assertTrue($veterinarians->every->isPubliclyVisible());

        $primaryPaths = collect()
            ->merge($animals->pluck('photo_url'))
            ->merge($products->pluck('image_url'))
            ->merge($services->map(fn (ServiceListing $service): string => $service->media[0]))
            ->merge($veterinarians->pluck('image_path'));
        $this->assertCount(21, $primaryPaths);
        $this->assertCount(21, $primaryPaths->unique());
        $this->assertEqualsCanonicalizing(array_keys(MarketplaceTestSeeder::IMAGE_PLAN), $primaryPaths->map('basename')->all());
        $this->assertTrue($primaryPaths->every(fn (string $path): bool => Storage::disk('public')->exists($path)));

        $pendingProduct = Product::query()->where('name', '[TEST MODÉRATION] Produit en attente')->firstOrFail();
        $pendingAnimal = Animal::query()->where('name', '[TEST MODÉRATION] Animal en attente')->firstOrFail();
        $this->assertFalse($pendingProduct->isPubliclyVisible());
        $this->assertFalse($pendingAnimal->isPubliclyVisible());
        $this->assertNull($pendingProduct->moderated_by);
        $this->assertNull($pendingAnimal->moderated_by);

        $this->assertDatabaseCount('favorites', 4);
        $this->assertDatabaseCount('reservations', 3);
        $this->assertSame(['approved' => 1, 'completed' => 1, 'pending' => 1], Reservation::query()->selectRaw('reservation_status, count(*) aggregate')->groupBy('reservation_status')->pluck('aggregate', 'reservation_status')->map(fn ($count) => (int) $count)->all());
        $this->assertFalse(Reservation::query()->get()->contains(fn (Reservation $reservation): bool => $reservation->buyer_id === $reservation->seller_id));
        $this->assertDatabaseCount('payments', 2);
        $this->assertSame(['cash_on_pickup', 'manual_bank_transfer'], Payment::query()->orderBy('provider')->pluck('provider')->all());
        $this->assertSame(['paid', 'pending'], Payment::query()->orderBy('status')->pluck('status')->all());
        $this->assertTrue(Payment::query()->get()->every(fn (Payment $payment): bool => str_starts_with($payment->internal_reference, 'YAZ-DEMO-LOCAL')));

        $review = ReservationReview::query()->firstOrFail();
        $this->assertSame('completed', $review->reservation->reservation_status);
        $this->assertSame($users['client.fes@yazoo.test']->id, $review->reviewer_id);
        $this->assertSame(ServiceListing::class, $review->reviewable_type);
        $this->assertSame('published', $review->status);
        $this->assertDatabaseCount('conversations', 1);
        $this->assertDatabaseCount('messages', 2);
        $this->assertDatabaseCount('veterinarian_availability_slots', 3);
        $this->assertTrue(VeterinarianAvailabilitySlot::query()->get()->every(fn ($slot): bool => $slot->starts_at->isFuture()));
        $appointmentCounts = VeterinarianAppointment::query()
            ->selectRaw('status, count(*) aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->map(fn ($count) => (int) $count)
            ->all();
        ksort($appointmentCounts);
        $this->assertSame(['completed' => 1, 'confirmed' => 1, 'pending' => 1], $appointmentCounts);
        $this->assertDatabaseCount('veterinarian_appointment_reviews', 1);
        $this->assertSame('completed', VeterinarianAppointmentReview::query()->firstOrFail()->appointment->status);

        $resolver = app(MarketplacePublishingResolver::class);
        $destinations = [
            'breeder' => 'animals',
            'pet_shop' => 'products',
            'service_provider' => 'services',
            'trainer' => 'services',
            'veterinarian' => 'veterinarians',
        ];
        foreach ($verifications as $verification) {
            $capability = $resolver->resolve($verification->user);
            $this->assertTrue($capability['canPublish']);
            $this->assertSame($destinations[$verification->business_type], $capability['destination']);
            $this->assertSame($verification->business_type === 'trainer' ? 'training' : null, $capability['serviceType']);
        }

        $countsBefore = $this->demoCounts();
        $publicFilesBefore = Storage::disk('public')->allFiles();
        $privateFilesBefore = Storage::disk('private')->allFiles();

        $this->assertSame(0, Artisan::call('yazoo:seed-marketplace-demo', ['--images' => $this->imagesPath]));

        $this->assertSame($countsBefore, $this->demoCounts());
        $this->assertSame($publicFilesBefore, Storage::disk('public')->allFiles());
        $this->assertSame($privateFilesBefore, Storage::disk('private')->allFiles());
    }

    public function test_database_and_storage_are_rolled_back_on_failure(): void
    {
        $exit = Artisan::call('yazoo:seed-marketplace-demo', [
            '--images' => $this->imagesPath,
            '--fail-after' => 'users',
        ]);

        $this->assertSame(1, $exit);
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('professional_verifications', 0);
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertSame([], Storage::disk('private')->allFiles());
    }

    private function writeImages(): void
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', true);
        $this->assertIsString($png);

        foreach (array_keys(MarketplaceTestSeeder::IMAGE_PLAN) as $file) {
            File::put($this->imagesPath.DIRECTORY_SEPARATOR.$file, $png);
        }
    }

    /** @return array<string, string> */
    private function demoEmails(): array
    {
        return [
            'bough.youssef@gmail.com' => 'sefrou123456',
            'client.fes@yazoo.test' => 'fes123456',
            'eleveur.poules.meknes@yazoo.test' => 'meknes123456',
            'eleveuse.bovins.benimellal@yazoo.test' => 'benimellal123456',
            'oiseaux.sale@yazoo.test' => 'sale123456',
            'chats.casablanca@yazoo.test' => 'casablanca123456',
            'chiens.rabat@yazoo.test' => 'rabat123456',
            'garde.tetouan@yazoo.test' => 'tetouan123456',
            'dresseur.chiens.marrakech@yazoo.test' => 'marrakech123456',
            'dresseur.chevaux.eljadida@yazoo.test' => 'eljadida123456',
            'dresseur.faune.kenitra@yazoo.test' => 'kenitra123456',
            'veterinaire.agadir@yazoo.test' => 'agadir123456',
            'veterinaire.oujda@yazoo.test' => 'oujda123456',
            'veterinaire.tanger@yazoo.test' => 'tanger123456',
        ];
    }

    /** @return array<string, int> */
    private function demoCounts(): array
    {
        return [
            'users' => User::query()->count(),
            'professional_verifications' => ProfessionalVerification::query()->count(),
            'animals' => Animal::query()->count(),
            'products' => Product::query()->count(),
            'services' => ServiceListing::query()->count(),
            'veterinarians' => Veterinarian::query()->count(),
            'favorites' => Favorite::query()->count(),
            'reservations' => Reservation::query()->count(),
            'payments' => Payment::query()->count(),
            'reviews' => ReservationReview::query()->count(),
            'messages' => Message::query()->count(),
            'slots' => VeterinarianAvailabilitySlot::query()->count(),
            'appointments' => VeterinarianAppointment::query()->count(),
            'appointment_reviews' => VeterinarianAppointmentReview::query()->count(),
        ];
    }
}
