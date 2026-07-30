<?php

use App\Http\Controllers\Api\AdminAnimalReviewController;
use App\Http\Controllers\Api\AdminContentModerationController;
use App\Http\Controllers\Api\AdminExportController;
use App\Http\Controllers\Api\AdminMfaController;
use App\Http\Controllers\Api\AdminModerationActionController;
use App\Http\Controllers\Api\AdminModerationController;
use App\Http\Controllers\Api\AdminOrdersController;
use App\Http\Controllers\Api\AdminReservationReviewController;
use App\Http\Controllers\Api\AdminStatsController;
use App\Http\Controllers\Api\AdminUserModerationController;
use App\Http\Controllers\Api\AnimalController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\CommunityController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\DataDeletionRequestController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\HistoryController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\MonitoringController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\PrivacyConsentController;
use App\Http\Controllers\Api\PrivacyController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProfessionalVerificationController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PublicMarketplaceController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\ReservationReviewController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\ServiceListingController;
use App\Http\Controllers\Api\StoryController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VeterinarianAppointmentController;
use App\Http\Controllers\Api\VeterinarianController;
use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\SetApiLocale;
use App\Http\Middleware\UseSanctumTokenFromCookie;
use App\Support\Sms\SmsSender;
use Illuminate\Support\Facades\Route;

