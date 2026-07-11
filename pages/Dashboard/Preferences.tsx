import React, { useState } from 'react';
import { 
  Settings, Globe, Clock, Bell, Keyboard, LayoutGrid, Eyeglasses, 
  Check, ShieldAlert, Sparkles, SlidersHorizontal, ArrowRight, AppWindow
} from 'lucide-react';
import { Card, Button, Badge, Switch, Select, Alert, useToast, ToastContainer } from '../../components/design-system';

export default function PreferencesPage() {
  const { toasts, showToast } = useToast();
  
  // States
  const [lang, setLang] = useState('pt');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState('24h');
  const [density, setDensity] = useState('comfortable');
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Notifications
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifBrowser, setNotifBrowser] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);
  const [notifCalls, setNotifCalls] = useState(true);

  const handleSave = () => {
    showToast('Preferências salvas com sucesso no seu perfil!', 'success');
  };

  const timezones = [
    { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3) — São Paulo' },
    { value: 'America/Manaus', label: 'Amazonas (GMT-4) — Manaus' },
    { value: 'America/New_York', label: 'Eastern Standard Time (GMT-5) — NY' },
    { value: 'Europe/London', label: 'Western European Time (GMT+0) — London' },
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)' }
  ];

  const languages = [
    { value: 'pt', label: 'Português (Brasil)' },
    { value: 'en', label: 'English (US)' },
    { value: 'es', label: 'Español' }
  ];

  const dateFormats = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (Ex: 10/07/2026)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (Ex: 2026-07-10)' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (Ex: 07/10/2026)' }
  ];

  const timeFormats = [
    { value: '24h', label: 'Formato 24h (Ex: 18:14)' },
    { value: '12h', label: 'Formato 12h (Ex: 06:14 PM)' }
  ];

  const densities = [
    { value: 'compact', label: 'Compacta (Alta densidade de dados, estilo Stripe)' },
    { value: 'comfortable', label: 'Confortável (Espaçamento padrão equilibrado)' },
    { value: 'spacious', label: 'Espaçosa (Maior negative space e descanso visual)' }
  ];

  return (
    <div className="space-y-8 animate-slide-up text-left pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Settings className="h-4.5 w-4.5 text-brand" />
            <Badge variant="primary">Configurações Pessoais</Badge>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 font-sans tracking-tight">Preferências da Conta</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-3xl">
            Ajuste as configurações de localidade, notificações, interface de dados e acessibilidade para criar o seu ambiente de trabalho perfeito.
          </p>
        </div>
        <Button variant="primary" onClick={handleSave} className="shadow-lg shrink-0">
          Salvar Alterações
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          {/* LOCALIDADE */}
          <Card className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Localização e Formatação</h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">Defina idioma, fuso horário e formatos numéricos.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select 
                label="Idioma Principal"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                options={languages}
              />
              <Select 
                label="Fuso Horário (Timezone)"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                options={timezones}
              />
              <Select 
                label="Formato de Data"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                options={dateFormats}
              />
              <Select 
                label="Formato de Hora"
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value)}
                options={timeFormats}
              />
            </div>
          </Card>

          {/* DENSIDADE E APARÊNCIA */}
          <Card className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Aparência do Painel</h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">Adapte a densidade e legibilidade das tabelas e KPIs.</p>
              </div>
            </div>

            <div className="space-y-6">
              <Select 
                label="Densidade de Dados"
                value={density}
                onChange={(e) => setDensity(e.target.value)}
                options={densities}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-750">
                <Switch 
                  checked={highContrast} 
                  onChange={setHighContrast} 
                  label="Alto Contraste WCAG AAA"
                  description="Aumenta o contraste dos textos e bordas de inputs"
                />
                <Switch 
                  checked={reducedMotion} 
                  onChange={setReducedMotion} 
                  label="Reduzir Movimento"
                  description="Desativa micro-animações de entrada e transições"
                />
              </div>
            </div>
          </Card>

          {/* NOTIFICAÇÕES */}
          <Card className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Canais de Notificação</h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">Gerencie onde e quando deseja receber alertas de voz e billing.</p>
              </div>
            </div>

            <div className="space-y-4">
              <Switch 
                checked={notifEmail} 
                onChange={setNotifEmail} 
                label="Notificações por E-mail"
                description="Resumos de faturas, alertas críticos do servidor e falhas de chamadas."
              />
              <hr className="border-slate-100 dark:border-slate-750" />
              <Switch 
                checked={notifBrowser} 
                onChange={setNotifBrowser} 
                label="Notificações do Navegador"
                description="Alertas instantâneos quando um novo lead ou chamada for concluída."
              />
              <hr className="border-slate-100 dark:border-slate-750" />
              <Switch 
                checked={notifWeekly} 
                onChange={setNotifWeekly} 
                label="Relatório Executivo Semanal"
                description="Envio de métricas de CSAT, SLA e minutos consumidos consolidados."
              />
              <hr className="border-slate-100 dark:border-slate-750" />
              <Switch 
                checked={notifCalls} 
                onChange={setNotifCalls} 
                label="Alertas de Latência e Erro na IA"
                description="Notificar se o tempo de resposta do modelo ultrapassar 1.5s."
              />
            </div>
          </Card>

        </div>

        {/* SIDE PANEL: SHORTCUTS & INFO */}
        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-slate-850 p-6 space-y-4">
            <div className="flex items-center gap-2 text-brand">
              <Keyboard className="h-5 w-5" />
              <h4 className="font-bold text-sm uppercase tracking-wider">Atalhos de Teclado</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Agilize seu fluxo de trabalho utilizando os seguintes atalhos globais do sistema:
            </p>
            <div className="space-y-3 pt-2 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Command Palette</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px]">Ctrl + K</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Ir para Home</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px]">G + H</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Criar Novo Agente</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px]">C + A</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Fechar Modal / Esc</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px]">ESC</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Abrir Suporte AI</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px]">Ctrl + H</kbd>
              </div>
            </div>
          </Card>

          <Card className="border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-6 space-y-4 text-center">
            <SlidersHorizontal className="h-8 w-8 mx-auto text-brand animate-bounce" />
            <h4 className="font-bold text-slate-900 dark:text-slate-50 text-sm">Design System integrado</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Todas as preferências alteradas aqui reconfiguram dinamicamente o comportamento de renderização dos componentes, cumprindo estritamente as diretrizes de acessibilidade WCAG.
            </p>
            <Button size="sm" variant="outline" className="w-full" onClick={() => window.location.hash = '#/dashboard/docs'}>
              Ver Design Tokens
              <ArrowRight className="h-3.5 w-3.5 ml-2" />
            </Button>
          </Card>
        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
