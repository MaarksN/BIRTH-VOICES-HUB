import React, { useState, useEffect } from 'react';
import { Plus, Trash, Save, Mic, MessageSquare, Database, Link as LinkIcon, Brain } from 'lucide-react';
import { AgentConfig, AgentTemplate, Question, StoredAgent } from '../types';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/errors';

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
    { id: '1', text: 'Pode me contar brevemente sobre sua experiência profissional?', type: 'open', collectAs: 'experiencia_profissional', required: true },
    { id: '2', text: 'O que te motivou a se candidatar a esta vaga?', type: 'open', collectAs: 'motivacao' },
    { id: '3', text: 'Quais são suas principais habilidades?', type: 'open', collectAs: 'habilidades' },
    { id: '4', text: 'Você tem disponibilidade para o modelo de trabalho proposto?', type: 'closed', collectAs: 'disponibilidade', required: true },
    { id: '5', text: 'Qual sua expectativa salarial?', type: 'open', collectAs: 'expectativa_salarial' }
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
    { id: '1', text: 'Pode me contar um pouco sobre sua empresa?', type: 'open', collectAs: 'empresa', required: true },
    { id: '2', text: 'Qual desafio você está tentando resolver hoje?', type: 'open', collectAs: 'dor_principal', required: true, riskKeywords: ['urgente', 'perdendo clientes', 'parado', 'não consigo operar'] },
    { id: '3', text: 'Como você lida com isso atualmente?', type: 'open', collectAs: 'processo_atual' },
    { id: '4', text: 'Existe orçamento previsto para essa solução?', type: 'closed', collectAs: 'orcamento', required: true },
    { id: '5', text: 'Quem participa da decisão final?', type: 'open', collectAs: 'decisores' }
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
    { id: '1', text: 'Qual o principal objetivo ao contratar nossa solução?', type: 'open', collectAs: 'objetivo_principal', required: true },
    { id: '2', text: 'Quais processos você deseja melhorar primeiro?', type: 'open', collectAs: 'processos_prioritarios' },
    { id: '3', text: 'Já utilizou soluções semelhantes?', type: 'closed', collectAs: 'experiencia_previa' },
    { id: '4', text: 'Existe algum prazo crítico?', type: 'closed', collectAs: 'prazo_critico', riskKeywords: ['hoje', 'amanhã', 'esta semana', 'urgente'] }
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
    { id: '1', text: 'Olá, aqui é do Suporte Técnico. Poderia descrever o problema?', type: 'open', collectAs: 'problema', required: true, riskKeywords: ['fora do ar', 'parado', 'perda de dados', 'critico', 'crítico'], stopOnRisk: true },
    { id: '2', text: 'Certo. Qual modelo do equipamento você está utilizando?', type: 'open', collectAs: 'modelo_equipamento' },
    { id: '3', text: 'Entendi. Para finalizar, qual nível de prioridade você daria para essa resolução: Baixa, Média ou Alta?', type: 'closed', collectAs: 'prioridade' }
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
    { id: '1', text: 'Olá, aqui é da Pesquisa de Qualidade. Você tem um minuto para avaliar nosso serviço?', type: 'closed', collectAs: 'aceite_pesquisa' },
    { id: '2', text: 'De 0 a 10, qual a chance de você nos recomendar para um amigo?', type: 'closed', collectAs: 'nota_nps', required: true, riskKeywords: ['0', '1', '2', '3', '4', 'péssimo', 'horrível'] },
    { id: '3', text: 'O que motivou essa nota?', type: 'open', collectAs: 'motivo_nota' }
  ]
};

