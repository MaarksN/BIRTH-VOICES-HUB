import { prisma } from '../lib/prisma.js';

export function listCallLogsForTenant(tenantId: string) {
  return prisma.callLog.findMany({ where: { tenantId }, orderBy: { timestamp: 'desc' }, take: 100 });
}

export function createCallLog(tenantId: string, userId: string | null, data: {
  patientName?: string; duration?: string; status?: string; agent?: string;
}) {
  return prisma.callLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      patientName: data.patientName || 'Contato Anônimo',
      duration: data.duration || '02:15',
      status: data.status || 'Concluído',
      time: 'Agora mesmo',
      agent: data.agent || 'Catarina Atendimento',
    },
  });
}

export function findCallLogForTenant(id: string, tenantId: string) {
  return prisma.callLog.findFirst({ where: { id, tenantId } });
}

export function updateCallLog(id: string, data: { patientName?: string; status?: string; duration?: string }) {
  return prisma.callLog.update({ where: { id }, data });
}

export function deleteCallLog(id: string) {
  return prisma.callLog.delete({ where: { id } });
}
