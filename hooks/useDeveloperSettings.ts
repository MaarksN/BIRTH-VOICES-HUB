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

// No backend API-key issuance exists yet (prisma has an unused `APIKey` model but no
// route/controller/service reads or writes it — see handoff 02-para-09-api-key-backend.md).
// Starting from an empty list — rather than two pre-seeded keys that looked exactly like real
// live/test secret values sitting in source — avoids both (a) presenting fabricated credentials
// as if issued by a real backend, and (b) a string shaped like a real secret living in the repo.
const INITIAL_KEYS: ApiKey[] = [];

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
