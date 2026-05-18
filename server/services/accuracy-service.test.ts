import { describe, it, expect } from 'vitest';
import {
  resolveActualValue,
  calculateBadge,
  processRankingLines,
  computeAccuracyMetrics,
  type LiveStats,
  type RankingLine,
} from './accuracy-service';

// ─── resolveActualValue ────────────────────────────────────────

describe('resolveActualValue', () => {
  const stats: LiveStats = {
    homeGoals: 2,
    awayGoals: 1,
    homeShots: 12,
    awayShots: 8,
    homeCorners: 6,
    awayCorners: 4,
    homeShotsOnTarget: 5,
    awayShotsOnTarget: 3,
  };

  it('returns total goals for "Total gols Over 2.5"', () => {
    expect(resolveActualValue('Total gols Over 2.5', 'Fluminense', 'São Paulo', stats)).toBe(3);
  });

  it('returns total goals for "Total de gols"', () => {
    expect(resolveActualValue('Total de gols Over 1.5', 'Fluminense', 'São Paulo', stats)).toBe(3);
  });

  it('returns 1 for BTTS when both teams scored', () => {
    expect(resolveActualValue('BTTS Over 0.5', 'Fluminense', 'São Paulo', stats)).toBe(1);
  });

  it('returns 0 for BTTS when away team did not score', () => {
    const s = { ...stats, awayGoals: 0 };
    expect(resolveActualValue('BTTS Over 0.5', 'Fluminense', 'São Paulo', s)).toBe(0);
  });

  it('returns home goals for home team goal line', () => {
    expect(resolveActualValue('Fluminense gols Over 1.5', 'Fluminense', 'São Paulo', stats)).toBe(2);
  });

  it('returns away goals for away team goal line', () => {
    expect(resolveActualValue('São Paulo gols Over 0.5', 'Fluminense', 'São Paulo', stats)).toBe(1);
  });

  it('returns total corners for "Total escanteios Over 9.5"', () => {
    expect(resolveActualValue('Total escanteios Over 9.5', 'Fluminense', 'São Paulo', stats)).toBe(10);
  });

  it('returns home corners for home team corner line', () => {
    expect(resolveActualValue('Fluminense escanteios Over 4.5', 'Fluminense', 'São Paulo', stats)).toBe(6);
  });

  it('returns away corners for away team corner line', () => {
    expect(resolveActualValue('São Paulo escanteios Over 3.5', 'Fluminense', 'São Paulo', stats)).toBe(4);
  });

  it('returns total shots for "Total finalizações Over 18.5"', () => {
    expect(resolveActualValue('Total finalizações Over 18.5', 'Fluminense', 'São Paulo', stats)).toBe(20);
  });

  it('returns home shots for home team shot line', () => {
    expect(resolveActualValue('Fluminense finalizações Over 9.5', 'Fluminense', 'São Paulo', stats)).toBe(12);
  });

  it('returns total shots on target for "Total chutes no gol"', () => {
    expect(resolveActualValue('Total chutes no gol Over 6.5', 'Fluminense', 'São Paulo', stats)).toBe(8);
  });

  it('returns 1 for home win when home scored more', () => {
    expect(resolveActualValue('Fluminense vence', 'Fluminense', 'São Paulo', stats)).toBe(1);
  });

  it('returns 0 for home win when away scored more', () => {
    const s = { ...stats, homeGoals: 0, awayGoals: 2 };
    expect(resolveActualValue('Fluminense vence', 'Fluminense', 'São Paulo', s)).toBe(0);
  });

  it('returns 1 for draw when scores are equal', () => {
    const s = { ...stats, homeGoals: 1, awayGoals: 1 };
    expect(resolveActualValue('Empate', 'Fluminense', 'São Paulo', s)).toBe(1);
  });

  it('returns 0 for draw when scores differ', () => {
    expect(resolveActualValue('Empate', 'Fluminense', 'São Paulo', stats)).toBe(0);
  });

  it('returns null for unknown line', () => {
    expect(resolveActualValue('Alguma linha desconhecida', 'Fluminense', 'São Paulo', stats)).toBeNull();
  });

  it('returns null for corners when stats not available', () => {
    const s = { homeGoals: 1, awayGoals: 0 };
    expect(resolveActualValue('Total escanteios Over 9.5', 'Fluminense', 'São Paulo', s)).toBeNull();
  });

  it('handles mandante/visitante keywords', () => {
    expect(resolveActualValue('Mandante gols Over 1.5', 'Fluminense', 'São Paulo', stats)).toBe(2);
    expect(resolveActualValue('Visitante gols Over 0.5', 'Fluminense', 'São Paulo', stats)).toBe(1);
  });
});

