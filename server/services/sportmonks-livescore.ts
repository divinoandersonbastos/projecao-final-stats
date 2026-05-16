/**
 * Sportmonks Livescore Service
 * Provides real-time match data: live fixtures, statistics, events, scores
 * 
 * Endpoints used:
 * - /livescores/inplay — fixtures currently being played
 * - /livescores — all today's fixtures with live updates (15min window)
 * - /fixtures/{id} — single fixture with stats, events, scores, periods
 * - /fixtures/date/{date} — fixtures by date (for upcoming/finished)
 */

import { ENV } from '../_core/env.js';

const BASE_URL = 'https://api.sportmonks.com/v3/football';

// Fixture statistic type IDs (match-level)
const STAT_TYPES = {
  POSSESSION: 45,
  TOTAL_SHOTS: 42,
  SHOTS_ON_TARGET: 50,
  SHOTS_OFF_TARGET: 55,
  CORNERS: 34,
  GOALS: 52,
  DANGEROUS_ATTACKS: 44,
  ATTACKS: 43,
  FOULS: 56,
  PASSES: 80,
  ACCURATE_PASSES: 81,
  PASS_ACCURACY: 82,
  TACKLES: 46,
  GK_SAVES: 86,
  YELLOW_CARDS: 109,
  RED_CARDS: 79,
  OFFSIDES: 100,
} as const;

// Event type IDs
const EVENT_TYPES = {
  GOAL: 14,
  OWN_GOAL: 16,
  PENALTY_GOAL: 15,
  MISSED_PENALTY: 17,
  SUBSTITUTION: 18,
  YELLOW_CARD: 19,
  YELLOW_RED: 20,  // second yellow
  RED_CARD: 21,
  VAR: 24,
} as const;

// State classifications
const LIVE_STATES = ['LIVE', '1ST', '2ND', 'HT', 'ET', 'PEN_LIVE', 'BT', 'BREAK'];
const FINISHED_STATES = ['FT', 'AET', 'FT_PEN'];

// ─── Interfaces ────────────────────────────────────────────────

export interface LiveFixture {
  id: number;
  leagueId: number;
  leagueName: string;
  leagueLogo: string;
  seasonId: number;
  startingAt: string;       // UTC datetime
  homeTeam: { id: number; name: string; logo: string };
  awayTeam: { id: number; name: string; logo: string };
  homeGoals: number | null;
  awayGoals: number | null;
  state: string;            // short: 1H, 2H, HT, FT, NS, etc.
  stateLong: string;        // full name
  minute: number | null;    // current minute (from clock or periods)
  periodScores: PeriodScore[];
}

export interface PeriodScore {
  period: string;           // '1ST_HALF', '2ND_HALF', etc.
  homeGoals: number;
  awayGoals: number;
}

export interface LiveStats {
  possession: { home: number | null; away: number | null };
  totalShots: { home: number | null; away: number | null };
  shotsOnTarget: { home: number | null; away: number | null };
  corners: { home: number | null; away: number | null };
  dangerousAttacks: { home: number | null; away: number | null };
  attacks: { home: number | null; away: number | null };
  fouls: { home: number | null; away: number | null };
  offsides: { home: number | null; away: number | null };
  yellowCards: { home: number | null; away: number | null };
  redCards: { home: number | null; away: number | null };
  passes: { home: number | null; away: number | null };
  passAccuracy: { home: number | null; away: number | null };
  tackles: { home: number | null; away: number | null };
  gkSaves: { home: number | null; away: number | null };
}

export interface MatchEvent {
  id: number;
  minute: number;
  extraMinute: number | null;
  type: 'goal' | 'own_goal' | 'penalty' | 'missed_penalty' | 'yellow_card' | 'second_yellow' | 'red_card' | 'substitution' | 'var' | 'other';
  teamId: number;
  teamName: string;
  playerName: string;
  relatedPlayerName: string | null;  // assist or substituted player
  description: string;
}

