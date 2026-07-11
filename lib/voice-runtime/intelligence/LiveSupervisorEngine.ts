import { SessionIntelligence, VoiceSession } from '../types';
import { observability } from '../Observability';

export interface SupervisorAlert {
  id: string;
  sessionId: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
}

export class LiveSupervisorEngine {
  public monitorSession(session: VoiceSession, intelligence: SessionIntelligence): SupervisorAlert[] {
    const alerts: SupervisorAlert[] = [];
    
    // Check for high latency
    if (session.latencyMs > 2000) {
      alerts.push({
        id: crypto.randomUUID(),
        sessionId: session.sessionId,
        level: 'warning',
        message: 'Latência acima do esperado. Verificar Provider.',
        timestamp: Date.now()
      });
    }

    // Check for critical emotions
    const latestEmotion = intelligence.emotionTimeline[intelligence.emotionTimeline.length - 1];
    if (latestEmotion && (latestEmotion.name === 'Irritação' || latestEmotion.name === 'Raiva') && latestEmotion.intensity > 80) {
      alerts.push({
        id: crypto.randomUUID(),
        sessionId: session.sessionId,
        level: 'critical',
        message: 'Cliente intensamente irritado. Risco alto.',
        timestamp: Date.now()
      });
    }
    
    // Check for objections
    const latestObjection = intelligence.objections[intelligence.objections.length - 1];
    if (latestObjection && Date.now() - latestObjection.timestamp < 5000) {
       alerts.push({
        id: crypto.randomUUID(),
        sessionId: session.sessionId,
        level: 'info',
        message: `Objeção detectada: ${latestObjection.category}`,
        timestamp: Date.now()
      });
    }

    if (alerts.length > 0) {
        observability.logEvent(session.sessionId, 'SUPERVISOR_ALERT', { alerts });
        // Emit to real-time pub/sub for supervisor dashboard
    }

    return alerts;
  }
}

export const liveSupervisorEngine = new LiveSupervisorEngine();
