import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import App from './App';

const lazyAuth = vi.hoisted(() => vi.fn());
vi.mock('./components/auth/AdminAuthBoundary', () => {
  lazyAuth();
  return { default: ({ children }: { children: ReactNode }) => <>{children}</> };
});
vi.mock('./components/Header', async () => {
  const { Link } = await import('react-router-dom');
  return { default: () => <><Link to="/admin">Admin test entry</Link><Link to="/competitors/1">First profile</Link><Link to="/competitors/2">Second profile</Link></> };
});
vi.mock('./components/Footer', () => ({ default: () => null }));
vi.mock('./components/LiveStreamBanner', () => ({ default: () => null }));
vi.mock('./components/AnnouncementBar', () => ({ default: () => null }));
vi.mock('./providers/PostHogProvider', () => ({ PostHogPageView: () => null }));
vi.mock('./contexts/OrganizationContext', () => ({ OrganizationProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('./contexts/EventsContext', () => ({ EventsProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('./pages/HomePage', () => ({ default: () => <h1>Public home</h1> }));
vi.mock('./pages/CompetitorProfilePage', async () => {
  const { useParams } = await import('react-router-dom');
  const { useState } = await import('react');
  return { default: function Profile() { const { id } = useParams(); const [loadedId] = useState(id); return <h1>Profile {loadedId}</h1>; } };
});
vi.mock('./pages/AcademyPage', () => ({ default: () => null }));
vi.mock('./components/auth/ProtectedRoute', () => ({ default: ({ children }: { children: ReactNode }) => children }));
vi.mock('./layouts/AdminLayout', async () => {
  const { Outlet } = await import('react-router-dom');
  return { default: () => <Outlet /> };
});
vi.mock('./pages/admin/AdminDashboard', () => ({ default: () => <h1>Admin dashboard</h1> }));
afterEach(cleanup);

it('does not import Clerk boundary on a public route, but loads it for client-side /admin navigation', async () => {
  window.history.replaceState(null, '', '/');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<App />);
  await screen.findByRole('heading', { name: 'Public home' });
  expect(lazyAuth).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('link', { name: 'Admin test entry' }));
  await screen.findByRole('heading', { name: 'Admin dashboard' });
  expect(lazyAuth).toHaveBeenCalledTimes(1);
});

it('remounts public profiles when path parameters change without delaying navigation for an exit animation', async () => {
  window.history.replaceState(null, '', '/competitors/1');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<App />);
  await screen.findByRole('heading', { name: 'Profile 1' });
  fireEvent.click(screen.getByRole('link', { name: 'Second profile' }));
  await screen.findByRole('heading', { name: 'Profile 2' });
  expect(screen.queryByRole('heading', { name: 'Profile 1' })).toBeNull();
});
