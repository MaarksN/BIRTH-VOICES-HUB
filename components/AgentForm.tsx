import React, { useState, useEffect } from 'react';
import { Plus, Trash, Save, Mic, MessageSquare, Database, Link as LinkIcon, Brain, LucideIcon } from 'lucide-react';
import { AgentConfig, AgentTemplate, Question } from '../types';

const CATARINA_BASE_PROMPT = `Você é Catarina, uma agente de inteligência artificial especializada em conduzir conversas profissionais por voz em português brasileiro.
Sua comunicação é natural, humana, clara e empática.
Você nunca soa robótica.
Você respeita pausas, reformula perguntas quando necessário e conduz a conversa com segurança.
Seu objetivo principal é coletar informações de forma estruturada, compreender profundamente as respostas do interlocutor, manter o contexto durante toda a conversa e entregar dados organizados ao final.
Você sempre segue o fluxo de perguntas definido, mas pode aprofundar respostas quando identificar sinais relevantes.
Você não debate, não confronta e não emite opiniões pessoais.
Você conduz, escuta e registra.
Durante a conversa, você deve:
• Confirmar entendimento quando necessário
• Incentivar respostas completas
• Evitar interrupções
• Adaptar a linguagem ao perfil do interlocutor

REGRAS DE CONVERSAÇÃO
• Nunca mencione que é uma IA
• Nunca fale sobre modelos, algoritmos ou tecnologia
• Nunca use linguagem técnica com o participante
• Nunca pressione o interlocutor
• Nunca finalize sem antes confirmar se há algo a acrescentar`;

const INITIAL_HR_CONFIG: AgentConfig = {
  name: 'Catarina (RH)',
  template: 'hr',
  description: 'Triagem de Candidatos - Avaliar aderência inicial ao perfil da vaga',
  language: 'Português Brasileiro',
  tone: ['Profissional', 'Empático'],
  speed: 1,
  systemInstruction: `${CATARINA_BASE_PROMPT}

CONTEXTO ESPECÍFICO (RH):
Você está entrevistando um candidato. Avalie experiência, expectativas, soft skills e aderência ao perfil.`,
  analysisPrompt: 'Gere um Resumo do perfil, Score de aderência e Classificação (aprovado ou seguir análise).',
  questions: [
    { id: '1', text: 'Pode me contar brevemente sobre sua experiência profissional?', type: 'open' },
    { id: '2', text: 'O que te motivou a se candidatar a esta vaga?', type: 'open' },
    { id: '3', text: 'Quais são suas principais habilidades?', type: 'open' },
    { id: '4', text: 'Você tem disponibilidade para o modelo de trabalho proposto?', type: 'closed' },
    { id: '5', text: 'Qual sua expectativa salarial?', type: 'open' }
  ]
};

const INITIAL_SALES_CONFIG: AgentConfig = {
  name: 'Catarina (Vendas)',
  template: 'sales',
  description: 'Discovery Call - Qualificar leads antes do vendedor humano',
  language: 'Português Brasileiro',
  tone: ['Consultivo', 'Objetivo'],
  speed: 1,
  systemInstruction: `${CATARINA_BASE_PROMPT}

CONTEXTO ESPECÍFICO (VENDAS):
Você está qualificando um lead. Colete dores, orçamento, timing e autoridade. Entregue lead quente ou desqualificado.`,
  analysisPrompt: 'Identifique: Lead qualificado ou desqualificado, Dores mapeadas e Prioridade de follow up.',
  questions: [
    { id: '1', text: 'Pode me contar um pouco sobre sua empresa?', type: 'open' },
    { id: '2', text: 'Qual desafio você está tentando resolver hoje?', type: 'open' },
    { id: '3', text: 'Como você lida com isso atualmente?', type: 'open' },
    { id: '4', text: 'Existe orçamento previsto para essa solução?', type: 'closed' },
    { id: '5', text: 'Quem participa da decisão final?', type: 'open' }
  ]
};

const INITIAL_ONBOARDING_CONFIG: AgentConfig = {
  name: 'Catarina (Onboarding)',
  template: 'onboarding',
  description: 'Coletar contexto inicial do cliente recém-contratado',
  language: 'Português Brasileiro',
  tone: ['Acolhedor', 'Consultivo'],
  speed: 1,
  systemInstruction: `${CATARINA_BASE_PROMPT}

CONTEXTO ESPECÍFICO (ONBOARDING):
Você está recebendo um novo cliente. Mapeie cenário, expectativas e contexto para preparar o time de sucesso do cliente.`,
  analysisPrompt: 'Gere um Mapa de expectativas, Pontos críticos e Recomendações iniciais.',
  questions: [
    { id: '1', text: 'Qual o principal objetivo ao contratar nossa solução?', type: 'open' },
    { id: '2', text: 'Quais processos você deseja melhorar primeiro?', type: 'open' },
    { id: '3', text: 'Já utilizou soluções semelhantes?', type: 'closed' },
    { id: '4', text: 'Existe algum prazo crítico?', type: 'closed' }
  ]
};

