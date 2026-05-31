import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  PhoneCall,
  Plus,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDuration, parseDurationToSeconds, riskClass, sentimentClass } from '../../lib/format';
import { RuntimeStatus, SessionRecord, StoredAgent } from '../../types';

export default function Overview() {
  const [agents, setAgents] = useState<StoredAgent[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [agentsResponse, sessionsResponse, runtimeResponse] = await Promise.all([
          api.listAgents(),
          api.listSessions(),
          api.status(),
        ]);

        if (!cancelled) {
          setAgents(agentsResponse.agents);
          setSessions(sessionsResponse.sessions);
          setStatus(runtimeResponse);
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

  const metrics = useMemo(() => {
    const totalSeconds = sessions.reduce((sum, session) => sum + parseDurationToSeconds(session.duration), 0);
    const highRisk = sessions.filter((session) => session.riskLevel === 'Alto').length;
    const averageScore = sessions.length
      ? Math.round(sessions.reduce((sum, session) => sum + session.score, 0) / sessions.length)
      : 0;
    const structured = sessions.length
      ? Math.round((sessions.filter((session) => session.extracted.length > 0).length / sessions.length) * 100)
      : 0;

    return [
      { label: 'Sessões registradas', value: sessions.length.toString(), helper: 'criadas pela sua operação', icon: PhoneCall },
      { label: 'Agentes cadastrados', value: agents.length.toString(), helper: 'configurados por você', icon: Bot },
      { label: 'Tempo médio', value: sessions.length ? formatDuration(totalSeconds / sessions.length) : '00:00', helper: 'calculado das sessões', icon: Clock },
      { label: 'Alertas de risco', value: highRisk.toString(), helper: `score médio ${averageScore || 0} · ${structured}% estruturado`, icon: AlertTriangle, danger: highRisk > 0 },
    ];
  }, [agents.length, sessions]);

  const highRiskSessions = sessions.filter((session) => session.riskLevel === 'Alto');
  const recentSessions = sessions.slice(0, 5);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando dados reais da plataforma...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">Command Center</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Visão Geral</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Métricas calculadas somente a partir de agentes e sessões reais cadastrados nesta instalação.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            to="/dashboard/results"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-brand hover:text-brand"
          >
            Ver sessões
          </Link>
          <Link
            to="/dashboard/agents/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
          >
            Criar agente
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <React.Fragment key={metric.label}>
            <MetricCard metric={metric} />
          </React.Fragment>
        ))}
      </div>

      {!agents.length && !sessions.length && (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50 text-brand">
            <Bot className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-950">Sua operação ainda não tem dados</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Crie um agente, teste no playground e salve uma sessão real. A partir daí esta visão passa a calcular tudo automaticamente.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/dashboard/agents/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">
              <Plus className="h-4 w-4" />
              Criar primeiro agente
            </Link>
            <Link to="/dashboard/playground" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">
              Abrir playground
            </Link>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-950">Sessões recentes</h2>
              <p className="text-sm text-slate-500">Chamadas salvas por você ou por integrações futuras.</p>
            </div>
            <Link to="/dashboard/results" className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:opacity-80">
              Ver todas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recentSessions.length ? (
            <div className="divide-y divide-slate-100">
              {recentSessions.map((session) => (
                <div key={session.id} className="grid gap-4 p-5 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">{session.id}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${sentimentClass[session.sentiment]}`}>
                          {session.sentiment}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${riskClass[session.riskLevel]}`}>
                          {session.riskLevel}
                        </span>
                      </div>
                      <p className="mt-1 font-bold text-slate-950">{session.agentName}</p>
                      <p className="mt-1 line-clamp-1 text-sm text-slate-500">{session.summary}</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">
                    <Clock className="mr-1 inline h-4 w-4" />
                    {session.duration}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel text="Nenhuma sessão registrada ainda." />
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Configuração real</h2>
            <div className="mt-4 space-y-3 text-sm">
              <StatusRow label="IA Gemini" ok={Boolean(status?.geminiConfigured)} okText="Configurada" failText="Defina GEMINI_API_KEY" />
              <StatusRow label="Webhook CRM/ATS" ok={Boolean(status?.integrationConfigured)} okText="Configurado" failText="Configure em Developers" />
              <StatusRow label="Telefonia" ok={Boolean(status?.telephonyConfigured)} okText="Configurada" failText="Sem credenciais" />
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">Armazenamento</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-700">{status?.storage}</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Ações pendentes</h2>
            {highRiskSessions.length ? (
              <div className="mt-4 space-y-3">
                {highRiskSessions.slice(0, 3).map((session) => (
                  <div key={session.id} className="rounded-lg border border-rose-100 bg-rose-50 p-3">
                    <p className="font-bold text-rose-900">{session.id}</p>
                    <p className="mt-1 text-sm text-rose-800/80">{session.followUp}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel text="Nenhum alerta de risco alto registrado." compact />
            )}
          </section>
        </aside>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-950">Agentes cadastrados</h2>
            <p className="text-sm text-slate-500">Configurações persistidas no backend local.</p>
          </div>
          <Link to="/dashboard/agents/new" className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:opacity-80">
            Gerenciar
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {agents.length ? (
          <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
            {agents.map((agent) => (
              <React.Fragment key={agent.id}>
                <AgentCard agent={agent} />
              </React.Fragment>
            ))}
          </div>
        ) : (
          <EmptyPanel text="Nenhum agente cadastrado ainda." />
        )}
      </section>
    </div>
  );
}

function MetricCard({ metric }: { metric: any }) {
  const Icon = metric.icon;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{metric.label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{metric.value}</p>
        </div>
        <div className={`rounded-lg p-2 ${metric.danger ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand'}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">{metric.helper}</p>
    </div>
  );
}

function AgentCard({ agent }: { agent: StoredAgent }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-brand shadow-sm">
          <Bot className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-black text-slate-950">{agent.name}</h3>
          <p className="text-sm text-slate-500">{agent.description}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <MiniStat label="Template" value={agent.template} />
        <MiniStat label="Perguntas" value={agent.questions.length.toString()} />
        <MiniStat label="Idioma" value={agent.language} />
        <MiniStat label="Atualizado" value={new Date(agent.updatedAt).toLocaleDateString('pt-BR')} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate font-black text-slate-950">{value}</p>
    </div>
  );
}

function StatusRow({ label, ok, okText, failText }: { label: string; ok: boolean; okText: string; failText: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
      <span className="font-medium text-slate-700">{label}</span>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
        {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        {ok ? okText : failText}
      </span>
    </div>
  );
}

function EmptyPanel({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <div className={`${compact ? 'p-4' : 'p-8'} text-center text-sm text-slate-500`}>
      {text}
    </div>
  );
}
