import React, { useEffect, useState, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Outlet, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { AgentForm } from './components/AgentForm';
import { auth, installSessionExpiryWatcher } from './lib/auth';
import { useSessionStore, applyBrandColorToDom } from './store/useSessionStore';
import { ThemeProvider } from './components/design-system/ThemeContext';
import { ErrorBoundary } from './components/design-system/ErrorBoundary';
import { CommandPalette } from './components/design-system/CommandPalette';
import { GlobalHelpCenter } from './components/GlobalHelpCenter';

// Route-level code splitting: each page ships as its own chunk instead of one
// monolithic bundle, so the initial load only pays for Landing/Login/Register.
const LandingPage = lazy(() => import('./pages/Landing'));
const LoginPage = lazy(() => import('./pages/Login'));
const RegisterPage = lazy(() => import('./pages/Register'));
const Overview = lazy(() => import('./pages/Dashboard/Overview'));
const AdminPage = lazy(() => import('./pages/Dashboard/Admin'));
const AnalyticsPage = lazy(() => import('./pages/Dashboard/Analytics'));
const BillingPage = lazy(() => import('./pages/Dashboard/Billing'));
const DevelopersPage = lazy(() => import('./pages/Dashboard/Developers'));
const OrganizationPage = lazy(() => import('./pages/Dashboard/Organization'));
const PlaygroundPage = lazy(() => import('./pages/Dashboard/Playground'));
const TelephonyPage = lazy(() => import('./pages/Dashboard/Telephony'));
const ResultsPage = lazy(() => import('./pages/Dashboard/Results'));
const DesignSystemDocs = lazy(() => import('./pages/Dashboard/Docs'));
const PreferencesPage = lazy(() => import('./pages/Dashboard/Preferences'));
const AgentRegistry = lazy(() => import('./pages/Dashboard/AgentRegistry'));
const AgentOS = lazy(() => import('./pages/Dashboard/AgentOS'));
const KnowledgeManager = lazy(() => import('./pages/Dashboard/KnowledgeManager'));
const ToolRegistry = lazy(() => import('./pages/Dashboard/ToolRegistry'));
const AgentMarketplace = lazy(() => import('./pages/Dashboard/AgentMarketplace'));
const ObservabilityPage = lazy(() => import('./pages/Dashboard/Observability'));
const GovernancePage = lazy(() => import('./pages/Dashboard/Governance'));
const VoiceStudioPage = lazy(() => import('./pages/Dashboard/VoiceStudio'));
const SupervisionPage = lazy(() => import('./pages/Dashboard/Supervision'));

const RouteFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
  </div>
);

// Shown for any dashboard sub-path that doesn't match a known route (typo'd bookmark, stale
// link from another module, removed page) instead of silently rendering a blank <Outlet />.
const DashboardNotFound = () => (
  <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
    <p className="text-sm font-bold uppercase tracking-wider text-slate-400">Página não encontrada</p>
    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Este endereço não existe no painel.</h1>
    <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
      Verifique o link ou volte para a Visão Geral.
    </p>
    <Link
      to="/dashboard"
      className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90"
    >
      Voltar para a Visão Geral
    </Link>
  </div>
);

// Shown for any top-level path outside /, /login, /register and /dashboard/*.
const AppNotFound = () => (
  <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-slate-900 p-4 text-center text-white">
    <p className="text-sm font-bold uppercase tracking-wider text-slate-400">Erro 404</p>
    <h1 className="text-2xl font-bold">Página não encontrada</h1>
    <Link to="/" className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90">
      Voltar ao início
    </Link>
  </div>
);

const DashboardLayout = () => {
  const navigate = useNavigate();
  const hasCookieSession = !!auth.getToken();
  const sessionStatus = useSessionStore((state) => state.sessionStatus);
  const fetchSession = useSessionStore((state) => state.fetchSession);
  const clearSession = useSessionStore((state) => state.clearSession);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Resolve who is actually logged in (id/email/role/tenantId) once per mount so the shell
  // (Sidebar, breadcrumbs, role-gated actions) reflects real session state instead of a cookie
  // that only proves "some session exists", not who it belongs to.
  useEffect(() => {
    if (hasCookieSession && sessionStatus === 'idle') {
      fetchSession();
    }
  }, [hasCookieSession, sessionStatus, fetchSession]);

  // Any authenticated API call anywhere in the dashboard that comes back 401 (expired/revoked
  // session) fires this event — react by clearing local session state and bouncing to /login
  // instead of leaving the current page stuck showing stale data against a dead session.
  useEffect(() => {
    const handleExpired = () => {
      clearSession();
      navigate('/login', { replace: true });
    };
    window.addEventListener('session-expired', handleExpired);
    return () => window.removeEventListener('session-expired', handleExpired);
  }, [navigate, clearSession]);

  useEffect(() => {
    const handleOpen = () => setIsPaletteOpen(true);
    const handleToggle = () => setIsPaletteOpen(prev => !prev);

    window.addEventListener('open-command-palette', handleOpen);
    window.addEventListener('toggle-command-palette', handleToggle);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-command-palette', handleOpen);
      window.removeEventListener('toggle-command-palette', handleToggle);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const location = useLocation();
  const isFullWidth = location.pathname.includes('/studio') || location.pathname.includes('/playground') || location.pathname.includes('/supervision');

  if (!hasCookieSession) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-200">
      <Sidebar />
      <main className="flex-1 overflow-auto flex flex-col">
        <div className={`${isFullWidth ? 'flex-1 flex flex-col' : 'max-w-7xl mx-auto p-8 w-full'}`}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
      <GlobalHelpCenter />
    </div>
  );
};

export default function App() {
  const brandColor = useSessionStore((state) => state.brandColor);

  useEffect(() => {
    applyBrandColorToDom(brandColor);
  }, [brandColor]);

  useEffect(() => {
    installSessionExpiryWatcher();
  }, []);

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Router>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="agents" element={<AgentRegistry />} />
              <Route path="agents/new" element={
                <div className="max-w-4xl mx-auto">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-8 font-sans">Novo Agente</h1>
                  <AgentForm />
                </div>
              } />
              <Route path="agents/:id/*" element={<AgentOS />} />
              <Route path="knowledge" element={<KnowledgeManager />} />
              <Route path="tools" element={<ToolRegistry />} />
              <Route path="marketplace" element={<AgentMarketplace />} />
              <Route path="observability" element={<ObservabilityPage />} />
              <Route path="supervision" element={<SupervisionPage />} />
              <Route path="studio" element={<VoiceStudioPage />} />
              <Route path="governance" element={<GovernancePage />} />
              <Route path="playground" element={<PlaygroundPage />} />
              
              <Route path="admin" element={<AdminPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="developers" element={<DevelopersPage />} />
              <Route path="organization" element={<OrganizationPage />} />
              <Route path="telephony" element={<TelephonyPage />} />
              <Route path="results" element={<ResultsPage />} />
              <Route path="docs" element={<DesignSystemDocs />} />
              <Route path="preferences" element={<PreferencesPage />} />

              {/* Unmatched dashboard sub-route: no link in the shell should ever produce this,
                  but a stale bookmark, old email link, or a removed page must not render a
                  blank <Outlet /> — send the user somewhere useful with an explanation. */}
              <Route path="*" element={<DashboardNotFound />} />
            </Route>

            {/* Unmatched top-level route (outside /, /login, /register, /dashboard/*). */}
            <Route path="*" element={<AppNotFound />} />
          </Routes>
          </Suspense>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