export interface LiveMatchDetail {
  fixture: LiveFixture;
  stats: LiveStats;
  events: MatchEvent[];
}

// ─── API Request Helper ────────────────────────────────────────

interface SportmonksResponse<T> {
  data: T;
  pagination?: { count: number; per_page: number; current_page: number; next_page: string | null; has_more: boolean };
  rate_limit?: { resets_in_seconds: number; remaining: number };
  message?: string;
}

async function sportmonksRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<SportmonksResponse<T>> {
  const token = ENV.SPORTMONKS_API_TOKEN;
  if (!token) {
    throw new Error('SPORTMONKS_API_TOKEN not configured');
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': token },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Sportmonks API error ${response.status}: ${errorBody}`);
  }

  return response.json() as Promise<SportmonksResponse<T>>;
}

// ─── State Mapping ─────────────────────────────────────────────

function mapState(state: any): { short: string; long: string } {
  if (!state) return { short: 'NS', long: 'Not Started' };
  const s = state.short_name || '';
  const stateMap: Record<string, string> = {
    'FT': 'FT', 'AET': 'AET', 'FT_PEN': 'PEN', 'NS': 'NS',
    '1ST': '1H', '2ND': '2H', 'HT': 'HT', 'ET': 'ET',
    'PEN_LIVE': 'P', 'LIVE': 'LIVE', 'BT': 'BT', 'BREAK': 'BT',
    'PST': 'PST', 'CANC': 'CANC', 'ABD': 'ABD', 'SUSP': 'SUSP',
    'INT': 'INT', 'AWD': 'AWD', 'WO': 'WO', 'TBA': 'TBA',
  };
  return {
    short: stateMap[s] || s || 'NS',
    long: state.name || state.state || 'Unknown',
  };
}

export function isLive(stateShort: string): boolean {
  return ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'].includes(stateShort);
}

export function isFinished(stateShort: string): boolean {
  return ['FT', 'AET', 'PEN'].includes(stateShort);
}

// ─── Fixture Parsing ───────────────────────────────────────────

function parseFixture(f: any): LiveFixture {
  const participants = f.participants || [];
  const home = participants.find((p: any) => p.meta?.location === 'home');
  const away = participants.find((p: any) => p.meta?.location === 'away');

  const scores = f.scores || [];
  const homeScore = scores.find((s: any) => s.participant_id === home?.id && s.description === 'CURRENT');
  const awayScore = scores.find((s: any) => s.participant_id === away?.id && s.description === 'CURRENT');

  const { short: stateShort, long: stateLong } = mapState(f.state);

  // Extract period scores
  const periodScores: PeriodScore[] = [];
  const periodDescriptions = ['1ST_HALF', '2ND_HALF', 'EXTRA_TIME'];
  for (const desc of periodDescriptions) {
    const homeP = scores.find((s: any) => s.participant_id === home?.id && s.description === desc);
    const awayP = scores.find((s: any) => s.participant_id === away?.id && s.description === desc);
    if (homeP || awayP) {
      periodScores.push({
        period: desc,
        homeGoals: homeP?.score?.goals ?? 0,
        awayGoals: awayP?.score?.goals ?? 0,
      });
    }
  }

  // Estimate current minute from periods
  let minute: number | null = null;
  if (f.periods && f.periods.length > 0) {
    const lastPeriod = f.periods[f.periods.length - 1];
    if (lastPeriod.minutes) {
      minute = lastPeriod.minutes;
    }
  }
  // Override with clock if available (livescores endpoint)
  if (f.state?.clock?.minute !== undefined) {
    minute = f.state.clock.minute;
  }

  return {
    id: f.id,
    leagueId: f.league_id || f.league?.id || 0,
    leagueName: f.league?.name || '',
    leagueLogo: f.league?.image_path || '',
    seasonId: f.season_id || 0,
    startingAt: f.starting_at || '',
    homeTeam: {
      id: home?.id || 0,
      name: home?.name || 'Unknown',
      logo: home?.image_path || '',
    },
    awayTeam: {
      id: away?.id || 0,
      name: away?.name || 'Unknown',
      logo: away?.image_path || '',
    },
    homeGoals: homeScore?.score?.goals ?? null,
    awayGoals: awayScore?.score?.goals ?? null,
    state: stateShort,
    stateLong,
    minute,
    periodScores,
  };
}

