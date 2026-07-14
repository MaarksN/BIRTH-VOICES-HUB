import * as metricRepository from '../repositories/metricRepository.js';

export function listMetrics(tenantId: string, userId: string) {
  return metricRepository.listMetricsForUser(tenantId, userId);
}

export function createMetric(tenantId: string, userId: string, data: { name: string; value: number; tags?: unknown }) {
  return metricRepository.createMetric(tenantId, userId, data);
}

export function clearMetrics(tenantId: string, userId: string) {
  return metricRepository.deleteMetricsForUser(tenantId, userId);
}
