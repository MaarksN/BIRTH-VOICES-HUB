import React from 'react';
import { Card, Badge } from '../../components/design-system';
import { Activity, BarChart2, Eye, Server, Zap } from 'lucide-react';

export default function ObservabilityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Observability Center</h1>
        <p className="text-sm text-slate-500">Monitoramento global da infraestrutura e requisições LLM.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Global Uptime', value: '99.99%', trend: '+0.01%', icon: <Server className="h-5 w-5" />, color: 'emerald' },
          { title: 'P95 Latency', value: '312ms', trend: '-12ms', icon: <Zap className="h-5 w-5" />, color: 'brand' },
          { title: 'Token Usage', value: '14.2M', trend: '+1.2M', icon: <Activity className="h-5 w-5" />, color: 'blue' },
          { title: 'Error Rate', value: '0.02%', trend: '-0.01%', icon: <Eye className="h-5 w-5" />, color: 'amber' }
        ].map((metric, i) => (
          <Card key={i} className="p-5">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{metric.title}</span>
              <div className={`text-${metric.color}-500`}>{metric.icon}</div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{metric.value}</p>
            <p className={`text-xs mt-1 font-semibold text-emerald-500`}>{metric.trend} esta semana</p>
          </Card>
        ))}
      </div>

      <Card className="p-6 h-96 flex flex-col items-center justify-center text-slate-500">
        <BarChart2 className="h-12 w-12 mb-4 opacity-50" />
        <p>Gráficos de rastreamento (Tracing) e logs em tempo real em desenvolvimento.</p>
      </Card>
    </div>
  );
}