const INITIAL_MATERNAL_CONFIG: AgentConfig = {
  name: 'Catarina (Pré-natal)',
  template: 'maternal',
  description: 'Atendimento de pré-natal, confirmação de consultas e orientação segura de próximos passos',
  language: 'Português Brasileiro',
  tone: ['Empático', 'Profissional'],
  speed: 1,
  systemInstruction: `${CATARINA_BASE_PROMPT}

CONTEXTO ESPECÍFICO (CUIDADO MATERNO):
Você apoia gestantes e puérperas com acolhimento, confirmação de informações, coleta estruturada e encaminhamento seguro.
Você não dá diagnóstico, não substitui equipe clínica e deve orientar contato humano imediato quando houver dor intensa, sangramento, febre, falta de ar, tontura forte, alteração importante de pressão, redução de movimentos fetais ou qualquer sinal de urgência.`,
  analysisPrompt: 'Gere: resumo objetivo, sinais de risco, campos extraídos, próxima ação recomendada e necessidade de escalação humana.',
  questions: [
    { id: '1', text: 'Olá, posso confirmar seu nome e o motivo do contato?', type: 'open', collectAs: 'identificacao_e_motivo', required: true },
    { id: '2', text: 'Você está sentindo algum sintoma que precise de atenção imediata?', type: 'open', collectAs: 'sintomas', required: true, riskKeywords: ['dor forte', 'sangramento', 'febre', 'falta de ar', 'tontura', 'pressão alta', 'pressao alta', 'movimentos fetais reduzidos', 'bebê mexendo menos', 'bebe mexendo menos'], stopOnRisk: true },
    { id: '3', text: 'Qual foi a última orientação recebida pela equipe de saúde?', type: 'open', collectAs: 'orientacao_recebida' },
    { id: '4', text: 'Você gostaria que eu registrasse uma solicitação de retorno da equipe?', type: 'closed', collectAs: 'solicitar_retorno' }
  ]
};

