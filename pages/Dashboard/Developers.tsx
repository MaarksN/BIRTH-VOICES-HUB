import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, History, Loader2, RefreshCw, Save, ShieldCheck, Webhook } from 'lucide-react';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';
import { IntegrationDelivery, IntegrationSettings } from '../../types';

export default function DevelopersPage() {
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [retryingId, setRetryingId] = useState('');
  const [message, setMessage] = useState('');
  const [responseBody, setResponseBody] = useState('');
  const [deliveries, setDeliveries] = useState<IntegrationDelivery[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [response, deliveriesResponse] = await Promise.all([
          api.getIntegrations(),
          api.listIntegrationDeliveries(),
        ]);
        if (!cancelled) {
          setSettings(response);
          setWebhookUrl(response.webhook.url);
          setEnabled(response.webhook.enabled);
          setDeliveries(deliveriesResponse.deliveries);
        }
      } catch (error) {
        if (!cancelled) setMessage(getErrorMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await api.updateIntegrations({
        webhook: {
          enabled,
          url: webhookUrl,
          secret: webhookSecret,
        },
      });
      setSettings(response);
      setWebhookSecret('');
      setMessage('Integração salva. Novas sessões serão entregues automaticamente quando o webhook estiver ativo.');
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage('');
    setResponseBody('');

    try {
      const response = await api.testWebhook({
        url: webhookUrl,
        secret: webhookSecret || undefined,
      });
      setSettings((prev) => prev ? { ...prev, webhook: { ...prev.webhook, lastDelivery: response.delivery } } : prev);
      setResponseBody(response.responseBody || '');
      setMessage(response.delivery.status === 'delivered'
        ? 'Teste entregue com sucesso ao endpoint.'
        : `Teste enviado, mas o endpoint respondeu falha: ${response.delivery.message}`);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setTesting(false);
    }
  };

  const handleRetry = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    setMessage('');

    try {
      const response = await api.retryIntegrationDelivery(deliveryId);
      setSettings((prev) => prev ? { ...prev, webhook: { ...prev.webhook, lastDelivery: response.delivery } } : prev);
      const deliveriesResponse = await api.listIntegrationDeliveries();
      setDeliveries(deliveriesResponse.deliveries);
      setMessage(response.delivery.status === 'delivered'
        ? 'Entrega reenviada com sucesso.'
        : `Nova tentativa registrada com falha: ${response.delivery.message}`);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setRetryingId('');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando integrações...
      </div>
    );
  }

  const lastDelivery = settings?.webhook.lastDelivery;

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <p className="text-sm font-semibold text-brand">Developers</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Integração real com CRM, ATS e bancos</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Configure um endpoint HTTPS do seu CRM, ATS, n8n, Make, banco de dados ou backend. Ao salvar uma sessão, o Birth Voices Hub envia automaticamente o payload estruturado para esse destino.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {message}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <h2 className="flex items-center gap-2 font-bold text-slate-950">
            <Webhook className="h-5 w-5 text-brand" />
            Webhook de entrega automática
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Evento enviado: <span className="font-mono font-bold">session.completed</span>
          </p>
        </div>

        <div className="space-y-5 p-6">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <span className="font-bold text-slate-900">Ativar entrega automática</span>
              <p className="mt-1 text-sm text-slate-500">Quando ativo, cada sessão salva tentará entregar o resultado ao endpoint.</p>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-5 w-5 accent-brand"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">URL do endpoint</span>
            <input
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              placeholder="https://seu-crm.com/api/birth-voices"
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Segredo para assinatura HMAC</span>
            <input
              value={webhookSecret}
              onChange={(event) => setWebhookSecret(event.target.value)}
              placeholder={settings?.webhook.hasSecret ? 'Segredo já configurado; preencha apenas para trocar' : 'Crie um segredo compartilhado'}
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
            />
            <p className="mt-2 text-xs text-slate-500">
              O backend envia a assinatura em <span className="font-mono">X-Birth-Voices-Signature</span>. Valide esse HMAC SHA-256 no destino.
            </p>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar integração
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !webhookUrl.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand hover:text-brand disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Enviar teste real
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-950">Status da última entrega</h2>
          {lastDelivery ? (
            <DeliveryStatus delivery={lastDelivery} />
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Nenhuma entrega registrada ainda.
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-bold text-slate-950">Formato do payload</h2>
            <button
              onClick={() => navigator.clipboard.writeText(payloadExample)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-brand hover:text-brand"
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </button>
          </div>
          <pre className="mt-4 max-h-[360px] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">
            {payloadExample}
          </pre>
          {responseBody && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">Resposta do teste</h3>
              <pre className="max-h-[220px] overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{responseBody}</pre>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-slate-950">
          <ShieldCheck className="h-5 w-5 text-brand" />
          Como preencher CRM/ATS/banco automaticamente
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <InfoCard title="CRM" text="Aponte a URL para seu endpoint de leads. Use extracted, tags, summary e followUp para criar ou atualizar contatos." />
          <InfoCard title="ATS" text="Use agentName, score e extracted para qualificar candidatos, preencher campos do perfil e criar tarefas de follow-up." />
          <InfoCard title="Banco de dados" text="Aponte para n8n, Make, Supabase Edge Function, Cloudflare Worker ou sua API para gravar o JSON onde quiser." />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-slate-950">
              <History className="h-5 w-5 text-brand" />
              Histórico de entregas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Cada sessão salva registra uma tentativa de entrega para auditoria e retentativa.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{deliveries.length} registros</span>
        </div>

        {deliveries.length ? (
          <div className="divide-y divide-slate-100">
            {deliveries.map((delivery) => (
              <div key={delivery.id || `${delivery.sessionId}-${delivery.deliveredAt}`} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <DeliveryBadge status={delivery.status} />
                    {delivery.sessionId && <span className="font-mono text-xs font-bold text-slate-500">{delivery.sessionId}</span>}
                    {delivery.attempt && <span className="text-xs font-bold text-slate-500">tentativa {delivery.attempt}</span>}
                  </div>
                  <p className="mt-2 break-all text-sm text-slate-600">{delivery.target || 'Webhook não configurado'}</p>
                  {delivery.message && <p className="mt-1 text-sm text-slate-500">{delivery.message}</p>}
                  {delivery.responseBody && (
                    <pre className="mt-3 max-h-24 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{delivery.responseBody}</pre>
                  )}
                </div>
                <div className="flex flex-col gap-2 text-right">
                  <span className="text-xs text-slate-500">
                    {delivery.deliveredAt ? new Date(delivery.deliveredAt).toLocaleString('pt-BR') : 'sem data'}
                  </span>
                  {delivery.status !== 'delivered' && delivery.id && (
                    <button
                      onClick={() => handleRetry(delivery.id!)}
                      disabled={retryingId === delivery.id}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-brand hover:text-brand disabled:opacity-50"
                    >
                      {retryingId === delivery.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Retentar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">
            Nenhuma tentativa de entrega registrada ainda.
          </div>
        )}
      </section>
    </div>
  );
}

function DeliveryBadge({ status }: { status: IntegrationDelivery['status'] }) {
  const classes: Record<IntegrationDelivery['status'], string> = {
    delivered: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-rose-50 text-rose-700',
    not_configured: 'bg-amber-50 text-amber-700',
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${classes[status]}`}>
      {status}
    </span>
  );
}

function DeliveryStatus({ delivery }: { delivery: IntegrationDelivery }) {
  const ok = delivery.status === 'delivered';
  const pending = delivery.status === 'not_configured';

  return (
    <div className={`mt-4 rounded-lg border p-4 ${
      ok
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : pending
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-rose-200 bg-rose-50 text-rose-800'
    }`}>
      <div className="flex items-center gap-2 font-bold">
        {ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        {delivery.status}
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        {delivery.target && (
          <div>
            <dt className="font-bold">Destino</dt>
            <dd className="break-all font-mono text-xs">{delivery.target}</dd>
          </div>
        )}
        {delivery.statusCode && (
          <div>
            <dt className="font-bold">HTTP</dt>
            <dd>{delivery.statusCode}</dd>
          </div>
        )}
        {delivery.message && (
          <div>
            <dt className="font-bold">Mensagem</dt>
            <dd>{delivery.message}</dd>
          </div>
        )}
        {delivery.deliveredAt && (
          <div>
            <dt className="font-bold">Horário</dt>
            <dd>{new Date(delivery.deliveredAt).toLocaleString('pt-BR')}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

const payloadExample = JSON.stringify({
  event: 'session.completed',
  createdAt: '<ISO timestamp>',
  data: {
    id: '<session id>',
    agentName: '<nome do agente>',
    caller: '<contato informado>',
    dateTime: '<data da sessão>',
    duration: '<mm:ss>',
    sentiment: '<Positivo | Neutro | Negativo>',
    riskLevel: '<Baixo | Moderado | Alto>',
    score: '<0-100>',
    summary: '<resumo gerado pela IA>',
    tags: ['<tag>'],
    followUp: '<próxima ação>',
    extracted: [
      { label: '<campo>', value: '<valor>' },
    ],
    transcript: '<transcrição completa>',
  },
}, null, 2);
