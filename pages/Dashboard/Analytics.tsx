import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Bot, Clock, Loader2, PieChart } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDuration, parseDurationToSeconds } from '../../lib/format';
import { SessionRecord, StoredAgent } from '../../types';

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [agents, setAgents] = useState<StoredAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [sessionsResponse, agentsResponse] = await Promise.all([
          api.listSessions(),
          api.listAgents(),
        ]);

        if (!cancelled) {
          setSessions(sessionsResponse.sessions);
          setAgents(agentsResponse.agents);
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

  const stats = useMemo(() => {
    const totalSeconds = sessions.reduce((sum, session) => sum + parseDurationToSeconds(session.duration), 0);
    const delivered = sessions.filter((session) => session.integrationDelivery?.status === 'delivered').length;
    const highRisk = sessions.filter((session) => session.riskLevel === 'Alto').length;
    const averageScore = sessions.length
      ? Math.round(sessions.reduce((sum, session) => sum + session.score, 0) / sessions.length)
      : 0;

    return {
      total: sessions.length,
      averageDuration: sessions.length ? formatDuration(totalSeconds / sessions.length) : '00:00',
      deliveredRate: sessions.length ? Math.round((delivered / sessions.length) * 100) : 0,
      highRisk,
      averageScore,
    };
  }, [sessions]);

  const byAgent = agents.map((agent) => {
    const agentSessions = sessions.filter((session) => session.agentName === agent.name);
    const averageScore = agentSessions.length
      ? Math.round(agentSessions.reduce((sum, session) => sum + session.score, 0) / agentSessions.length)
      : 0;
    return {
      agent,
      total: agentSessions.length,
      averageScore,
      delivered: agentSessions.filter((session) => session.integrationDelivery?.status === 'delivered').length,
    };
  });

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Calculando analytics reais...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-brand">Analytics</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Performance real</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Indicadores calculados a partir das sessões salvas. Sem amostras artificiais.</p>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BarChart3} label="Sessões" value={stats.total.toString()} />
        <StatCard icon={Clock} label="Duração média" value={stats.averageDuration} />
        <StatCard icon={PieChart} label="Entrega CRM/ATS" value={`${stats.deliveredRate}%`} />
        <StatCard icon={Activity} label="Risco alto" value={stats.highRisk.toString()} />
      </div>

      {!sessions.length ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Salve sessões no playground para liberar gráficos e ranking por agente.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-950">Distribuição por agente</h2>
            <div className="mt-5 space-y-4">
              {byAgent.map(({ agent, total, averageScore }) => {
                const width = stats.total ? Math.max(4, Math.round((total / stats.total) * 100)) : 0;
                return (
                  <div key={agent.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-700">{agent.name}</span>
                      <span className="text-slate-500">{total} sessões · score {averageScore}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div className="h-3 rounded-full bg-brand" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-950">Qualidade geral</h2>
            <div className="mt-5 space-y-4">
              <Quality label="Score médio" value={stats.averageScore} />
              <Quality label="Entrega CRM/ATS" value={stats.deliveredRate} />
              <Quality label="Sem risco alto" value={stats.total ? Math.round(((stats.total - stats.highRisk) / stats.total) * 100) : 0} />
            </div>
          </section>
        </div>
      )}
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
        <div className="text-2xl font-black text-slate-950">{value}</div>
      </div>
    </div>
  );
}

function Quality({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="font-black text-slate-950">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