const INITIAL_SUPPORT_CONFIG: AgentConfig = {
  name: 'Suporte Técnico',
  template: 'support',
  description: 'Agente de Nível 1 para resolução de problemas',
  language: 'Português Brasileiro',
  tone: ['Direto'],
  speed: 1,
  systemInstruction: `${CATARINA_BASE_PROMPT}

CONTEXTO ESPECÍFICO (SUPORTE):
Você é um assistente de suporte técnico. Siga um fluxo de diagnóstico passo a passo. Seja paciente e claro.`,
  analysisPrompt: 'Resuma o problema relatado pelo cliente, a solução aplicada passo a passo e a prioridade definida pelo usuário (Baixa, Média, Alta).',
  questions: [
    { id: '1', text: 'Olá, aqui é do Suporte Técnico. Poderia descrever o problema?', type: 'open' },
    { id: '2', text: 'Certo. Qual modelo do equipamento você está utilizando?', type: 'open' },
    { id: '3', text: 'Entendi. Para finalizar, qual nível de prioridade você daria para essa resolução: Baixa, Média ou Alta?', type: 'closed' }
  ]
};

const INITIAL_RESEARCH_CONFIG: AgentConfig = {
  name: 'Pesquisa NPS',
  template: 'research',
  description: 'Agente para coleta de feedback e pesquisa de satisfação',
  language: 'Português Brasileiro',
  tone: ['Empático', 'Profissional'],
  speed: 1,
  systemInstruction: `${CATARINA_BASE_PROMPT}

CONTEXTO ESPECÍFICO (PESQUISA):
Você é um pesquisador de satisfação. Colete feedback honesto e detalhado.`,
  analysisPrompt: 'Gere um Resumo Estratégico em formato de tópicos (bullet points) contendo: - Principais elogios - Principais reclamações - Sugestões de melhoria - Score de Sentimento Geral.',
  questions: [
    { id: '1', text: 'Olá, aqui é da Pesquisa de Qualidade. Você tem um minuto para avaliar nosso serviço?', type: 'closed' },
    { id: '2', text: 'De 0 a 10, qual a chance de você nos recomendar para um amigo?', type: 'closed' },
    { id: '3', text: 'O que motivou essa nota?', type: 'open' }
  ]
};

