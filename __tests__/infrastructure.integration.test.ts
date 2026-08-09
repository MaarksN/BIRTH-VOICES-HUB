import { GenericContainer, Wait } from 'testcontainers';
import { afterAll, describe, expect, it } from 'vitest';

const runInfrastructureTests = process.env.RUN_INFRA_TESTS === '1';
const suite = runInfrastructureTests ? describe : describe.skip;

suite('infraestrutura em containers', () => {
  let stop: (() => Promise<void>) | undefined;

  afterAll(async () => {
    await stop?.();
  });

  it('inicializa um Valkey compatível com BullMQ', async () => {
    const container = await new GenericContainer('valkey/valkey:8-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start();
    stop = async () => container.stop().then(() => undefined);
    expect(container.getMappedPort(6379)).toBeGreaterThan(0);
  }, 60_000);
});
