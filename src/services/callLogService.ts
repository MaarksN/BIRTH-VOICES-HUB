import * as callLogRepository from '../repositories/callLogRepository.js';

export class NotFoundError extends Error {}

export function listCallLogs(tenantId: string) {
  return callLogRepository.listCallLogsForTenant(tenantId);
}

export function createCallLog(tenantId: string, userId: string | null, data: { patientName?: string; duration?: string; status?: string; agent?: string }) {
  return callLogRepository.createCallLog(tenantId, userId, data);
}

export async function updateCallLog(id: string, tenantId: string, data: { patientName?: string; status?: string; duration?: string }) {
  const existing = await callLogRepository.findCallLogForTenant(id, tenantId);
  if (!existing) throw new NotFoundError('Log de chamada não encontrado.');
  return callLogRepository.updateCallLog(id, data);
}

export async function deleteCallLog(id: string, tenantId: string) {
  const existing = await callLogRepository.findCallLogForTenant(id, tenantId);
  if (!existing) throw new NotFoundError('Log não encontrado para exclusão.');
  await callLogRepository.deleteCallLog(id);
}
