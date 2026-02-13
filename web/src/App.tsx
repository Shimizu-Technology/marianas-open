import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import MobileLanguageFAB from './components/MobileLanguageFAB';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';

const HomePage = lazy(() => import('./pages/HomePage'));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const WatchPage = lazy(() => import('./pages/WatchPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const RankingsPage = lazy(() => import('./pages/RankingsPage'));
const CompetitorProfilePage = lazy(() => import('./pages/CompetitorProfilePage'));
const CompetitorsPage = lazy(() => import('./pages/CompetitorsPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PastEventsPage = lazy(() => import('./pages/PastEventsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Admin
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const EventsAdmin = lazy(() => import('./pages/admin/EventsAdmin'));
const SponsorsAdmin = lazy(() => import('./pages/admin/SponsorsAdmin'));
const VideosAdmin = lazy(() => import('./pages/admin/VideosAdmin'));
const UsersAdmin = lazy(() => import('./pages/admin/UsersAdmin'));
const ImagesAdmin = lazy(() => import('./pages/admin/ImagesAdmin'));
const SettingsAdmin = lazy(() => import('./pages/admin/SettingsAdmin'));
const ContentAdmin = lazy(() => import('./pages/admin/ContentAdmin'));
const CompetitorsAdmin = lazy(() => import('./pages/admin/CompetitorsAdmin'));

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
            <Route path="/competitors/profile" element={<CompetitorProfilePage />} />
            <Route path="/terms" element={<TermsPage />} />
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
      <ScrollToTop />
      <Routes>
        {/* Admin routes — no Header/Footer */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRole="staff">
              <Suspense fallback={<LoadingSpinner />}>
                <AdminLayout />
              </Suspense>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="events" element={<EventsAdmin />} />
          <Route path="sponsors" element={<SponsorsAdmin />} />
          <Route path="videos" element={<VideosAdmin />} />
          <Route path="competitors" element={<CompetitorsAdmin />} />
          <Route path="images" element={<ImagesAdmin />} />
          <Route path="users" element={<UsersAdmin />} />
          <Route path="content" element={<ContentAdmin />} />
          <Route path="settings" element={<SettingsAdmin />} />
        </Route>

        {/* Public routes with Header/Footer */}
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-navy-900 text-text-primary">
              <Header />
              <main>
                <AnimatedRoutes />
              </main>
              <Footer />
              <MobileLanguageFAB />
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
