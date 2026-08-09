<?php

namespace Database\Seeders;

use App\Models\Animal;
use App\Models\Conversation;
use App\Models\Product;
use App\Models\Reservation;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use App\Notifications\PostCommentedNotification;
use App\Notifications\PostLikedNotification;
use App\Notifications\ReservationApprovedNotification;
use App\Notifications\ReservationCompletedNotification;
use App\Notifications\ReservationRequestedNotification;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoContentSeeder extends Seeder
{
    /**
     * Seed the application's demo content.
     */
    public function run(): void
    {
        $admin = $this->createUser([
            'name' => 'Admin YaZoo',
            'email' => 'admin@yazoo.ma',
            'phone' => '+212600000001',
            'country' => 'Maroc',
            'city' => 'Casablanca',
            'bio' => 'Administration de la plateforme YaZoo.',
            'avatar' => 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
        ], isAdmin: true);

        $sellerAnimal = $this->createUser([
            'name' => 'Sara Adoption',
            'email' => 'sara.adoption@yazoo.ma',
            'phone' => '+212600000002',
            'country' => 'Maroc',
            'city' => 'Rabat',
            'bio' => 'Je partage des annonces d adoption et des conseils pour les chats et chiens.',
            'avatar' => 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80',
        ]);

        $sellerProduct = $this->createUser([
            'name' => 'Youssef Boutique',
            'email' => 'youssef.shop@yazoo.ma',
            'phone' => '+212600000003',
            'country' => 'Maroc',
            'city' => 'Marrakech',
            'bio' => 'Accessoires et produits premium pour animaux.',
            'avatar' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        ]);

        $buyer = $this->createUser([
            'name' => 'Imane Client',
            'email' => 'imane.client@yazoo.ma',
            'phone' => '+212600000004',
            'country' => 'Maroc',
            'city' => 'Fes',
            'bio' => 'Passionnee par les adoptions responsables et les accessoires utiles.',
            'avatar' => 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        ]);

        $communityLead = $this->createUser([
            'name' => 'Nadia Communaute',
            'email' => 'nadia.community@yazoo.ma',
            'phone' => '+212600000005',
            'country' => 'Maroc',
            'city' => 'Tanger',
            'bio' => 'J anime des groupes autour des soins, de l adoption et de la vie animale.',
            'avatar' => 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=400&q=80',
        ]);

        $guestMember = $this->createUser([
            'name' => 'Hamza Membre',
            'email' => 'hamza.member@yazoo.ma',
            'phone' => '+212600000006',
            'country' => 'Maroc',
            'city' => 'Agadir',
            'bio' => 'Je rejoins les groupes prives pour apprendre et partager.',
            'avatar' => 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
        ]);

        $postOne = $communityLead->posts()->create([
            'content' => 'Premiere rencontre ce matin avec trois chatons sauves. Ils s habituent doucement a leur nouvel espace.',
            'location' => 'Tanger',
            'tags' => ['adoption', 'chatons', 'refuge'],
        ]);

        $postTwo = $sellerAnimal->posts()->create([
            'content' => 'Routine douceur avant visite veterinaire: eau, calme et friandises. Vos astuces ?',
            'location' => 'Rabat',
            'tags' => ['soins', 'chiens', 'conseils'],
        ]);

        $postThree = $buyer->posts()->create([
            'content' => 'Mon panier YaZoo commence a prendre forme: gamelles, jouets et coin nuit pour accueillir un nouveau compagnon.',
            'location' => 'Fes',
            'tags' => ['preparation', 'maison', 'adoption'],
        ]);

        $commentOne = $postOne->comments()->create([
            'user_id' => $sellerProduct->id,
            'body' => 'Tres beau sauvetage. Pensez a ajouter un coin chaud et calme pour la premiere nuit.',
        ]);

        $commentTwo = $postTwo->comments()->create([
            'user_id' => $buyer->id,
            'body' => 'Je prevois toujours une serviette et de l eau fraiche, ca marche tres bien avant le trajet.',
        ]);

        $postOne->likes()->create(['user_id' => $buyer->id]);
        $postOne->likes()->create(['user_id' => $admin->id]);
        $postTwo->likes()->create(['user_id' => $communityLead->id]);
        $postThree->likes()->create(['user_id' => $sellerAnimal->id]);

        $communityLead->notify(new PostLikedNotification($postOne, $buyer));
        $communityLead->notify(new PostCommentedNotification($postOne, $commentOne, $sellerProduct));
        $sellerAnimal->notify(new PostCommentedNotification($postTwo, $commentTwo, $buyer));

        $animalReserved = $sellerAnimal->animals()->create([
            'name' => 'Milo',
            'category' => 'cat',
            'type' => 'chat',
            'breed' => 'Europeen',
            'age' => 2,
            'sex' => 'male',
            'location' => 'Rabat',
            'photo_url' => 'https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=900&q=80',
            'gallery_urls' => [
                'https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=900&q=80',
                'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=900&q=80',
            ],
            'price' => 1200,
            'is_for_adoption' => false,
            'listing_status' => 'reserved',
            'description' => 'Chat sociable, vaccine, propre et habitue a la vie en appartement.',
        ]);

        $animalAvailable = $sellerAnimal->animals()->create([
            'name' => 'Luna',
            'category' => 'dog',
            'type' => 'chien',
            'breed' => 'Croisee',
            'age' => 1,
            'sex' => 'female',
            'location' => 'Rabat',
            'photo_url' => 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80',
            'gallery_urls' => [
                'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80',
            ],
            'price' => 0,
            'is_for_adoption' => true,
            'listing_status' => 'available',
            'description' => 'Jeune chienne douce, joueuse et prete pour une adoption responsable.',
        ]);

        $productCompleted = $sellerProduct->products()->create([
            'name' => 'Pack repas premium',
            'category' => 'food',
            'description' => 'Selection de croquettes et friandises pour un demarrage en douceur.',
            'price' => 180,
            'image_url' => 'https://images.unsplash.com/photo-1583512603806-077998240c7a?auto=format&fit=crop&w=900&q=80',
            'gallery_urls' => [
                'https://images.unsplash.com/photo-1583512603806-077998240c7a?auto=format&fit=crop&w=900&q=80',
                'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80',
            ],
            'location' => 'Marrakech',
            'stock' => 8,
            'listing_status' => 'available',
            'condition_status' => 'new',
        ]);

        $productApproved = $sellerProduct->products()->create([
            'name' => 'Panier velours violet',
            'category' => 'habitat',
            'description' => 'Panier confortable avec coussin epais et texture douce.',
            'price' => 260,
            'image_url' => 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=900&q=80',
            'gallery_urls' => [
                'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=900&q=80',
            ],
            'location' => 'Marrakech',
            'stock' => 3,
            'listing_status' => 'reserved',
            'condition_status' => 'new',
        ]);

        $publicCommunity = $communityLead->createdCommunities()->create([
            'name' => 'Conseils adoption Maroc',
            'description' => 'Conseils, retours d experience et entraide autour des adoptions responsables.',
            'image_url' => 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?auto=format&fit=crop&w=900&q=80',
            'is_private' => false,
        ]);

        $publicCommunity->memberships()->create([
            'user_id' => $communityLead->id,
            'role' => 'admin',
            'status' => 'approved',
        ]);

        $publicCommunity->memberships()->create([
            'user_id' => $buyer->id,
            'role' => 'member',
            'status' => 'approved',
        ]);

        $privateCommunity = $admin->createdCommunities()->create([
            'name' => 'Moderation refuges prives',
            'description' => 'Espace prive pour l organisation des demandes, des refuges et des validations sensibles.',
            'image_url' => 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80',
            'is_private' => true,
        ]);

        $privateCommunity->memberships()->create([
            'user_id' => $admin->id,
            'role' => 'admin',
            'status' => 'approved',
        ]);

        $privateCommunity->memberships()->create([
            'user_id' => $sellerAnimal->id,
            'role' => 'member',
            'status' => 'approved',
        ]);

        $privateCommunity->memberships()->create([
            'user_id' => $guestMember->id,
            'role' => 'member',
            'status' => 'pending',
        ]);

        $conversation = Conversation::query()->create([
            'participant_one_id' => $buyer->id,
            'participant_two_id' => $sellerProduct->id,
        ]);

        $conversation->messages()->create([
            'body' => 'Bonjour, je voulais confirmer le delai de livraison du panier velours violet.',
            'user_id' => $buyer->id,
            'read_at' => now()->subHours(10),
        ]);

        $latestMessage = $conversation->messages()->create([
            'body' => 'Bonjour Imane, le colis peut partir demain matin avec une livraison estimee a 48h.',
            'user_id' => $sellerProduct->id,
        ]);

        $buyer->notify(new NewMessageNotification($conversation, $latestMessage, $sellerProduct));

        $pendingAnimalReservation = Reservation::query()->create([
            'buyer_id' => $buyer->id,
            'seller_id' => $sellerAnimal->id,
            'reservable_type' => Animal::class,
            'reservable_id' => $animalReserved->id,
            'quantity' => 1,
            'delivery_method' => 'pickup',
            'note' => 'Je peux venir samedi matin pour rencontrer Milo et finaliser la reservation.',
            'payment_method' => 'cash_on_pickup',
            'reservation_status' => 'pending',
            'payment_status' => 'pending',
            'delivery_status' => 'pending',
            'delivery_contact_name' => $buyer->name,
            'delivery_phone' => $buyer->phone,
            'delivery_city' => $buyer->city,
            'delivery_address' => null,
            'delivery_notes' => 'Retrait directement au refuge.',
            'unit_price' => 1200,
            'total_price' => 1200,
            'delivery_fee' => 0,
        ]);

        $completedProductReservation = Reservation::query()->create([
            'buyer_id' => $buyer->id,
            'seller_id' => $sellerProduct->id,
            'reservable_type' => Product::class,
            'reservable_id' => $productCompleted->id,
            'quantity' => 2,
            'delivery_method' => 'delivery',
            'note' => 'Merci de bien proteger le colis.',
            'payment_method' => 'bank_transfer',
            'reservation_status' => 'completed',
            'payment_status' => 'paid',
            'delivery_status' => 'delivered',
            'delivery_contact_name' => $buyer->name,
            'delivery_phone' => $buyer->phone,
            'delivery_city' => $buyer->city,
            'delivery_address' => 'Avenue Hassan II, Fes',
            'delivery_notes' => 'Livraison en journee.',
            'unit_price' => 180,
            'total_price' => 360,
            'delivery_fee' => 40,
            'invoice_number' => 'YAZ-DEMO-00001',
            'invoice_issued_at' => now()->subDay(),
            'approved_at' => now()->subDays(2),
            'completed_at' => now()->subDay(),
        ]);

        $approvedProductReservation = Reservation::query()->create([
            'buyer_id' => $communityLead->id,
            'seller_id' => $sellerProduct->id,
            'reservable_type' => Product::class,
            'reservable_id' => $productApproved->id,
            'quantity' => 3,
            'delivery_method' => 'delivery',
            'note' => 'Commande pour le local de l association.',
            'payment_method' => 'cash_on_pickup',
            'reservation_status' => 'approved',
            'payment_status' => 'pending',
            'delivery_status' => 'preparing',
            'delivery_contact_name' => $communityLead->name,
            'delivery_phone' => $communityLead->phone,
            'delivery_city' => $communityLead->city,
            'delivery_address' => 'Boulevard de la Corniche, Tanger',
            'delivery_notes' => 'Appeler avant livraison.',
            'unit_price' => 260,
            'total_price' => 780,
            'delivery_fee' => 45,
            'approved_at' => now()->subHours(12),
        ]);

        $sellerAnimal->notify(new ReservationRequestedNotification($pendingAnimalReservation));
        $communityLead->notify(new ReservationApprovedNotification($approvedProductReservation));
        $buyer->notify(new ReservationCompletedNotification($completedProductReservation));
    }

    /**
     * Create deterministic demo users without loading development-only Faker.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function createUser(array $attributes, bool $isAdmin = false): User
    {
        $user = new User;
        $user->forceFill(array_merge([
            'email_verified_at' => now(),
            'phone_verified_at' => now(),
            'preferred_locale' => 'fr',
            'is_admin' => $isAdmin,
            'password' => Hash::make('password'),
            'remember_token' => null,
        ], $attributes));
        $user->save();

        return $user;
    }
}
