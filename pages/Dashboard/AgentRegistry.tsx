import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../../components/design-system';
import { Search, Filter, Plus, MoreVertical, Copy, Archive, Trash2, ArrowRight, Play, Activity, Settings, User } from 'lucide-react';

const mockAgents = [
  { id: 'agt_001', name: 'Catarina Triagem', description: 'Triagem obstétrica e emergencial.', category: 'Saúde', dept: 'Recepção', status: 'active', model: 'Gemini 2.5 Pro', latency: '320ms', csat: '98%', tokens: '1.2M', updated: '2h atrás' },
  { id: 'agt_002', name: 'SDR Qualificador', description: 'Qualificação de leads inbound B2B.', category: 'Vendas', dept: 'Comercial', status: 'draft', model: 'Gemini 2.5 Flash', latency: '-', csat: '-', tokens: '0', updated: '1d atrás' },
  { id: 'agt_003', name: 'Suporte N1 T.I.', description: 'Resolução de chamados de rede e acesso.', category: 'Suporte', dept: 'TI', status: 'active', model: 'Gemini 2.5 Flash', latency: '280ms', csat: '92%', tokens: '4.5M', updated: '5h atrás' },
  { id: 'agt_004', name: 'Cobrança Ativa', description: 'Negociação de dívidas e envio de boletos.', category: 'Financeiro', dept: 'Cobrança', status: 'archived', model: 'GPT-4o', latency: '450ms', csat: '81%', tokens: '800k', updated: '2 sem atrás' },
];

export default function AgentRegistry() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Agent Registry</h1>
          <p className="text-sm text-slate-500">Gerencie todos os agentes do seu workspace.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Filter className="h-4 w-4 mr-2" /> Filtrar</Button>
          <Button variant="primary" onClick={() => navigate('/dashboard/agents/new')}>
            <Plus className="h-4 w-4 mr-2" /> Novo Agente
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Pesquisar por nome, ID ou departamento..." 
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-brand"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Agente</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Modelo</th>
                <th className="px-4 py-3 font-semibold">Desempenho</th>
                <th className="px-4 py-3 font-semibold">Atualização</th>
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {mockAgents.map(agent => (
                <tr key={agent.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors group cursor-pointer" onClick={() => navigate(`/dashboard/agents/${agent.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{agent.name}</p>
                        <p className="text-xs text-slate-500">{agent.dept} • {agent.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {agent.status === 'active' && <Badge variant="success">Em Produção</Badge>}
                    {agent.status === 'draft' && <Badge variant="warning">Rascunho</Badge>}
                    {agent.status === 'archived' && <Badge variant="outline">Arquivado</Badge>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {agent.model}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="flex items-center gap-1"><Activity className="h-3 w-3 text-emerald-500" /> {agent.latency}</span>
                      <span className="text-slate-500">CSAT: {agent.csat}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {agent.updated}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-brand transition-colors"><Settings className="h-4 w-4" /></button>
                      <button className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"><Copy className="h-4 w-4" /></button>
                      <button className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
