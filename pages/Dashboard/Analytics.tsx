import React from 'react';
import { BarChart3, PieChart, Activity, Users } from 'lucide-react';
import LineChart from '../../components/D3Chart';

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Analytics & Performance</h1>

        <div className="grid grid-cols-4 gap-4 mb-8">
            <StatCard icon={BarChart3} label="Total de Chamadas" value="1,240" color="blue" />
            <StatCard icon={PieChart} label="Taxa de Conversão" value="18.5%" color="green" />
            <StatCard icon={Activity} label="Custo Médio / Lead" value="R$ 4,20" color="orange" />
            <StatCard icon={Users} label="Satisfação (CSAT)" value="4.8/5" color="purple" />
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
                <h3 className="font-bold text-slate-800 mb-4">Volume de Chamadas (Últimos 30 dias)</h3>
                <div className="flex flex-col flex-1 h-full max-h-48">
                    <LineChart />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
                <h3 className="font-bold text-slate-800 mb-4">Funil de Conversão</h3>
                <div className="space-y-4">
                    <FunnelBar label="Tentativas" value="100%" color="bg-slate-200" />
                    <FunnelBar label="Atendidas" value="65%" color="bg-blue-200" />
                    <FunnelBar label="Conversa Útil (>30s)" value="42%" color="bg-blue-400" />
                    <FunnelBar label="Conversão / Objetivo" value="18%" color="bg-green-500" />
                </div>
            </div>
        </div>

        <h3 className="font-bold text-slate-800 mb-4">Performance por Agente</h3>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                        <th className="p-3">Agente</th>
                        <th className="p-3">Chamadas</th>
                        <th className="p-3">Minutos</th>
                        <th className="p-3">Custo</th>
                        <th className="p-3">Score (IA)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    <tr>
                        <td className="p-3 font-medium">Catarina (Vendas)</td>
                        <td className="p-3">842</td>
                        <td className="p-3">1,240 min</td>
                        <td className="p-3 text-slate-500">R$ 320,00</td>
                        <td className="p-3"><span className="text-green-600 font-bold">9.2</span></td>
                    </tr>
                    <tr>
                        <td className="p-3 font-medium">Suporte N1</td>
                        <td className="p-3">398</td>
                        <td className="p-3">890 min</td>
                        <td className="p-3 text-slate-500">R$ 180,00</td>
                        <td className="p-3"><span className="text-yellow-600 font-bold">8.5</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
        purple: 'bg-purple-50 text-purple-600',
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

function FunnelBar({ label, value, color }: any) {
    return (
        <div>
            <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>{label}</span>
                <span className="font-bold">{value}</span>
            </div>
            <div className="w-full bg-slate-50 rounded-full h-3">
                <div className={`h-3 rounded-full ${color}`} style={{ width: value }}></div>
            </div>
        </div>
    )
}