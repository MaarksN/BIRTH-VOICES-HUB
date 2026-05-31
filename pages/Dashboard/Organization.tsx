import React, { useState, useEffect } from 'react';
import { Save, UserPlus, Upload, Shield } from 'lucide-react';
import { auth } from '../../lib/auth';
import { useSessionStore } from '../../store/useSessionStore';

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState('branding');
  const brandColor = useSessionStore((state) => state.brandColor);
  const setBrandColor = useSessionStore((state) => state.setBrandColor);
  const [branding, setBranding] = useState({ color: brandColor, name: '' });

  useEffect(() => {
      // Load org data and set current branding color from global store
      setBranding({
          name: auth.getUser()?.company || 'My Company',
          color: brandColor
      });
  }, [brandColor]);

  const handleSave = () => {
    setBrandColor(branding.color);
  };

  return (
    <div className="space-y-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 font-sans">Configurações da Organização</h1>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
                <button onClick={() => setActiveTab('branding')} className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'branding' ? 'border-b-2 border-brand text-brand' : 'text-slate-500 hover:bg-slate-50'}`}>Marca & White-label</button>
                <button onClick={() => setActiveTab('team')} className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'team' ? 'border-b-2 border-brand text-brand' : 'text-slate-500 hover:bg-slate-50'}`}>Equipe & Permissões</button>
                <button onClick={() => setActiveTab('audit')} className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'audit' ? 'border-b-2 border-brand text-brand' : 'text-slate-500 hover:bg-slate-50'}`}>Audit Log</button>
            </div>

            <div className="p-6">
                {activeTab === 'branding' && (
                    <div className="max-w-xl space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Nome da Organização</label>
                            <input type="text" value={branding.name} onChange={e => setBranding({...branding, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Cor da Marca</label>
                            <div className="flex gap-4 items-center">
                                <input type="color" value={branding.color} onChange={e => setBranding({...branding, color: e.target.value})} className="h-10 w-20 p-1 rounded border border-slate-300 cursor-pointer" />
                                <span className="font-mono text-slate-500 text-sm bg-slate-100 px-2 py-1 rounded">{branding.color}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Escolha uma cor principal da marca. Isso atualizará o tema da plataforma em tempo real.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">Clique para fazer upload (PNG, SVG)</p>
                            </div>
                        </div>
                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:opacity-90 font-medium transition-opacity">
                            <Save className="h-4 w-4" /> Salvar Alterações
                        </button>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800">Membros do Time</h3>
                            <button className="flex items-center gap-2 px-4 py-2 border border-brand text-brand rounded-lg hover:bg-brand-50 font-medium transition-colors">
                                <UserPlus className="h-4 w-4" /> Convidar Membro
                            </button>
                        </div>
                        <div className="space-y-4">
                             <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 bg-brand-50 text-brand rounded-full flex items-center justify-center font-bold">JD</div>
                                     <div>
                                         <div className="font-bold text-slate-900">John Doe</div>
                                         <div className="text-xs text-slate-500">john@company.com</div>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-4">
                                     <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">OWNER</span>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div>
                         <div className="flex items-center gap-2 mb-4 text-slate-500 text-sm">
                             <Shield className="h-4 w-4" />
                             Mostrando últimos 30 dias
                         </div>
                         <table className="w-full text-sm text-left">
                             <thead className="bg-slate-50 text-slate-500 font-medium">
                                 <tr>
                                     <th className="p-3">Data</th>
                                     <th className="p-3">Usuário</th>
                                     <th className="p-3">Ação</th>
                                     <th className="p-3">Recurso</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                 <tr>
                                     <td className="p-3 text-slate-500">Hoje, 14:30</td>
                                     <td className="p-3 font-medium">John Doe</td>
                                     <td className="p-3">Alterou Prompt</td>
                                     <td className="p-3 text-mono text-slate-500">agent_sales_v2</td>
                                 </tr>
                             </tbody>
                         </table>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}