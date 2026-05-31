import React from 'react';
import { CreditCard, History, ShieldCheck, Zap } from 'lucide-react';

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-brand">Faturamento</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Planos e uso</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Nenhum provedor de cobrança está configurado nesta instalação. Esta tela não inventa saldo, plano ou cobrança.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <CreditCard className="h-6 w-6 text-brand" />
          <h2 className="mt-4 font-bold text-slate-950">Provedor de pagamento</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Conecte Stripe, Mercado Pago ou outro gateway no backend para habilitar cobrança real.
          </p>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <Zap className="h-6 w-6 text-amber-600" />
          <h2 className="mt-4 font-bold text-slate-950">Uso de voz e IA</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            O consumo pode ser calculado a partir das sessões salvas e chamadas reais quando telefonia estiver conectada.
          </p>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          <h2 className="mt-4 font-bold text-slate-950">Sem dados fictícios</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Assim que houver um gateway configurado, os valores aparecerão a partir da API real.
          </p>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 p-5">
          <History className="h-4 w-4 text-slate-500" />
          <h2 className="font-bold text-slate-950">Histórico de cobrança</h2>
        </div>
        <div className="p-10 text-center text-sm text-slate-500">
          Nenhuma cobrança real registrada.
        </div>
      </section>
    </div>
  );
}
