import { TokenPayload } from '../lib/auth-tokens.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      tenantId?: string;
    }
  }
}

export {};
