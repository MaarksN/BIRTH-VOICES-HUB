declare module 'clamscan' {
  interface ClamScanOptions {
    clamdscan: {
      host: string;
      port: number;
      timeout: number;
      localFallback: boolean;
    };
    preference: 'clamdscan';
  }

  interface Scanner {
    isInfected(path: string): Promise<{ isInfected: boolean; viruses: string[] }>;
    // `isInfected` is `null` when clamd returns a response NodeClam can't confidently parse as
    // clean/infected — callers must treat that the same as "scan failed", never as "clean".
    scanStream(stream: NodeJS.ReadableStream): Promise<{ isInfected: boolean | null; viruses: string[] }>;
  }

  export default class NodeClam {
    init(options: ClamScanOptions): Promise<Scanner>;
  }
}
