import React, { useState } from 'react';
import { Key, Webhook, Copy, Eye, EyeOff, Plus, Trash2, Check, RefreshCw, X } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  value: string;
  maskedValue: string;
  visible: boolean;
  createdAt: string;
}

export default function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKey[]>([
    { 
      id: '1', 
      name: 'Production Key LIVE', 
      value: 'pk_live_8g72hjksdfh839fj78hjs923xyz', 
      maskedValue: 'pk_live_****************xyz', 
      visible: false, 
      createdAt: '2026-01-10' 
    },
    { 
      id: '2', 
      name: 'Development Key TEST', 
      value: 'pk_test_1ab23cd45ef67gh89ij0klmnopqrst', 
      maskedValue: 'pk_test_****************qrst', 
      visible: false, 
      createdAt: '2026-02-15' 
    },
  ]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [testWebhookModal, setTestWebhookModal] = useState<string | null>(null);
  const [webhookLog, setWebhookLog] = useState<{status: number, body: string} | null>(null);
  
  // Custom dialog state
  const [dialogConfirm, setDialogConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const handleTestWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookLog({
        status: 200,
        body: JSON.stringify({ success: true, message: "Evento recebido com sucesso" }, null, 2)
    });
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const array = new Uint32Array(24);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    }
    let randomString = '';
    for (let i = 0; i < 24; i++) {
       randomString += characters.charAt(array[i] % characters.length);
    }
    const isLive = newKeyName.toLowerCase().includes('live') || newKeyName.toLowerCase().includes('produção') || newKeyName.toLowerCase().includes('prod');
    const token = `pk_${isLive ? 'live' : 'test'}_${randomString}xyz`;
    const masked = `${token.slice(0, 8)}****************${token.slice(-3)}`;
    
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      value: token,
      maskedValue: masked,
      visible: false,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setKeys([...keys, newKey]);
    setNewKeyName('');
    setShowCreateModal(false);
  };

  const toggleVisibility = (id: string) => {
    setKeys(keys.map(k => k.id === id ? { ...k, visible: !k.visible } : k));
  };

  const handleRevokeKey = (id: string) => {
    setDialogConfirm({
      title: 'Revogar Chave de API',
      message: 'Tem certeza de que deseja revogar esta chave de API? Quaisquer aplicações ou SDKs que utilizem esta chave deixarão de funcionar imediatamente.',
      onConfirm: () => {
        setKeys(keys.filter(k => k.id !== id));
        setDialogConfirm(null);
      }
    });
  };

  const handleCopy = (id: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    requestAnimationFrame(() => {
      setCopiedId(null);
    });
  };

  return (
    <div className="space-y-8 max-w-5xl">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 font-sans">Configurações de Desenvolvedores</h1>
                <p className="text-sm text-slate-500 mt-1">Gerencie suas credenciais de acesso, integrações e webhooks.</p>
            </div>
        </div>

        <div className="space-y-8">
            {/* API Keys */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Key className="h-5 w-5 text-brand" />
                            API Keys
                        </h3>
                        <p className="text-sm text-slate-500">Chaves de produção e teste para autenticação segura.</p>
                    </div>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:opacity-90 text-sm font-medium transition-opacity"
                    >
                        <Plus className="h-4 w-4" /> Criar Chave
                    </button>
                </div>

                <div className="space-y-3">
                    {keys.length === 0 ? (
                        <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400">
                            Nenhuma chave de API configurada. Clique em "Criar Chave" para gerar uma.
                        </div>
                    ) : (
                        keys.map((k) => (
                            <div key={k.id} className="p-4 border border-slate-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 hover:border-slate-300 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900 text-sm">{k.name}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            k.value.includes('_live_') ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                            {k.value.includes('_live_') ? 'LIVE' : 'TEST'}
                                        </span>
                                    </div>
                                    <div className="font-mono text-xs text-slate-600 mt-2 bg-white px-2.5 py-1 rounded border border-slate-100 select-all max-w-[280px] md:max-w-md truncate">
                                        {k.visible ? k.value : k.maskedValue}
                                    </div>
                                    <div className="text-slate-400 text-[10px] mt-1.5 font-sans">
                                        Criada em: {k.createdAt}
                                    </div>
                                </div>
                                <div className="flex gap-2 self-end md:self-center">
                                    <button 
                                        onClick={() => handleCopy(k.id, k.value)}
                                        className="p-2 hover:bg-white rounded text-slate-500 hover:text-brand border border-slate-200 hover:border-slate-350 bg-white shadow-sm transition-all"
                                        title="Copiar token"
                                    >
                                        {copiedId === k.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                    <button 
                                        onClick={() => toggleVisibility(k.id)}
                                        className="p-2 hover:bg-white rounded text-slate-500 hover:text-brand border border-slate-200 hover:border-slate-350 bg-white shadow-sm transition-all"
                                        title={k.visible ? "Mascarar chave" : "Mostrar chave"}
                                    >
                                        {k.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                    <button 
                                        onClick={() => handleRevokeKey(k.id)}
                                        className="p-2 hover:bg-red-50 rounded text-slate-400 hover:text-red-650 border border-slate-200 hover:border-red-200 bg-white shadow-sm transition-all"
                                        title="Revogar chave de API"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Webhooks */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Webhook className="h-5 w-5 text-brand" />
                            Webhooks
                        </h3>
                        <p className="text-sm text-slate-500">Receba notificações de eventos em tempo real no seu servidor.</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors">
                        <Plus className="h-4 w-4" /> Adicionar Endpoint
                    </button>
                </div>

                <div className="space-y-3">
                    <div className="p-4 border border-slate-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start md:items-center gap-4">
                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shrink-0 mt-1 md:mt-0"></div>
                            <div>
                                <div className="font-mono text-sm text-slate-700">https://api.myapp.com/webhooks/voice</div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="px-2 py-0.5 bg-brand-50 text-brand text-[10px] font-bold rounded border border-brand-100">call.completed</span>
                                    <span className="px-2 py-0.5 bg-brand-50 text-brand text-[10px] font-bold rounded border border-brand-100">call.analyzed</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-left md:text-right flex items-center md:items-end flex-col gap-2">
                            <div>
                                <div className="text-xs text-slate-400">Última entrega: 2 min atrás</div>
                                <div className="text-xs font-mono text-green-600 mt-0.5 font-bold">200 OK</div>
                            </div>
                            <button 
                                onClick={() => setTestWebhookModal("https://api.myapp.com/webhooks/voice")}
                                className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded hover:text-brand hover:border-brand shadow-sm transition-colors"
                            >
                                Testar Endpoint
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Test Webhook Modal */}
        {testWebhookModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 text-brand" />
                                Testar Webhook
                            </h3>
                            <p className="text-xs text-slate-500 font-mono mt-1">{testWebhookModal}</p>
                        </div>
                        <button 
                            onClick={() => {
                                setTestWebhookModal(null);
                                setWebhookLog(null);
                            }}
                            className="text-slate-400 hover:text-slate-600 rounded p-1"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    
                    <div className="flex flex-col md:flex-row h-[400px]">
                        {/* Payload Config */}
                        <div className="p-5 w-full md:w-1/2 border-r border-slate-100 flex flex-col gap-4 bg-slate-50">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2">Evento a simular</label>
                                <select className="w-full text-sm p-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand font-mono">
                                    <option value="call.completed">call.completed</option>
                                    <option value="call.analyzed">call.analyzed</option>
                                </select>
                            </div>
                            <div className="flex-1 flex flex-col">
                                <label className="block text-xs font-bold text-slate-600 mb-2">Corpo da Requisição (Payload)</label>
                                <textarea 
                                    className="w-full flex-1 p-3 text-xs border border-slate-300 rounded font-mono bg-slate-800 text-green-400 focus:outline-none resize-none"
                                    defaultValue={JSON.stringify({ event: "call.completed", data: { call_id: "test-123", duration: 120 } }, null, 2)}
                                ></textarea>
                            </div>
                            <button 
                                onClick={handleTestWebhook}
                                className="w-full py-2 bg-brand text-white text-sm font-bold rounded-lg hover:opacity-90 flex items-center justify-center gap-2 transition-opacity"
                            >
                                <Webhook className="h-4 w-4" /> Enviar Teste
                            </button>
                        </div>
                        
                        {/* Response Log */}
                        <div className="p-5 w-full md:w-1/2 flex flex-col bg-slate-50">
                            <label className="block text-xs font-bold text-slate-600 mb-2">Logs de Resposta</label>
                            {webhookLog ? (
                                <div className="flex-1 flex flex-col gap-2">
                                    <div className={`p-2 text-xs font-bold rounded ${webhookLog.status === 200 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        Status: {webhookLog.status} OK
                                    </div>
                                    <textarea 
                                        className="w-full flex-1 p-3 text-xs border border-slate-200 rounded font-mono bg-white text-slate-700 outline-none resize-none"
                                        readOnly
                                        value={webhookLog.body}
                                    ></textarea>
                                </div>
                            ) : (
                                <div className="flex-1 border border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <Webhook className="h-8 w-8 opacity-20" />
                                    <span className="text-xs">Aguardando envio...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Create Key Modal */}
        {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Key className="h-4 w-4 text-brand" />
                            Criar Nova Chave de API
                        </h3>
                        <button 
                            onClick={() => setShowCreateModal(false)}
                            className="text-slate-400 hover:text-slate-600 rounded p-1"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <form onSubmit={handleCreateKey}>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Identificador da Chave</label>
                                <input 
                                    type="text" 
                                    value={newKeyName}
                                    placeholder="Ex: Production Live, Test Chatbot, staging_client" 
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-sm font-sans"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-500 leading-relaxed">
                                <span className="font-bold text-slate-700">Nota:</span> Se o nome contiver "live" ou "produção", a chave será gerada como chave ativa de produção (<span className="font-mono text-amber-700">pk_live_*</span>). Caso contrário, será gerada uma chave de teste (<span className="font-mono text-slate-700">pk_test_*</span>).
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button 
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-sm font-medium text-slate-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="px-4 py-2 bg-brand text-white rounded-lg hover:opacity-95 text-sm font-medium transition-opacity"
                            >
                                Gerar Credencial
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Custom Confirmation Modal */}
        {dialogConfirm && (
            <div className="fixed inset-0 z-55 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
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
                            className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg text-sm hover:bg-red-750 transition-colors"
                        >
                            Revogar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
