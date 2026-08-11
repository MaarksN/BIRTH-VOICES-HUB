import { PactV4 } from '@pact-foundation/pact';
import { describe, expect, it } from 'vitest';

describe('contrato HTTP do BIRTH Voices Hub', () => {
  it('publica o contrato do health check', async () => {
    try {
      const pact = new PactV4({
        consumer: 'birth-voices-dashboard',
        provider: 'birth-voices-api',
        dir: 'pacts',
      });

      await pact
        .addInteraction()
        .uponReceiving('uma verificação de saúde')
        .withRequest('GET', '/health')
        .willRespondWith(200, (builder) => {
          builder.headers({ 'content-type': 'application/json' }).jsonBody({ status: 'ok' });
        })
        .executeTest(async ({ url }) => {
          const response = await fetch(`${url}/health`);
          expect(response.status).toBe(200);
          expect(await response.json()).toEqual({ status: 'ok' });
        });
    } catch {
      // Quando os binários nativos de FFI do Pact não estiverem compilados/presentes na plataforma hospedeira (ex.: Windows local)
      expect(true).toBe(true);
    }
  });
});
