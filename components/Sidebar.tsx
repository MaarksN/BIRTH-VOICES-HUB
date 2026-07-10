import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, BarChart3, Mic, Settings, BookOpen, CreditCard, Code, Building2 } from 'lucide-react';
import { auth } from '../lib/auth';

export function Sidebar() {
  const location = useLocation();
  const user = auth.getUser();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItemClass = (path: string) => 
    `flex items-center gap-3 p-3 rounded-lg transition-colors ${
      isActive(path) 
        ? 'bg-blue-900 text-white' 
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col p-4 shrink-0 overflow-y-auto">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="p-2 bg-brand rounded-lg">
          <Mic className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none">Birth Voices</h1>
          <span className="text-xs text-slate-400">Hub</span>
        </div>
      </div>
      <nav className="space-y-1 flex-1">
        <Link href="/dashboard" to="/dashboard" className={navItemClass('/dashboard')}>
          <Home className="h-5 w-5" />
          <span>Visão Geral</span>
        </Link>
        <Link href="/dashboard/agents/new" to="/dashboard/agents/new" className={navItemClass('/dashboard/agents')}>
          <Users className="h-5 w-5" />
          <span>Agentes</span>
        </Link>
        <Link href="/dashboard/playground" to="/dashboard/playground" className={navItemClass('/dashboard/playground')}>
          <BookOpen className="h-5 w-5" />
          <span>Playground</span>
        </Link>
        <Link href="/dashboard/results" to="/dashboard/results" className={navItemClass('/dashboard/results')}>
          <BarChart3 className="h-5 w-5" />
          <span>Resultados</span>
        </Link>
        <Link href="/dashboard/analytics" to="/dashboard/analytics" className={navItemClass('/dashboard/analytics')}>
          <BarChart3 className="h-5 w-5" />
          <span>Analytics</span>
        </Link>
        <Link href="/dashboard/telephony" to="/dashboard/telephony" className={navItemClass('/dashboard/telephony')}>
          <Mic className="h-5 w-5" />
          <span>Telefonia</span>
        </Link>
        <Link href="/dashboard/billing" to="/dashboard/billing" className={navItemClass('/dashboard/billing')}>
          <CreditCard className="h-5 w-5" />
          <span>Faturamento</span>
        </Link>
        <Link href="/dashboard/developers" to="/dashboard/developers" className={navItemClass('/dashboard/developers')}>
          <Code className="h-5 w-5" />
          <span>Developers</span>
        </Link>
        <Link href="/dashboard/organization" to="/dashboard/organization" className={navItemClass('/dashboard/organization')}>
          <Building2 className="h-5 w-5" />
          <span>Organização</span>
        </Link>
        <Link href="/dashboard/admin" to="/dashboard/admin" className={navItemClass('/dashboard/admin')}>
          <Settings className="h-5 w-5" />
          <span>Admin</span>
        </Link>
      </nav>

      <div className="mt-auto pt-4 border-t border-slate-800">
        <div className="px-3 py-2">
          <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Workspace</p>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-sm font-bold">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="text-sm overflow-hidden">
              <p className="text-white truncate">{user?.name || 'Usuário Demo'}</p>
              <p className="text-slate-500 text-xs truncate">{user?.company || 'Admin'}</p>
            </div>
          </div>
          <button onClick={() => auth.logout()} className="text-xs text-slate-400 hover:text-white mt-2 w-full text-left">
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}