import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ENV
vi.mock('../_core/env.js', () => ({
  ENV: {
    SPORTMONKS_API_TOKEN: 'test-token',
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  getInplayFixtures,
  getTodayFixtures,
  getMatchDetail,
  getFixturesByDate,
  isLive,
  isFinished,
} from './sportmonks-livescore';

// ─── Test Data ─────────────────────────────────────────────────

const mockFixture = {
  id: 19146186,
  sport_id: 1,
  league_id: 462,
  season_id: 23614,
  stage_id: 77457923,
  name: 'Arsenal vs Chelsea',
  starting_at: '2026-05-16 15:00:00',
  result_info: null,
  leg: 'N/A',
  length: 90,
  state: {
    id: 3,
    state: 'inplay',
    name: 'Second Half',
    short_name: '2ND',
  },
  participants: [
    {
      id: 1,
      name: 'Arsenal',
      short_code: 'ARS',
      image_path: 'https://cdn.sportmonks.com/images/soccer/teams/1/1.png',
      meta: { location: 'home', winner: null, position: 1 },
    },
    {
      id: 2,
      name: 'Chelsea',
      short_code: 'CHE',
      image_path: 'https://cdn.sportmonks.com/images/soccer/teams/2/2.png',
      meta: { location: 'away', winner: null, position: 2 },
    },
  ],
  league: {
    id: 462,
    name: 'Premier League',
    image_path: 'https://cdn.sportmonks.com/images/soccer/leagues/462.png',
  },
  scores: [
    { participant_id: 1, score: { goals: 2 }, description: 'CURRENT' },
    { participant_id: 2, score: { goals: 1 }, description: 'CURRENT' },
    { participant_id: 1, score: { goals: 1 }, description: '1ST_HALF' },
    { participant_id: 2, score: { goals: 0 }, description: '1ST_HALF' },
    { participant_id: 1, score: { goals: 1 }, description: '2ND_HALF' },
    { participant_id: 2, score: { goals: 1 }, description: '2ND_HALF' },
  ],
  statistics: [
    { participant_id: 1, type_id: 45, data: { value: 58 } },  // Possession
    { participant_id: 2, type_id: 45, data: { value: 42 } },
    { participant_id: 1, type_id: 42, data: { value: 12 } },  // Total Shots
    { participant_id: 2, type_id: 42, data: { value: 8 } },
    { participant_id: 1, type_id: 50, data: { value: 5 } },   // Shots on Target
    { participant_id: 2, type_id: 50, data: { value: 3 } },
    { participant_id: 1, type_id: 34, data: { value: 6 } },   // Corners
    { participant_id: 2, type_id: 34, data: { value: 4 } },
    { participant_id: 1, type_id: 44, data: { value: 45 } },  // Dangerous Attacks
    { participant_id: 2, type_id: 44, data: { value: 32 } },
    { participant_id: 1, type_id: 56, data: { value: 10 } },  // Fouls
    { participant_id: 2, type_id: 56, data: { value: 14 } },
  ],
  events: [
    {
      id: 1001,
      type_id: 14,
      minute: 23,
      extra_minute: null,
      participant_id: 1,
      player_name: 'Saka',
      related_player_name: 'Odegaard',
      addition: null,
      info: null,
    },
    {
      id: 1002,
      type_id: 14,
      minute: 55,
      extra_minute: null,
      participant_id: 1,
      player_name: 'Havertz',
      related_player_name: null,
      addition: null,
      info: null,
    },
    {
      id: 1003,
      type_id: 14,
      minute: 67,
      extra_minute: null,
      participant_id: 2,
      player_name: 'Palmer',
      related_player_name: 'Enzo',
      addition: null,
      info: null,
    },
    {
      id: 1004,
      type_id: 19,
      minute: 34,
      extra_minute: null,
      participant_id: 2,
      player_name: 'Caicedo',
      related_player_name: null,
      addition: null,
      info: null,
    },
    {
      id: 1005,
      type_id: 18,
      minute: 70,
      extra_minute: null,
      participant_id: 1,
      player_name: 'Trossard',
      related_player_name: 'Saka',
      addition: null,
      info: null,
    },
  ],
  periods: [
    { minutes: 72 },
  ],
};

const mockNSFixture = {
  ...mockFixture,
  id: 19146187,
  state: { id: 1, state: 'NS', name: 'Not Started', short_name: 'NS' },
  scores: [],
  statistics: [],
  events: [],
};

const mockFTFixture = {
  ...mockFixture,
  id: 19146188,
  state: { id: 5, state: 'FT', name: 'Full Time', short_name: 'FT' },
};

// ─── Tests ─────────────────────────────────────────────────────

describe('sportmonks-livescore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isLive / isFinished helpers', () => {
    it('should identify live states correctly', () => {
      expect(isLive('1H')).toBe(true);
      expect(isLive('2H')).toBe(true);
      expect(isLive('HT')).toBe(true);
      expect(isLive('ET')).toBe(true);
      expect(isLive('LIVE')).toBe(true);
      expect(isLive('NS')).toBe(false);
      expect(isLive('FT')).toBe(false);
    });

    it('should identify finished states correctly', () => {
      expect(isFinished('FT')).toBe(true);
      expect(isFinished('AET')).toBe(true);
      expect(isFinished('PEN')).toBe(true);
      expect(isFinished('NS')).toBe(false);
      expect(isFinished('1H')).toBe(false);
    });
  });

  describe('getInplayFixtures', () => {
    it('should return live fixtures from livescores/inplay', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockFixture] }),
      });

      const result = await getInplayFixtures();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(19146186);
      expect(result[0].homeTeam.name).toBe('Arsenal');
      expect(result[0].awayTeam.name).toBe('Chelsea');
      expect(result[0].homeGoals).toBe(2);
      expect(result[0].awayGoals).toBe(1);
      expect(result[0].state).toBe('2H');
    });

    it('should fallback to fixtures/date when inplay returns error', async () => {
      // First call (inplay) fails
      mockFetch.mockRejectedValueOnce(new Error('No result'));
      // Second call (fixtures/date) succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockFixture, mockNSFixture] }),
      });

      const result = await getInplayFixtures();
      // Should only return live fixtures (not NS)
      expect(result).toHaveLength(1);
      expect(result[0].state).toBe('2H');
    });

    it('should return empty array when no live fixtures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('No result'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockNSFixture] }),
      });

      const result = await getInplayFixtures();
      expect(result).toHaveLength(0);
    });
  });

  describe('getTodayFixtures', () => {
    it('should group fixtures by status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [mockFixture, mockNSFixture, mockFTFixture],
        }),
      });

      const result = await getTodayFixtures();
      expect(result.live).toHaveLength(1);
      expect(result.upcoming).toHaveLength(1);
      expect(result.finished).toHaveLength(1);
      expect(result.live[0].state).toBe('2H');
      expect(result.upcoming[0].state).toBe('NS');
      expect(result.finished[0].state).toBe('FT');
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const result = await getTodayFixtures();
      expect(result.live).toHaveLength(0);
      expect(result.upcoming).toHaveLength(0);
      expect(result.finished).toHaveLength(0);
    });
  });

  describe('getMatchDetail', () => {
    it('should parse fixture, stats and events correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockFixture }),
      });

      const result = await getMatchDetail(19146186);

      // Fixture
      expect(result.fixture.id).toBe(19146186);
      expect(result.fixture.homeTeam.name).toBe('Arsenal');
      expect(result.fixture.awayTeam.name).toBe('Chelsea');
      expect(result.fixture.homeGoals).toBe(2);
      expect(result.fixture.awayGoals).toBe(1);
      expect(result.fixture.state).toBe('2H');
      expect(result.fixture.minute).toBe(72);

      // Period scores
      expect(result.fixture.periodScores).toHaveLength(2);
      expect(result.fixture.periodScores[0]).toEqual({
        period: '1ST_HALF',
        homeGoals: 1,
        awayGoals: 0,
      });

      // Stats
      expect(result.stats.possession.home).toBe(58);
      expect(result.stats.possession.away).toBe(42);
      expect(result.stats.totalShots.home).toBe(12);
      expect(result.stats.totalShots.away).toBe(8);
      expect(result.stats.shotsOnTarget.home).toBe(5);
      expect(result.stats.corners.home).toBe(6);
      expect(result.stats.dangerousAttacks.home).toBe(45);
      expect(result.stats.fouls.home).toBe(10);
      expect(result.stats.fouls.away).toBe(14);

      // Events (sorted by minute desc)
      expect(result.events).toHaveLength(5);
      expect(result.events[0].minute).toBe(70); // substitution
      expect(result.events[0].type).toBe('substitution');
      expect(result.events[1].minute).toBe(67); // Palmer goal
      expect(result.events[1].type).toBe('goal');
      expect(result.events[1].playerName).toBe('Palmer');
    });

    it('should handle missing stats gracefully', async () => {
      const fixtureNoStats = { ...mockFixture, statistics: [], events: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: fixtureNoStats }),
      });

      const result = await getMatchDetail(19146186);
      expect(result.stats.possession.home).toBeNull();
      expect(result.stats.totalShots.home).toBeNull();
      expect(result.events).toHaveLength(0);
    });

    it('should throw error when fixture not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      });

      await expect(getMatchDetail(99999)).rejects.toThrow('Fixture 99999 not found');
    });
  });

  describe('getFixturesByDate', () => {
    it('should return fixtures for a specific date', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockFixture, mockNSFixture] }),
      });

      const result = await getFixturesByDate('2026-05-16');
      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/fixtures/date/2026-05-16'),
        expect.any(Object)
      );
    });
  });

  describe('fixture parsing', () => {
    it('should map Sportmonks state short_name to internal codes', async () => {
      const states = [
        { short_name: '1ST', expected: '1H' },
        { short_name: '2ND', expected: '2H' },
        { short_name: 'HT', expected: 'HT' },
        { short_name: 'FT', expected: 'FT' },
        { short_name: 'NS', expected: 'NS' },
        { short_name: 'AET', expected: 'AET' },
        { short_name: 'FT_PEN', expected: 'PEN' },
      ];

      for (const { short_name, expected } of states) {
        const fixture = {
          ...mockFixture,
          state: { ...mockFixture.state, short_name },
        };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [fixture] }),
        });

        const result = await getFixturesByDate('2026-05-16');
        expect(result[0].state).toBe(expected);
      }
    });

    it('should extract team logos correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockFixture] }),
      });

      const result = await getFixturesByDate('2026-05-16');
      expect(result[0].homeTeam.logo).toBe('https://cdn.sportmonks.com/images/soccer/teams/1/1.png');
      expect(result[0].awayTeam.logo).toBe('https://cdn.sportmonks.com/images/soccer/teams/2/2.png');
    });
  });

  describe('event parsing', () => {
    it('should map event type IDs to readable types', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockFixture }),
      });

      const result = await getMatchDetail(19146186);
      const types = result.events.map(e => e.type);
      expect(types).toContain('goal');
      expect(types).toContain('yellow_card');
      expect(types).toContain('substitution');
    });

    it('should include related player names for goals and substitutions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockFixture }),
      });

      const result = await getMatchDetail(19146186);
      const sakaGoal = result.events.find(e => e.playerName === 'Saka');
      expect(sakaGoal?.relatedPlayerName).toBe('Odegaard');

      const sub = result.events.find(e => e.type === 'substitution');
      expect(sub?.playerName).toBe('Trossard');
      expect(sub?.relatedPlayerName).toBe('Saka');
    });
  });

  describe('API error handling', () => {
    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      await expect(getFixturesByDate('2026-05-16')).rejects.toThrow('Sportmonks API error 429');
    });
  });
});