Route::middleware([ForceJsonResponse::class, SetApiLocale::class, 'throttle:api'])->group(function (): void {
    Route::get('/', fn () => response()->json([
        'name' => 'YaZoo API',
        'status' => 'ok',
    ]));

    Route::get('/legal/config', fn () => response()->json([
        'entityName' => config('legal.entity_name'),
        'legalStatus' => config('legal.legal_status'),
        'address' => config('legal.address'),
        'ice' => config('legal.ice'),
        'privacyContactEmail' => config('legal.privacy_contact_email'),
        'dataControllerName' => config('legal.data_controller_name'),
        'dataRetentionDays' => config('legal.data_retention_days'),
        'dataRequestResponseDays' => config('legal.data_request_response_days'),
        'contactEmail' => config('services.contact.recipient'),
        'contactPhone' => config('services.contact.public_phone'),
        'contactWhatsapp' => config('services.contact.public_whatsapp'),
        'contactAvailable' => filled(config('services.contact.recipient'))
            && (! app()->isProduction() || ! in_array(config('mail.default'), ['log', 'array'], true)),
        'smsAvailable' => app(SmsSender::class)->isAvailable(),
        'notice' => 'Informations administratives a valider juridiquement avant publication officielle.',
    ]))->middleware('throttle:30,1');

    Route::get('/media/{fileId}', [MediaController::class, 'show'])
        ->where('fileId', '[A-Fa-f0-9]{24}');

    Route::post('/monitoring/frontend-error', [MonitoringController::class, 'store'])
        ->middleware('throttle:10,1');

    Route::post('/contact', [ContactController::class, 'send'])
        ->middleware('throttle:5,1');

    Route::post('/privacy/consents/public', [PrivacyConsentController::class, 'storePublic'])
        ->middleware('throttle:20,1');

    Route::get('/payments/config', [PaymentController::class, 'config'])
        ->middleware('throttle:30,1');

    Route::get('/marketplace/public-preview', PublicMarketplaceController::class)
        ->middleware('throttle:60,1');
    Route::get('/marketplace/public/{section}', [PublicMarketplaceController::class, 'index'])
        ->whereIn('section', ['animals', 'products', 'services', 'veterinarians'])
        ->middleware('throttle:60,1');
    Route::get('/marketplace/public/{section}/{listing}', [PublicMarketplaceController::class, 'show'])
        ->whereIn('section', ['animals', 'products', 'services', 'veterinarians'])
        ->whereNumber('listing')
        ->middleware('throttle:60,1');

    Route::post('/payments/cmi/callback', [PaymentController::class, 'cmiCallback'])
        ->middleware('throttle:30,1');

    Route::prefix('auth')->group(function (): void {
        Route::post('/otp/request', [AuthController::class, 'requestOtp'])->middleware('throttle:otp-request');
        Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
        Route::post('/password/forgot', [AuthController::class, 'requestPasswordReset'])
            ->middleware('throttle:5,1');
        Route::post('/password/reset', [AuthController::class, 'resetPassword'])
            ->middleware('throttle:10,1');
        Route::get('/email/verify/{user}/{hash}', [AuthController::class, 'verifyEmail'])
            ->middleware(['signed', 'throttle:10,1'])
            ->name('verification.verify');
        Route::get('/google', [AuthController::class, 'redirectToGoogle'])
            ->middleware(['web', 'throttle:10,1']);
        Route::get('/google/callback', [AuthController::class, 'handleGoogleCallback'])
            ->middleware(['web', 'throttle:10,1']);

        Route::middleware(['cookie_csrf', UseSanctumTokenFromCookie::class, 'auth:sanctum', 'active_mutation'])->group(function (): void {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::post('/email/verification-notification', [AuthController::class, 'resendEmailVerification'])
                ->middleware('throttle:3,10');
        });
    });

    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

    Route::middleware(['cookie_csrf', UseSanctumTokenFromCookie::class, 'auth:sanctum', 'active_mutation'])->group(function (): void {
        Route::get('/posts', [PostController::class, 'index']);
        Route::middleware(['throttle:feed-write', 'not_suspended'])->group(function (): void {
            Route::post('/posts', [PostController::class, 'store']);
            Route::patch('/posts/{post}', [PostController::class, 'update']);
            Route::delete('/posts/{post}', [PostController::class, 'destroy']);
            Route::post('/posts/{post}/like', [PostController::class, 'toggleLike']);
            Route::post('/posts/{post}/comments', [CommentController::class, 'store']);
            Route::post('/comments/{comment}/reaction', [CommentController::class, 'react']);
        });

        Route::get('/stories', [StoryController::class, 'index']);
        Route::middleware(['throttle:stories-write', 'not_suspended'])->group(function (): void {
            Route::post('/stories', [StoryController::class, 'store']);
            Route::post('/stories/{story}/view', [StoryController::class, 'markAsViewed']);
            Route::delete('/stories/{story}', [StoryController::class, 'destroy']);
        });

        Route::get('/users/suggestions', [UserController::class, 'suggestions']);
        Route::get('/users/{user}/followers', [ProfileController::class, 'followers']);
        Route::get('/users/{user}/following', [ProfileController::class, 'following']);
        Route::get('/users/{user}', [ProfileController::class, 'show']);
        Route::patch('/users/{user}', [ProfileController::class, 'update']);
        Route::post('/users/{user}/follow', [ProfileController::class, 'follow']);
        Route::delete('/users/{user}/follow', [ProfileController::class, 'unfollow']);

        Route::get('/favorites', [FavoriteController::class, 'index']);
        Route::post('/favorites', [FavoriteController::class, 'store'])->middleware('throttle:30,1');
        Route::delete('/favorites/{type}/{id}', [FavoriteController::class, 'destroy'])->middleware('throttle:30,1');

        Route::get('/animals', [AnimalController::class, 'index']);
        Route::get('/animals/{animal}', [AnimalController::class, 'show']);

        Route::get('/products', [ProductController::class, 'index']);
        Route::get('/products/{product}', [ProductController::class, 'show']);

        Route::get('/services', [ServiceListingController::class, 'index']);
        Route::get('/services/feed', [ServiceListingController::class, 'feed']);
        Route::get('/my/services', [ServiceListingController::class, 'mine']);
        Route::get('/services/types', [ServiceListingController::class, 'types']);
        Route::get('/services/{service}', [ServiceListingController::class, 'show']);

        Route::get('/veterinarians', [VeterinarianController::class, 'index']);
        Route::get('/veterinarians/{veterinarian}', [VeterinarianController::class, 'show']);
        Route::get('/veterinarians/{veterinarian}/availability', [VeterinarianAppointmentController::class, 'availability']);
        Route::get('/veterinarian-appointments', [VeterinarianAppointmentController::class, 'index']);
        Route::middleware(['throttle:appointments-write', 'not_suspended'])->group(function (): void {
            Route::post('/veterinarians/{veterinarian}/availability', [VeterinarianAppointmentController::class, 'storeAvailability']);
            Route::delete('/veterinarian-availability/{slot}', [VeterinarianAppointmentController::class, 'destroyAvailability']);
            Route::post('/veterinarians/{veterinarian}/appointments', [VeterinarianAppointmentController::class, 'store']);
            Route::patch('/veterinarian-appointments/{appointment}/status', [VeterinarianAppointmentController::class, 'updateStatus']);
            Route::post('/veterinarian-appointments/{appointment}/review', [VeterinarianAppointmentController::class, 'review']);
        });

        Route::middleware(['throttle:marketplace-write', 'not_suspended'])->group(function (): void {
            Route::post('/animals', [AnimalController::class, 'store']);
            Route::put('/animals/{animal}', [AnimalController::class, 'update']);
            Route::delete('/animals/{animal}', [AnimalController::class, 'destroy']);
            Route::post('/products', [ProductController::class, 'store']);
            Route::put('/products/{product}', [ProductController::class, 'update']);
            Route::delete('/products/{product}', [ProductController::class, 'destroy']);
            Route::post('/services', [ServiceListingController::class, 'store']);
            Route::put('/services/{service}', [ServiceListingController::class, 'update']);
            Route::patch('/services/{service}', [ServiceListingController::class, 'update']);
            Route::delete('/services/{service}', [ServiceListingController::class, 'destroy']);
            Route::post('/veterinarians', [VeterinarianController::class, 'store']);
            Route::put('/veterinarians/{veterinarian}', [VeterinarianController::class, 'update']);
            Route::patch('/veterinarians/{veterinarian}', [VeterinarianController::class, 'update']);
            Route::delete('/veterinarians/{veterinarian}', [VeterinarianController::class, 'destroy']);
        });

        Route::get('/reservations', [ReservationController::class, 'index']);
        Route::get('/reservations/{reservation}', [ReservationController::class, 'show']);
        Route::get('/reservations/{reservation}/payments', [PaymentController::class, 'index']);
        Route::post('/reservations/{reservation}/payments', [PaymentController::class, 'store'])
            ->middleware('throttle:10,1');
        Route::get('/payments/{payment}', [PaymentController::class, 'show']);
        Route::patch('/payments/{payment}/manual-confirm', [PaymentController::class, 'confirmManual'])
            ->middleware('throttle:10,1');
        Route::get('/orders/history', [ReservationController::class, 'history']);
        Route::get('/history', [HistoryController::class, 'index']);
        Route::get('/history/me', [HistoryController::class, 'index']);
        Route::get('/reservations/{reservation}/invoice', [ReservationController::class, 'invoice']);
        Route::middleware('throttle:reservations-write')->group(function (): void {
            Route::post('/reservations', [ReservationController::class, 'store']);
            Route::post('/animals/{animal}/reservations', [ReservationController::class, 'storeAnimal']);
            Route::post('/products/{product}/reservations', [ReservationController::class, 'storeProduct']);
            Route::post('/reservations/{reservation}/approve', [ReservationController::class, 'approve']);
            Route::patch('/reservations/{reservation}/approve', [ReservationController::class, 'approve']);
            Route::post('/reservations/{reservation}/reject', [ReservationController::class, 'reject']);
            Route::patch('/reservations/{reservation}/reject', [ReservationController::class, 'reject']);
            Route::patch('/reservations/{reservation}/delivery-status', [ReservationController::class, 'updateDeliveryStatus']);
            Route::post('/reservations/{reservation}/cancel', [ReservationController::class, 'cancel']);
            Route::patch('/reservations/{reservation}/cancel', [ReservationController::class, 'cancel']);
            Route::post('/reservations/{reservation}/complete', [ReservationController::class, 'complete']);
            Route::patch('/reservations/{reservation}/complete', [ReservationController::class, 'complete']);
            Route::post('/reservations/{reservation}/reviews', [ReservationReviewController::class, 'store']);
        });

        Route::get('/communities', [CommunityController::class, 'index']);
        Route::post('/communities', [CommunityController::class, 'store']);
        Route::get('/communities/{community}', [CommunityController::class, 'show']);
        Route::put('/communities/{community}', [CommunityController::class, 'update']);
        Route::delete('/communities/{community}', [CommunityController::class, 'destroy']);
        Route::post('/communities/{community}/join', [CommunityController::class, 'join']);
        Route::delete('/communities/{community}/leave', [CommunityController::class, 'leave']);
        Route::get('/communities/{community}/membership-requests', [CommunityController::class, 'pendingRequests']);
        Route::post('/communities/{community}/membership-requests/{membership}/approve', [CommunityController::class, 'approveRequest']);
        Route::delete('/communities/{community}/membership-requests/{membership}', [CommunityController::class, 'rejectRequest']);

        Route::get('/conversations', [ConversationController::class, 'index']);
        Route::get('/messages/unread-count', [ConversationController::class, 'unreadCount']);
        Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
        Route::patch('/conversations/{conversation}/read', [ConversationController::class, 'read']);
        Route::middleware(['throttle:messages-write', 'not_suspended'])->group(function (): void {
            Route::post('/conversations', [ConversationController::class, 'store']);
            Route::post('/conversations/direct', [ConversationController::class, 'direct']);
            Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store']);
        });

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

        Route::get('/search', [SearchController::class, 'index']);
        Route::get('/search/users', [SearchController::class, 'users']);
        Route::post('/reports', [ReportController::class, 'store'])->middleware('not_suspended');
        Route::get('/privacy/export', [PrivacyController::class, 'export']);
        Route::post('/privacy/consents', [PrivacyConsentController::class, 'store']);
        Route::get('/privacy/consents', [PrivacyConsentController::class, 'index']);
        Route::post('/privacy/delete-request', [DataDeletionRequestController::class, 'store']);
        Route::get('/privacy/delete-request', [DataDeletionRequestController::class, 'show']);
        Route::post('/professional-verifications', [ProfessionalVerificationController::class, 'store'])
            ->middleware('throttle:professional-verification-submit');
        Route::get('/professional-verifications/me', [ProfessionalVerificationController::class, 'me']);
        Route::get('/professional-verifications/{professionalVerification}/document', [ProfessionalVerificationController::class, 'downloadDocument'])
            ->middleware('throttle:20,1');

        Route::prefix('admin')->middleware('admin')->group(function (): void {
            Route::prefix('mfa')->middleware('throttle:10,1')->group(function (): void {
                Route::get('/', [AdminMfaController::class, 'status']);
                Route::post('/enroll', [AdminMfaController::class, 'enroll']);
                Route::post('/confirm', [AdminMfaController::class, 'confirm']);
                Route::post('/challenge', [AdminMfaController::class, 'challenge'])->middleware('throttle:5,1');
                Route::post('/recovery-codes', [AdminMfaController::class, 'regenerateRecoveryCodes']);
                Route::delete('/', [AdminMfaController::class, 'disable']);
            });
            Route::get('/users', [AdminUserModerationController::class, 'index']);
            Route::post('/users', [UserController::class, 'store']);
            Route::patch('/users/{user}/suspension', [AdminUserModerationController::class, 'updateSuspension'])->middleware('admin_mfa');
            Route::patch('/users/{user}/ban', [AdminUserModerationController::class, 'updateBan'])->middleware('admin_mfa');
            Route::get('/stats', AdminStatsController::class);
            Route::get('/reports', [ReportController::class, 'index']);
            Route::patch('/reports/{report}/status', [ReportController::class, 'updateStatus'])->middleware('admin_mfa');
            Route::get('/moderation-actions', [AdminModerationActionController::class, 'index']);
            Route::get('/reviews', [AdminReservationReviewController::class, 'index']);
            Route::patch('/reviews/{reservationReview}/status', [AdminReservationReviewController::class, 'updateStatus'])->middleware('admin_mfa');
            Route::patch('/content/{type}/{id}/moderation-status', [AdminContentModerationController::class, 'update'])->middleware('admin_mfa');
            Route::get('/exports/stats.csv', [AdminExportController::class, 'stats'])->middleware('admin_mfa');
            Route::get('/exports/reports.csv', [AdminExportController::class, 'reports'])->middleware('admin_mfa');
            Route::get('/exports/moderation-actions.csv', [AdminExportController::class, 'moderationActions'])->middleware('admin_mfa');
            Route::get('/exports/professional-verifications.csv', [AdminExportController::class, 'professionalVerifications'])->middleware('admin_mfa');
            Route::get('/privacy/delete-requests', [DataDeletionRequestController::class, 'adminIndex']);
            Route::patch('/privacy/delete-requests/{dataDeletionRequest}/status', [DataDeletionRequestController::class, 'updateStatus'])->middleware('admin_mfa');
            Route::get('/professional-verifications', [ProfessionalVerificationController::class, 'adminIndex']);
            Route::get('/professional-verifications/{professionalVerification}/document', [ProfessionalVerificationController::class, 'downloadDocument'])
                ->middleware(['throttle:20,1', 'admin_mfa']);
            Route::patch('/professional-verifications/{professionalVerification}/status', [ProfessionalVerificationController::class, 'updateStatus'])->middleware('admin_mfa');
            Route::get('/animals/review', [AdminAnimalReviewController::class, 'index']);
            Route::patch('/animals/{animal}/legal-status', [AdminAnimalReviewController::class, 'updateStatus'])->middleware('admin_mfa');
            Route::get('/orders', [AdminOrdersController::class, 'index']);
            Route::get('/moderation', [AdminModerationController::class, 'index']);
            Route::get('/moderation/{type}', [AdminModerationController::class, 'marketplaceSection']);
            Route::delete('/posts/{post}', [AdminModerationController::class, 'destroyPost'])->middleware('admin_mfa');
            Route::delete('/animals/{animal}', [AdminModerationController::class, 'destroyAnimal'])->middleware('admin_mfa');
            Route::delete('/products/{product}', [AdminModerationController::class, 'destroyProduct'])->middleware('admin_mfa');
            Route::delete('/communities/{community}', [AdminModerationController::class, 'destroyCommunity'])->middleware('admin_mfa');
        });
    });
});
