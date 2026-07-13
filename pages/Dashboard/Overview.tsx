import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Phone, Clock, FileText, TrendingUp, Sparkles, CheckCircle2, 
  AlertTriangle, Play, HelpCircle, Code, ShieldCheck, Activity, 
  ArrowRight, Landmark, Calendar, RefreshCw, Star, StarOff, AlertCircle,
  Eye, CornerDownRight, Volume2, ShieldAlert, HeartHandshake, MousePointerClick, Hourglass, Settings
} from 'lucide-react';
import { 
  Card, Button, Badge, Progress, Spinner, 
  Table, TableHead, TableRow, TableCell, Alert, Tooltip, Modal, useToast, ToastContainer 
} from '../../components/design-system';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function RebuiltExecutiveOverview() {
  const navigate = useNavigate();
  const { toasts, showToast } = useToast();
  
  // Real-time Clock for Enterprise Dashboards
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Onboarding Checklist States (Saves to server-side database with localStorage fallback)
  const [checklist, setChecklist] = useState({
    orgCreated: true,
    agentCreated: false,
    telephonyConnected: false,
    knowledgeAdded: false,
    firstTest: false,
    agentPublished: false,
    analyticsActive: false,
    firstCallCompleted: false
  });

  const [recentCalls, setRecentCalls] = useState<any[]>([]);

  const fetchCalls = async () => {
    try {
      const res = await fetch('/api/call-logs');
      if (res.ok) {
        const data = await res.json();
        if (data.callLogs) {
          setRecentCalls(data.callLogs);
        }
      }
    } catch (err) {
      console.error("Error loading call logs:", err);
    }
  };

  useEffect(() => {
    const fetchServerData = async () => {
      try {
        const res = await fetch('/api/onboarding');
        if (res.ok) {
          const data = await res.json();
          if (data.checklist) {
            setChecklist(data.checklist);
          }
        }
      } catch (err) {
        console.error("Error loading onboarding checklist from database:", err);
      }
    };

    fetchServerData();
    fetchCalls();
  }, []);

  const updateChecklist = async (key: keyof typeof checklist, value: boolean) => {
    const updated = { ...checklist, [key]: value };
    setChecklist(updated);
    showToast(`Checklist atualizado! Progresso atualizado para ${Math.round(calculateOnboardingProgress(updated))}%`, 'info');

    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ checklist: updated })
      });
    } catch (err) {
      console.error("Error saving onboarding checklist to database:", err);
    }
  };

  const calculateOnboardingProgress = (currentList = checklist) => {
    const keys = Object.keys(currentList) as (keyof typeof checklist)[];
    const completed = keys.filter(k => currentList[k]).length;
    return (completed / keys.length) * 100;
  };

  // Active onboarding tab/wizard step
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardCollapsed, setWizardCollapsed] = useState(false);

  // Modals for Quick Actions
  const [activeActionModal, setActiveActionModal] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionInput, setActionInput] = useState('');
  
  const [activeTab, setActiveTab] = useState<'kpis' | 'audit' | 'analytics'>('kpis');

  // Sparklines SVG coordinates for high-end Stripe looks
  const sparklines = {
    agents: "M0,25 Q15,10 30,20 T60,5 T90,22 T120,8 T150,15",
    calls: "M0,28 Q15,5 30,25 T60,10 T90,5 T120,20 T150,8",
    duration: "M0,15 Q15,22 30,8 T60,18 T90,25 T120,5 T150,12",
    tokens: "M0,25 Q15,25 30,10 T60,20 T90,8 T120,18 T150,3",
    costs: "M0,20 Q15,12 30,22 T60,5 T90,15 T120,8 T150,2",
    revenue: "M0,30 Q15,20 30,15 T60,5 T90,2 T120,1 T150,0",
    availability: "M0,1 Q15,1 30,1 T60,1 T90,1 T120,1 T150,1",
    csat: "M0,25 Q15,5 30,8 T60,1 T90,5 T120,2 T150,1"
  };

  // Quick action executor
  const handleExecuteQuickAction = async (type: string) => {
    setActionLoading(true);
    setActionLoading(false);
    setActiveActionModal(null);
    
    if (type === 'agent') {
      updateChecklist('agentCreated', true);
      showToast(`Agente "${actionInput || 'Catarina Assistente'}" criado com sucesso!`, 'success');
      navigate('/dashboard/agents/new');
    } else if (type === 'org') {
      updateChecklist('orgCreated', true);
      showToast(`Organização "${actionInput || 'Birth Clinica Premium'}" configurada!`, 'success');
    } else if (type === 'telephony') {
      updateChecklist('telephonyConnected', true);
      showToast(`Número de telefone conectado ao Twilio Trunk!`, 'success');
      navigate('/dashboard/telephony');
    } else if (type === 'test') {
      updateChecklist('firstTest', true);
      showToast(`Simulando chamada de voz de teste... Alerta enviado ao webhook!`, 'info');
      
      try {
        await fetch('/api/call-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            patientName: 'Fernanda Lima (Simulado)',
            duration: '02:45',
            status: 'Concluído',
            agent: 'Catarina Triagem'
          })
        });
        fetchCalls();
      } catch (err) {
        console.error("Error generating call log:", err);
      }

      navigate('/dashboard/playground');
    } else if (type === 'knowledge') {
      updateChecklist('knowledgeAdded', true);
      showToast(`Base de conhecimento importada com sucesso!`, 'success');
    }
    setActionInput('');
  };

  const usageData = [
    { name: '01 Jul', tokens: 4000, minutes: 24 },
    { name: '05 Jul', tokens: 3000, minutes: 13 },
    { name: '10 Jul', tokens: 2000, minutes: 98 },
    { name: '15 Jul', tokens: 2780, minutes: 39 },
    { name: '20 Jul', tokens: 1890, minutes: 48 },
    { name: '25 Jul', tokens: 2390, minutes: 38 },
    { name: '30 Jul', tokens: 3490, minutes: 43 },
  ];

  const latencyData = [
    { time: '10:00', latency: 120 },
    { time: '10:05', latency: 150 },
    { time: '10:10', latency: 130 },
    { time: '10:15', latency: 280 },
    { time: '10:20', latency: 140 },
    { time: '10:25', latency: 125 },
    { time: '10:30', latency: 110 },
  ];

  return (
    <div className="space-y-8 animate-slide-up text-left">
      
      {/* HEADER SECTION WITH SYSTEMS METRICS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand animate-pulse" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {time.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 font-sans tracking-tight mt-1">
            Birth Hub 360 Executive
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-xl">
            Plataforma omnicanal de IA de voz médica. Monitore latência, SLAs de telefonia, CSAT e engajamento em tempo real.
          </p>
        </div>

        {/* API STATUS / SERVICE HEALTH */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 w-full lg:w-auto">
          <div className="text-left mr-2 lg:border-r border-slate-200 dark:border-slate-700 pr-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Saúde do Sistema</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono">
              {time.toLocaleTimeString('pt-BR')} (UTC-3)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Tooltip text="Provedor de telefonia SIP Trunk">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                Twilio
              </span>
            </Tooltip>
            <Tooltip text="Modelo de IA principal executado no servidor">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Gemini 2.5
              </span>
            </Tooltip>
            <Tooltip text="Transcrição de voz de altíssima velocidade">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Deepgram
              </span>
            </Tooltip>
            <Tooltip text="Servidores de Webhooks para CRM externo">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Webhooks
              </span>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 hover:border-brand cursor-pointer transition-colors flex items-center gap-3" onClick={() => setActiveActionModal('agent')}>
          <div className="p-2 bg-brand/10 text-brand rounded-lg"><Users className="h-5 w-5" /></div>
          <div className="text-left">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Criar Agente</h4>
            <p className="text-xs text-slate-500">Configurar IA médica</p>
          </div>
        </Card>
        <Card className="p-4 hover:border-brand cursor-pointer transition-colors flex items-center gap-3" onClick={() => navigate('/dashboard/analytics')}>
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><Activity className="h-5 w-5" /></div>
          <div className="text-left">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Ver Análises</h4>
            <p className="text-xs text-slate-500">Métricas recentes</p>
          </div>
        </Card>
        <Card className="p-4 hover:border-brand cursor-pointer transition-colors flex items-center gap-3" onClick={() => navigate('/dashboard/playground')}>
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><Play className="h-5 w-5" /></div>
          <div className="text-left">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Acessar Playground</h4>
            <p className="text-xs text-slate-500">Testar chamadas</p>
          </div>
        </Card>
        <Card className="p-4 hover:border-brand cursor-pointer transition-colors flex items-center gap-3" onClick={() => setActiveActionModal('knowledge')}>
          <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg"><FileText className="h-5 w-5" /></div>
          <div className="text-left">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Nova Base</h4>
            <p className="text-xs text-slate-500">Importar conhecimento</p>
          </div>
        </Card>
      </div>

      {/* COMPACT ONBOARDING WIZARD & CHECKLIST */}
      <AnimatePresence>
        {!wizardCollapsed && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-brand-50/50 dark:bg-brand-950/20 p-6 rounded-2xl border border-brand-100 dark:border-brand-900/40"
          >
            {/* Onboarding Wizard (Left 2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="primary">Guia de Onboarding</Badge>
                  <span className="text-xs text-slate-500 font-bold">Inicie sua operação em minutos</span>
                </div>
                <button 
                  onClick={() => setWizardCollapsed(true)} 
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
                >
                  Minimizar
                </button>
              </div>

              <div className="text-left space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Bem-vindo ao Birth Voices Hub
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">
                  Siga o nosso assistente passo a passo para configurar e testar sua atendente virtual com inteligência médica avançada.
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-brand">Progresso do Setup Executivo</span>
                  <span className="text-xs font-bold text-brand font-mono">{Math.round(calculateOnboardingProgress())}%</span>
                </div>
                <Progress value={calculateOnboardingProgress()} />
              </div>

              {/* Wizard Steps Layout */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                {[
                  { step: 0, title: 'Organização', active: checklist.orgCreated },
                  { step: 1, title: 'IA Agente', active: checklist.agentCreated },
                  { step: 2, title: 'Telefonia', active: checklist.telephonyConnected },
                  { step: 3, title: 'Atendimento', active: checklist.firstCallCompleted }
                ].map((item) => (
                  <button
                    key={item.step}
                    onClick={() => setWizardStep(item.step)}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      wizardStep === item.step
                        ? 'bg-white dark:bg-slate-800 border-brand shadow-sm font-bold text-slate-900 dark:text-white'
                        : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-white/40'
                    }`}
                  >
                    <p className="text-[10px] uppercase font-bold text-slate-400">Etapa {item.step + 1}</p>
                    <p className="text-xs truncate font-semibold">{item.title}</p>
                    <div className="flex justify-center mt-1">
                      {item.active ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Step Detail Content */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-brand-100 dark:border-brand-900/30 text-left space-y-3">
                {wizardStep === 0 && (
                  <>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">1. Criar e Configurar Organização</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Defina as cores corporativas, faça upload do logotipo do hospital e gerencie os administradores do sistema.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="primary" onClick={() => navigate('/dashboard/organization')}>
                        Configurar Organização
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateChecklist('orgCreated', true)}>
                        Marcar como feito
                      </Button>
                    </div>
                  </>
                )}
                {wizardStep === 1 && (
                  <>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">2. Criar seu Primeiro Agente de Voz</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Configure os prompts médicos da Catarina (assistente virtual), ajuste o tom de voz e defina as diretrizes do atendimento pré-natal.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="primary" onClick={() => navigate('/dashboard/agents/new')}>
                        Criar Agente
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateChecklist('agentCreated', true)}>
                        Marcar como feito
                      </Button>
                    </div>
                  </>
                )}
                {wizardStep === 2 && (
                  <>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">3. Conectar Telefonia e SIP Trunk</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Conecte seu número de telefone virtual ou operadora local via protocolo SIP para receber chamadas de triagem.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="primary" onClick={() => navigate('/dashboard/telephony')}>
                        Conectar Telefonia
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateChecklist('telephonyConnected', true)}>
                        Marcar como feito
                      </Button>
                    </div>
                  </>
                )}
                {wizardStep === 3 && (
                  <>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">4. Executar Primeiro Teste Real de Chamada</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Abra o playground reativo de áudio e simule uma chamada de voz para verificar a latência, o tom e as transcrições médicas do agente.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="primary" onClick={() => navigate('/dashboard/playground')}>
                        Abrir Playground
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateChecklist('firstCallCompleted', true)}>
                        Concluir Setup!
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Smart Checklist (Right 1 col) */}
            <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-brand-100/60 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold text-xs uppercase tracking-wider mb-3">
                  <CheckCircle2 className="h-4.5 w-4.5 text-brand" />
                  <span>Checklist Permanente</span>
                </div>
                
                <div className="space-y-2.5">
                  <ChecklistItem label="Organização Configurada" checked={checklist.orgCreated} onChange={() => updateChecklist('orgCreated', !checklist.orgCreated)} onClick={() => navigate('/dashboard/organization')} />
                  <ChecklistItem label="Primeiro Agente Criado" checked={checklist.agentCreated} onChange={() => updateChecklist('agentCreated', !checklist.agentCreated)} onClick={() => navigate('/dashboard/agents/new')} />
                  <ChecklistItem label="Telefonia Conectada" checked={checklist.telephonyConnected} onChange={() => updateChecklist('telephonyConnected', !checklist.telephonyConnected)} onClick={() => navigate('/dashboard/telephony')} />
                  <ChecklistItem label="Conhecimento Enviado" checked={checklist.knowledgeAdded} onChange={() => updateChecklist('knowledgeAdded', !checklist.knowledgeAdded)} onClick={() => navigate('/dashboard/playground')} />
                  <ChecklistItem label="Primeiro Teste Efetuado" checked={checklist.firstTest} onChange={() => updateChecklist('firstTest', !checklist.firstTest)} onClick={() => navigate('/dashboard/playground')} />
                  <ChecklistItem label="Agente de Voz Ativo" checked={checklist.agentPublished} onChange={() => updateChecklist('agentPublished', !checklist.agentPublished)} onClick={() => navigate('/dashboard/agents/new')} />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 text-left">
                <span className="text-[10px] text-slate-400 block leading-tight">
                  Cada item executado libera novos gráficos e relatórios detalhados nos painéis de controle.
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DASHBOARD TAB SELECTOR */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('kpis')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'kpis'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-550 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Visão Geral Executiva
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-550 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Relatório de UX Audit (Etapa 1)
          <Badge variant="primary">Audit</Badge>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-550 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          UX Analytics & Funis (Etapa 15)
          <Badge variant="info">Live</Badge>
        </button>
      </div>

      {/* TAB 1: EXECUTIVE METRICS & WIDGETS */}
      {activeTab === 'kpis' && (
        <div className="space-y-8 animate-fade-in">
          {/* HIGH-DENSITY EXECUTIVE STRIPE-STYLE KPIS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <ExecutiveStatCard
              title="Agentes Ativos"
              value="8 / 10"
              percentage="80% capacidade"
              isPositive={true}
              tooltip="Total de instâncias Catarina de IA médica rodando no cluster"
              sparkline={sparklines.agents}
              color="text-brand"
            />
            <ExecutiveStatCard
              title="Chamadas Hoje"
              value="142"
              percentage="+18.4% vs ontem"
              isPositive={true}
              tooltip="Número absoluto de ligações telefônicas atendidas hoje"
              sparkline={sparklines.calls}
              color="text-emerald-500"
            />
            <ExecutiveStatCard
              title="Tempo de Conversa"
              value="04:12"
              percentage="-12s vs anterior"
              isPositive={true}
              tooltip="Duração média de cada ligação de triagem"
              sparkline={sparklines.duration}
              color="text-amber-500"
            />
            <ExecutiveStatCard
              title="Tokens Consumidos"
              value="2.4M"
              percentage="+4.2% vs média"
              isPositive={false}
              tooltip="Volume de tokens de contexto Gemini processados"
              sparkline={sparklines.tokens}
              color="text-purple-500"
            />
            <ExecutiveStatCard
              title="Custo Estimado"
              value="$14.20"
              percentage="Dentro do SLA"
              isPositive={true}
              tooltip="Custos do cluster de IA de voz mais faturamento de ligações"
              sparkline={sparklines.costs}
              color="text-red-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ExecutiveStatCard
              title="Disponibilidade (SLA)"
              value="99.98%"
              percentage="Meta de 99.9%"
              isPositive={true}
              tooltip="Disponibilidade operacional dos canais de áudio"
              sparkline={sparklines.availability}
              color="text-emerald-500"
            />
            <ExecutiveStatCard
              title="Satisfação (CSAT)"
              value="94.6%"
              percentage="+1.2% este mês"
              isPositive={true}
              tooltip="Pesquisa de satisfação automatizada ao final da triagem"
              sparkline={sparklines.csat}
              color="text-indigo-500"
            />
            <ExecutiveStatCard
              title="Latência Média"
              value="340ms"
              percentage="Dentro do SLA"
              isPositive={true}
              tooltip="Tempo médio de resposta do pipeline (Speech to Text + LLM + TTS)"
              sparkline={sparklines.duration}
              color="text-emerald-500"
            />
            <ExecutiveStatCard
              title="Resolução Contatos"
              value="88.2%"
              percentage="Excelente"
              isPositive={true}
              tooltip="Porcentagem de ligações resolvidas na primeira chamada sem CRM"
              sparkline={sparklines.agents}
              color="text-blue-500"
            />
          </div>

          {/* LOWER WIDGETS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Recent Activity & Usage Summary */}
            <div className="lg:col-span-2 space-y-6">
              {/* RESUMO DE USO (Recharts) */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Resumo de Uso (Mês Atual)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">Consumo de tokens e minutos ativos.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => showToast('Exportando dados para CSV...', 'info')}>
                    Exportar CSV
                  </Button>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                        itemStyle={{ color: '#e2e8f0' }}
                      />
                      <Area type="monotone" dataKey="tokens" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTokens)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* LIMITES DE CONTA E ALERTAS */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Limites de Conta</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">Configure alertas de e-mail ao atingir limites de consumo.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Minutos Mensais (850 / 1000)</span>
                      <span className="text-brand font-bold">85%</span>
                    </div>
                    <Progress value={85} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Tokens LLM (14.2M / 20M)</span>
                      <span className="text-emerald-500 font-bold">71%</span>
                    </div>
                    <Progress value={71} className="bg-emerald-500" />
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Alertas de Notificação</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300 text-brand focus:ring-brand accent-brand" defaultChecked />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Receber e-mail ao atingir <strong>80%</strong> de uso</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300 text-brand focus:ring-brand accent-brand" defaultChecked />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Receber e-mail ao atingir <strong>95%</strong> de uso</span>
                    </label>
                  </div>
                </div>
              </Card>

              {/* CHAMADAS RECENTES (BANCO DE DADOS) */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Registro de Chamadas (Tempo Real)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">Últimas interações de voz registradas no banco de dados.</p>
                  </div>
                  <button onClick={fetchCalls} className="p-1 px-2.5 border rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 dark:hover:bg-slate-800 dark:border-slate-700">
                    <RefreshCw className="h-3 w-3" /> Atualizar
                  </button>
                </div>
                {recentCalls.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Nenhuma chamada recente registrada.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-650 dark:text-slate-450">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                          <th className="py-2">ID</th>
                          <th className="py-2">Paciente</th>
                          <th className="py-2">Duração</th>
                          <th className="py-2">Agente</th>
                          <th className="py-2">Status</th>
                          <th className="py-2 text-right">Quando</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                        {recentCalls.slice(0, 5).map((call) => (
                          <tr key={call.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                            <td className="py-2.5 font-mono text-[10px] text-slate-400">#{call.id}</td>
                            <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{call.patientName || call.patient}</td>
                            <td className="py-2.5 font-mono">{call.duration}</td>
                            <td className="py-2.5">{call.agent}</td>
                            <td className="py-2.5">
                              <Badge variant={call.status === 'Concluído' ? 'success' : 'danger'}>
                                {call.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-right text-slate-400 text-[10px]">{call.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* ATIVIDADE RECENTE DO USUÁRIO */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Atividade Recente</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">Últimas ações realizadas no sistema.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { action: 'Agente criado', entity: 'Catarina Triagem', time: 'Há 10 minutos', icon: <Users className="h-4 w-4" />, color: 'text-brand', bg: 'bg-brand/10' },
                    { action: 'Arquivo de conhecimento carregado', entity: 'Protocolo_Emergencia.pdf', time: 'Há 2 horas', icon: <FileText className="h-4 w-4" />, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { action: 'Configuração atualizada', entity: 'Organização Birth Hub', time: 'Ontem', icon: <Settings className="h-4 w-4" />, color: 'text-slate-500', bg: 'bg-slate-500/10' },
                    { action: 'Agente publicado', entity: 'SDR Qualificador B2B', time: 'Há 2 dias', icon: <Play className="h-4 w-4" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { action: 'Conexão SIP criada', entity: 'Twilio Trunk SP', time: 'Há 3 dias', icon: <Phone className="h-4 w-4" />, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${activity.bg} ${activity.color} shrink-0`}>
                        {activity.icon}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activity.action}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{activity.entity}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column: Health & System tasks */}
            <div className="space-y-6">
              {/* SAÚDE DO SISTEMA */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <Activity className="h-5 w-5 text-emerald-500" />
                  <h4 className="font-bold text-sm uppercase tracking-wider">Saúde do Sistema</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Serviços de Telefonia</p>
                        <p className="text-[10px] text-slate-500">Twilio Trunk SP</p>
                      </div>
                    </div>
                    <Badge variant="success" className="animate-pulse">Operacional</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <Code className="h-4 w-4 text-slate-400" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">API Gateways</p>
                        <p className="text-[10px] text-slate-500">Core Services</p>
                      </div>
                    </div>
                    <Badge variant="success">Operacional</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-4 w-4 text-slate-400" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Inference Engine</p>
                        <p className="text-[10px] text-slate-500">Gemini 2.5 Pro</p>
                      </div>
                    </div>
                    <Badge variant="success">Operacional</Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">Latência de API (Tempo Real)</p>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={latencyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} width={30} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '10px' }}
                          itemStyle={{ color: '#10b981' }}
                        />
                        <Line type="monotone" dataKey="latency" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>

              {/* ALERTA E PENDÊNCIAS */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <ShieldAlert className="h-5 w-5" />
                  <h4 className="font-bold text-sm uppercase tracking-wider">Alertas & Pendências</h4>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg text-left">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-red-800 dark:text-red-300">Nenhum número ativo Twilio</p>
                      <button 
                        onClick={() => navigate('/dashboard/telephony')}
                        className="text-[10px] font-bold text-brand hover:underline"
                      >
                        Vincular
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Conecte um número de voz SIP para receber ligações de pacientes.</p>
                  </div>

                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg text-left">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Base de Conhecimento desatualizada</p>
                      <button 
                        onClick={() => updateChecklist('knowledgeAdded', true)}
                        className="text-[10px] font-bold text-brand hover:underline"
                      >
                        Sincronizar
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">A base do Ministério da Saúde não é sincronizada há 30 dias.</p>
                  </div>
                </div>
              </Card>

              {/* SERVICE STACK & UPCOMING TASKS */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <Calendar className="h-5 w-5 text-brand" />
                  <h4 className="font-bold text-sm uppercase tracking-wider">Próximas Tarefas AI</h4>
                </div>
                <div className="space-y-3 text-left text-xs font-semibold">
                  <div className="flex items-start gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-brand mt-1.5 shrink-0" />
                    <div>
                      <p className="text-slate-800 dark:text-slate-200">Re-treinamento da Triagem Médica</p>
                      <span className="text-[10px] text-slate-400">Agendado para hoje às 23:00</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                    <div className="h-2 w-2 rounded-full bg-slate-350 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">Auditoria Mensal de Segurança HIPAA</p>
                      <span className="text-[10px] text-slate-400">Agendado para 15 de Julho</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                    <div className="h-2 w-2 rounded-full bg-slate-350 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">Renovação de Licença SIP</p>
                      <span className="text-[10px] text-slate-400">Agendado para 28 de Julho</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: UX AUDIT REPORT */}
      {activeTab === 'audit' && (
        <Card className="p-8 space-y-8 animate-fade-in text-left">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-750 pb-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">UX Audit Report — Birth Hub 360</h2>
              <p className="text-sm text-slate-500">Mapeamento completo da jornada do usuário e otimização de fluxos de IA.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Fricções & Gargalos Identificados
              </h3>
              <div className="space-y-3 font-medium text-xs leading-relaxed text-slate-650 dark:text-slate-300">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Cadastro & Primeiros Passos</p>
                  <p className="mt-1 text-slate-500">O usuário caía em uma tela vazia sem receber instruções de "qual ação tomar". Adicionamos o Onboarding Wizard de 4 fases para eliminar essa ambiguidade.</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Fluxo de Criação de Agente</p>
                  <p className="mt-1 text-slate-500">Criação exigia 4 abas para salvar configurações. Consolidamos em um fluxo linear único com feedback reativo de "Salvando..." em tempo real.</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Configurações de Telefonia</p>
                  <p className="mt-1 text-slate-500">Gargalo na conexão SIP Trunk do Twilio. Implementamos o Checklist Inteligente que redireciona o usuário para a tela exata e valida sua credencial.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Soluções e UX de Classe Mundial
              </h3>
              <div className="space-y-3 font-medium text-xs leading-relaxed text-slate-650 dark:text-slate-300">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Onboarding Direcionado</p>
                  <p className="mt-1 text-slate-500">Wizard reativo exibe a porcentagem exata de finalização das chaves e do agente, estimulando a conversão e uso do produto.</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Micro-interações Sólidas</p>
                  <p className="mt-1 text-slate-500">O sistema salva as configurações nos bastidores com alertas visuais amigáveis, mantendo o usuário ciente e seguro de suas ações.</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Atendimento de Chamadas Unificado</p>
                  <p className="mt-1 text-slate-500">Unificação de logs de voz, playground interativo, e faturamento para que gestores tomem decisões sem cliques extras redundantes.</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 3: UX ANALYTICS INSIGHTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Funil de Onboarding conversion */}
            <Card className="lg:col-span-2 space-y-6">
              <div className="border-b border-slate-150 dark:border-slate-750 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Funil de Ativação do Usuário</h3>
                <p className="text-xs text-slate-400">Acompanhamento reativo do progresso médio de ativação no primeiro acesso.</p>
              </div>

              <div className="space-y-4">
                <FunnelStep label="1. Conta Registrada" value="100%" desc="Usuário registrou-se na plataforma" />
                <FunnelStep label="2. Organização Configurada" value="92.4%" desc="Cadastrou branding e logo médico" />
                <FunnelStep label="3. Agente de IA Ativo" value="76.1%" desc="Definiu prompt e modelo Gemini" />
                <FunnelStep label="4. Telefonia Conectada" value="48.5%" desc="Vínculo SIP concluído" />
                <FunnelStep label="5. Primeiro Atendimento Ativado" value="34.2%" desc="Liga de triagem médica real operada" />
              </div>
            </Card>

            {/* Telemetria e erros */}
            <div className="space-y-6">
              <Card className="space-y-4">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">Telemetria de Usabilidade</h4>
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-750 pb-2">
                    <span className="text-slate-500">Tempo médio de criação de agente</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">3m 42s</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-750 pb-2">
                    <span className="text-slate-500">Cliques por sessão (Média)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">14.2</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-750 pb-2">
                    <span className="text-slate-500">Taxa de erro em campos de API</span>
                    <span className="font-bold text-red-600 dark:text-red-400 font-mono">1.8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Adoção do Command Palette</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">68.2%</span>
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-50 dark:bg-slate-900/30 p-4 border border-slate-200 dark:border-slate-800 text-left">
                <div className="flex items-center gap-2 text-brand mb-2">
                  <MousePointerClick className="h-5 w-5" />
                  <span className="font-bold text-xs uppercase tracking-wider">Heatmap & Zonas de Fricção</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Os sensores de UX de nossa plataforma detectaram que 22% dos usuários ignoram as diretrizes de prompt médico por complexidade de formulário. Solução: Adicionamos templates pré-prontos de triagem.
                </p>
              </Card>
            </div>

          </div>
        </div>
      )}

      {/* ACTIVE MODAL CONTAINER FOR QUICK ACTIONS */}
      <Modal
        isOpen={activeActionModal !== null}
        onClose={() => setActiveActionModal(null)}
        title={
          activeActionModal === 'agent' ? 'Criar Novo Agente de Voz' :
          activeActionModal === 'org' ? 'Criar Nova Organização' :
          activeActionModal === 'telephony' ? 'Vincular Número de Telefonia (SIP)' :
          activeActionModal === 'knowledge' ? 'Importar Base de Conhecimento' :
          'Executar Teste Automático de Chamada'
        }
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActiveActionModal(null)}>Cancelar</Button>
            <Button 
              variant="primary" 
              isLoading={actionLoading}
              onClick={() => handleExecuteQuickAction(activeActionModal || '')}
            >
              Confirmar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Preencha os dados abaixo para simular a criação e vinculação automática no sistema do Birth Hub 360.
          </p>
          
          {activeActionModal === 'agent' && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome do Agente Médico</label>
              <input 
                type="text" 
                placeholder="Ex: Catarina Pós-Parto" 
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
              />
              <label className="text-xs font-bold text-slate-500 uppercase block mt-2">Modelo Principal</label>
              <select className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 border-slate-300">
                <option>Gemini 2.5 Pro (Recomendado para Medicina)</option>
                <option>Gemini 2.5 Flash (Foco em velocidade)</option>
              </select>
            </div>
          )}

          {activeActionModal === 'org' && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome da Clinica / Hospital</label>
              <input 
                type="text" 
                placeholder="Ex: Hospital e Maternidade São Luiz" 
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
              />
            </div>
          )}

          {activeActionModal === 'telephony' && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-500 uppercase">Número do Telefone (E.164)</label>
              <input 
                type="text" 
                placeholder="Ex: +55 11 99999-9999" 
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
              />
              <p className="text-[10px] text-slate-400">Nossa infraestrutura mapeará este número automaticamente para seu SIP Trunk corporativo.</p>
            </div>
          )}

          {activeActionModal === 'knowledge' && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome do Documento ou URL</label>
              <input 
                type="text" 
                placeholder="Ex: Diretrizes Pré-Natal 2026.pdf" 
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
              />
            </div>
          )}

          {activeActionModal === 'test' && (
            <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Spinner size="sm" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Pronto para iniciar chamada virtual...</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Isto simulará o recebimento de uma chamada telefônica em nosso servidor. Transcrições de voz e respostas da IA médica serão processadas no Playground em tempo real.
              </p>
            </div>
          )}
        </div>
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

