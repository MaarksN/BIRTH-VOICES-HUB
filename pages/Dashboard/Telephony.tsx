import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Phone, PhoneCall, RefreshCw, Send, Shield, Settings } from 'lucide-react';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';
import { RuntimeStatus, StoredAgent, TelephonyCall, TelephonyCallStatus } from '../../types';

export default function TelephonyPage() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [agents, setAgents] = useState<StoredAgent[]>([]);
  const [calls, setCalls] = useState<TelephonyCall[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [to, setTo] = useState('');
  const [caller, setCaller] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState('');

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) || null,
    [agents, selectedAgentId],
  );

  const load = async () => {
    setMessage('');
    try {
      const [runtimeResponse, agentsResponse, callsResponse] = await Promise.all([
        api.status(),
        api.listAgents(),
        api.listTelephonyCalls(),
      ]);
      setStatus(runtimeResponse);
      setAgents(agentsResponse.agents);
      setCalls(callsResponse.calls);
      setSelectedAgentId((current) => current || agentsResponse.agents[0]?.id || '');
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) await load();
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const startCall = async () => {
    if (!selectedAgentId) {
      setMessage('Crie ou selecione um agente antes de iniciar uma chamada.');
      return;
    }

    setStarting(true);
    setMessage('');
    try {
      const response = await api.startTelephonyCall({
        agentId: selectedAgentId,
        to,
        caller: caller.trim() || to,
      });
      setCalls((current) => [response.call, ...current.filter((call) => call.id !== response.call.id)]);
      setMessage(`Chamada enviada para ${response.call.to}. A Catarina seguirá o roteiro "${response.call.agentName}" pelo telefone.`);
      setTo('');
      setCaller('');
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Verificando telefonia...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">Telefonia</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Chamadas reais</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Dispare uma chamada via Twilio, deixe Catarina conduzir o roteiro por voz e salve a sessão automaticamente ao final.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-brand hover:text-brand"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <StatusCard
          icon={Phone}
          title="Credenciais Twilio"
          ok={Boolean(status?.telephonyConfigured)}
          okText="Configuradas"
          failText="Defina SID e token"
          description="TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN autenticam as chamadas de saída."
        />
        <StatusCard
          icon={Settings}
          title="Número e URL pública"
          ok={Boolean(status?.telephonyOutboundConfigured)}
          okText="Pronto para ligar"
          failText="Falta origem ou callback"
          description="TWILIO_FROM_NUMBER e PUBLIC_BASE_URL permitem que a Twilio ligue e retorne para os webhooks de voz."
        />
        <StatusCard
          icon={Shield}
          title="Registro automático"
          ok
          okText="Ativo"
          failText=""
          description="Ao concluir ou detectar risco, a chamada vira sessão com transcrição, campos estruturados e webhook operacional."
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold text-slate-950">Iniciar chamada</h2>
          <p className="mt-1 text-sm text-slate-500">Use apenas números reais e autorizados para contato.</p>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_minmax(220px,1fr)_auto] lg:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Agente</span>
            <select
              value={selectedAgentId}
              onChange={(event) => setSelectedAgentId(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-medium outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Telefone destino</span>
            <input
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="+5511999999999"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Contato</span>
            <input
              value={caller}
              onChange={(event) => setCaller(event.target.value)}
              placeholder="Nome ou identificador"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <button
            onClick={startCall}
            disabled={starting || !to.trim() || !selectedAgent || !status?.telephonyOutboundConfigured}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Ligar
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-950">Histórico de chamadas</h2>
            <p className="text-sm text-slate-500">Chamadas iniciadas por esta instalação e suas sessões geradas.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{calls.length} chamadas</span>
        </div>
        {calls.length ? (
          <div className="divide-y divide-slate-100">
            {calls.map((call) => (
              <div key={call.id} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
                    <PhoneCall className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${callStatusClass[call.status]}`}>
                        {callStatusLabel[call.status]}
                      </span>
                      {call.sessionId && <span className="font-mono text-xs font-bold text-slate-500">{call.sessionId}</span>}
                    </div>
                    <p className="mt-1 font-bold text-slate-950">{call.agentName}</p>
                    <p className="mt-1 text-sm text-slate-500">{call.caller} · {call.to}</p>
                    {call.error && <p className="mt-1 text-sm font-medium text-rose-700">{call.error}</p>}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{new Date(call.updatedAt).toLocaleString('pt-BR')}</p>
                  {call.providerCallSid && <p className="mt-1 font-mono">{call.providerCallSid}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">
            Nenhuma chamada real iniciada ainda.
          </div>
        )}
      </section>
    </div>
  );
}

function StatusCard({ icon: Icon, title, ok, okText, failText, description }: {
  icon: React.ElementType;
  title: string;
  ok: boolean;
  okText: string;
  failText: string;
  description: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <Icon className="h-6 w-6 text-brand" />
      <h2 className="mt-4 font-bold text-slate-950">{title}</h2>
      <p className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
        {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        {ok ? okText : failText}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </section>
  );
}

const callStatusLabel: Record<TelephonyCallStatus, string> = {
  queued: 'Na fila',
  ringing: 'Chamando',
  'in-progress': 'Em conversa',
  completed: 'Concluída',
  failed: 'Falhou',
};

const callStatusClass: Record<TelephonyCallStatus, string> = {
  queued: 'bg-slate-100 text-slate-700',
  ringing: 'bg-cyan-50 text-cyan-700',
  'in-progress': 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-rose-50 text-rose-700',
};
