import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import LiveStreamBanner from './components/LiveStreamBanner';
import AnnouncementBar from './components/AnnouncementBar';
import MobileLanguageFAB from './components/MobileLanguageFAB';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { PostHogPageView } from './providers/PostHogProvider';
import { OrganizationProvider } from './contexts/OrganizationContext';

const HomePage = lazy(() => import('./pages/HomePage'));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const WatchPage = lazy(() => import('./pages/WatchPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const RankingsPage = lazy(() => import('./pages/RankingsPage'));
const CompetitorProfilePage = lazy(() => import('./pages/CompetitorProfilePage'));
const CompetitorsPage = lazy(() => import('./pages/CompetitorsPage'));
const TeamsPage = lazy(() => import('./pages/TeamsPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const RulesPage = lazy(() => import('./pages/RulesPage'));
const PastEventsPage = lazy(() => import('./pages/PastEventsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Admin — eagerly imported so page transitions are instant
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import EventsAdmin from './pages/admin/EventsAdmin';
import SponsorsAdmin from './pages/admin/SponsorsAdmin';
import VideosAdmin from './pages/admin/VideosAdmin';
import UsersAdmin from './pages/admin/UsersAdmin';
import ImagesAdmin from './pages/admin/ImagesAdmin';
import SettingsAdmin from './pages/admin/SettingsAdmin';
import ContentAdmin from './pages/admin/ContentAdmin';
import CompetitorsAdmin from './pages/admin/CompetitorsAdmin';
import AcademiesAdmin from './pages/admin/AcademiesAdmin';
import AnnouncementsAdmin from './pages/admin/AnnouncementsAdmin';
import EventResultsAdmin from './pages/admin/EventResultsAdmin';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Suspense fallback={<LoadingSpinner />}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/event" element={<EventDetailPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/competitors" element={<CompetitorsPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/competitors/profile" element={<CompetitorProfilePage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/watch" element={<WatchPage />} />
            <Route path="/events/past" element={<PastEventsPage />} />
            <Route path="/events/:slug" element={<EventDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <PostHogPageView />
      <ScrollToTop />
      <Routes>
        {/* Admin routes — no Header/Footer */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRole="staff">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="events" element={<EventsAdmin />} />
          <Route path="events/:eventId/results" element={<EventResultsAdmin />} />
          <Route path="sponsors" element={<SponsorsAdmin />} />
          <Route path="videos" element={<VideosAdmin />} />
          <Route path="competitors" element={<CompetitorsAdmin />} />
          <Route path="academies" element={<AcademiesAdmin />} />
          <Route path="images" element={<ImagesAdmin />} />
          <Route
            path="users"
            element={(
              <ProtectedRoute requiredRole="admin">
                <UsersAdmin />
              </ProtectedRoute>
            )}
          />
          <Route path="announcements" element={<AnnouncementsAdmin />} />
          <Route path="content" element={<ContentAdmin />} />
          <Route path="settings" element={<SettingsAdmin />} />
        </Route>

        {/* Public routes with Header/Footer */}
        <Route
          path="*"
          element={
            <OrganizationProvider>
              <div className="min-h-screen bg-navy-900 text-text-primary">
                <Header />
                <LiveStreamBanner />
                <AnnouncementBar />
                <main>
                  <AnimatedRoutes />
                </main>
                <Footer />
                <MobileLanguageFAB />
              </div>
            </OrganizationProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
