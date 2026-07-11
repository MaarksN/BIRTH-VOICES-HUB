import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Phone, Clock, FileText, TrendingUp, Sparkles, CheckCircle2, 
  AlertTriangle, Play, HelpCircle, Code, ShieldCheck, Activity, 
  ArrowRight, Landmark, Calendar, RefreshCw, Star, StarOff, AlertCircle,
  Eye, CornerDownRight, Volume2, ShieldAlert, HeartHandshake, MousePointerClick, Hourglass
} from 'lucide-react';
import { 
  Card, Button, Badge, Progress, Spinner, 
  Table, TableHead, TableRow, TableCell, Alert, Tooltip, Modal, useToast, ToastContainer 
} from '../../components/design-system';

export default function RebuiltExecutiveOverview() {
  const navigate = useNavigate();
  const { toasts, showToast } = useToast();
  
  // Real-time Clock for Enterprise Dashboards
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Onboarding Checklist States (Saves to LocalStorage for true persistence)
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

  useEffect(() => {
    const saved = localStorage.getItem('birth_voices_onboarding_checklist');
    if (saved) {
      try {
        setChecklist(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const updateChecklist = (key: keyof typeof checklist, value: boolean) => {
    const updated = { ...checklist, [key]: value };
    setChecklist(updated);
    localStorage.setItem('birth_voices_onboarding_checklist', JSON.stringify(updated));
    showToast(`Checklist atualizado! Progresso atualizado para ${Math.round(calculateOnboardingProgress(updated))}%`, 'info');
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
  
  // Custom states for demo purposes
  const [recentCalls, setRecentCalls] = useState([
    { id: 1024, patient: 'Isabela Santos', duration: '03:42', status: 'Concluído', time: 'Há 5 min', agent: 'Catarina Triagem' },
    { id: 1023, patient: 'Mariana Lima', duration: '05:15', status: 'Concluído', time: 'Há 18 min', agent: 'Catarina Pré-Natal' },
    { id: 1022, patient: 'Gabriela Costa', duration: '01:10', status: 'Falhou', time: 'Há 45 min', agent: 'Catarina Emergência' },
    { id: 1021, patient: 'Juliana Rocha', duration: '04:56', status: 'Concluído', time: 'Há 1 hora', agent: 'Catarina Triagem' }
  ]);

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
  const handleExecuteQuickAction = (type: string) => {
    setActionLoading(true);
    setTimeout(() => {
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
        navigate('/dashboard/playground');
      } else if (type === 'knowledge') {
        updateChecklist('knowledgeAdded', true);
        showToast(`Base de conhecimento importada com sucesso!`, 'success');
      }
      setActionInput('');
    }, 1500);
  };

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

      {/* QUICK ACTIONS ROW */}
      <div className="bg-white dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-750 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4.5 w-4.5 text-brand" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Ações Rápidas:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => { setActiveActionModal('agent'); }} leftIcon={<Users className="h-4 w-4" />}>
            Novo Agente
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setActiveActionModal('org'); }} leftIcon={<Landmark className="h-4 w-4" />}>
            Nova Organização
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setActiveActionModal('telephony'); }} leftIcon={<Phone className="h-4 w-4" />}>
            Nova Conexão SIP
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setActiveActionModal('knowledge'); }} leftIcon={<FileText className="h-4 w-4" />}>
            Nova Base
          </Button>
          <Button variant="primary" size="sm" onClick={() => { setActiveActionModal('test'); }} leftIcon={<Play className="h-4 w-4" />}>
            Testar Chamada
          </Button>
        </div>
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
            
            {/* Left Column: Recent Activity & Call logs */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <div className="text-left">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Atividade de Voz em Tempo Real</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">Chamadas que estão transitando pelo pipeline SIP agora.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/results')}>
                  Ver Detalhado
                </Button>
              </div>

              <div className="space-y-4">
                {recentCalls.map((call) => (
                  <div 
                    key={call.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-50/80 dark:hover:bg-slate-900/50 rounded-lg border border-slate-150 dark:border-slate-800 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${call.status === 'Concluído' ? 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'} shrink-0`}>
                        <Volume2 className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Chamada #{call.id}</p>
                          <Badge variant={call.status === 'Concluído' ? 'success' : 'danger'}>{call.status}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Paciente: <span className="font-semibold text-slate-700 dark:text-slate-300">{call.patient}</span> • {call.agent}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 sm:mt-0 justify-between sm:justify-end border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-2 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{call.duration}</p>
                        <p className="text-[10px] text-slate-400">Duração</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{call.time}</p>
                        <button 
                          onClick={() => {
                            showToast(`Carregando transcrição e áudio da chamada #${call.id}...`, 'info');
                            navigate('/dashboard/playground');
                          }}
                          className="text-[10px] font-bold text-brand hover:underline mt-0.5 block cursor-pointer"
                        >
                          Analisar Transcrição
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Alerts, Pending Issues, System tasks */}
            <div className="space-y-6">
              
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
