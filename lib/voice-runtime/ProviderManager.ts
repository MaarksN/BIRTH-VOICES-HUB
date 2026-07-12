import { BaseProvider } from './providers/BaseProvider';
import { observability } from './Observability';

export class ProviderManager {
  private providers: Map<string, BaseProvider> = new Map();

  public registerProvider(provider: BaseProvider) {
    this.providers.set(provider.id, provider);
    console.debug(`[ProviderManager] Registered provider: ${provider.name} (${provider.type})`);
  }

  public getProvider(id: string): BaseProvider | undefined {
    return this.providers.get(id);
  }

  public getProvidersByType(type: 'STT' | 'LLM' | 'TTS' | 'E2E'): BaseProvider[] {
    return Array.from(this.providers.values()).filter(p => p.type === type);
  }

  public async getHealthyProvider(preferredId: string, type: 'STT' | 'LLM' | 'TTS' | 'E2E', fallbacks: string[] = []): Promise<BaseProvider> {
    const preferred = this.getProvider(preferredId);
    
    if (preferred && await preferred.checkHealth()) {
      return preferred;
    }

    observability.logEvent('SYSTEM', 'PROVIDER_FAILOVER', { failed: preferredId, trying: fallbacks });

    for (const fallbackId of fallbacks) {
      const fallbackProvider = this.getProvider(fallbackId);
      if (fallbackProvider && await fallbackProvider.checkHealth()) {
        return fallbackProvider;
      }
    }

    throw new Error(`No healthy provider available for type ${type}`);
  }
}

export const providerManager = new ProviderManager();
