import React, { useState } from 'react';
import { LiveSupervisor } from '../../components/LiveSupervisor/LiveSupervisor';
import { Users, PhoneCall, ListFilter, Play } from 'lucide-react';

export default function SupervisionPage() {
  const [activeSession, setActiveSession] = useState<string | null>("demo-session-123");

  const activeCalls = [
    { id: 'demo-session-123', client: 'João Silva', agent: 'Agent Sales v2', duration: '05:23', status: 'critical' },
    { id: 'sess-456', client: 'Maria Oliveira', agent: 'Support Bot', duration: '12:01', status: 'normal' },
    { id: 'sess-789', client: 'Carlos Santos', agent: 'Agent Sales v2', duration: '01:45', status: 'warning' },
  ];

  return (
    <div className="h-full flex flex-col -m-8">
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <PhoneCall className="w-6 h-6 text-indigo-600" />
          Supervisão ao Vivo
        </h1>
        <p className="text-gray-500 mt-1">Acompanhe métricas emocionais e cognitivas em tempo real durante chamadas ativas.</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Calls List */}
        <div className="w-80 bg-slate-50 border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
            <h3 className="font-semibold text-gray-700">Chamadas Ativas ({activeCalls.length})</h3>
            <ListFilter className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
          </div>
          <div className="p-2 space-y-2">
            {activeCalls.map(call => (
              <div 
                key={call.id}
                onClick={() => setActiveSession(call.id)}
                className={`p-4 rounded-xl cursor-pointer border transition-all ${
                  activeSession === call.id 
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-gray-900 text-sm">{call.client}</div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded text-xs font-mono text-gray-600">
                    <Play className="w-3 h-3 text-indigo-500" />
                    {call.duration}
                  </div>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2 mb-3">
                  <Users className="w-3 h-3" />
                  {call.agent}
                </div>
                <div className="flex justify-between items-center">
                   <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                     call.status === 'critical' ? 'bg-red-100 text-red-600' :
                     call.status === 'warning' ? 'bg-orange-100 text-orange-600' :
                     'bg-emerald-100 text-emerald-600'
                   }`}>
                     {call.status === 'critical' ? 'Risco Alto' : call.status === 'warning' ? 'Atenção' : 'Estável'}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Supervisor Component */}
        <div className="flex-1 p-6 bg-slate-100 overflow-hidden">
          {activeSession ? (
            <LiveSupervisor sessionId={activeSession} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Selecione uma chamada ativa para monitorar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
