import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Save,
  Send,
  Volume2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Question, RuntimeStatus, SessionRecord, StoredAgent, StructuredDraft, StructuredRisk } from '../../types';

type Message = { role: 'agent' | 'user'; text: string };
type CallStatus = 'idle' | 'speaking' | 'listening' | 'processing' | 'completed';

const speechRecognitionSupported = () =>
  typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

const createEmptyStructuredDraft = (): StructuredDraft => ({
  extracted: [],
  triggeredRisks: [],
  requiredMissing: [],
});

const normalizeForMatch = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const keywordMatches = (answer: string, keyword: string) => {
  const normalizedAnswer = normalizeForMatch(answer);
  const normalizedKeyword = normalizeForMatch(keyword).trim();

  if (!normalizedKeyword) return false;
  if (/^\d+$/.test(normalizedKeyword)) {
    return normalizedAnswer.split(/\D+/).includes(normalizedKeyword);
  }

  return normalizedAnswer.includes(normalizedKeyword);
};

const detectRisk = (question: Question, answer: string): StructuredRisk | null => {
  const keyword = (question.riskKeywords || []).find((item) => keywordMatches(answer, item));
  if (!keyword) return null;

  return {
    questionId: question.id,
    question: question.text,
    keyword,
    answer,
    detectedAt: new Date().toISOString(),
  };
};

const applyAnswerToDraft = (draft: StructuredDraft, question: Question, answer: string, risk: StructuredRisk | null): StructuredDraft => {
  const label = question.collectAs?.trim();
  const extracted = label
    ? [
        ...draft.extracted.filter((item) => item.label.toLowerCase() !== label.toLowerCase()),
        { label, value: answer },
      ]
    : draft.extracted;

  const triggeredRisks = risk && !draft.triggeredRisks.some((item) => item.questionId === risk.questionId && item.keyword === risk.keyword)
    ? [...draft.triggeredRisks, risk]
    : draft.triggeredRisks;

  return {
    extracted,
    triggeredRisks,
    requiredMissing: draft.requiredMissing || [],
  };
};

const getRequiredMissing = (agent: StoredAgent, draft: StructuredDraft) => {
  const collected = new Set(draft.extracted.map((item) => item.label.toLowerCase()));
  return agent.questions
    .filter((question) => question.required && question.collectAs && !collected.has(question.collectAs.toLowerCase()))
    .map((question) => question.collectAs!);
};

