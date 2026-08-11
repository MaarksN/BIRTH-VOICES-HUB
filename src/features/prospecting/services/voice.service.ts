import { logger } from '../../../lib/logger.js';

export class VoiceProspectingService {
  /**
   * Configures and triggers an outbound qualification call using Bland AI.
   * @param payload The data required to initiate the call (must contain phone_number, name, company).
   */
  async triggerOutboundCall(payload: { phone_number: string; name: string; company: string }) {
    logger.info('VoiceProspectingService: Triggering outbound call via Bland AI', payload);
    
    const apiKey = process.env.BLAND_API_KEY || '';
    if (!apiKey) {
      logger.warn('BLAND_API_KEY is not set in the environment');
      throw new Error('BLAND_API_KEY missing');
    }

    try {
      const response = await fetch('https://api.bland.ai/v1/calls', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone_number: payload.phone_number,
          task: `Você é um assistente de vendas senior da AtlasGR. Você está ligando para ${payload.name} da empresa ${payload.company}. Seu objetivo é fazer 3 perguntas curtas para entender se a empresa tem fit para a nossa plataforma de CRM e BI. Seja simpático, natural, e nunca fale mais que 2 frases seguidas sem deixar o cliente responder.`,
          voice: 'josh',
          reduce_latency: true,
          record: true,
          webhook: `${process.env.WEBHOOK_BASE_URL || 'https://seu-dominio.com'}/api/webhooks/bland`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Failed to trigger call via Bland AI', data);
        throw new Error(data.message || 'Call failed');
      }

      logger.info(`Call successfully dispatched! Call ID: ${data.call_id}`);
      
      return {
        success: true,
        message: 'Outbound call triggered successfully via Bland AI',
        callId: data.call_id,
        status: data.status
      };
    } catch (error) {
      logger.error('Error triggering voice call:', error);
      throw error;
    }
  }
}

export const voiceProspectingService = new VoiceProspectingService();