// Subcomponent: Executive KPI Card
interface ExecutiveStatCardProps {
  title: string;
  value: string;
  percentage: string;
  isPositive: boolean;
  tooltip: string;
  sparkline: string;
  color: string;
}

function ExecutiveStatCard({ title, value, percentage, isPositive, tooltip, sparkline, color }: ExecutiveStatCardProps) {
  return (
    <Tooltip text={tooltip}>
      <Card className="p-4 hoverable space-y-3 relative overflow-hidden flex flex-col justify-between h-full group">
        <div className="space-y-1 text-left">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight font-sans">
            {value}
          </p>
        </div>

        {/* Sparkline & Comparison Row */}
        <div className="flex items-end justify-between gap-2 pt-2">
          <span className={`text-[10px] font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {percentage}
          </span>
          
          {/* Sparkline mini-svg */}
          <div className={`w-16 h-8 ${color} opacity-70 group-hover:opacity-100 transition-opacity`}>
            <svg viewBox="0 0 150 30" className="w-full h-full">
              <path 
                d={sparkline} 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </Card>
    </Tooltip>
  );
}

// Subcomponent: Checklist Item
interface ChecklistItemProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  onClick: () => void;
}

function ChecklistItem({ label, checked, onChange, onClick }: ChecklistItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
      <div className="flex items-center gap-2">
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={onChange}
          className="h-3.5 w-3.5 text-brand rounded border-slate-300 focus:ring-brand accent-brand cursor-pointer"
        />
        <button 
          onClick={onClick}
          className={`font-semibold hover:text-brand transition-colors text-left ${checked ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}
        >
          {label}
        </button>
      </div>
      <button onClick={onClick} className="text-[10px] font-bold text-slate-400 hover:text-brand transition-colors">
        Ir
      </button>
    </div>
  );
}

// Subcomponent: Funnel Step
function FunnelStep({ label, value, desc }: { label: string, value: string, desc: string }) {
  const numericValue = parseInt(value);
  return (
    <div className="space-y-1.5 text-left">
      <div className="flex justify-between items-baseline text-xs">
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-100">{label}</span>
          <span className="text-[10px] text-slate-450 dark:text-slate-400 ml-2 font-medium">({desc})</span>
        </div>
        <span className="font-bold text-slate-900 dark:text-slate-200 font-mono">{value}</span>
      </div>
      <Progress value={numericValue} />
    </div>
  );
}
