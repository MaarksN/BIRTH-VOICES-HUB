import NodeClam from 'clamscan';

export async function createAntivirusScanner() {
  const clam = await new NodeClam().init({
    clamdscan: {
      host: process.env.CLAMAV_HOST ?? '127.0.0.1',
      port: Number(process.env.CLAMAV_PORT ?? 3310),
      timeout: 60_000,
      localFallback: false,
    },
    preference: 'clamdscan',
  });
  return clam;
}
