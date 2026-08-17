<?php

namespace Database\Seeders;

use App\Models\Animal;
use App\Models\Conversation;
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
use App\Support\DatabaseTargetGuard;
use App\Support\ShowcaseBootstrapGuard;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class MarketplaceTestSeeder extends Seeder
{
    /** @var array<string, array{entity: string, listing: string, owner: string}> */
    public const IMAGE_PLAN = [
        'cafe_chat.png' => ['entity' => 'service', 'listing' => 'Garde de chat à domicile - journée', 'owner' => 'garde.tetouan@yazoo.test'],
        'cafe_chat2.png' => ['entity' => 'service', 'listing' => 'Visites et garde de chats - week-end', 'owner' => 'garde.tetouan@yazoo.test'],
        'cafe_chien1.png' => ['entity' => 'service', 'listing' => 'Garde familiale de chien', 'owner' => 'garde.tetouan@yazoo.test'],
        'cafe_chien2.png' => ['entity' => 'service', 'listing' => 'Promenade et garde de chiens', 'owner' => 'garde.tetouan@yazoo.test'],
        'dresser_cirque.png' => ['entity' => 'service', 'listing' => 'Démonstration locale encadrée avec grands félins', 'owner' => 'dresseur.faune.kenitra@yazoo.test'],
        "dresseur d'animaux sauvages.png" => ['entity' => 'service', 'listing' => "Accompagnement comportemental d'animaux exotiques", 'owner' => 'dresseur.faune.kenitra@yazoo.test'],
        'dresseur_cheval.png' => ['entity' => 'service', 'listing' => 'Dressage et éducation équine', 'owner' => 'dresseur.chevaux.eljadida@yazoo.test'],
        'dresseur_chien.png' => ['entity' => 'service', 'listing' => 'Travail canin encadré - obéissance et contrôle', 'owner' => 'dresseur.chiens.marrakech@yazoo.test'],
        'dresseur_chien2.png' => ['entity' => 'service', 'listing' => 'Éducation canine positive - marche au pied', 'owner' => 'dresseur.chiens.marrakech@yazoo.test'],
        'dresseur_egle.png' => ['entity' => 'service', 'listing' => "Fauconnerie et rappel d'oiseaux de proie", 'owner' => 'dresseur.faune.kenitra@yazoo.test'],
        'elveurs_poules.png' => ['entity' => 'animal', 'listing' => 'Lot de poules pondeuses Beldi', 'owner' => 'eleveur.poules.meknes@yazoo.test'],
        'elveurs_vaches.png' => ['entity' => 'animal', 'listing' => "Vache laitière issue d'un élevage suivi", 'owner' => 'eleveuse.bovins.benimellal@yazoo.test'],
        'food_bird.png' => ['entity' => 'product', 'listing' => 'Mélange de graines premium pour oiseaux', 'owner' => 'oiseaux.sale@yazoo.test'],
        'food_cat_produit1.png' => ['entity' => 'product', 'listing' => 'Pâtée au saumon pour chats adultes', 'owner' => 'chats.casablanca@yazoo.test'],
        'food_cat_produit2.png' => ['entity' => 'product', 'listing' => 'Coffret de repas complets pour chats', 'owner' => 'chats.casablanca@yazoo.test'],
        'food_dog_produit1.png' => ['entity' => 'product', 'listing' => 'Biscuits au chanvre pour chiens actifs', 'owner' => 'chiens.rabat@yazoo.test'],
        'food_dog_produit2.png' => ['entity' => 'product', 'listing' => 'Croquettes pour chiens actifs', 'owner' => 'chiens.rabat@yazoo.test'],
        'produit_oiseau_cage.png' => ['entity' => 'product', 'listing' => 'Cage équipée pour oiseaux', 'owner' => 'oiseaux.sale@yazoo.test'],
        'vétérinaire1.png' => ['entity' => 'veterinarian', 'listing' => 'Cabinet Vétérinaire Souss', 'owner' => 'veterinaire.agadir@yazoo.test'],
        'vétérinaire2.png' => ['entity' => 'veterinarian', 'listing' => 'Clinique Vétérinaire Oriental', 'owner' => 'veterinaire.oujda@yazoo.test'],
        'vétérinaire3.png' => ['entity' => 'veterinarian', 'listing' => 'Centre Vétérinaire Détroit', 'owner' => 'veterinaire.tanger@yazoo.test'],
    ];

    /** @var array<string, array{created: int, updated: int, unchanged: int}> */
    private array $stats = [];

    /** @var array<string, array{disk: string, path: string, contents: string|null}> */
    private array $storageBackup = [];

    /** @var array<string, array{file: string, exists: bool, bytes: int, dimensions: string, listing: string, path: string}> */
    private array $validatedImages = [];

    public function run(): void
    {
        throw new RuntimeException('Utilisez la commande yazoo:seed-marketplace-demo avec --images.');
    }

    /**
     * @return array{dryRun: bool, images: array<int, array<string, mixed>>, stats: array<string, array{created: int, updated: int, unchanged: int}>}
     */
    public function seedFrom(
        string $imagesPath,
        bool $dryRun = false,
        ?string $failAfter = null,
        ?string $showcaseConfirmation = null,
    ): array {
        $this->assertSafeEnvironment($showcaseConfirmation);

        return $this->seedValidated($imagesPath, $dryRun, $failAfter);
    }

    /**
     * Seed the guarded Azure DATABASE #2 target with the same marketplace data
     * as the local demonstration database, while rotating non-admin passwords.
     *
     * @return array{dryRun: bool, images: array<int, array<string, mixed>>, stats: array<string, array{created: int, updated: int, unchanged: int}>}
     */
    public function seedDatabase2(
        string $imagesPath,
        string $confirmation,
        string $accountPassword,
        string $releaseAdminEmail,
    ): array {
        $this->assertSafeDatabase2Target($confirmation);

        return $this->seedValidated(
            $imagesPath,
            false,
            null,
            $accountPassword,
            strtolower(trim($releaseAdminEmail)),
        );
    }

    /**
     * @return array{dryRun: bool, images: array<int, array<string, mixed>>, stats: array<string, array{created: int, updated: int, unchanged: int}>}
     */
    private function seedValidated(
        string $imagesPath,
        bool $dryRun,
        ?string $failAfter,
        ?string $accountPassword = null,
        ?string $releaseAdminEmail = null,
    ): array {
        $this->stats = [];
        $this->storageBackup = [];
        $this->validatedImages = $this->validateImages($imagesPath);
        $this->validatePdfTemplate();

        if ($dryRun) {
            return ['dryRun' => true, 'images' => array_values($this->validatedImages), 'stats' => []];
        }

        try {
            DB::transaction(function () use ($failAfter, $accountPassword, $releaseAdminEmail): void {
                $this->copyDemoFiles();
                $this->failAfter($failAfter, 'storage');

                $users = $this->seedUsers($accountPassword, $releaseAdminEmail);
                $this->failAfter($failAfter, 'users');

                $this->seedProfessionalVerifications($users);
                $this->failAfter($failAfter, 'professional_verifications');

                $listings = $this->seedListings($users);
                $this->failAfter($failAfter, 'listings');

                $this->seedBusinessScenarios($users, $listings);
                $this->failAfter($failAfter, 'business_scenarios');
            }, 1);
        } catch (Throwable $exception) {
            $this->restoreStorage();

            throw $exception;
        }

        $this->storageBackup = [];

        return ['dryRun' => false, 'images' => array_values($this->validatedImages), 'stats' => $this->stats];
    }

    private function assertSafeDatabase2Target(string $confirmation): void
    {
        if (! app()->environment(['production', 'testing'])) {
            throw new RuntimeException('Le bootstrap DATABASE #2 est reserve a la production et aux tests automatises.');
        }

        if (! (bool) config('operations.database2_test_data_bootstrap_enabled')) {
            throw new RuntimeException('YAZOO_DATABASE2_TEST_DATA_BOOTSTRAP_ENABLED doit etre true.');
        }

        $failures = app(DatabaseTargetGuard::class)->failures();
        if ($failures !== []) {
            throw new RuntimeException(implode(' ', $failures));
        }

        $expected = trim((string) config('operations.database2_test_data_bootstrap_confirmation'));
        if ($expected === '' || trim($confirmation) === '' || ! hash_equals($expected, trim($confirmation))) {
            throw new RuntimeException('La confirmation DATABASE #2 du jeu de test est invalide.');
        }
    }

    private function assertSafeEnvironment(?string $showcaseConfirmation): void
    {
        if ($showcaseConfirmation !== null) {
            app(ShowcaseBootstrapGuard::class)->assertAllowed($showcaseConfirmation);

            return;
        }

        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('Cette commande est strictement réservée aux environnements local ou testing.');
        }

        $appUrl = strtolower((string) config('app.url'));
        $host = strtolower((string) parse_url($appUrl, PHP_URL_HOST));

        if (! in_array($host, ['127.0.0.1', 'localhost'], true) || str_contains($appUrl, 'azure')) {
            throw new RuntimeException("L'URL applicative doit être strictement locale.");
        }

        $connection = (string) config('database.default');
        $driver = (string) config("database.connections.{$connection}.driver");
        $database = (string) config("database.connections.{$connection}.database");
        $dbHost = strtolower((string) config("database.connections.{$connection}.host"));

        if (app()->environment('testing') && $driver === 'sqlite') {
            return;
        }

        if (
            $driver !== 'mysql'
            || ! in_array($dbHost, ['127.0.0.1', 'localhost'], true)
            || $database !== 'yazoo_local'
            || str_contains(strtolower($database), 'azure')
            || str_contains(strtolower($database), 'prod')
        ) {
            throw new RuntimeException('La base doit être MySQL locale, sur localhost, et nommée exactement yazoo_local.');
        }
    }

    /** @return list<string> */
    public function demoEmails(): array
    {
        return array_column($this->accounts(), 'email');
    }

    /**
     * @return array<string, array{file: string, exists: bool, bytes: int, dimensions: string, listing: string, path: string}>
     */
    private function validateImages(string $imagesPath): array
    {
        $directory = realpath($imagesPath);

        if ($directory === false || ! is_dir($directory)) {
            throw new RuntimeException("Dossier d'images introuvable : {$imagesPath}");
        }

        $rows = [];

        foreach (self::IMAGE_PLAN as $file => $plan) {
            $path = $directory.DIRECTORY_SEPARATOR.$file;

            if (! is_file($path)) {
                throw new RuntimeException("Image obligatoire manquante : {$file}");
            }

            $bytes = filesize($path);
            $info = @getimagesize($path);

            if ($bytes === false || $bytes <= 0 || $info === false || ($info[2] ?? null) !== IMAGETYPE_PNG) {
                throw new RuntimeException("Fichier PNG vide, illisible ou invalide : {$file}");
            }

            $signature = file_get_contents($path, false, null, 0, 8);

            if ($signature !== "\x89PNG\r\n\x1a\n") {
                throw new RuntimeException("Signature PNG invalide : {$file}");
            }

            $rows[$file] = [
                'file' => $file,
                'exists' => true,
                'bytes' => (int) $bytes,
                'dimensions' => $info[0].'x'.$info[1],
                'listing' => $plan['listing'],
                'path' => $path,
            ];
        }

        return $rows;
    }

    private function validatePdfTemplate(): void
    {
        $path = database_path('seeders/assets/demo-professional-verification.pdf');

        if (! is_file($path) || filesize($path) === 0 || file_get_contents($path, false, null, 0, 5) !== '%PDF-') {
            throw new RuntimeException('Le modèle PDF de démonstration est absent ou invalide.');
        }
    }

    private function copyDemoFiles(): void
    {
        foreach ($this->validatedImages as $file => $image) {
            $contents = file_get_contents($image['path']);

            if ($contents === false) {
                throw new RuntimeException("Impossible de lire l'image {$file}.");
            }

            $this->syncStorageFile('public', $this->mediaPath($file), $contents, 'media_files');
        }

        $pdf = file_get_contents(database_path('seeders/assets/demo-professional-verification.pdf'));

        if ($pdf === false) {
            throw new RuntimeException('Impossible de lire le modèle PDF de démonstration.');
        }

        foreach ($this->professionalAccounts() as $account) {
            $this->syncStorageFile('private', $this->verificationDocumentPath($account['email']), $pdf, 'verification_documents');
        }
    }

    /** @return array<string, User> */
    private function seedUsers(?string $accountPassword = null, ?string $releaseAdminEmail = null): array
    {
        $users = [];

        foreach ($this->accounts() as $account) {
            $existing = User::query()->where('email', $account['email'])->first();
            $password = $accountPassword ?? $this->passwordForCity($account['city']);
            $preserveReleaseAdminPassword = $existing
                && $releaseAdminEmail !== null
                && strtolower((string) $existing->email) === $releaseAdminEmail
                && (bool) $existing->is_admin;

            $users[$account['email']] = $this->syncModel(User::class, ['email' => $account['email']], [
                'name' => $account['name'],
                'phone' => $account['phone'],
                'country' => 'Maroc',
                'city' => $account['city'],
                'bio' => $account['bio'],
                'preferred_locale' => 'fr',
                'email_verified_at' => $existing?->email_verified_at ?? now(),
                'phone_verified_at' => $existing?->phone_verified_at ?? now(),
                'is_admin' => $account['business_type'] === null && $account['email'] === 'bough.youssef@gmail.com',
                'is_suspended' => false,
                'suspended_at' => null,
                'suspended_reason' => null,
                'banned_at' => null,
                'banned_reason' => null,
                'google_id' => null,
                'google_avatar' => null,
                'password' => $preserveReleaseAdminPassword
                    ? $existing->password
                    : ($existing && Hash::check($password, (string) $existing->password)
                    ? $existing->password
                    : Hash::make($password)),
            ], 'users');
        }

        return $users;
    }

    /** @param array<string, User> $users */
    private function seedProfessionalVerifications(array $users): void
    {
        $templateSize = filesize(database_path('seeders/assets/demo-professional-verification.pdf')) ?: null;

        foreach ($this->professionalAccounts() as $account) {
            $user = $users[$account['email']];
            $slug = Str::slug(Str::before($account['email'], '@'));
            $isVeterinarian = $account['business_type'] === 'veterinarian';

            $this->syncModel(ProfessionalVerification::class, [
                'user_id' => $user->id,
                'business_type' => $account['business_type'],
            ], [
                'legal_name' => $account['name'].' - DEMO-NON-VALABLE',
                'ice' => 'DEMO-NON-VALABLE-'.strtoupper(substr(hash('sha256', $account['email']), 0, 12)),
                'onssa_authorization_number' => $account['business_type'] === 'breeder' ? 'DEMO-NON-VALABLE-ONSSA-'.$user->id : null,
                'professional_license_number' => $isVeterinarian ? 'DEMO-NON-VALABLE-VET-'.$user->id : null,
                'document_path' => $this->verificationDocumentPath($account['email']),
                'document_type' => $isVeterinarian ? 'veterinarian_license' : 'professional_card',
                'document_original_name' => 'DEMO-NON-VALABLE-'.$slug.'.pdf',
                'document_mime' => 'application/pdf',
                'document_size' => $templateSize,
                'document_expires_at' => today()->addYears(2),
                'status' => 'approved',
                'pending_key' => null,
                'verified_by' => $users['bough.youssef@gmail.com']->id,
                'verified_at' => now(),
                'admin_note' => 'Données de test locales YaZoo - document fictif DEMO-NON-VALABLE.',
                'review_reason' => null,
                'reviewed_by' => $users['bough.youssef@gmail.com']->id,
                'reviewed_at' => now(),
            ], 'professional_verifications', ['verified_at', 'reviewed_at']);
        }
    }

    /**
     * @param  array<string, User>  $users
     * @return array<string, Model>
     */
    private function seedListings(array $users): array
    {
        $admin = $users['bough.youssef@gmail.com'];
        $listings = [];

        $animalDefinitions = [
            ['file' => 'elveurs_poules.png', 'category' => 'bird', 'type' => 'Poules pondeuses', 'breed' => 'Beldi', 'age' => 1, 'sex' => 'female', 'price' => 850.00, 'visibility' => 'phone', 'origin' => 'Élevage local suivi à Meknès'],
            ['file' => 'elveurs_vaches.png', 'category' => 'other', 'type' => 'Bovin laitier', 'breed' => 'Croisée laitière', 'age' => 4, 'sex' => 'female', 'price' => 18500.00, 'visibility' => 'messages_only', 'origin' => 'Élevage bovin local suivi à Béni Mellal'],
        ];

        foreach ($animalDefinitions as $definition) {
            $plan = self::IMAGE_PLAN[$definition['file']];
            $owner = $users[$plan['owner']];
            $contact = $this->contact($owner, $definition['visibility']);
            $animal = $this->syncModel(Animal::class, ['user_id' => $owner->id, 'name' => $plan['listing']], [
                'category' => $definition['category'],
                'type' => $definition['type'],
                'breed' => $definition['breed'],
                'age' => $definition['age'],
                'sex' => $definition['sex'],
                'location' => $owner->city,
                ...$contact,
                'photo_url' => $this->mediaPath($definition['file']),
                'gallery_urls' => [$this->mediaPath($definition['file'])],
                'price' => $definition['price'],
                'is_for_adoption' => false,
                'listing_status' => 'available',
                'description' => "Annonce professionnelle locale de démonstration pour {$plan['listing']}. Suivi sanitaire et bien-être animal documentés ; données non contractuelles.",
                'accepts_animal_rules' => true,
                'seller_type' => 'professional',
                'origin' => $definition['origin'],
                'identification_number' => 'DEMO-NON-VALABLE-ANIMAL-'.strtoupper(substr(hash('sha256', $definition['file']), 0, 10)),
                'onssa_authorization_number' => 'DEMO-NON-VALABLE-ONSSA-'.$owner->id,
                'legal_status' => 'approved',
                'moderation_note' => 'Annonce canonique de test local approuvée.',
                'moderated_by' => $admin->id,
                'moderated_at' => now(),
            ], 'animals', ['moderated_at']);
            $listings['animal:'.$definition['file']] = $animal;
        }

        $productDefinitions = [
            ['file' => 'food_bird.png', 'category' => 'food', 'price' => 89.00, 'stock' => 28, 'visibility' => 'email'],
            ['file' => 'produit_oiseau_cage.png', 'category' => 'habitat', 'price' => 420.00, 'stock' => 8, 'visibility' => 'whatsapp'],
            ['file' => 'food_cat_produit1.png', 'category' => 'food', 'price' => 32.00, 'stock' => 45, 'visibility' => 'messages_only'],
            ['file' => 'food_cat_produit2.png', 'category' => 'food', 'price' => 119.00, 'stock' => 20, 'visibility' => 'phone'],
            ['file' => 'food_dog_produit1.png', 'category' => 'food', 'price' => 74.00, 'stock' => 32, 'visibility' => 'email'],
            ['file' => 'food_dog_produit2.png', 'category' => 'food', 'price' => 310.00, 'stock' => 17, 'visibility' => 'whatsapp'],
        ];

        foreach ($productDefinitions as $definition) {
            $plan = self::IMAGE_PLAN[$definition['file']];
            $owner = $users[$plan['owner']];
            $product = $this->syncModel(Product::class, ['user_id' => $owner->id, 'name' => $plan['listing']], [
                'category' => $definition['category'],
                'description' => "Produit neuf de démonstration locale : {$plan['listing']}. Présentation et prix en MAD non contractuels pour les tests YaZoo.",
                'price' => $definition['price'],
                'image_url' => $this->mediaPath($definition['file']),
                'gallery_urls' => [$this->mediaPath($definition['file'])],
                'location' => $owner->city,
                ...$this->contact($owner, $definition['visibility']),
                'stock' => $definition['stock'],
                'listing_status' => 'available',
                'condition_status' => 'new',
                'moderation_status' => 'active',
                'moderation_note' => 'Annonce canonique de test local approuvée.',
                'moderated_by' => $admin->id,
                'moderated_at' => now(),
            ], 'products', ['moderated_at']);
            $listings['product:'.$definition['file']] = $product;
        }

        $serviceDefinitions = [
            ['file' => 'cafe_chat.png', 'type' => 'pet_sitting', 'animals' => ['cat'], 'price' => 140.00, 'price_type' => 'daily', 'visibility' => 'messages_only'],
            ['file' => 'cafe_chat2.png', 'type' => 'pet_sitting', 'animals' => ['cat'], 'price' => 260.00, 'price_type' => 'fixed', 'visibility' => 'phone'],
            ['file' => 'cafe_chien1.png', 'type' => 'pet_sitting', 'animals' => ['dog'], 'price' => 170.00, 'price_type' => 'daily', 'visibility' => 'email'],
            ['file' => 'cafe_chien2.png', 'type' => 'pet_sitting', 'animals' => ['dog'], 'price' => 90.00, 'price_type' => 'session', 'visibility' => 'whatsapp'],
            ['file' => 'dresser_cirque.png', 'type' => 'training', 'animals' => ['other'], 'price' => 650.00, 'price_type' => 'session', 'visibility' => 'messages_only', 'wild' => true],
            ['file' => "dresseur d'animaux sauvages.png", 'type' => 'training', 'animals' => ['other', 'bird'], 'price' => 700.00, 'price_type' => 'session', 'visibility' => 'phone', 'wild' => true],
            ['file' => 'dresseur_cheval.png', 'type' => 'training', 'animals' => ['horse'], 'price' => 420.00, 'price_type' => 'session', 'visibility' => 'email'],
            ['file' => 'dresseur_chien.png', 'type' => 'training', 'animals' => ['dog'], 'price' => 280.00, 'price_type' => 'session', 'visibility' => 'whatsapp'],
            ['file' => 'dresseur_chien2.png', 'type' => 'training', 'animals' => ['dog'], 'price' => 240.00, 'price_type' => 'session', 'visibility' => 'messages_only'],
            ['file' => 'dresseur_egle.png', 'type' => 'training', 'animals' => ['bird'], 'price' => 600.00, 'price_type' => 'session', 'visibility' => 'phone', 'wild' => true],
        ];

        foreach ($serviceDefinitions as $definition) {
            $plan = self::IMAGE_PLAN[$definition['file']];
            $owner = $users[$plan['owner']];
            $description = "Service professionnel local de démonstration : {$plan['listing']}. Méthodes respectueuses du bien-être animal et données de test non contractuelles.";

            if ($definition['wild'] ?? false) {
                $description .= " Activité de démonstration locale uniquement pour détenteurs légalement autorisés, dans le respect du bien-être animal. Aucune vente illégale n'est proposée.";
            }

            $service = $this->syncModel(ServiceListing::class, ['user_id' => $owner->id, 'title' => $plan['listing']], [
                'type' => $definition['type'],
                'description' => $description,
                'animal_types' => $definition['animals'],
                'city' => $owner->city,
                'address' => 'Adresse de démonstration locale - '.$owner->city,
                'price' => $definition['price'],
                'price_type' => $definition['price_type'],
                'availability' => ['Lundi 09:00-18:00', 'Samedi 10:00-16:00'],
                ...$this->contact($owner, $definition['visibility']),
                'status' => 'active',
                'media' => [$this->mediaPath($definition['file'])],
                'views_count' => 0,
                'reservations_count' => 0,
                'moderation_status' => 'active',
                'moderation_note' => 'Annonce canonique de test local approuvée.',
                'moderated_by' => $admin->id,
                'moderated_at' => now(),
                'deleted_at' => null,
            ], 'services', ['moderated_at']);
            $listings['service:'.$definition['file']] = $service;
        }

        $vetDefinitions = [
            ['file' => 'vétérinaire1.png', 'city' => 'Agadir', 'lat' => 30.4278, 'lng' => -9.5981, 'address' => 'Quartier Talborjt, Agadir'],
            ['file' => 'vétérinaire2.png', 'city' => 'Oujda', 'lat' => 34.6814, 'lng' => -1.9086, 'address' => 'Centre-ville, Oujda'],
            ['file' => 'vétérinaire3.png', 'city' => 'Tanger', 'lat' => 35.7595, 'lng' => -5.8340, 'address' => 'Quartier Iberia, Tanger'],
        ];

        foreach ($vetDefinitions as $definition) {
            $plan = self::IMAGE_PLAN[$definition['file']];
            $owner = $users[$plan['owner']];
            $veterinarian = $this->syncModel(Veterinarian::class, ['user_id' => $owner->id, 'clinic_name' => $plan['listing']], [
                'name' => $owner->name,
                'description' => "Établissement vétérinaire de démonstration locale à {$definition['city']}, avec consultations préventives et suivi des animaux de compagnie.",
                'city' => $definition['city'],
                'address' => $definition['address'],
                'phone' => $owner->phone,
                'whatsapp' => $owner->phone,
                'email' => $owner->email,
                'specialties' => ['Médecine générale', 'Vaccination', 'Conseil préventif'],
                'working_hours' => ['Lundi-Vendredi 09:00-18:00', 'Samedi 09:00-13:00'],
                'image_path' => $this->mediaPath($definition['file']),
                'latitude' => $definition['lat'],
                'longitude' => $definition['lng'],
                'location_url' => 'https://www.google.com/maps?q='.$definition['lat'].','.$definition['lng'],
                'is_active' => true,
                'moderation_status' => 'active',
                'moderation_note' => 'Profil canonique de test local approuvé.',
                'moderated_by' => $admin->id,
                'moderated_at' => now(),
                'deleted_at' => null,
            ], 'veterinarians', ['moderated_at']);
            $listings['veterinarian:'.$definition['file']] = $veterinarian;
        }

        $pendingProductOwner = $users['chiens.rabat@yazoo.test'];
        $listings['pending_product'] = $this->syncModel(Product::class, [
            'user_id' => $pendingProductOwner->id,
            'name' => '[TEST MODÉRATION] Produit en attente',
        ], [
            'category' => 'other',
            'description' => 'Produit local fictif créé uniquement pour vérifier la file de modération.',
            'price' => 10.00,
            'image_url' => null,
            'gallery_urls' => [],
            'location' => $pendingProductOwner->city,
            ...$this->contact($pendingProductOwner, 'messages_only'),
            'stock' => 1,
            'listing_status' => 'available',
            'condition_status' => 'new',
            'moderation_status' => 'pending_review',
            'moderation_note' => null,
            'moderated_by' => null,
            'moderated_at' => null,
        ], 'products');

        $pendingAnimalOwner = $users['eleveur.poules.meknes@yazoo.test'];
        $listings['pending_animal'] = $this->syncModel(Animal::class, [
            'user_id' => $pendingAnimalOwner->id,
            'name' => '[TEST MODÉRATION] Animal en attente',
        ], [
            'category' => 'bird',
            'type' => 'Volaille de démonstration',
            'breed' => 'Beldi',
            'age' => 1,
            'sex' => 'unknown',
            'location' => $pendingAnimalOwner->city,
            ...$this->contact($pendingAnimalOwner, 'messages_only'),
            'photo_url' => null,
            'gallery_urls' => [],
            'price' => 100.00,
            'is_for_adoption' => false,
            'listing_status' => 'available',
            'description' => 'Animal fictif créé uniquement pour tester la validation légale et la modération.',
            'accepts_animal_rules' => true,
            'seller_type' => 'professional',
            'origin' => 'Démonstration locale',
            'identification_number' => 'DEMO-NON-VALABLE-PENDING',
            'legal_status' => 'pending_review',
            'moderation_note' => null,
            'moderated_by' => null,
            'moderated_at' => null,
        ], 'animals');

        return $listings;
    }

    /** @param array<string, User> $users @param array<string, Model> $listings */
    private function seedBusinessScenarios(array $users, array $listings): void
    {
        $client = $users['client.fes@yazoo.test'];
        $admin = $users['bough.youssef@gmail.com'];
        $animal = $listings['animal:elveurs_poules.png'];
        $product = $listings['product:food_bird.png'];
        $service = $listings['service:cafe_chat.png'];
        $vetAgadir = $listings['veterinarian:vétérinaire1.png'];
        $vetOujda = $listings['veterinarian:vétérinaire2.png'];
        $vetTanger = $listings['veterinarian:vétérinaire3.png'];

        foreach ([$animal, $product, $service, $vetAgadir] as $favoritable) {
            $this->syncModel(Favorite::class, [
                'user_id' => $client->id,
                'favoritable_type' => $favoritable::class,
                'favoritable_id' => $favoritable->id,
            ], [], 'favorites');
        }

        $productReservation = $this->syncModel(Reservation::class, ['invoice_number' => 'YAZ-DEMO-LOCAL-RES-PRODUCT'], [
            'buyer_id' => $client->id,
            'seller_id' => $product->user_id,
            'reservable_type' => Product::class,
            'reservable_id' => $product->id,
            'category' => 'product',
            'quantity' => 2,
            'delivery_method' => 'pickup',
            'note' => 'Réservation locale de démonstration en attente.',
            'contact_phone' => $client->phone,
            'payment_method' => 'cash_on_pickup',
            'reservation_status' => 'pending',
            'payment_status' => 'pending',
            'delivery_status' => 'pending',
            'unit_price' => $product->price,
            'total_price' => (float) $product->price * 2,
            'delivery_fee' => 0,
        ], 'reservations');

        $animalReservation = $this->syncModel(Reservation::class, ['invoice_number' => 'YAZ-DEMO-LOCAL-RES-ANIMAL'], [
            'buyer_id' => $client->id,
            'seller_id' => $animal->user_id,
            'reservable_type' => Animal::class,
            'reservable_id' => $animal->id,
            'category' => 'animal',
            'quantity' => 1,
            'delivery_method' => 'pickup',
            'note' => "Réservation locale approuvée après échange avec l'éleveur.",
            'contact_phone' => $client->phone,
            'payment_method' => 'cash_on_pickup',
            'reservation_status' => 'approved',
            'payment_status' => 'pending',
            'delivery_status' => 'ready_for_pickup',
            'unit_price' => $animal->price,
            'total_price' => $animal->price,
            'delivery_fee' => 0,
            'approved_at' => Carbon::parse('2025-06-14 10:00:00'),
        ], 'reservations');

        $serviceReservation = $this->syncModel(Reservation::class, ['invoice_number' => 'YAZ-DEMO-LOCAL-RES-SERVICE'], [
            'buyer_id' => $client->id,
            'seller_id' => $service->user_id,
            'reservable_type' => ServiceListing::class,
            'reservable_id' => $service->id,
            'category' => 'service',
            'quantity' => 1,
            'scheduled_at' => Carbon::parse('2025-06-15 09:00:00'),
            'scheduled_end_at' => Carbon::parse('2025-06-15 17:00:00'),
            'delivery_method' => 'pickup',
            'note' => 'Journée de garde terminée avec succès - démonstration locale.',
            'contact_phone' => $client->phone,
            'payment_method' => 'bank_transfer',
            'reservation_status' => 'completed',
            'payment_status' => 'paid',
            'delivery_status' => 'picked_up',
            'unit_price' => $service->price,
            'total_price' => $service->price,
            'delivery_fee' => 0,
            'approved_at' => Carbon::parse('2025-06-14 11:00:00'),
            'completed_at' => Carbon::parse('2025-06-15 17:30:00'),
        ], 'reservations');

        $this->syncModel(Payment::class, ['internal_reference' => 'YAZ-DEMO-LOCAL-PAY-PENDING'], [
            'reservation_id' => $productReservation->id,
            'buyer_id' => $client->id,
            'seller_id' => $product->user_id,
            'provider' => 'cash_on_pickup',
            'status' => 'pending',
            'amount' => $productReservation->total_price,
            'currency' => 'MAD',
            'commission_amount' => 0,
            'net_amount' => $productReservation->total_price,
            'provider_reference' => null,
            'idempotency_key' => 'YAZ-DEMO-LOCAL-IDEMP-PENDING',
            'checkout_url' => null,
            'metadata' => ['demo' => true, 'local_only' => true],
        ], 'payments');

        $this->syncModel(Payment::class, ['internal_reference' => 'YAZ-DEMO-LOCAL-PAY-PAID'], [
            'reservation_id' => $serviceReservation->id,
            'buyer_id' => $client->id,
            'seller_id' => $service->user_id,
            'provider' => 'manual_bank_transfer',
            'status' => 'paid',
            'amount' => $serviceReservation->total_price,
            'currency' => 'MAD',
            'commission_amount' => 0,
            'net_amount' => $serviceReservation->total_price,
            'provider_reference' => 'YAZ-DEMO-LOCAL-MANUAL-001',
            'idempotency_key' => 'YAZ-DEMO-LOCAL-IDEMP-PAID',
            'checkout_url' => null,
            'paid_at' => Carbon::parse('2025-06-15 17:25:00'),
            'metadata' => ['demo' => true, 'local_only' => true, 'verified_manually' => true],
        ], 'payments');

        $this->syncModel(ReservationReview::class, [
            'reservation_id' => $serviceReservation->id,
            'reviewer_id' => $client->id,
        ], [
            'reviewee_id' => $service->user_id,
            'reviewable_type' => ServiceListing::class,
            'reviewable_id' => $service->id,
            'rating' => 5,
            'comment' => 'Service ponctuel et attentionné, avis de démonstration locale.',
            'status' => 'published',
            'moderated_by' => $admin->id,
            'moderated_at' => Carbon::parse('2025-06-16 09:00:00'),
            'moderation_reason' => 'Avis de démonstration locale approuvé.',
        ], 'reviews');

        $seller = $users['oiseaux.sale@yazoo.test'];
        [$participantOne, $participantTwo] = collect([$client->id, $seller->id])->sort()->values()->all();
        $conversation = $this->syncModel(Conversation::class, [
            'participant_one_id' => $participantOne,
            'participant_two_id' => $participantTwo,
        ], [], 'conversations');

        $this->syncModel(Message::class, [
            'conversation_id' => $conversation->id,
            'user_id' => $client->id,
            'body' => 'Bonjour, le mélange de graines est-il disponible cette semaine ?',
        ], ['read_at' => Carbon::parse('2025-06-10 10:05:00')], 'messages');
        $this->syncModel(Message::class, [
            'conversation_id' => $conversation->id,
            'user_id' => $seller->id,
            'body' => 'Bonjour Amine, oui, le stock de démonstration est disponible.',
        ], ['read_at' => null], 'messages');

        $futureSlots = [
            [$vetAgadir, '2030-06-15 09:00:00', '2030-06-15 09:30:00'],
            [$vetOujda, '2030-06-16 10:00:00', '2030-06-16 10:30:00'],
            [$vetTanger, '2030-06-17 11:00:00', '2030-06-17 11:30:00'],
        ];
        $slots = [];

        foreach ($futureSlots as [$vet, $startsAt, $endsAt]) {
            $slots[$vet->id] = $this->syncModel(VeterinarianAvailabilitySlot::class, [
                'veterinarian_id' => $vet->id,
                'starts_at' => Carbon::parse($startsAt),
                'ends_at' => Carbon::parse($endsAt),
            ], ['is_available' => true], 'veterinarian_slots');
        }

        $appointments = [];
        $appointments['pending'] = $this->syncModel(VeterinarianAppointment::class, [
            'veterinarian_id' => $vetAgadir->id,
            'client_id' => $client->id,
            'starts_at' => Carbon::parse('2030-06-15 09:00:00'),
        ], [
            'availability_slot_id' => $slots[$vetAgadir->id]->id,
            'animal_type' => 'chat',
            'reason' => 'Contrôle préventif de démonstration locale.',
            'ends_at' => Carbon::parse('2030-06-15 09:30:00'),
            'status' => 'pending',
            'status_note' => null,
            'status_changed_by' => null,
            'status_changed_at' => null,
        ], 'veterinarian_appointments');
        $appointments['confirmed'] = $this->syncModel(VeterinarianAppointment::class, [
            'veterinarian_id' => $vetOujda->id,
            'client_id' => $client->id,
            'starts_at' => Carbon::parse('2030-06-16 10:00:00'),
        ], [
            'availability_slot_id' => $slots[$vetOujda->id]->id,
            'animal_type' => 'chien',
            'reason' => 'Consultation de suivi de démonstration locale.',
            'ends_at' => Carbon::parse('2030-06-16 10:30:00'),
            'status' => 'confirmed',
            'status_note' => 'Créneau confirmé pour le test local.',
            'status_changed_by' => $vetOujda->user_id,
            'status_changed_at' => Carbon::parse('2025-06-10 12:00:00'),
        ], 'veterinarian_appointments');
        $appointments['completed'] = $this->syncModel(VeterinarianAppointment::class, [
            'veterinarian_id' => $vetTanger->id,
            'client_id' => $client->id,
            'starts_at' => Carbon::parse('2025-06-12 14:00:00'),
        ], [
            'availability_slot_id' => null,
            'animal_type' => 'chat',
            'reason' => 'Consultation terminée servant au test des avis.',
            'ends_at' => Carbon::parse('2025-06-12 14:30:00'),
            'status' => 'completed',
            'status_note' => 'Consultation terminée - démonstration locale.',
            'status_changed_by' => $vetTanger->user_id,
            'status_changed_at' => Carbon::parse('2025-06-12 14:35:00'),
        ], 'veterinarian_appointments');

        $this->syncModel(VeterinarianAppointmentReview::class, [
            'veterinarian_appointment_id' => $appointments['completed']->id,
        ], [
            'client_id' => $client->id,
            'rating' => 5,
            'comment' => 'Accueil professionnel, avis fictif de démonstration locale.',
        ], 'veterinarian_appointment_reviews');
    }

    /**
     * @template TModel of Model
     *
     * @param  class-string<TModel>  $modelClass
     * @param  array<string, mixed>  $identity
     * @param  array<string, mixed>  $attributes
     * @param  list<string>  $preserveExisting
     * @return TModel
     */
    private function syncModel(string $modelClass, array $identity, array $attributes, string $entity, array $preserveExisting = []): Model
    {
        $existing = $modelClass::query()->where($identity)->first();

        if ($existing) {
            foreach ($preserveExisting as $field) {
                if ($existing->getAttribute($field) !== null) {
                    $attributes[$field] = $existing->getAttribute($field);
                }
            }

            $probe = clone $existing;
            Model::unguarded(fn () => $probe->fill($attributes));
            $state = $probe->isDirty() ? 'updated' : 'unchanged';
        } else {
            $state = 'created';
        }

        /** @var TModel $model */
        $model = Model::unguarded(fn () => $modelClass::query()->updateOrCreate($identity, $attributes));
        $this->increment($entity, $state);

        return $model;
    }

    private function syncStorageFile(string $disk, string $path, string $contents, string $entity): void
    {
        $storage = Storage::disk($disk);
        $exists = $storage->exists($path);
        $current = $exists ? $storage->get($path) : null;

        if ($current === $contents) {
            $this->increment($entity, 'unchanged');

            return;
        }

        $key = $disk.'|'.$path;
        $this->storageBackup[$key] = ['disk' => $disk, 'path' => $path, 'contents' => $current];

        if (! $storage->put($path, $contents)) {
            throw new RuntimeException("Échec d'écriture du fichier local {$path}.");
        }

        $this->increment($entity, $exists ? 'updated' : 'created');
    }

    private function restoreStorage(): void
    {
        foreach (array_reverse($this->storageBackup) as $backup) {
            $disk = Storage::disk($backup['disk']);

            if ($backup['contents'] === null) {
                $disk->delete($backup['path']);
            } else {
                $disk->put($backup['path'], $backup['contents']);
            }
        }

        $this->storageBackup = [];
    }

    private function increment(string $entity, string $state): void
    {
        $this->stats[$entity] ??= ['created' => 0, 'updated' => 0, 'unchanged' => 0];
        $this->stats[$entity][$state]++;
    }

    private function failAfter(?string $requested, string $phase): void
    {
        if ($requested === $phase) {
            throw new RuntimeException("Échec de démonstration demandé après la phase {$phase}.");
        }
    }

    /** @return array{contact_visibility: string, contact_phone: string|null, contact_email: string|null, whatsapp_enabled: bool} */
    private function contact(User $owner, string $visibility): array
    {
        return [
            'contact_visibility' => $visibility,
            'contact_phone' => in_array($visibility, ['phone', 'whatsapp'], true) ? $owner->phone : null,
            'contact_email' => $visibility === 'email' ? $owner->email : null,
            'whatsapp_enabled' => $visibility === 'whatsapp',
        ];
    }

    private function mediaPath(string $file): string
    {
        return 'marketplace/demo/'.$file;
    }

    private function verificationDocumentPath(string $email): string
    {
        return 'professional-verifications/demo/'.Str::slug(Str::before($email, '@')).'.pdf';
    }

    private function passwordForCity(string $city): string
    {
        return Str::of($city)->ascii()->lower()->replaceMatches('/[^a-z0-9]+/', '')->append('123456')->toString();
    }

    /** @return list<array{name: string, email: string, phone: string, city: string, bio: string, business_type: string|null}> */
    private function accounts(): array
    {
        return [
            ['name' => 'Youssef BOUGHIOUL', 'email' => 'bough.youssef@gmail.com', 'phone' => '+212606610014', 'city' => 'Sefrou', 'bio' => 'Fondateur et administrateur de la plateforme YaZoo.', 'business_type' => null],
            ['name' => 'Amine EL IDRISSI', 'email' => 'client.fes@yazoo.test', 'phone' => '+212600000101', 'city' => 'Fès', 'bio' => 'Client local utilisant le marché YaZoo pour ses animaux.', 'business_type' => null],
            ['name' => 'Hamid ALAOUI', 'email' => 'eleveur.poules.meknes@yazoo.test', 'phone' => '+212600000102', 'city' => 'Meknès', 'bio' => 'Éleveur professionnel de volailles Beldi à Meknès.', 'business_type' => 'breeder'],
            ['name' => 'Khadija BENNANI', 'email' => 'eleveuse.bovins.benimellal@yazoo.test', 'phone' => '+212600000103', 'city' => 'Béni Mellal', 'bio' => 'Éleveuse bovine attentive au suivi sanitaire et au bien-être animal.', 'business_type' => 'breeder'],
            ['name' => 'Omar EL FASSI', 'email' => 'oiseaux.sale@yazoo.test', 'phone' => '+212600000104', 'city' => 'Salé', 'bio' => "Gérant d'une animalerie spécialisée dans les oiseaux et leur habitat.", 'business_type' => 'pet_shop'],
            ['name' => 'Salma ZAHRA', 'email' => 'chats.casablanca@yazoo.test', 'phone' => '+212600000105', 'city' => 'Casablanca', 'bio' => 'Responsable d’une animalerie dédiée à l’alimentation féline.', 'business_type' => 'pet_shop'],
            ['name' => 'Nabil AMRANI', 'email' => 'chiens.rabat@yazoo.test', 'phone' => '+212600000106', 'city' => 'Rabat', 'bio' => 'Vendeur professionnel de produits pour chiens à Rabat.', 'business_type' => 'pet_shop'],
            ['name' => 'Nadia BERRADA', 'email' => 'garde.tetouan@yazoo.test', 'phone' => '+212600000107', 'city' => 'Tétouan', 'bio' => "Prestataire de garde et de promenade d'animaux à Tétouan.", 'business_type' => 'service_provider'],
            ['name' => 'Karim MANSOURI', 'email' => 'dresseur.chiens.marrakech@yazoo.test', 'phone' => '+212600000108', 'city' => 'Marrakech', 'bio' => 'Dresseur canin spécialisé en éducation et comportement.', 'business_type' => 'trainer'],
            ['name' => 'Mehdi CHERKAOUI', 'email' => 'dresseur.chevaux.eljadida@yazoo.test', 'phone' => '+212600000109', 'city' => 'El Jadida', 'bio' => 'Professionnel de l’éducation et du dressage équin.', 'business_type' => 'trainer'],
            ['name' => 'Yassine LAHLOU', 'email' => 'dresseur.faune.kenitra@yazoo.test', 'phone' => '+212600000110', 'city' => 'Kénitra', 'bio' => 'Dresseur spécialisé dans les démonstrations encadrées et légalement autorisées.', 'business_type' => 'trainer'],
            ['name' => 'Dr Sara EL MANSOURI', 'email' => 'veterinaire.agadir@yazoo.test', 'phone' => '+212600000111', 'city' => 'Agadir', 'bio' => 'Vétérinaire généraliste au service des animaux de compagnie à Agadir.', 'business_type' => 'veterinarian'],
            ['name' => 'Dr Imane AIT BENALI', 'email' => 'veterinaire.oujda@yazoo.test', 'phone' => '+212600000112', 'city' => 'Oujda', 'bio' => 'Vétérinaire assurant consultations et suivi préventif à Oujda.', 'business_type' => 'veterinarian'],
            ['name' => 'Dr Anas BENJELLOUN', 'email' => 'veterinaire.tanger@yazoo.test', 'phone' => '+212600000113', 'city' => 'Tanger', 'bio' => 'Vétérinaire pour animaux de compagnie au Centre Vétérinaire Détroit.', 'business_type' => 'veterinarian'],
        ];
    }

    /** @return list<array{name: string, email: string, phone: string, city: string, bio: string, business_type: string}> */
    private function professionalAccounts(): array
    {
        return array_values(array_filter($this->accounts(), fn (array $account): bool => $account['business_type'] !== null));
    }
}
