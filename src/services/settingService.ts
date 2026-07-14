import * as settingRepository from '../repositories/settingRepository.js';

const DEFAULT_SETTINGS = {
  theme: 'light',
  notificationsEnabled: true,
  mfaEnabled: false,
  recordingEnabled: true,
};

const DEFAULT_VOICE_RUNTIME = {
  voiceId: 'eleven_rachel',
  language: 'pt-BR',
  speed: 1.0,
  stability: 0.75,
  clarity: 0.85,
};

const DEFAULT_CHECKLIST = {
  orgCreated: true,
  agentCreated: false,
  telephonyConnected: false,
  knowledgeAdded: false,
  firstTest: false,
  agentPublished: false,
  analyticsActive: false,
  firstCallCompleted: false,
};

export async function getUserSettings(tenantId: string, userId: string) {
  const row = await settingRepository.findSetting(tenantId, userId, 'general');
  return row?.value ?? DEFAULT_SETTINGS;
}

export async function saveUserSettings(tenantId: string, userId: string, settings: Record<string, unknown>, merge: boolean) {
  let value = settings;
  if (merge) {
    const existing = await settingRepository.findSetting(tenantId, userId, 'general');
    value = { ...((existing?.value as Record<string, unknown>) ?? {}), ...settings };
  }
  await settingRepository.upsertSetting(tenantId, userId, 'general', value);
  return value;
}

export function resetUserSettings(tenantId: string, userId: string) {
  return settingRepository.deleteSetting(tenantId, userId, 'general');
}

export async function getVoiceRuntimeConfig(tenantId: string, userId: string) {
  const row = await settingRepository.findSetting(tenantId, userId, 'voice_runtime');
  return row?.value ?? DEFAULT_VOICE_RUNTIME;
}

export async function saveVoiceRuntimeConfig(tenantId: string, userId: string, config: Record<string, unknown>, merge: boolean) {
  let value = config;
  if (merge) {
    const existing = await settingRepository.findSetting(tenantId, userId, 'voice_runtime');
    value = { ...((existing?.value as Record<string, unknown>) ?? {}), ...config };
  }
  await settingRepository.upsertSetting(tenantId, userId, 'voice_runtime', value);
  return value;
}

export function resetVoiceRuntimeConfig(tenantId: string, userId: string) {
  return settingRepository.deleteSetting(tenantId, userId, 'voice_runtime');
}

export async function getChecklist(tenantId: string, userId: string) {
  const row = await settingRepository.findSetting(tenantId, userId, 'onboarding_checklist');
  return row?.value ?? DEFAULT_CHECKLIST;
}

export function saveChecklist(tenantId: string, userId: string, checklist: Record<string, boolean>) {
  return settingRepository.upsertSetting(tenantId, userId, 'onboarding_checklist', checklist);
}

export function resetChecklist(tenantId: string, userId: string) {
  return settingRepository.deleteSetting(tenantId, userId, 'onboarding_checklist');
}

export async function getBrandColor(tenantId: string | null) {
  if (!tenantId) return '#2563eb';
  const row = await settingRepository.findSetting(tenantId, null, 'brand_color');
  return (row?.value as string) ?? '#2563eb';
}

export function saveBrandColor(tenantId: string, color: string) {
  return settingRepository.upsertSetting(tenantId, null, 'brand_color', color);
}

export function resetBrandColor(tenantId: string) {
  return settingRepository.deleteSetting(tenantId, null, 'brand_color');
}
