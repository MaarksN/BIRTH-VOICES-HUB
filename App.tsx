import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import LandingPage from './pages/Landing';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import Overview from './pages/Dashboard/Overview';
import AdminPage from './pages/Dashboard/Admin';
import AnalyticsPage from './pages/Dashboard/Analytics';
import BillingPage from './pages/Dashboard/Billing';
import DevelopersPage from './pages/Dashboard/Developers';
import OrganizationPage from './pages/Dashboard/Organization';
import PlaygroundPage from './pages/Dashboard/Playground';
import TelephonyPage from './pages/Dashboard/Telephony';
import ResultsPage from './pages/Dashboard/Results';
import DesignSystemDocs from './pages/Dashboard/Docs';
import PreferencesPage from './pages/Dashboard/Preferences';
import AgentRegistry from './pages/Dashboard/AgentRegistry';
import AgentOS from './pages/Dashboard/AgentOS';
import KnowledgeManager from './pages/Dashboard/KnowledgeManager';
import ToolRegistry from './pages/Dashboard/ToolRegistry';
import AgentMarketplace from './pages/Dashboard/AgentMarketplace';
import ObservabilityPage from './pages/Dashboard/Observability';
import GovernancePage from './pages/Dashboard/Governance';
import { Sidebar } from './components/Sidebar';
import { AgentForm } from './components/AgentForm';
import { auth } from './lib/auth';
import { useSessionStore, applyBrandColorToDom } from './store/useSessionStore';
import { ThemeProvider } from './components/design-system/ThemeContext';
import { ErrorBoundary } from './components/design-system/ErrorBoundary';
import { CommandPalette } from './components/design-system/CommandPalette';
import { GlobalHelpCenter } from './components/GlobalHelpCenter';

const DashboardLayout = () => {
  // Simple auth check
  const isAuthenticated = !!auth.getToken();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

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

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-200">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
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

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Router>
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
            </Route>
          </Routes>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
