import { describe, expect, it } from 'vitest';
import { formatDuration, parseDurationToSeconds, riskClass, sentimentClass, toCsvCell } from '../../lib/format';

describe('format helpers', () => {
  it('maps sentiment and risk labels to existing CSS class contracts', () => {
    expect(sentimentClass.Positivo).toContain('emerald');
    expect(sentimentClass.Neutro).toContain('slate');
    expect(sentimentClass.Negativo).toContain('rose');
    expect(riskClass.Baixo).toContain('emerald');
    expect(riskClass.Moderado).toContain('amber');
    expect(riskClass.Alto).toContain('rose');
  });

  it('parses mm:ss durations into seconds', () => {
    expect(parseDurationToSeconds('02:05')).toBe(125);
    expect(parseDurationToSeconds('7:03')).toBe(423);
    expect(parseDurationToSeconds('01:not-a-number')).toBe(60);
    expect(parseDurationToSeconds('invalid')).toBe(0);
  });

  it('formats seconds as mm:ss without emitting 60 seconds', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(125.4)).toBe('02:05');
    expect(formatDuration(59.6)).toBe('01:00');
    expect(formatDuration(-4)).toBe('00:00');
  });

  it('escapes CSV cells using doubled quotes', () => {
    expect(toCsvCell('Maria')).toBe('"Maria"');
    expect(toCsvCell('Disse "sim"')).toBe('"Disse ""sim"""');
    expect(toCsvCell(42)).toBe('"42"');
  });
});