export default function PlaygroundPage() {
  const [agents, setAgents] = useState<StoredAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [input, setInput] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [caller, setCaller] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [savedSession, setSavedSession] = useState<SessionRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [structuredDraft, setStructuredDraft] = useState<StructuredDraft>(() => createEmptyStructuredDraft());

  const recognitionRef = useRef<any>(null);
  const startedAtRef = useRef<number | null>(null);
  const completedAtRef = useRef<number | null>(null);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) || null,
    [agents, selectedAgentId],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [agentsResponse, statusResponse] = await Promise.all([
          api.listAgents(),
          api.status(),
        ]);

        if (!cancelled) {
          setAgents(agentsResponse.agents);
          setRuntime(statusResponse);
          setSelectedAgentId(agentsResponse.agents[0]?.id || '');
        }
      } catch (error: any) {
        if (!cancelled) setStatusMessage(error.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      stopRecognition();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const appendMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const speak = (text: string, onEnd?: () => void) => {
    appendMessage({ role: 'agent', text });
    setCallStatus('speaking');

    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (!synth) {
      globalThis.setTimeout(() => onEnd?.(), 400);
      return;
    }

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedAgent?.language.includes('Português') ? 'pt-BR' : 'en-US';
    utterance.rate = selectedAgent?.speed || 1;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith('pt-br')) || voices.find((voice) => voice.lang.toLowerCase().startsWith('pt'));
    if (ptVoice) utterance.voice = ptVoice;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onEnd?.();
    };
    const fallbackMs = Math.min(9000, Math.max(1800, text.length * 45));

    utterance.onend = finish;
    utterance.onerror = finish;
    globalThis.setTimeout(finish, fallbackMs);
    synth.speak(utterance);
  };

  const askQuestion = (index: number) => {
    if (!selectedAgent) return;
    const question = selectedAgent.questions[index];

    if (!question) {
      const closing = 'Obrigada. Vou registrar a conversa, organizar as informações e preparar a entrega para a operação.';
      completedAtRef.current = Date.now();
      speak(closing, () => setCallStatus('completed'));
      return;
    }

    setCurrentQuestionIndex(index);
    speak(question.text, () => startRecognition());
  };

  const startCall = () => {
    if (!selectedAgent) return;
    if (!selectedAgent.questions.length) {
      setStatusMessage('Este agente não possui perguntas no roteiro.');
      return;
    }

    stopRecognition();
    window.speechSynthesis?.cancel();
    setMessages([]);
    setInput('');
    setInterimTranscript('');
    setSavedSession(null);
    setStatusMessage('');
    setStructuredDraft(createEmptyStructuredDraft());
    setCurrentQuestionIndex(0);
    startedAtRef.current = Date.now();
    completedAtRef.current = null;
    askQuestion(0);
  };

  const resetCall = () => {
    stopRecognition();
    window.speechSynthesis?.cancel();
    setCallStatus('idle');
    setMessages([]);
    setInput('');
    setInterimTranscript('');
    setSavedSession(null);
    setStatusMessage('');
    setStructuredDraft(createEmptyStructuredDraft());
    setCurrentQuestionIndex(0);
    startedAtRef.current = null;
    completedAtRef.current = null;
  };

  const startRecognition = () => {
    setInterimTranscript('');

    if (!speechRecognitionSupported()) {
      setCallStatus('listening');
      setStatusMessage('Reconhecimento de voz indisponível neste navegador. Use o campo de texto para responder.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';

    recognition.onstart = () => setCallStatus('listening');
    recognition.onresult = (event: any) => {
      let finalText = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }

      setInterimTranscript(interim);
      if (finalText.trim()) {
        handleUserAnswer(finalText.trim());
      }
    };
    recognition.onerror = (event: any) => {
      setCallStatus('listening');
      setStatusMessage(`Reconhecimento de voz: ${event.error}. Você pode responder por texto.`);
    };
    recognition.onend = () => {
      if (callStatus === 'listening') setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Browser recognition can throw if already stopped.
      }
      recognitionRef.current = null;
    }
  };

  const handleUserAnswer = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !selectedAgent) return;
    stopRecognition();
    setInterimTranscript('');
    appendMessage({ role: 'user', text: trimmed });
    setInput('');
    setCallStatus('processing');

    const question = selectedAgent.questions[currentQuestionIndex];
    const risk = question ? detectRisk(question, trimmed) : null;
    const nextDraft = question ? applyAnswerToDraft(structuredDraft, question, trimmed, risk) : structuredDraft;
    setStructuredDraft(nextDraft);

    if (risk && question?.stopOnRisk) {
      const escalationMessage = 'Identifiquei um possível sinal de atenção. Vou interromper o roteiro, registrar prioridade alta e encaminhar para retorno humano.';
      completedAtRef.current = Date.now();
      window.setTimeout(() => speak(escalationMessage, () => setCallStatus('completed')), 450);
      return;
    }

    const nextIndex = currentQuestionIndex + 1;
    window.setTimeout(() => askQuestion(nextIndex), 450);
  };

  const saveStructuredSession = async () => {
    if (!selectedAgent) return;
    setSaving(true);
    setStatusMessage('');

    try {
      const startedAt = startedAtRef.current || Date.now();
      const endedAt = completedAtRef.current || Date.now();
      const draftForSave = {
        ...structuredDraft,
        requiredMissing: getRequiredMissing(selectedAgent, structuredDraft),
      };
      setStructuredDraft(draftForSave);

      const response = await api.analyzeAndSaveSession({
        agentId: selectedAgent.id,
        caller: caller.trim() || 'Contato não informado',
        transcriptItems: messages,
        durationSeconds: Math.max(1, Math.round((endedAt - startedAt) / 1000)),
        structuredDraft: draftForSave,
      });

      setSavedSession(response.session);
      const delivery = response.session.integrationDelivery;
      const deliveryText = delivery?.status === 'delivered'
        ? ` Entrega enviada para ${delivery.target}.`
        : delivery?.status === 'failed'
          ? ` Sessão salva, mas a integração falhou: ${delivery.message}`
          : ' Sessão salva. Configure um webhook para entrega automática ao CRM/ATS/banco.';
      const analysisText = runtime?.geminiConfigured
        ? 'Sessão analisada e registrada com sucesso.'
        : 'Sessão registrada com campos e regras do roteiro. Configure GEMINI_API_KEY para análise semântica do Gemini.';
      setStatusMessage(`${analysisText}${deliveryText}`);
    } catch (error: any) {
      setStatusMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando agentes...
      </div>
    );
  }

  if (!agents.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50 text-brand">
          <Bot className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-950">Crie um agente antes de iniciar chamadas</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          O playground usa agentes reais salvos no backend. Depois de criar o agente, a Catarina poderá conduzir o roteiro por voz e registrar a sessão.
        </p>
        <a href="/#/dashboard/agents/new" className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">
          Criar meu agente
        </a>
      </div>
    );
  }

  const canSave = callStatus === 'completed' && messages.some((message) => message.role === 'user');
  const currentQuestion = selectedAgent?.questions[currentQuestionIndex];

  return (
    <div className="grid min-h-[calc(100vh-8rem)] grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-brand">Voice Agent</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Conversa estruturada</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Catarina fala, escuta, segue o roteiro e salva a transcrição com análise inteligente.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Agente</span>
            <select
              value={selectedAgentId}
              onChange={(event) => {
                setSelectedAgentId(event.target.value);
                resetCall();
              }}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-medium outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Contato / lead / paciente</span>
            <input
              value={caller}
              onChange={(event) => setCaller(event.target.value)}
              placeholder="Nome, telefone ou identificador"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">Roteiro</span>
              <span className="text-xs font-bold text-slate-700">{selectedAgent?.questions.length || 0} blocos</span>
            </div>
            <div className="mt-3 space-y-2">
              {selectedAgent?.questions.map((question, index) => (
                <div key={question.id} className={`rounded-md p-2 text-xs ${index === currentQuestionIndex && callStatus !== 'idle' ? 'bg-brand text-white' : 'bg-white text-slate-600'}`}>
                  <span className="font-bold">{index + 1}.</span> {question.text}
                  <div className={`mt-1 flex flex-wrap gap-1 ${index === currentQuestionIndex && callStatus !== 'idle' ? 'text-white/80' : 'text-slate-400'}`}>
                    {question.collectAs && <span>campo: {question.collectAs}</span>}
                    {question.required && <span>obrigatória</span>}
                    {Boolean(question.riskKeywords?.length) && <span>monitora risco</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">Coleta estruturada</span>
              <span className="text-xs font-bold text-slate-700">{structuredDraft.extracted.length} campos</span>
            </div>
            {structuredDraft.extracted.length === 0 ? (
              <p className="mt-3 text-xs leading-5 text-slate-500">Os campos aparecem conforme a conversa avança.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {structuredDraft.extracted.map((item) => (
                  <div key={item.label} className="rounded-md bg-slate-50 p-2 text-xs">
                    <div className="font-bold text-slate-700">{item.label}</div>
                    <div className="mt-1 line-clamp-2 text-slate-500">{item.value}</div>
                  </div>
                ))}
              </div>
            )}
            {structuredDraft.triggeredRisks.length > 0 && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="h-4 w-4" />
                  Risco detectado
                </div>
                <div className="mt-1">
                  {structuredDraft.triggeredRisks.map((risk) => risk.keyword).join(', ')}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
            <StatusRow label="IA Gemini" ok={Boolean(runtime?.geminiConfigured)} failText="salva roteiro sem LLM" />
            <StatusRow label="Reconhecimento de voz" ok={speechRecognitionSupported()} failText="Use resposta por texto" />
            <StatusRow label="Entrega CRM/ATS" ok={Boolean(runtime?.integrationConfigured)} failText="Configure webhook em Developers" />
          </div>
        </div>
      </aside>

      <main className="flex min-h-[680px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(callStatus)}`}>{statusLabel(callStatus)}</span>
              {currentQuestion && callStatus !== 'idle' && (
                <span className="text-xs font-semibold text-slate-500">Pergunta {currentQuestionIndex + 1} de {selectedAgent?.questions.length}</span>
              )}
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">{selectedAgent?.name}</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={resetCall}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              Resetar
            </button>
            <button
              onClick={startCall}
              disabled={callStatus === 'speaking' || callStatus === 'listening' || callStatus === 'processing'}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Iniciar chamada
            </button>
            <button
              onClick={saveStructuredSession}
              disabled={!canSave || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {runtime?.geminiConfigured ? 'Analisar e salvar' : 'Salvar registro'}
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="border-b border-slate-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-900">
            {statusMessage}
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center text-slate-500">
              <Volume2 className="mb-3 h-12 w-12 text-slate-300" />
              <p className="font-bold text-slate-700">Pronto para iniciar uma conversa real</p>
              <p className="mt-1 max-w-md text-sm">Ao iniciar, Catarina vai ler a primeira pergunta e aguardar a resposta por voz ou texto.</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-6 shadow-sm ${
                    message.role === 'user'
                      ? 'rounded-tr-none bg-brand text-white'
                      : 'rounded-tl-none border border-slate-200 bg-white text-slate-800'
                  }`}>
                    {message.text}
                  </div>
                </div>
              ))}
              {interimTranscript && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-none border border-dashed border-brand-200 bg-brand-50 p-3 text-sm italic text-brand">
                    {interimTranscript}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white p-4">
          <div className="flex gap-2">
            <button
              onClick={() => callStatus === 'listening' ? stopRecognition() : startRecognition()}
              disabled={callStatus === 'idle' || callStatus === 'completed' || callStatus === 'speaking'}
              className={`rounded-full p-3 transition ${
                callStatus === 'listening'
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } disabled:cursor-not-allowed disabled:opacity-50`}
              title={callStatus === 'listening' ? 'Parar microfone' : 'Ouvir resposta'}
            >
              {callStatus === 'listening' ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleUserAnswer(input)}
              disabled={callStatus === 'idle' || callStatus === 'speaking' || callStatus === 'processing' || callStatus === 'completed'}
              placeholder={callStatus === 'listening' ? 'Digite a resposta caso prefira não usar voz...' : 'Inicie a chamada para responder'}
              className="min-w-0 flex-1 rounded-full border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand disabled:bg-slate-50"
            />
            <button
              onClick={() => handleUserAnswer(input)}
              disabled={!input.trim() || callStatus === 'idle' || callStatus === 'speaking' || callStatus === 'processing' || callStatus === 'completed'}
              className="rounded-full bg-brand p-3 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              title="Enviar resposta"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>

          {savedSession && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Sessão {savedSession.id} salva com {savedSession.extracted.length} campos estruturados.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusRow({ label, ok, failText }: { label: string; ok: boolean; failText: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
        {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        {ok ? 'OK' : failText}
      </span>
    </div>
  );
}

function statusLabel(status: CallStatus) {
  const labels: Record<CallStatus, string> = {
    idle: 'Aguardando',
    speaking: 'Catarina falando',
    listening: 'Ouvindo resposta',
    processing: 'Processando',
    completed: 'Conversa concluída',
  };
  return labels[status];
}

function statusClass(status: CallStatus) {
  const classes: Record<CallStatus, string> = {
    idle: 'bg-slate-100 text-slate-700',
    speaking: 'bg-cyan-50 text-cyan-700',
    listening: 'bg-rose-50 text-rose-700',
    processing: 'bg-amber-50 text-amber-700',
    completed: 'bg-emerald-50 text-emerald-700',
  };
  return classes[status];
}
