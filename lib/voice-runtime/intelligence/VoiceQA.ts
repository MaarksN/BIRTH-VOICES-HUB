import { SessionIntelligence } from '../types';
import { observability } from '../Observability';

export interface QAAuditResult {
  passed: boolean;
  score: number;
  violations: string[];
  notes: string;
}

export class VoiceQAEngine {
  public auditSession(sessionId: string, intelligence: SessionIntelligence): QAAuditResult {
    observability.startSpan(`qa-audit-${sessionId}`);
    
    // Voice QA avalia conformidade (Compliance), scripts mandatórios, etc.
    const violations: string[] = [];
    
    // Simulação de regras de Quality Assurance
    // Ex: Se entidades CPF foram coletadas, verificar se houve aceite da LGPD (no contexto)
    const collectedCPF = intelligence.extractedEntities.some(e => e.type === 'CPF' || e.type === 'Documento');
    const lgpdConsent = intelligence.contextSummary.toLowerCase().includes('concorda com a lgpd') || intelligence.contextSummary.toLowerCase().includes('política de privacidade');

    if (collectedCPF && !lgpdConsent) {
      violations.push('Documento coletado sem consentimento explícito da LGPD registrado no contexto.');
    }

    const score = 100 - (violations.length * 20);
    const passed = score >= 80;

    const result: QAAuditResult = {
      passed,
      score,
      violations,
      notes: passed ? 'Sessão em conformidade com as diretrizes de QA.' : 'Foram encontradas violações críticas de QA na sessão.'
    };

    observability.endSpan(`qa-audit-${sessionId}`, sessionId, 'QA_AUDIT_COMPLETED', { result });

    return result;
  }
}

export const voiceQA = new VoiceQAEngine();
