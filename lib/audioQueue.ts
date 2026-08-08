import { Queue, Worker } from 'bullmq';

// Payload para processamento assíncrono de áudio
export interface AudioProcessingPayload {
  contactId: string;
  audioUrl: string;
  workflowId: string;
}

// Fila assincrona para processamento de audio com Ollama/Whisper
export const audioProcessingQueue = new Queue<AudioProcessingPayload>('audio-processing-queue', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
});

// Worker para processamento em segundo plano
export const initAudioWorker = () => {
  return new Worker<AudioProcessingPayload>('audio-processing-queue', async job => {
    console.log(`[BullMQ Worker] Processando audio do contato ${job.data.contactId}...`);
    // Simula transcrição e classificação via FFmpeg/Whisper
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log(`[BullMQ Worker] Processamento concluido para ${job.data.contactId}`);
    return { status: 'COMPLETED', confidence: 0.98 };
  }, {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    }
  });
};
