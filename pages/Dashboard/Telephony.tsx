import React, { useEffect, useState } from 'react';
import { Loader2, Phone, Shield, Settings } from 'lucide-react';
import { api } from '../../lib/api';
import { RuntimeStatus } from '../../types';

export default function TelephonyPage() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    api.status()
      .then((response) => {
        if (!cancelled) setStatus(response);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      <div>
        <p className="text-sm font-semibold text-brand">Telefonia</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Canais de voz</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          O navegador já conduz conversas por voz no Playground. Para chamadas telefônicas reais, configure um provedor SIP/Twilio no backend.
        </p>
      </div>

      {message && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{message}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <Phone className="h-6 w-6 text-brand" />
          <h2 className="mt-4 font-bold text-slate-950">Status do provedor</h2>
          <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status?.telephonyConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {status?.telephonyConfigured ? 'Configurado' : 'Não configurado'}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Defina <span className="font-mono">TWILIO_ACCOUNT_SID</span> e <span className="font-mono">TWILIO_AUTH_TOKEN</span> para ligar chamadas telefônicas reais.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <Settings className="h-6 w-6 text-slate-700" />
          <h2 className="mt-4 font-bold text-slate-950">Entrada de chamadas</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Depois de configurar o provedor, o webhook de voz pode chamar a API da plataforma para iniciar sessões e registrar resultados.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <Shield className="h-6 w-6 text-emerald-600" />
          <h2 className="mt-4 font-bold text-slate-950">Compliance</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Gravação, consentimento e retenção devem ser ativados conforme a política da sua operação antes de produção.
          </p>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold text-slate-950">Números conectados</h2>
        </div>
        <div className="p-10 text-center text-sm text-slate-500">
          Nenhum número real conectado.
        </div>
      </section>
    </div>
  );
}
