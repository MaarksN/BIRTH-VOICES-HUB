import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Headphones,
  Mic,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: 'Agentes prontos para operação',
    description: 'Crie fluxos por especialidade, defina tom de voz, regras de segurança e critérios de transferência humana.',
  },
  {
    icon: ClipboardCheck,
    title: 'Resultados estruturados',
    description: 'Cada chamada vira resumo, tags, campos extraídos, risco, próxima ação e transcrição pesquisável.',
  },
  {
    icon: ShieldCheck,
    title: 'Governança clínica e operacional',
    description: 'Controle versões de prompts, audite mudanças e acompanhe alertas antes de publicar em produção.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/12 p-2 ring-1 ring-white/15 backdrop-blur">
              <Mic className="h-6 w-6 text-cyan-200" />
            </div>
            <span className="text-lg font-bold tracking-tight">Birth Voices Hub</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-200 md:flex">
            <a href="#recursos" className="hover:text-white">Recursos</a>
            <a href="#operacao" className="hover:text-white">Operação</a>
            <a href="#seguranca" className="hover:text-white">Segurança</a>
          </nav>
          <Link
            to="/login"
            className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-50"
          >
            Acessar
          </Link>
        </div>
      </header>

      <main>
        <section className="relative isolate flex min-h-[88vh] items-end overflow-hidden pb-12 pt-28">
          <img
            src="/assets/voice-ops-hero.png"
            alt="Painel de operação de agentes de voz com chamadas, ondas de áudio e indicadores"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/78 to-slate-950/18" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-slate-950 to-transparent" />

          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.55fr)] lg:px-8">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-semibold text-cyan-100 backdrop-blur">
                <Sparkles className="h-4 w-4" />
                Plataforma de voz para conversas críticas e estruturadas
              </div>
              <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Birth Voices Hub
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
                Orquestre agentes de voz para triagem, acompanhamento, pesquisas e atendimento com dados prontos para ação, auditoria e integração.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-6 py-3 text-base font-bold text-slate-950 transition hover:bg-cyan-200"
                >
                  Criar operação
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-base font-bold text-white backdrop-blur transition hover:bg-white/15"
                >
                  Entrar na plataforma
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-white/15 bg-slate-950/58 p-4 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fluxo real</p>
                  <p className="font-bold text-white">Da voz ao sistema</p>
                </div>
                <span className="rounded-full bg-cyan-300/12 px-2.5 py-1 text-xs font-bold text-cyan-100">Configurável</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['1. Crie o agente', 'Defina persona, voz, roteiro e instruções de análise.'],
                  ['2. Conduza a conversa', 'Catarina fala, escuta e segue a lógica configurada.'],
                  ['3. Entregue o resultado', 'A sessão salva dispara webhook para CRM, ATS ou banco.'],
                ].map(([name, description]) => (
                  <div key={name} className="flex items-center justify-between rounded-lg bg-white/8 p-3 ring-1 ring-white/8">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/12 text-cyan-100">
                        <Headphones className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold">{name}</p>
                        <p className="text-xs text-slate-400">{description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-white/8 p-3 text-xs leading-6 text-slate-300 ring-1 ring-white/8">
                As métricas aparecem dentro do dashboard somente depois que sua operação salvar sessões reais.
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="bg-white py-16 text-slate-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">Produto completo</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight">Da conversa ao dado acionável, em uma única operação.</h2>
                <p className="mt-4 text-slate-600">
                  A plataforma agora combina criação de agentes, testes de prompt, analytics, transcrições, telefonia, webhooks e governança de marca.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-slate-950">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="operacao" className="bg-slate-50 py-16 text-slate-950">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <BarChart3 className="h-6 w-6 text-cyan-700" />
              <h3 className="mt-4 font-bold">Analytics de qualidade</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Compare agentes por resolução, CSAT, custo, taxa de transferência e completude do roteiro.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <CheckCircle2 className="h-6 w-6 text-emerald-700" />
              <h3 className="mt-4 font-bold">Fila de próximos passos</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Transforme cada chamada em follow-up, alerta, tarefa de revisão ou sincronização com sistemas externos.</p>
            </div>
            <div id="seguranca" className="rounded-lg border border-slate-200 bg-white p-6">
              <ShieldCheck className="h-6 w-6 text-amber-700" />
              <h3 className="mt-4 font-bold">Publicação segura</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Valide scripts, regras de transferência, privacidade e webhooks antes de liberar agentes em produção.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
