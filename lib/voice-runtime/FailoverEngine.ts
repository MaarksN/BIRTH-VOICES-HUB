import { providerManager } from './ProviderManager';
import { observability } from './Observability';
import { BaseProvider } from './providers/BaseProvider';

export class FailoverEngine {
  
  public async executeWithFailover<T>(
    sessionId: string,
    operationName: string,
    preferredProviderId: string,
    type: 'STT' | 'LLM' | 'TTS' | 'E2E',
    fallbacks: string[],
    operation: (provider: BaseProvider) => Promise<T>
  ): Promise<T> {
    
    let currentProviderId = preferredProviderId;
    let attempts = [preferredProviderId, ...fallbacks];

    for (let i = 0; i < attempts.length; i++) {
      try {
        const provider = await providerManager.getHealthyProvider(attempts[i], type, []);
        currentProviderId = provider.id;
        
        const result = await operation(provider);
        return result;

      } catch (error: any) {
        observability.logEvent(sessionId, 'FAILOVER_TRIGGERED', {
          failedProvider: currentProviderId,
          error: error.message,
          nextProvider: attempts[i + 1] || 'NONE'
        });
        
        if (i === attempts.length - 1) {
          throw new Error(`All providers failed for ${operationName}. Last error: ${error.message}`);
        }
      }
    }

    throw new Error('Unexpected end of failover loop');
  }
}

export const failoverEngine = new FailoverEngine();
