import React, { useEffect, useState } from 'react';
import { Activity, Bot, Database, Loader2, Server } from 'lucide-react';
import { api } from '../../lib/api';
import { RuntimeStatus, SessionRecord, StoredAgent } from '../../types';

export default function AdminPage() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [agents, setAgents] = useState<StoredAgent[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [statusResponse, agentsResponse, sessionsResponse] = await Promise.all([
          api.status(),
          api.listAgents(),
          api.listSessions(),
        ]);

        if (!cancelled) {
          setStatus(statusResponse);
          setAgents(agentsResponse.agents);
          setSessions(sessionsResponse.sessions);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando estado do sistema...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-brand">Admin</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Estado real da instalação</h1>
        <p className="mt-2 text-slate-600">Visão operacional baseada no backend e no arquivo de persistência local.</p>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Server} label="API" value="Online" />
        <StatCard icon={Bot} label="Agentes" value={agents.length.toString()} />
        <StatCard icon={Activity} label="Sessões" value={sessions.length.toString()} />
        <StatCard icon={Database} label="Gemini" value={status?.geminiConfigured ? 'Configurado' : 'Pendente'} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold text-slate-950">Armazenamento</h2>
        </div>
        <div className="p-5">
          <p className="break-all rounded-lg bg-slate-50 p-4 font-mono text-sm text-slate-700">{status?.storage}</p>
          <p className="mt-3 text-sm text-slate-500">
            Este arquivo contém usuários, agentes, sessões e configurações de integração desta instalação.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold text-slate-950">Últimas sessões</h2>
        </div>
        {sessions.length ? (
          <div className="divide-y divide-slate-100">
            {sessions.slice(0, 5).map((session) => (
              <div key={session.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-mono text-xs font-bold text-slate-500">{session.id}</p>
                  <p className="font-bold text-slate-900">{session.agentName}</p>
                </div>
                <span className="text-sm text-slate-500">{session.integrationDelivery?.status || 'sem entrega'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">Nenhuma sessão registrada.</div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-xl font-black text-slate-950">{value}</div>
      </div>
    </div>
  );
}
