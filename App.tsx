import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { Menu, Mic } from 'lucide-react';
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
import { Sidebar } from './components/Sidebar';
import { AgentForm } from './components/AgentForm';
import { auth } from './lib/auth';
import { useSessionStore, applyBrandColorToDom } from './store/useSessionStore';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAuthenticated = !!auth.getToken();
  const user = auth.getUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 h-full w-72 max-w-[86vw]">
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg border border-slate-200 p-2 text-slate-700"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-brand p-2 text-white">
              <Mic className="h-4 w-4" />
            </span>
            <span className="font-bold text-slate-900">Birth Voices</span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
            {user?.name?.[0] || 'U'}
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  const brandColor = useSessionStore((state) => state.brandColor);
  
  useEffect(() => {
    applyBrandColorToDom(brandColor);
  }, [brandColor]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="developers" element={<DevelopersPage />} />
          <Route path="organization" element={<OrganizationPage />} />
          <Route path="playground" element={<PlaygroundPage />} />
          <Route path="telephony" element={<TelephonyPage />} />
          <Route path="agents/new" element={<div className="max-w-4xl mx-auto"><h1 className="text-3xl font-bold text-slate-900 mb-8">Novo Agente</h1><AgentForm /></div>} />
          <Route path="results" element={<ResultsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
