import React, { useEffect, useState } from 'react';
import { Activity, Server, Users, Database } from 'lucide-react';

type Session = {
  id: string;
  summary: string;
  agent: string;
  status: string;
};

export default function AdminPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Mock backend check failure to simulate "offline" or just load mock data
    setTimeout(() => {
        setError(true);
        setSessions([
            { id: 'sess_001', summary: 'Candidato aprovado na triagem inicial. Boa comunicação.', agent: 'Catarina (RH)', status: 'completed' },
            { id: 'sess_002', summary: 'Cliente satisfeito com a resolução do problema de rede.', agent: 'Suporte Técnico', status: 'completed' },
            { id: 'sess_003', summary: 'Lead qualificado. Orçamento confirmado para Q3.', agent: 'Catarina (Vendas)', status: 'qualified' },
        ]);
        setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard Administrativo</h1>
                <p className="text-slate-500">Monitoramento de sessões e infraestrutura</p>
            </div>
            {error && (
                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium border border-yellow-200">
                    Backend Disconnected (Mock Mode)
                </div>
            )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
            <StatCard icon={Activity} label="Sessões Ativas" value="12" color="blue" />
            <StatCard icon={Server} label="Status da API" value={error ? "Offline" : "Online"} color={error ? "red" : "green"} />
            <StatCard icon={Users} label="Total Agentes" value="5" color="purple" />
            <StatCard icon={Database} label="Integrações" value="Active" color="orange" />
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">Sessões Recentes</h2>
                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Ver todas</button>
            </div>

            {loading ? (
                <div className="p-8 text-center text-slate-500">Carregando...</div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {sessions.map((s) => (
                        <div key={s.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{s.id}</span>
                                    <span className="text-sm font-bold text-slate-700">{s.agent}</span>
                                    <StatusBadge status={s.status} />
                                </div>
                                <p className="text-sm text-slate-600">{s.summary}</p>
                            </div>
                            <div className="text-right pl-4">
                                <button className="text-xs font-medium text-slate-400 hover:text-blue-600">Detalhes &rarr;</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        red: 'bg-red-50 text-red-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600',
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div>
                <div className="text-xl font-bold text-slate-900">{value}</div>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'completed') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Concluído</span>;
    if (status === 'qualified') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Qualificado</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status}</span>;
}