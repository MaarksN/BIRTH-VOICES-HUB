import { ComplianceIssue, ConversationTurn, ExtractedEntity } from '../types';
import { observability } from '../Observability';

export class ComplianceEngine {
  public detectComplianceIssues(sessionId: string, turn: ConversationTurn, _entities: ExtractedEntity[]): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];

    // Simulate compliance detection (e.g. PCI DSS for credit cards, LGPD for CPF)
    // Normally done via Regex, NLP, or LLM evaluation on the turn.
    
    const content = turn.content;
    const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
    const cardRegex = /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g;

    if (cpfRegex.test(content)) {
      issues.push({
        id: crypto.randomUUID(),
        framework: 'LGPD',
        rule: 'CPF Exposto',
        description: 'Dado sensível (CPF) detectado na transcrição.',
        severity: 'high',
        actionTaken: 'masked',
        evidence: 'Transcrição mascarada antes do armazenamento.',
        timestamp: Date.now()
      });
      // Na prática: turn.content = turn.content.replace(cpfRegex, '***.***.***-**');
    }

    if (cardRegex.test(content)) {
       issues.push({
        id: crypto.randomUUID(),
        framework: 'PCI DSS',
        rule: 'Cartão de Crédito Exposto',
        description: 'Número de cartão de crédito detectado.',
        severity: 'critical',
        actionTaken: 'masked',
        evidence: 'Transcrição mascarada e evento de auditoria gerado.',
        timestamp: Date.now()
      });
      // Na prática: turn.content = turn.content.replace(cardRegex, '**** **** **** ****');
    }

    if (issues.length > 0) {
      observability.logEvent(sessionId, 'COMPLIANCE_ISSUE_DETECTED', { issues });
    }

    return issues;
  }
}

export const complianceEngine = new ComplianceEngine();
