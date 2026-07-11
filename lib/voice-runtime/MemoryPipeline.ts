import { ConversationTurn } from './types';
import { observability } from './Observability';

export class MemoryPipeline {
  private sessions: Map<string, {
    shortTerm: ConversationTurn[];
    summary: string;
    persistentContext: any;
  }> = new Map();

  public initialize(sessionId: string, initialContext: any = {}) {
    this.sessions.set(sessionId, {
      shortTerm: [],
      summary: '',
      persistentContext: initialContext
    });
  }

  public addTurn(sessionId: string, turn: ConversationTurn) {
    const memory = this.sessions.get(sessionId);
    if (!memory) return;

    memory.shortTerm.push(turn);
    observability.logEvent(sessionId, 'MEMORY_UPDATED', { role: turn.role, content: turn.content });
    
    // Trigger summarization if memory gets too long
    if (memory.shortTerm.length > 20) {
      this.summarize(sessionId);
    }
  }

  public getContext(sessionId: string) {
    const memory = this.sessions.get(sessionId);
    if (!memory) return null;

    return {
      history: memory.shortTerm,
      summary: memory.summary,
      context: memory.persistentContext
    };
  }

  private async summarize(sessionId: string) {
    const memory = this.sessions.get(sessionId);
    if (!memory) return;

    observability.logEvent(sessionId, 'MEMORY_SUMMARIZATION_STARTED', { length: memory.shortTerm.length });
    // In a real implementation, this would call a fast LLM to summarize the older turns
    // and slide the window.
    
    // Mock summarization:
    memory.shortTerm = memory.shortTerm.slice(-10); 
    observability.logEvent(sessionId, 'MEMORY_SUMMARIZATION_COMPLETED', { newLength: memory.shortTerm.length });
  }

  public clear(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}

export const memoryPipeline = new MemoryPipeline();
