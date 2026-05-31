import React from 'react';
import { Phone, Globe, Shield, Search } from 'lucide-react';

export default function TelephonyPage() {
  return (
    <div className="space-y-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Telefonia & Números</h1>

        <div className="grid grid-cols-3 gap-6 mb-8">
             <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <Phone className="h-4 w-4 text-blue-600" />
                     Comprar Número (DID)
                 </h3>
                 <div className="flex gap-4">
                     <select className="p-2 border border-slate-300 rounded-lg bg-white flex-1">
                         <option>Brasil (+55)</option>
                         <option>United States (+1)</option>
                     </select>
                     <input type="text" placeholder="DDD / Área (ex: 11)" className="p-2 border border-slate-300 rounded-lg w-32" />
                     <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
                         <Search className="h-4 w-4" /> Buscar
                     </button>
                 </div>
                 <div className="mt-6 space-y-2">
                     <div className="p-3 border border-slate-200 rounded-lg flex justify-between items-center hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors">
                         <div className="font-mono text-lg text-slate-700">+55 11 4004-9999</div>
                         <div className="text-sm font-bold text-green-600">R$ 15,00/mês</div>
                     </div>
                 </div>
             </div>

             <div className="space-y-6">
                 <div className="bg-white rounded-xl border border-slate-200 p-6">
                     <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                         <Globe className="h-4 w-4 text-purple-600" />
                         BYOC (Bring Your Own Carrier)
                     </h3>
                     <p className="text-xs text-slate-500 mb-4">Conecte seu próprio tronco SIP/Twilio.</p>
                     <button className="w-full py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Configurar Tronco</button>
                 </div>

                 <div className="bg-white rounded-xl border border-slate-200 p-6">
                     <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                         <Shield className="h-4 w-4 text-green-600" />
                         Compliance
                     </h3>
                     <div className="flex items-center justify-between py-2 border-b border-slate-100">
                         <span className="text-sm text-slate-600">Mascaramento</span>
                         <div className="w-8 h-4 bg-green-500 rounded-full relative"><div className="w-2 h-2 bg-white rounded-full absolute right-1 top-1"></div></div>
                     </div>
                     <div className="flex items-center justify-between py-2">
                         <span className="text-sm text-slate-600">Gravação Auto</span>
                         <div className="w-8 h-4 bg-slate-300 rounded-full relative"><div className="w-2 h-2 bg-white rounded-full absolute left-1 top-1"></div></div>
                     </div>
                 </div>
             </div>
        </div>

        <h3 className="font-bold text-slate-800 mb-4">Meus Números</h3>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                        <th className="p-3">Número</th>
                        <th className="p-3">Provedor</th>
                        <th className="p-3">Destino (Webhook)</th>
                        <th className="p-3">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    <tr>
                        <td className="p-3 font-mono">+55 11 99999-0000</td>
                        <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">TWILIO</span></td>
                        <td className="p-3 text-slate-500 truncate max-w-xs">https://api.birthhub.com/voice/incoming/...</td>
                        <td className="p-3"><span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2"></span>Ativo</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  );
}