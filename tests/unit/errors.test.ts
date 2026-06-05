import { describe, expect, it } from 'vitest';
import { getErrorMessage } from '../../lib/errors';

describe('error helpers', () => {
  it('extracts useful messages from unknown errors', () => {
    expect(getErrorMessage(new Error('Falha conhecida'))).toBe('Falha conhecida');
    expect(getErrorMessage({ message: 'Erro da API' })).toBe('Erro da API');
    expect(getErrorMessage('Texto direto')).toBe('Texto direto');
    expect(getErrorMessage(null, 'Fallback')).toBe('Fallback');
    expect(getErrorMessage({ message: 500 }, 'Fallback')).toBe('Fallback');
  });
});
