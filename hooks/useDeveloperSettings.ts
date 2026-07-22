import { useState } from 'react';

export interface ApiKey {
  id: string;
  name: string;
  value: string;
  maskedValue: string;
  visible: boolean;
  createdAt: string;
}

interface DialogConfirmState {
  title: string;
  message: string;
  onConfirm: () => void;
}

interface WebhookLog {
  status: number;
  body: string;
}

const INITIAL_KEYS: ApiKey[] = [
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
];

export function useDeveloperSettings() {
  const [keys, setKeys] = useState<ApiKey[]>(INITIAL_KEYS);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [testWebhookModal, setTestWebhookModal] = useState<string | null>(null);
  const [webhookLog, setWebhookLog] = useState<WebhookLog | null>(null);
  const [dialogConfirm, setDialogConfirm] = useState<DialogConfirmState | null>(null);

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

  return {
    keys,
    copiedId,
    newKeyName,
    setNewKeyName,
    showCreateModal,
    setShowCreateModal,
    testWebhookModal,
    setTestWebhookModal,
    webhookLog,
    setWebhookLog,
    dialogConfirm,
    setDialogConfirm,
    handleTestWebhook,
    handleCreateKey,
    toggleVisibility,
    handleRevokeKey,
    handleCopy,
  };
}