export function AgentForm() {
  const [activeTab, setActiveTab] = useState('persona');
  const [config, setConfig] = useState<AgentConfig>(INITIAL_HR_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<AgentConfig[]>([]);
  const [showLoadModal, setShowLoadModal] = useState(false);
  
  // Custom dialogs states
  const [dialogAlert, setDialogAlert] = useState<string | null>(null);
  const [dialogConfirm, setDialogConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.settings) {
          if (Array.isArray(data.settings.savedAgents)) {
            setSavedConfigs(data.settings.savedAgents);
          }
          if (data.settings.currentConfig) {
            setConfig(data.settings.currentConfig);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { currentConfig: config } })
    }).catch(() => {});
  }, [config]);

  const updateConfig = <K extends keyof AgentConfig>(field: K, value: AgentConfig[K]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateChange = (template: AgentTemplate) => {
    switch (template) {
      case 'hr':
        setConfig({ ...INITIAL_HR_CONFIG, name: config.name });
        break;
      case 'sales':
        setConfig({ ...INITIAL_SALES_CONFIG, name: config.name });
        break;
      case 'onboarding':
        setConfig({ ...INITIAL_ONBOARDING_CONFIG, name: config.name });
        break;
      case 'support':
        setConfig({ ...INITIAL_SUPPORT_CONFIG, name: config.name });
        break;
      case 'research':
        setConfig({ ...INITIAL_RESEARCH_CONFIG, name: config.name });
        break;
    }
  };

  const addQuestion = () => {
    updateConfig('questions', [...config.questions, { id: Date.now().toString(), text: '', type: 'open' }]);
  };

  const removeQuestion = (id: string) => {
    updateConfig('questions', config.questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof Question, value: string) => {
    updateConfig('questions', config.questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleSave = () => {
    setIsSaving(true);

    const newSavedConfigs = [...savedConfigs];
    const existingIndex = newSavedConfigs.findIndex(c => c.name === config.name);

    const performSave = () => {
      const updatedConfigs = [...savedConfigs];
      if (existingIndex >= 0) {
        updatedConfigs[existingIndex] = config;
      } else {
        updatedConfigs.push(config);
      }
      setSavedConfigs(updatedConfigs);
      
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { savedAgents: updatedConfigs } })
      })
      .then(() => {
        setIsSaving(false);
        setDialogAlert('Configurações do agente salvas com sucesso!');
      })
      .catch(() => {
        setIsSaving(false);
        setDialogAlert('Erro ao salvar as configurações.');
      });
    };

    if (existingIndex >= 0) {
      setDialogConfirm({
        title: 'Sobrescrever Agente',
        message: `Já existe um agente cadastrado com o nome "${config.name}". Deseja substituir suas configurações?`,
        onConfirm: () => {
          performSave();
          setDialogConfirm(null);
        }
      });
      setIsSaving(false);
    } else {
      newSavedConfigs.push(config);
      setSavedConfigs(newSavedConfigs);
      
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { savedAgents: newSavedConfigs } })
      })
      .then(() => {
        setIsSaving(false);
        setDialogAlert('Novo agente criado com sucesso!');
      })
      .catch(() => {
        setIsSaving(false);
        setDialogAlert('Erro ao criar agente.');
      });
    }
  };

  const loadAgent = (agent: AgentConfig) => {
    setConfig(agent);
    setShowLoadModal(false);
  };

  const deleteAgent = (name: string) => {
    setDialogConfirm({
      title: 'Excluir Agente',
      message: `Tem certeza que deseja excluir o agente "${name}" de forma permanente?`,
      onConfirm: () => {
        const newSaved = savedConfigs.filter(c => c.name !== name);
        setSavedConfigs(newSaved);
        
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: { savedAgents: newSaved } })
        })
        .then(() => {
          setDialogConfirm(null);
          setDialogAlert('Agente excluído com sucesso!');
        });
      }
    });
  };

  const clearAllAgents = () => {
    setDialogConfirm({
      title: 'Limpar Todos os Agentes',
      message: 'Tem certeza que deseja apagar TODOS os agentes salvos? Esta ação não pode ser desfeita.',
      onConfirm: () => {
        setSavedConfigs([]);
        
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: { savedAgents: [] } })
        })
        .then(() => {
          setDialogConfirm(null);
          setDialogAlert('Todos os agentes foram removidos.');
        });
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Alert Dialog Modal */}
      {dialogAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-lg mb-2">Mensagem do Sistema</h3>
            <p className="text-sm text-slate-600 mb-6">{dialogAlert}</p>
            <button 
              onClick={() => setDialogAlert(null)}
              className="w-full py-2.5 bg-brand text-white font-bold rounded-lg hover:opacity-90 transition-opacity text-sm"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog Modal */}
      {dialogConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-lg mb-2">{dialogConfirm.title}</h3>
            <p className="text-sm text-slate-600 mb-6">{dialogConfirm.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDialogConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={dialogConfirm.onConfirm}
                className="flex-1 py-2.5 bg-brand text-white font-bold rounded-lg text-sm hover:opacity-90 transition-opacity"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadModal && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Meus Agentes Salvos</h3>
              <button onClick={() => setShowLoadModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto space-y-3">
              {savedConfigs.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhum agente salvo ainda.</p>
              ) : (
                savedConfigs.map((agent, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-brand/40 hover:bg-brand-50 transition-colors group">
                    <div className="flex-1 cursor-pointer" onClick={() => loadAgent(agent)}>
                      <div className="font-bold text-slate-800">{agent.name}</div>
                      <div className="text-xs text-slate-500">{agent.template} • {agent.tone.join(', ')}</div>
                    </div>
                    <button
                      onClick={() => deleteAgent(agent.name)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      title="Excluir"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-400">Clique em um agente para carregar</span>
              {savedConfigs.length > 0 && (
                <button
                  onClick={clearAllAgents}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Limpar Todos
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-slate-200 flex justify-between items-center pr-4">
        <div className="flex flex-wrap">
          <TabButton active={activeTab === 'persona'} onClick={() => setActiveTab('persona')} icon={Mic} label="Persona & Voz" />
          <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={Brain} label="Inteligência" />
          <TabButton active={activeTab === 'script'} onClick={() => setActiveTab('script')} icon={MessageSquare} label="Script" />
          <TabButton active={activeTab === 'integrations'} onClick={() => setActiveTab('integrations')} icon={LinkIcon} label="Integrações" />
        </div>
        <button
          onClick={() => setShowLoadModal(true)}
          className="text-sm font-medium text-brand hover:text-brand-700 flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-brand-50 transition-colors"
        >
          <Database className="h-4 w-4" />
          Meus Agentes
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'persona' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
              <label className="block text-sm font-bold text-slate-900 mb-2">Modelo de Agente (Template)</label>
              <div className="flex flex-wrap gap-2">
                <TemplateButton active={config.template === 'hr'} onClick={() => handleTemplateChange('hr')} label="RH" />
                <TemplateButton active={config.template === 'sales'} onClick={() => handleTemplateChange('sales')} label="Vendas" />
                <TemplateButton active={config.template === 'onboarding'} onClick={() => handleTemplateChange('onboarding')} label="Onboarding" />
                <TemplateButton active={config.template === 'support'} onClick={() => handleTemplateChange('support')} label="Suporte" />
                <TemplateButton active={config.template === 'research'} onClick={() => handleTemplateChange('research')} label="Pesquisa" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Agente</label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => updateConfig('name', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição / Função</label>
              <textarea
                value={config.description}
                onChange={(e) => updateConfig('description', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand outline-none h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Idioma</label>
                <select
                    value={config.language}
                    onChange={(e) => updateConfig('language', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option>Português Brasileiro</option>
                  <option>English (US)</option>
                  <option>Español</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tom de Voz</label>
                <div className="flex flex-wrap gap-2">
                  {['Formal', 'Consultivo', 'Empático', 'Direto', 'Descontraído', 'Profissional'].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        const newTones = config.tone.includes(t)
                          ? config.tone.filter(x => x !== t)
                          : [...config.tone, t];
                        updateConfig('tone', newTones);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        config.tone.includes(t)
                          ? 'bg-brand-100 text-brand-700 border-brand-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Velocidade da Fala ({config.speed}x)</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={config.speed}
                onChange={(e) => updateConfig('speed', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Lento</span>
                <span>Normal</span>
                <span>Rápido</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
             <div className="space-y-6 max-w-2xl">
                 <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-sm text-purple-900">
                     Ajuste como a IA "pensa" e analisa as conversas.
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">System Instruction</label>
                    <p className="text-xs text-slate-500 mb-2">Instruções de base para o comportamento do modelo LLM.</p>
                    <textarea
                        value={config.systemInstruction}
                        onChange={(e) => updateConfig('systemInstruction', e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none h-32 font-mono text-sm"
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Analysis Prompt</label>
                    <p className="text-xs text-slate-500 mb-2">Como a IA deve resumir e extrair dados da conversa.</p>
                    <textarea
                        value={config.analysisPrompt}
                        onChange={(e) => updateConfig('analysisPrompt', e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none h-32 font-mono text-sm"
                    />
                 </div>
             </div>
        )}

        {activeTab === 'script' && (
          <div className="space-y-6">
            <div className="bg-brand-50 p-4 rounded-lg border border-brand-100 text-sm text-brand-800 mb-6">
              Defina o fluxo da conversa.
            </div>

            <div className="space-y-4">
              {config.questions.map((q, index) => (
                <div key={q.id} className="flex gap-4 items-start bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="mt-3 bg-slate-200 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      value={q.text}
                      onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                      placeholder="Digite a pergunta ou fala do agente..."
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand outline-none"
                    />
                    <div className="flex gap-4">
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestion(q.id, 'type', e.target.value)}
                        className="p-2 text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="open">Resposta Aberta</option>
                        <option value="closed">Sim/Não</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={() => removeQuestion(q.id)} className="text-slate-400 hover:text-red-500 mt-3">
                    <Trash className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={addQuestion} className="flex items-center gap-2 text-brand font-medium hover:text-brand-700">
              <Plus className="h-5 w-5" />
              Adicionar Novo Bloco
            </button>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-6 max-w-2xl">
            <IntegrationCard name="HubSpot" connected={true} />
            <IntegrationCard name="Salesforce" connected={false} />
            <IntegrationCard name="Webhooks" connected={false} />
            <IntegrationCard name="n8n" connected={false} />
          </div>
        )}
      </div>

      <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-3">
        <button className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition-colors">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-brand hover:opacity-90 text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : (
            <>
              <Save className="h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}

function TabButton({ active, onClick, icon: Icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-brand text-brand bg-brand-50/50'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

interface TemplateButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function TemplateButton({ active, onClick, label }: TemplateButtonProps) {
    return (
        <button
          onClick={onClick}
          className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${active ? 'bg-brand text-white border-brand shadow-sm' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
        >
          {label}
        </button>
    )
}

function IntegrationCard({ name, connected }: { name: string, connected: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-white">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-500">
          {name[0]}
        </div>
        <span className="font-medium text-slate-900">{name}</span>
      </div>
      <button
        className={`px-3 py-1 rounded-full text-xs font-bold ${
          connected
            ? 'bg-green-100 text-green-700 border border-green-200'
            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
        }`}
      >
        {connected ? 'Conectado' : 'Conectar'}
      </button>
    </div>
  );
}