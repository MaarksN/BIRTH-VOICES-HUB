import React from 'react';
import { Users, Phone, Clock, FileText } from 'lucide-react';

export default function Overview() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Visão Geral</h1>
        <p className="text-slate-500 mt-2">Bem-vindo ao Birth Voices Hub. Aqui está o resumo das suas operações.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Chamadas Realizadas"
          value="1,234"
          icon={Phone}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Minutos Conversados"
          value="8,540"
          icon={Clock}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Leads Qualificados"
          value="856"
          icon={Users}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <StatCard
          title="Transcrições"
          value="1,234"
          icon={FileText}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Atividade Recente</h2>
          <div className="space-y-4">
             {[1, 2, 3].map((i) => (
               <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                 <div className="flex items-center gap-4">
                   <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                     <Phone className="h-5 w-5 text-slate-500" />
                   </div>
                   <div>
                     <p className="font-medium text-slate-900">Chamada de Triagem #{1000 + i}</p>
                     <p className="text-sm text-slate-500">Catarina • Há {i * 15} minutos</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="font-medium text-slate-900">04:32</p>
                   <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                     Concluído
                   </span>
                 </div>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Performance da Catarina</h2>
          <div className="space-y-6">
            <PerformanceBar label="Engajamento" value={88} color="bg-blue-500" />
            <PerformanceBar label="Conversão" value={64} color="bg-purple-500" />
            <PerformanceBar label="Satisfação (CSAT)" value={92} color="bg-emerald-500" />
            <PerformanceBar label="Resolução" value={78} color="bg-orange-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, iconColor, iconBg }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${iconBg} ${iconColor}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}

function PerformanceBar({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-medium text-slate-900">{value}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );
}