// ─── Stats Parsing ─────────────────────────────────────────────

function parseStats(statistics: any[], homeId: number, awayId: number): LiveStats {
  const getStat = (participantId: number, typeId: number): number | null => {
    const stat = statistics.find((s: any) => s.participant_id === participantId && s.type_id === typeId);
    if (!stat || stat.data?.value === undefined || stat.data?.value === null) return null;
    return typeof stat.data.value === 'number' ? stat.data.value : parseFloat(String(stat.data.value)) || null;
  };

  return {
    possession: { home: getStat(homeId, STAT_TYPES.POSSESSION), away: getStat(awayId, STAT_TYPES.POSSESSION) },
    totalShots: { home: getStat(homeId, STAT_TYPES.TOTAL_SHOTS), away: getStat(awayId, STAT_TYPES.TOTAL_SHOTS) },
    shotsOnTarget: { home: getStat(homeId, STAT_TYPES.SHOTS_ON_TARGET), away: getStat(awayId, STAT_TYPES.SHOTS_ON_TARGET) },
    corners: { home: getStat(homeId, STAT_TYPES.CORNERS), away: getStat(awayId, STAT_TYPES.CORNERS) },
    dangerousAttacks: { home: getStat(homeId, STAT_TYPES.DANGEROUS_ATTACKS), away: getStat(awayId, STAT_TYPES.DANGEROUS_ATTACKS) },
    attacks: { home: getStat(homeId, STAT_TYPES.ATTACKS), away: getStat(awayId, STAT_TYPES.ATTACKS) },
    fouls: { home: getStat(homeId, STAT_TYPES.FOULS), away: getStat(awayId, STAT_TYPES.FOULS) },
    offsides: { home: getStat(homeId, STAT_TYPES.OFFSIDES), away: getStat(awayId, STAT_TYPES.OFFSIDES) },
    yellowCards: { home: getStat(homeId, STAT_TYPES.YELLOW_CARDS), away: getStat(awayId, STAT_TYPES.YELLOW_CARDS) },
    redCards: { home: getStat(homeId, STAT_TYPES.RED_CARDS), away: getStat(awayId, STAT_TYPES.RED_CARDS) },
    passes: { home: getStat(homeId, STAT_TYPES.PASSES), away: getStat(awayId, STAT_TYPES.PASSES) },
    passAccuracy: { home: getStat(homeId, STAT_TYPES.PASS_ACCURACY), away: getStat(awayId, STAT_TYPES.PASS_ACCURACY) },
    tackles: { home: getStat(homeId, STAT_TYPES.TACKLES), away: getStat(awayId, STAT_TYPES.TACKLES) },
    gkSaves: { home: getStat(homeId, STAT_TYPES.GK_SAVES), away: getStat(awayId, STAT_TYPES.GK_SAVES) },
  };
}

// ─── Events Parsing ────────────────────────────────────────────

