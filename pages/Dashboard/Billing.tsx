import React, { useState } from 'react';
import { CreditCard, Zap, History, Plus } from 'lucide-react';

export default function BillingPage() {
  const [balance, setBalance] = useState('100.00');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleTopUp = async () => {
      setLoading(true);
      setBalance((Number(balance) + 50).toFixed(2));
      setLoading(false);
      setSuccessMessage('Recarga de R$ 50,00 realizada com sucesso!');
  };

  return (
    <div className="space-y-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Faturamento & Planos</h1>

        {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm font-medium flex justify-between items-center">
                <span>{successMessage}</span>
                <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">&times;</button>
            </div>
        )}

        <div className="grid grid-cols-3 gap-6 mb-8">
             <div className="bg-gradient-to-br from-brand to-brand-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
                 <div className="flex items-center gap-2 mb-2 opacity-80">
                     <CreditCard className="h-5 w-5" />
                     <span className="text-sm font-medium">Saldo em Carteira</span>
                 </div>
                 <div className="text-4xl font-bold mb-4">
                     {loading ? '...' : `R$ ${Number(balance).toFixed(2)}`}
                 </div>
                 <button
                    onClick={handleTopUp}
                    className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                 >
                     <Plus className="h-4 w-4" /> Recarregar R$ 50
                 </button>
             </div>

             <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                 <div className="flex items-center gap-2 mb-2 text-slate-500">
                     <Zap className="h-5 w-5 text-yellow-500" />
                     <span className="text-sm font-medium">Plano Atual</span>
                 </div>
                 <div className="text-2xl font-bold text-slate-900 mb-1">Professional</div>
                 <div className="text-xs text-slate-400 mb-4">Renova em 15/05/2024</div>
                 <button className="w-full py-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors text-slate-600">
                     Gerenciar Assinatura
                 </button>
             </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500" />
                <h3 className="font-bold text-slate-800">Histórico de Uso</h3>
            </div>
            <table className="w-full text-sm text-left">
                 <thead className="bg-white text-slate-500 border-b border-slate-100">
                     <tr>
                         <th className="p-4 font-medium">Data</th>
                         <th className="p-4 font-medium">Descrição</th>
                         <th className="p-4 font-medium">Tipo</th>
                         <th className="p-4 font-medium text-right">Valor</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     <tr>
                         <td className="p-4 text-slate-500">10/04 14:30</td>
                         <td className="p-4 font-medium">Chamada #8821 (4 min)</td>
                         <td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs">USO</span></td>
                         <td className="p-4 text-right text-red-600 font-mono">- R$ 1,20</td>
                     </tr>
                     <tr>
                         <td className="p-4 text-slate-500">01/04 09:00</td>
                         <td className="p-4 font-medium">Recarga via PIX</td>
                         <td className="p-4"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">CRÉDITO</span></td>
                         <td className="p-4 text-right text-green-600 font-mono">+ R$ 100,00</td>
                     </tr>
                 </tbody>
            </table>
        </div>
    </div>
  );
}