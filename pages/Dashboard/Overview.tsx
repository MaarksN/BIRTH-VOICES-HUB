import React from 'react';
import { Users, Phone, Clock, FileText, TrendingUp } from 'lucide-react';
import { Card, Badge, Progress } from '../../components/design-system';

export default function Overview() {
  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 font-sans tracking-tight">Visão Geral</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            Bem-vindo ao Birth Voices Hub. Aqui está o resumo das suas operações e interações de voz.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 w-fit">
          <TrendingUp className="h-4 w-4 text-brand animate-pulse" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Atualizado agora</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Chamadas Realizadas"
          value="1,234"
          percentage="+12%"
          isPositive={true}
          icon={Phone}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-950/40"
        />
        <StatCard
          title="Minutos Conversados"
          value="8,540"
          percentage="+8%"
          isPositive={true}
          icon={Clock}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
        />
        <StatCard
          title="Leads Qualificados"
          value="856"
          percentage="+24%"
          isPositive={true}
          icon={Users}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBg="bg-purple-50 dark:bg-purple-950/40"
        />
        <StatCard
          title="Transcrições"
          value="1,234"
          percentage="-3%"
          isPositive={false}
          icon={FileText}
          iconColor="text-orange-600 dark:text-orange-400"
          iconBg="bg-orange-50 dark:bg-orange-950/40"
        />
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-sans">Atividade Recente</h2>
            <button className="text-xs font-bold text-brand hover:opacity-85 transition-opacity">Ver todas</button>
          </div>
          <div className="space-y-4">
             {[1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-lg transition-colors border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Chamada de Triagem #{1000 + i}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Catarina • Há {i * 15} minutos</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div className="hidden sm:block">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">04:32</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Duração</p>
                    </div>
                    <Badge variant="success">Concluído</Badge>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Catarina performance metrics */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 font-sans">Performance da Catarina</h2>
          <div className="space-y-6">
            <PerformanceMetric label="Engajamento de Conversa" value={88} />
            <PerformanceMetric label="Taxa de Conversão" value={64} />
            <PerformanceMetric label="Satisfação do Usuário (CSAT)" value={92} />
            <PerformanceMetric label="Resolução na Primeira Chamada" value={78} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  percentage: string;
  isPositive: boolean;
  icon: React.ComponentType<any>;
  iconColor: string;
  iconBg: string;
}

function StatCard({ title, value, percentage, isPositive, icon: Icon, iconColor, iconBg }: StatCardProps) {
  return (
    <Card className="flex items-center justify-between p-6">
      <div className="text-left space-y-1">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">{title}</p>
        <div className="flex items-baseline gap-2.5">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 font-sans tracking-tight">{value}</p>
          <span className={`text-xs font-bold flex items-center ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {percentage}
          </span>
        </div>
      </div>
      <div className={`p-3 rounded-lg ${iconBg} ${iconColor} shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
    </Card>
  );
}

function PerformanceMetric({ label, value }: { label: string, value: number }) {
  return (
    <div className="space-y-2 text-left">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{label}</span>
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}