// ─── calculateBadge ────────────────────────────────────────────

describe('calculateBadge', () => {
  it('returns pending when actualValue is null', () => {
    const result = calculateBadge('Total gols Over 2.5', 3, 2.5, null);
    expect(result.badge).toBe('pending');
    expect(result.hit).toBe(false);
  });

  it('returns green for Over line when actual exceeds baseline', () => {
    const result = calculateBadge('Total gols Over 2.5', 3, 2.5, 3);
    expect(result.badge).toBe('green');
    expect(result.hit).toBe(true);
  });

  it('returns yellow for Over line when actual is within 1 of baseline', () => {
    const result = calculateBadge('Total escanteios Over 9.5', 10, 9.5, 9);
    expect(result.badge).toBe('yellow');
    expect(result.hit).toBe(false);
  });

  it('returns red for Over line when actual is clearly below baseline', () => {
    const result = calculateBadge('Total finalizações Over 18.5', 20, 18.5, 12);
    expect(result.badge).toBe('red');
    expect(result.hit).toBe(false);
  });

  it('returns green for Under line when actual is below baseline', () => {
    const result = calculateBadge('Total gols Under 2.5', 2, 2.5, 1);
    expect(result.badge).toBe('green');
    expect(result.hit).toBe(true);
  });

  it('returns yellow for Under line when actual is within 1 above baseline', () => {
    const result = calculateBadge('Total gols Under 2.5', 2, 2.5, 3);
    expect(result.badge).toBe('yellow');
    expect(result.hit).toBe(false);
  });

  it('returns red for Under line when actual is clearly above baseline', () => {
    const result = calculateBadge('Total gols Under 2.5', 2, 2.5, 5);
    expect(result.badge).toBe('red');
    expect(result.hit).toBe(false);
  });

  it('returns green for binary BTTS when hit', () => {
    const result = calculateBadge('BTTS Over 0.5', 1, 0.5, 1);
    expect(result.badge).toBe('green');
    expect(result.hit).toBe(true);
  });

  it('returns red for binary BTTS when missed', () => {
    const result = calculateBadge('BTTS Over 0.5', 1, 0.5, 0);
    expect(result.badge).toBe('red');
    expect(result.hit).toBe(false);
  });

  it('returns green for home win when confirmed', () => {
    const result = calculateBadge('Fluminense vence', 1, 0.5, 1);
    expect(result.badge).toBe('green');
    expect(result.hit).toBe(true);
  });

  it('returns red for home win when not confirmed', () => {
    const result = calculateBadge('Fluminense vence', 1, 0.5, 0);
    expect(result.badge).toBe('red');
    expect(result.hit).toBe(false);
  });
});

// ─── processRankingLines ───────────────────────────────────────