function parseEvents(events: any[], participants: any[]): MatchEvent[] {
  const getTeamName = (participantId: number): string => {
    const p = participants.find((t: any) => t.id === participantId);
    return p?.name || 'Unknown';
  };

  const mapEventType = (typeId: number): MatchEvent['type'] => {
    switch (typeId) {
      case EVENT_TYPES.GOAL: return 'goal';
      case EVENT_TYPES.OWN_GOAL: return 'own_goal';
      case EVENT_TYPES.PENALTY_GOAL: return 'penalty';
      case EVENT_TYPES.MISSED_PENALTY: return 'missed_penalty';
      case EVENT_TYPES.SUBSTITUTION: return 'substitution';
      case EVENT_TYPES.YELLOW_CARD: return 'yellow_card';
      case EVENT_TYPES.YELLOW_RED: return 'second_yellow';
      case EVENT_TYPES.RED_CARD: return 'red_card';
      case EVENT_TYPES.VAR: return 'var';
      default: return 'other';
    }
  };

  return (events || [])
    .map((e: any) => ({
      id: e.id,
      minute: e.minute || 0,
      extraMinute: e.extra_minute || null,
      type: mapEventType(e.type_id),
      teamId: e.participant_id || 0,
      teamName: getTeamName(e.participant_id),
      playerName: e.player_name || e.player?.name || '',
      relatedPlayerName: e.related_player_name || e.related_player?.name || null,
      description: e.addition || e.info || '',
    }))
    .sort((a: MatchEvent, b: MatchEvent) => b.minute - a.minute || (b.extraMinute || 0) - (a.extraMinute || 0));
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Get all fixtures currently being played (inplay)
 * Falls back to fixtures/date with state filter if livescores/inplay returns empty
 */
export async function getInplayFixtures(): Promise<LiveFixture[]> {
  try {
    // Try livescores/inplay first (fastest, but only returns data during games)
    const data = await sportmonksRequest<any[]>('/livescores/inplay', {
      include: 'participants;state;scores;league',
    });
    if (data.data && data.data.length > 0) {
      return data.data.map(parseFixture);
    }
  } catch {
    // Sportmonks returns error message when no live games
  }

  // Fallback: get today's fixtures and filter live ones
  const today = new Date().toISOString().split('T')[0];
  const data = await sportmonksRequest<any[]>(`/fixtures/date/${today}`, {
    include: 'participants;state;scores;league',
  });

  const all = (data.data || []).map(parseFixture);
  return all.filter(f => isLive(f.state));
}

/**
 * Get today's fixtures grouped by status (live, upcoming, finished)
 */
export async function getTodayFixtures(): Promise<{
  live: LiveFixture[];
  upcoming: LiveFixture[];
  finished: LiveFixture[];
}> {
  const today = new Date().toISOString().split('T')[0];
  const data = await sportmonksRequest<any[]>(`/fixtures/date/${today}`, {
    include: 'participants;state;scores;league;periods',
  });

  const all = (data.data || []).map(parseFixture);

  return {
    live: all.filter(f => isLive(f.state)),
    upcoming: all.filter(f => f.state === 'NS' || f.state === 'TBA'),
    finished: all.filter(f => isFinished(f.state)),
  };
}

/**
 * Get full match detail: fixture info + live stats + events timeline
 */
export async function getMatchDetail(fixtureId: number): Promise<LiveMatchDetail> {
  const data = await sportmonksRequest<any>(`/fixtures/${fixtureId}`, {
    include: 'participants;state;scores;statistics;events;periods;league',
  });

  if (!data.data) {
    throw new Error(`Fixture ${fixtureId} not found`);
  }

  const f = data.data;
  const fixture = parseFixture(f);

  const participants = f.participants || [];
  const home = participants.find((p: any) => p.meta?.location === 'home');
  const away = participants.find((p: any) => p.meta?.location === 'away');

  const stats = parseStats(f.statistics || [], home?.id || 0, away?.id || 0);
  const events = parseEvents(f.events || [], participants);

  return { fixture, stats, events };
}

/**
 * Get fixtures for a specific date
 */
export async function getFixturesByDate(date: string): Promise<LiveFixture[]> {
  const data = await sportmonksRequest<any[]>(`/fixtures/date/${date}`, {
    include: 'participants;state;scores;league;periods',
  });

  return (data.data || []).map(parseFixture);
}
