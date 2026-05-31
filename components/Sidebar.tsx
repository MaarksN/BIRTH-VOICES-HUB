import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  Building2,
  ClipboardList,
  Code2,
  CreditCard,
  FlaskConical,
  Home,
  LogOut,
  Mic,
  PhoneCall,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { auth } from '../lib/auth';

type SidebarProps = {
  onNavigate?: () => void;
};

const navGroups = [
  {
    label: 'Operação',
    items: [
      { path: '/dashboard', label: 'Visão Geral', icon: Home, exact: true },
      { path: '/dashboard/agents/new', label: 'Agentes', icon: Bot },
      { path: '/dashboard/playground', label: 'Playground', icon: FlaskConical },
      { path: '/dashboard/results', label: 'Resultados', icon: ClipboardList },
      { path: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
      { path: '/dashboard/telephony', label: 'Telefonia', icon: PhoneCall },
    ],
  },
  {
    label: 'Plataforma',
    items: [
      { path: '/dashboard/billing', label: 'Faturamento', icon: CreditCard },
      { path: '/dashboard/developers', label: 'Developers', icon: Code2 },
      { path: '/dashboard/organization', label: 'Organização', icon: Building2 },
      { path: '/dashboard/admin', label: 'Admin', icon: Settings },
    ],
  },
];

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const user = auth.getUser();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItemClass = (path: string, exact?: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
      isActive(path, exact)
        ? 'bg-brand text-white shadow-sm shadow-black/10'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <aside className="flex h-full min-h-screen w-72 shrink-0 flex-col overflow-y-auto bg-slate-950 p-4 text-white lg:w-64">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="rounded-lg bg-brand p-2 shadow-lg shadow-brand-900/20">
          <Mic className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-none">Birth Voices</h1>
          <span className="text-xs text-slate-400">Hub de agentes de voz</span>
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.04] p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Operação real</span>
        <p className="mt-2 text-xs leading-relaxed text-slate-300">
          Métricas aparecem depois que agentes e sessões forem criados no backend.
        </p>
      </div>

      <nav className="flex-1 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={navItemClass(item.path, item.exact)}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-5 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-amber-100">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
          <ShieldCheck className="h-4 w-4" />
          Integrações
        </div>
        <p className="mt-2 text-xs leading-relaxed text-amber-50/80">
          Configure um webhook em Developers para entregar sessões automaticamente.
        </p>
      </div>

      <div className="mt-4 border-t border-slate-800 pt-4">
        <div className="px-3 py-2">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Workspace</p>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden text-sm">
              <p className="text-white truncate">{user?.name || 'Usuário'}</p>
              <p className="text-slate-500 text-xs truncate">{user?.company || 'Organização'}</p>
            </div>
          </div>
          <button onClick={() => auth.logout()} className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-slate-400 transition-colors hover:bg-slate-900 hover:text-white">
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
