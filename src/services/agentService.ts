import * as agentRepository from '../repositories/agentRepository.js';

export function listAgents(tenantId: string) {
  return agentRepository.listAgentsForTenant(tenantId);
}

export function createAgent(tenantId: string, userId: string, data: { name: string; model: string; configuration?: unknown }) {
  return agentRepository.createAgent(tenantId, userId, data);
}

export function deleteAgent(id: string, tenantId: string) {
  return agentRepository.deleteAgentForTenant(id, tenantId);
}
