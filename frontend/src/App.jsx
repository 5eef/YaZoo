import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useAuth } from './hooks/useAuth'
import { useI18n } from './hooks/useI18n'
import CookieConsentBanner from './components/privacy/CookieConsentBanner'
import SeoManager from './components/seo/SeoManager'
import AdminRoute from './components/auth/AdminRoute'
import AppErrorBoundary from './components/errors/AppErrorBoundary'

const AdminModerationPage = lazy(() => import('./pages/AdminModerationPage'))
const AdminAnimalReviewPage = lazy(() => import('./pages/AdminAnimalReviewPage'))
const AdminModerationActionsPage = lazy(() => import('./pages/AdminModerationActionsPage'))
const AdminOrdersDashboardPage = lazy(() => import('./pages/AdminOrdersDashboardPage'))
const AdminProfessionalVerificationsPage = lazy(() => import('./pages/AdminProfessionalVerificationsPage'))
const AdminStatsPage = lazy(() => import('./pages/AdminStatsPage'))
const AdminSecurityPage = lazy(() => import('./pages/AdminSecurityPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const AccessibilityPage = lazy(() => import('./pages/AccessibilityPage'))
const AnimalDetailPage = lazy(() => import('./pages/AnimalDetailPage'))
const AnimalsMarketplacePage = lazy(() => import('./pages/AnimalsMarketplacePage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const CommunitiesPage = lazy(() => import('./pages/CommunitiesPage'))
const CommunityDetailPage = lazy(() => import('./pages/CommunityDetailPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const FeedPage = lazy(() => import('./pages/FeedPage'))
const InvoicePage = lazy(() => import('./pages/InvoicePage'))
const ImpactPage = lazy(() => import('./pages/ImpactPage'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const Layout = lazy(() => import('./layouts/Layout'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const MobileDemoPage = lazy(() => import('./pages/MobileDemoPage'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage'))
const PartnerPage = lazy(() => import('./pages/PartnerPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const PrivacySettingsPage = lazy(() => import('./pages/PrivacySettingsPage'))
const ProfessionalVerificationPage = lazy(() => import('./pages/ProfessionalVerificationPage'))
const PublicListingPage = lazy(() => import('./pages/PublicListingPage'))
const PublicMarketplacePage = lazy(() => import('./pages/PublicMarketplacePage'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'))
const ProductsMarketplacePage = lazy(() => import('./pages/ProductsMarketplacePage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const ProsPage = lazy(() => import('./pages/ProsPage'))
const PublishingRulesPage = lazy(() => import('./pages/PublishingRulesPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const ReservationsPage = lazy(() => import('./pages/ReservationsPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const ServicesMarketplacePage = lazy(() => import('./pages/ServicesMarketplacePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const TrustSafetyPage = lazy(() => import('./pages/TrustSafetyPage'))
const VeterinariansMarketplacePage = lazy(() => import('./pages/VeterinariansMarketplacePage'))
const VeterinarianAppointmentsPage = lazy(() => import('./pages/VeterinarianAppointmentsPage'))

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <AppErrorBoundary>
      <SeoManager />
      <Suspense fallback={<RouteLoader />}>
        <Routes>
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/feed" replace /> : <LandingPage />}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/cgu" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/trust" element={<TrustSafetyPage />} />
        <Route path="/rules" element={<PublishingRulesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/accessibility" element={<AccessibilityPage />} />
        <Route path="/impact" element={<ImpactPage />} />
        <Route path="/partner" element={<PartnerPage />} />
        <Route path="/pros" element={<ProsPage />} />
        <Route path="/demo-mobile" element={<MobileDemoPage />} />
        <Route path="/discover/:section" element={<PublicMarketplacePage />} />
        <Route path="/discover/:section/:listingId" element={<PublicListingPage />} />
        <Route element={<Layout />}>
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin/moderation" element={<AdminModerationPage />} />
            <Route path="/admin/moderation-actions" element={<AdminModerationActionsPage />} />
            <Route path="/admin/animals/review" element={<AdminAnimalReviewPage />} />
            <Route path="/admin/professional-verifications" element={<AdminProfessionalVerificationsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/orders" element={<AdminOrdersDashboardPage />} />
            <Route path="/admin/stats" element={<AdminStatsPage />} />
            <Route path="/admin/security" element={<AdminSecurityPage />} />
          </Route>
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/orders/history" element={<OrderHistoryPage />} />
          <Route path="/reservations/:reservationId/invoice" element={<InvoicePage />} />
          <Route
            path="/marketplace/products"
            element={<ProductsMarketplacePage />}
          />
          <Route
            path="/marketplace/products/:productId"
            element={<ProductDetailPage />}
          />
          <Route
            path="/marketplace/services"
            element={<ServicesMarketplacePage />}
          />
          <Route
            path="/marketplace/veterinarians"
            element={<VeterinariansMarketplacePage />}
          />
          <Route path="/veterinarian-appointments" element={<VeterinarianAppointmentsPage />} />
          <Route
            path="/marketplace/animals/:animalId"
            element={<AnimalDetailPage />}
          />
          <Route path="/marketplace/animals" element={<AnimalsMarketplacePage />} />
          <Route path="/marketplace" element={<AnimalsMarketplacePage />} />
          <Route path="/communities" element={<CommunitiesPage />} />
          <Route path="/communities/:communityId" element={<CommunityDetailPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/privacy" element={<PrivacySettingsPage />} />
          <Route path="/settings/professional-verification" element={<ProfessionalVerificationPage />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/feed' : '/'} replace />}
        />
        </Routes>
        <CookieConsentBanner />
      </Suspense>
    </AppErrorBoundary>
  )
}

function RouteLoader() {
  const { t } = useI18n()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_24%),linear-gradient(180deg,_#fffaff_0%,_#f7f1ff_100%)] px-4">
      <div className="rounded-[32px] border border-white/80 bg-white/92 px-6 py-5 text-center shadow-[0_20px_48px_rgba(124,58,237,0.08)]">
        <img
          src="/yazoo-logo.webp"
          alt={t('layout.logoLabel')}
          className="mx-auto h-14 w-14 object-contain"
        />
        <p className="mt-2 text-sm font-medium text-stone-700">
          {t('common.loadingExperience')}
        </p>
      </div>
    </div>
  )
}

export default App
