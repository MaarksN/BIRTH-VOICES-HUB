import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, BarChart3, Mic, Settings, BookOpen, CreditCard, Code, Building2, Search, Sun, Moon, Laptop } from 'lucide-react';
import { auth } from '../lib/auth';
import { useTheme } from './design-system/ThemeContext';

export function Sidebar() {
  const location = useLocation();
  const user = auth.getUser();
  const { theme, setTheme } = useTheme();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItemClass = (path: string) => 
    `flex items-center gap-3 p-3 rounded-lg transition-all ${
      isActive(path) 
        ? 'text-white font-semibold shadow-xs' 
        : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
    }`;

  const navItemStyle = (path: string) => 
    isActive(path) ? { backgroundColor: 'var(--brand-color)' } : {};

  const triggerSearch = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col p-4 shrink-0 overflow-y-auto border-r border-slate-850">
      <div className="mb-4 flex items-center gap-3 px-2">
        <div className="p-2 bg-brand rounded-lg">
          <Mic className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none">Birth Voices</h1>
          <span className="text-xs text-slate-400">Hub</span>
        </div>
      </div>

      {/* Enterprise-grade Command Palette trigger */}
      <button 
        onClick={triggerSearch}
        className="mb-6 flex items-center justify-between gap-2 px-3 py-2 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-300 rounded-lg text-xs transition-colors border border-slate-800 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5" />
          <span>Pesquisar...</span>
        </div>
        <kbd className="px-1.5 py-0.5 font-mono text-[9px] bg-slate-800 border border-slate-750 text-slate-400 rounded">
          Ctrl+K
        </kbd>
      </button>

      <nav className="space-y-1 flex-1">
        <Link href="/dashboard" to="/dashboard" className={navItemClass('/dashboard')} style={navItemStyle('/dashboard')}>
          <Home className="h-5 w-5" />
          <span>Visão Geral</span>
        </Link>
        <Link href="/dashboard/agents/new" to="/dashboard/agents/new" className={navItemClass('/dashboard/agents/new')} style={navItemStyle('/dashboard/agents/new')}>
          <Users className="h-5 w-5" />
          <span>Agentes</span>
        </Link>
        <Link href="/dashboard/playground" to="/dashboard/playground" className={navItemClass('/dashboard/playground')} style={navItemStyle('/dashboard/playground')}>
          <BookOpen className="h-5 w-5" />
          <span>Playground</span>
        </Link>
        <Link href="/dashboard/results" to="/dashboard/results" className={navItemClass('/dashboard/results')} style={navItemStyle('/dashboard/results')}>
          <BarChart3 className="h-5 w-5" />
          <span>Resultados</span>
        </Link>
        <Link href="/dashboard/analytics" to="/dashboard/analytics" className={navItemClass('/dashboard/analytics')} style={navItemStyle('/dashboard/analytics')}>
          <BarChart3 className="h-5 w-5" />
          <span>Analytics</span>
        </Link>
        <Link href="/dashboard/telephony" to="/dashboard/telephony" className={navItemClass('/dashboard/telephony')} style={navItemStyle('/dashboard/telephony')}>
          <Mic className="h-5 w-5" />
          <span>Telefonia</span>
        </Link>
        <Link href="/dashboard/billing" to="/dashboard/billing" className={navItemClass('/dashboard/billing')} style={navItemStyle('/dashboard/billing')}>
          <CreditCard className="h-5 w-5" />
          <span>Faturamento</span>
        </Link>
        <Link href="/dashboard/developers" to="/dashboard/developers" className={navItemClass('/dashboard/developers')} style={navItemStyle('/dashboard/developers')}>
          <Code className="h-5 w-5" />
          <span>Developers</span>
        </Link>
        <Link href="/dashboard/organization" to="/dashboard/organization" className={navItemClass('/dashboard/organization')} style={navItemStyle('/dashboard/organization')}>
          <Building2 className="h-5 w-5" />
          <span>Organização</span>
        </Link>
        <Link href="/dashboard/admin" to="/dashboard/admin" className={navItemClass('/dashboard/admin')} style={navItemStyle('/dashboard/admin')}>
          <Settings className="h-5 w-5" />
          <span>Admin</span>
        </Link>
        <Link href="/dashboard/docs" to="/dashboard/docs" className={navItemClass('/dashboard/docs')} style={navItemStyle('/dashboard/docs')}>
          <BookOpen className="h-5 w-5" />
          <span>Docs & Tokens</span>
        </Link>
      </nav>

      {/* Premium Theme Selector controls in sidebar */}
      <div className="py-2.5 px-2 mb-2 bg-slate-850/40 rounded-lg border border-slate-800/65 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aparência</span>
        <div className="flex gap-1">
          <button 
            onClick={() => setTheme('light')}
            className={`p-1.5 rounded transition-colors ${theme === 'light' ? 'bg-brand text-white' : 'text-slate-500 hover:text-slate-350 hover:bg-slate-800/40'}`}
            title="Tema Claro"
          >
            <Sun className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={() => setTheme('dark')}
            className={`p-1.5 rounded transition-colors ${theme === 'dark' ? 'bg-brand text-white' : 'text-slate-500 hover:text-slate-350 hover:bg-slate-800/40'}`}
            title="Tema Escuro"
          >
            <Moon className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={() => setTheme('system')}
            className={`p-1.5 rounded transition-colors ${theme === 'system' ? 'bg-brand text-white' : 'text-slate-500 hover:text-slate-350 hover:bg-slate-800/40'}`}
            title="Tema do Sistema"
          >
            <Laptop className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-850">
        <div className="px-3 py-2">
          <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Workspace</p>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-sm font-bold">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="text-sm overflow-hidden">
              <p className="text-white truncate">{user?.name || 'Usuário Demo'}</p>
              <p className="text-slate-550 text-xs truncate">{user?.company || 'Admin'}</p>
            </div>
          </div>
          <button onClick={() => auth.logout()} className="text-xs text-slate-400 hover:text-white mt-2 w-full text-left font-semibold">
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}