export function AgentForm() {
  const [activeTab, setActiveTab] = useState('persona');
  const [config, setConfig] = useState<AgentConfig>(INITIAL_MATERNAL_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<StoredAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await api.listAgents();
        setSavedConfigs(response.agents);
      } catch (error) {
        setStatusMessage(getErrorMessage(error));
      }
    };

    loadAgents();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('birth_voices_current_config', JSON.stringify(config));
  }, [config]);

  const updateConfig = <K extends keyof AgentConfig>(field: K, value: AgentConfig[K]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateChange = (template: AgentTemplate) => {
    switch (template) {
      case 'maternal':
        setConfig({ ...INITIAL_MATERNAL_CONFIG, name: config.name });
        break;
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
    updateConfig('questions', [...config.questions, { id: Date.now().toString(), text: '', type: 'open', riskKeywords: [] }]);
  };

  const removeQuestion = (id: string) => {
    updateConfig('questions', config.questions.filter(q => q.id !== id));
  };

  const updateQuestion = <K extends keyof Question>(id: string, field: K, value: Question[K]) => {
    updateConfig('questions', config.questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage('');

    try {
      const existingByName = savedConfigs.find(agent => agent.name === config.name && agent.id !== selectedAgentId);
      let saved: StoredAgent;

      if (selectedAgentId) {
        saved = (await api.updateAgent(selectedAgentId, config)).agent;
      } else if (existingByName && confirm(`Já existe um agente com o nome "${config.name}". Deseja atualizar esse agente?`)) {
        saved = (await api.updateAgent(existingByName.id, config)).agent;
      } else if (existingByName) {
        setIsSaving(false);
        return;
      } else {
        saved = (await api.createAgent(config)).agent;
      }

      setSelectedAgentId(saved.id);
      setConfig(saved);
      const response = await api.listAgents();
      setSavedConfigs(response.agents);
      setStatusMessage('Agente salvo no backend com sucesso.');
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const loadAgent = (agent: StoredAgent) => {
    setConfig(agent);
    setSelectedAgentId(agent.id);
    setShowLoadModal(false);
    setStatusMessage(`Agente "${agent.name}" carregado.`);
  };

  const deleteAgent = async (agent: StoredAgent) => {
    if (confirm(`Tem certeza que deseja excluir o agente "${agent.name}"?`)) {
      try {
        await api.deleteAgent(agent.id);
        const newSaved = savedConfigs.filter(c => c.id !== agent.id);
        setSavedConfigs(newSaved);
        if (selectedAgentId === agent.id) {
          setSelectedAgentId(null);
          setConfig(INITIAL_MATERNAL_CONFIG);
        }
        setStatusMessage('Agente excluído.');
      } catch (error) {
        setStatusMessage(getErrorMessage(error));
      }
    }
  };

  const clearAllAgents = async () => {
    if (confirm('Tem certeza que deseja apagar TODOS os agentes salvos? Esta ação não pode ser desfeita.')) {
      try {
        await Promise.all(savedConfigs.map(agent => api.deleteAgent(agent.id)));
        setSavedConfigs([]);
        setSelectedAgentId(null);
        setConfig(INITIAL_MATERNAL_CONFIG);
        setStatusMessage('Todos os agentes foram excluídos.');
      } catch (error) {
        setStatusMessage(getErrorMessage(error));
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
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
                savedConfigs.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                    <div className="flex-1 cursor-pointer" onClick={() => loadAgent(agent)}>
                      <div className="font-bold text-slate-800">{agent.name}</div>
                      <div className="text-xs text-slate-500">{agent.template} • {agent.tone.join(', ')}</div>
                    </div>
                    <button
                      onClick={() => deleteAgent(agent)}
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
          className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Database className="h-4 w-4" />
          Meus Agentes
        </button>
      </div>

      <div className="p-6">
        {statusMessage && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700">
            {statusMessage}
          </div>
        )}

        {activeTab === 'persona' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
              <label className="block text-sm font-bold text-slate-900 mb-2">Modelo de Agente (Template)</label>
              <div className="flex flex-wrap gap-2">
                <TemplateButton active={config.template === 'maternal'} onClick={() => handleTemplateChange('maternal')} label="Cuidado Materno" />
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
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição / Função</label>
              <textarea
                value={config.description}
                onChange={(e) => updateConfig('description', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24"
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
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
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
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 mb-6">
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
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <div className="flex gap-4">
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestion(q.id, 'type', e.target.value as Question['type'])}
                        className="p-2 text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="open">Resposta Aberta</option>
                        <option value="closed">Sim/Não</option>
                      </select>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Campo estruturado</span>
                        <input
                          type="text"
                          value={q.collectAs || ''}
                          onChange={(e) => updateQuestion(q.id, 'collectAs', e.target.value)}
                          placeholder="ex.: sintomas, orçamento, prioridade"
                          className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Palavras de risco</span>
                        <input
                          type="text"
                          value={(q.riskKeywords || []).join(', ')}
                          onChange={(e) => updateQuestion(q.id, 'riskKeywords', e.target.value.split(',').map(item => item.trim()).filter(Boolean))}
                          placeholder="ex.: urgente, dor forte, fora do ar"
                          className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(q.required)}
                          onChange={(e) => updateQuestion(q.id, 'required', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                        Obrigatória
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(q.stopOnRisk)}
                          onChange={(e) => updateQuestion(q.id, 'stopOnRisk', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                        Escalar ao detectar risco
                      </label>
                    </div>
                  </div>
                  <button onClick={() => removeQuestion(q.id)} className="text-slate-400 hover:text-red-500 mt-3">
                    <Trash className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={addQuestion} className="flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700">
              <Plus className="h-5 w-5" />
              Adicionar Novo Bloco
            </button>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-6 max-w-2xl">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Integrações externas só ficam ativas quando credenciais reais forem configuradas no backend. Nenhuma conexão é marcada como ativa sem autenticação.
            </div>
            <IntegrationCard name="HubSpot" connected={false} />
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
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
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

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-blue-600 text-blue-600 bg-blue-50/50'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function TemplateButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
          onClick={onClick}
          className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${active ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
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
        {connected ? 'Conectado' : 'Configurar'}
      </button>
    </div>
  );
}
