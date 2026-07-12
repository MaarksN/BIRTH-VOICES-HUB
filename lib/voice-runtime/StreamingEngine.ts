import { AudioChunk } from './types';
import { observability } from './Observability';

type StreamCallback = (chunk: AudioChunk) => void;

export class StreamingEngine {
  private inputStreams: Map<string, ReadableStreamDefaultController<AudioChunk>> = new Map();
  private outputStreams: Map<string, ReadableStreamDefaultController<AudioChunk>> = new Map();
  private outputCallbacks: Map<string, StreamCallback[]> = new Map();

  public createSessionStreams(sessionId: string) {
    const input = new ReadableStream<AudioChunk>({
      start: (controller) => {
        this.inputStreams.set(sessionId, controller);
      },
      cancel: () => {
        this.inputStreams.delete(sessionId);
      }
    });

    const output = new ReadableStream<AudioChunk>({
      start: (controller) => {
        this.outputStreams.set(sessionId, controller);
      },
      cancel: () => {
        this.outputStreams.delete(sessionId);
      }
    });

    this.outputCallbacks.set(sessionId, []);

    return { input, output };
  }

  public writeInput(sessionId: string, chunk: AudioChunk) {
    const controller = this.inputStreams.get(sessionId);
    if (controller) {
      controller.enqueue(chunk);
    }
  }

  public writeOutput(sessionId: string, chunk: AudioChunk) {
    const controller = this.outputStreams.get(sessionId);
    if (controller) {
      controller.enqueue(chunk);
    }

    const callbacks = this.outputCallbacks.get(sessionId) || [];
    callbacks.forEach(cb => cb(chunk));
  }

  public onOutput(sessionId: string, callback: StreamCallback) {
    const callbacks = this.outputCallbacks.get(sessionId) || [];
    callbacks.push(callback);
    this.outputCallbacks.set(sessionId, callbacks);
  }

  public interrupt(sessionId: string) {
    observability.logEvent(sessionId, 'STREAMING_INTERRUPTED');
    // Clear pending audio chunks in output buffer
    // Send interruption signal to provider
  }

  public cleanup(sessionId: string) {
    const inCtrl = this.inputStreams.get(sessionId);
    if (inCtrl) {
      try { inCtrl.close(); } catch (e) {}
      this.inputStreams.delete(sessionId);
    }

    const outCtrl = this.outputStreams.get(sessionId);
    if (outCtrl) {
      try { outCtrl.close(); } catch (e) {}
      this.outputStreams.delete(sessionId);
    }

    this.outputCallbacks.delete(sessionId);
  }
}

export const streamingEngine = new StreamingEngine();
