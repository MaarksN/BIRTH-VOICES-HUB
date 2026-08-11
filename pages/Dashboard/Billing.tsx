import React from 'react';
import { CreditCard, Zap, History, AlertTriangle } from 'lucide-react';

// No billing/credits backend exists yet in this platform: no APIKey-adjacent model for wallet
// balance, no plan/subscription model, no usage-ledger model, and no routes under /api for any
// of it (confirmed against prisma/schema.prisma and src/routes/index.ts). This page used to
// simulate a wallet top-up entirely in client state (incrementing a local number and showing a
// fake "success" message) and displayed a hardcoded historical usage table with a stale renewal
// date. Per the platform rule against fabricated business data, this is now explicitly labeled
// as a preview of the intended UI rather than presented as live financial state. See handoff
// 02-para-00-billing-backend.md for the real backend this needs before it can go live.
export default function BillingPage() {
  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-slate-900">Faturamento & Planos</h1>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm font-medium flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Pré-visualização de layout. Ainda não existe uma integração real de faturamento/créditos nesta plataforma
              (sem saldo, plano ou histórico de uso reais) — nenhum valor abaixo deve ser tratado como saldo ou cobrança real.
            </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <div className="bg-gradient-to-br from-brand to-brand-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden opacity-90">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
                 <div className="flex items-center gap-2 mb-2 opacity-80">
                     <CreditCard className="h-5 w-5" />
                     <span className="text-sm font-medium">Saldo em Carteira</span>
                 </div>
                 <div className="text-4xl font-bold mb-4">—</div>
                 <button
                    disabled
                    title="Integração de créditos ainda não implementada"
                    className="w-full py-2 bg-white/10 rounded-lg text-sm font-bold cursor-not-allowed opacity-60"
                 >
                     Recarga indisponível
                 </button>
             </div>

             <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                 <div className="flex items-center gap-2 mb-2 text-slate-500">
                     <Zap className="h-5 w-5 text-yellow-500" />
                     <span className="text-sm font-medium">Plano Atual</span>
                 </div>
                 <div className="text-2xl font-bold text-slate-900 mb-1">—</div>
                 <div className="text-xs text-slate-400 mb-4">Nenhum plano de assinatura configurado</div>
                 <button disabled className="w-full py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-400 cursor-not-allowed">
                     Gerenciar Assinatura
                 </button>
             </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500" />
                <h3 className="font-bold text-slate-800">Histórico de Uso</h3>
            </div>
            <div className="p-8 text-center text-slate-400 text-sm">
              Sem histórico de uso — nenhuma cobrança real ainda existe nesta plataforma.
            </div>
        </div>
    </div>
  );
}