describe('processRankingLines', () => {
  const stats: LiveStats = {
    homeGoals: 2,
    awayGoals: 1,
    homeShots: 14,
    awayShots: 8,
    homeCorners: 7,
    awayCorners: 4,
    homeShotsOnTarget: 6,
    awayShotsOnTarget: 3,
  };

  const lines: RankingLine[] = [
    { line: 'Total gols Over 2.5', projection: 3, baseline: 2.5, confidenceIndex: 8.5, category: 'D' },
    { line: 'Total escanteios Over 9.5', projection: 11, baseline: 9.5, confidenceIndex: 7.2, category: 'A' },
    { line: 'Total finalizações Over 18.5', projection: 22, baseline: 18.5, confidenceIndex: 6.8, category: 'B' },
    { line: 'BTTS Over 0.5', projection: 1, baseline: 0.5, confidenceIndex: 7.0, category: 'D' },
  ];

  it('processes all ranking lines and returns badge results', () => {
    const results = processRankingLines(lines, 'Fluminense', 'São Paulo', stats);
    expect(results).toHaveLength(4);
    expect(results[0].badge).toBe('green'); // 3 > 2.5
    expect(results[1].badge).toBe('green'); // 11 > 9.5
    expect(results[2].badge).toBe('green'); // 22 > 18.5
    expect(results[3].badge).toBe('green'); // BTTS: both scored
  });

  it('includes actualValue in results', () => {
    const results = processRankingLines(lines, 'Fluminense', 'São Paulo', stats);
    expect(results[0].actualValue).toBe(3);
    expect(results[1].actualValue).toBe(11);
    expect(results[2].actualValue).toBe(22);
    expect(results[3].actualValue).toBe(1);
  });

  it('handles lines with no matching stats (returns pending)', () => {
    const unknownLines: RankingLine[] = [
      { line: 'Linha desconhecida Over 5.5', projection: 6, baseline: 5.5, confidenceIndex: 5.0, category: 'A' },
    ];
    const results = processRankingLines(unknownLines, 'Fluminense', 'São Paulo', stats);
    expect(results[0].badge).toBe('pending');
    expect(results[0].actualValue).toBeNull();
  });
});

// ─── computeAccuracyMetrics ────────────────────────────────────

describe('computeAccuracyMetrics', () => {
  it('computes correct counts and hit rate', () => {
    const results = [
      { badge: 'green' as const, hit: true, line: 'L1', projection: 3, baseline: 2.5, confidenceIndex: 8, category: 'D', actualValue: 3, description: '' },
      { badge: 'green' as const, hit: true, line: 'L2', projection: 11, baseline: 9.5, confidenceIndex: 7, category: 'A', actualValue: 11, description: '' },
      { badge: 'yellow' as const, hit: false, line: 'L3', projection: 22, baseline: 18.5, confidenceIndex: 6, category: 'B', actualValue: 18, description: '' },
      { badge: 'red' as const, hit: false, line: 'L4', projection: 1, baseline: 0.5, confidenceIndex: 7, category: 'D', actualValue: 0, description: '' },
    ];
    const metrics = computeAccuracyMetrics(results);
    expect(metrics.greenCount).toBe(2);
    expect(metrics.yellowCount).toBe(1);
    expect(metrics.redCount).toBe(1);
    expect(metrics.totalLines).toBe(4);
    expect(metrics.hitRate).toBe(50);
  });

  it('excludes pending badges from total lines', () => {
    const results = [
      { badge: 'green' as const, hit: true, line: 'L1', projection: 3, baseline: 2.5, confidenceIndex: 8, category: 'D', actualValue: 3, description: '' },
      { badge: 'pending' as const, hit: false, line: 'L2', projection: 11, baseline: 9.5, confidenceIndex: 7, category: 'A', actualValue: null, description: '' },
    ];
    const metrics = computeAccuracyMetrics(results);
    expect(metrics.totalLines).toBe(1);
    expect(metrics.hitRate).toBe(100);
  });

  it('returns 0 hit rate when no lines are available', () => {
    const metrics = computeAccuracyMetrics([]);
    expect(metrics.hitRate).toBe(0);
    expect(metrics.totalLines).toBe(0);
  });

  it('returns 0 hit rate when all badges are pending', () => {
    const results = [
      { badge: 'pending' as const, hit: false, line: 'L1', projection: 3, baseline: 2.5, confidenceIndex: 8, category: 'D', actualValue: null, description: '' },
    ];
    const metrics = computeAccuracyMetrics(results);
    expect(metrics.hitRate).toBe(0);
    expect(metrics.totalLines).toBe(0);
  });
});
