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
  }

  export default class NodeClam {
    init(options: ClamScanOptions): Promise<Scanner>;
  }
}
