/**
 * Sportmonks Validation Service
 * Replaces API-Football for post-match validation
 * 
 * Provides:
 * - Search fixtures by team name (using fixtures/search/{name})
 * - Get fixtures by date (using fixtures/date/{date})
 * - Get live fixtures (using livescores/inplay)
 * - Get fixture stats (using fixtures/{id}?include=statistics;participants;scores;state)
 * - Get fixture by ID
 */

import { ENV } from '../_core/env.js';

const BASE_URL = 'https://api.sportmonks.com/v3/football';

// Fixture statistic type IDs (match-level stats)
export const FIXTURE_STAT_TYPES = {
  POSSESSION: 45,           // Ball Possession %
  TOTAL_SHOTS: 42,          // Total Shots
  SHOTS_ON_TARGET: 50,      // Shots on Target
  SHOTS_OFF_TARGET: 55,     // Shots Off Target
  CORNERS: 34,              // Corner Kicks
  GOALS: 52,                // Goals
  DANGEROUS_ATTACKS: 44,    // Dangerous Attacks
  ATTACKS: 43,              // Attacks
  FOULS: 56,                // Fouls
  PASSES: 80,               // Total Passes
  ACCURATE_PASSES: 81,      // Accurate Passes
  PASS_ACCURACY: 82,        // Pass Accuracy %
  TACKLES: 46,              // Tackles
  GK_SAVES: 86,             // Goalkeeper Saves
  YELLOW_CARDS: 109,        // Yellow Cards
  RED_CARDS: 79,            // Red Cards
  INTERCEPTIONS: 60,        // Interceptions
  CLEARANCES: 78,           // Clearances
  OFFSIDES: 100,            // Offsides
  CROSSES: 98,              // Crosses
  BLOCKED_SHOTS: 117,       // Shots Blocked
  SHOTS_INSIDE_BOX: 49,     // Shots Inside Box
  SHOTS_OUTSIDE_BOX: 58,    // Shots Outside Box
} as const;

// State short_names that indicate a finished match
const FINISHED_STATES = ['FT', 'AET', 'FT_PEN'];
const LIVE_STATES = ['LIVE', '1ST', '2ND', 'HT', 'ET', 'PEN_LIVE', 'BT', 'BREAK'];

export interface SearchResult {
  id: number;
  date: string;
  homeTeam: string;
  homeTeamLogo: string;
  awayTeam: string;
  awayTeamLogo: string;
  homeGoals: number | null;
  awayGoals: number | null;
  league: string;
  leagueLogo: string;
  status: string;
  statusShort: string;
  elapsed: number | null;
  fixtureId: number;
}

export interface ExtractedMatchStats {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  homeShots: number | null;
  awayShots: number | null;
  homeShotsOnTarget: number | null;
  awayShotsOnTarget: number | null;
  homeCorners: number | null;
  awayCorners: number | null;
  homeDangerousAttacks: number | null;
  awayDangerousAttacks: number | null;
  homePossession: number | null;
  awayPossession: number | null;
  homeXg: number | null;
  awayXg: number | null;
  homeFouls: number | null;
  awayFouls: number | null;
  homePasses: number | null;
  awayPasses: number | null;
  homePassAccuracy: number | null;
  awayPassAccuracy: number | null;
  homeTackles: number | null;
  awayTackles: number | null;
  homeGkSaves: number | null;
  awayGkSaves: number | null;
  status: string;
  statusShort: string;
}

interface SportmonksResponse<T> {
  data: T;
  pagination?: { count: number; per_page: number; current_page: number; next_page: string | null; has_more: boolean };
  subscription?: any[];
  rate_limit?: { resets_in_seconds: number; remaining: number; requested_entity: string };
  timezone?: string;
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
    headers: {
      'Authorization': token,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Sportmonks API error ${response.status}: ${errorBody}`);
  }

  return response.json() as Promise<SportmonksResponse<T>>;
}

/**
 * Convert Sportmonks state to a status short code compatible with our system
 */
function mapStateToStatusShort(state: any): string {
  if (!state) return 'NS';
  const shortName = state.short_name || state.state || '';
  // Map Sportmonks state names to our internal codes
  switch (shortName) {
    case 'FT': return 'FT';
    case 'AET': return 'AET';
    case 'FT_PEN': return 'PEN';
    case 'NS': return 'NS';
    case '1ST': return '1H';
    case '2ND': return '2H';
    case 'HT': return 'HT';
    case 'ET': return 'ET';
    case 'PEN_LIVE': return 'P';
    case 'LIVE': return 'LIVE';
    case 'BT': return 'BT';
    case 'BREAK': return 'BT';
    case 'PST': return 'PST';
    case 'CANC': return 'CANC';
    case 'ABD': return 'ABD';
    case 'SUSP': return 'SUSP';
    case 'INT': return 'INT';
    case 'AWD': return 'AWD';
    case 'WO': return 'WO';
    case 'TBA': return 'TBA';
    default: return shortName || 'NS';
  }
}

function mapStateToStatusLong(state: any): string {
  if (!state) return 'Not Started';
  return state.name || state.state || 'Unknown';
}

/**
 * Parse a Sportmonks fixture into our SearchResult format
 */
function fixtureToSearchResult(f: any): SearchResult {
  const participants = f.participants || [];
  const home = participants.find((p: any) => p.meta?.location === 'home');
  const away = participants.find((p: any) => p.meta?.location === 'away');

  // Get scores
  const scores = f.scores || [];
  const homeScore = scores.find((s: any) => s.participant_id === home?.id && s.description === 'CURRENT');
  const awayScore = scores.find((s: any) => s.participant_id === away?.id && s.description === 'CURRENT');

  const statusShort = mapStateToStatusShort(f.state);

  return {
    id: f.id,
    date: f.starting_at || '',
    homeTeam: home?.name || 'Unknown',
    homeTeamLogo: home?.image_path || '',
    awayTeam: away?.name || 'Unknown',
    awayTeamLogo: away?.image_path || '',
    homeGoals: homeScore?.score?.goals ?? null,
    awayGoals: awayScore?.score?.goals ?? null,
    league: f.league?.name || '',
    leagueLogo: f.league?.image_path || '',
    status: mapStateToStatusLong(f.state),
    statusShort,
    elapsed: f.state?.short_name === 'HT' ? 45 : null, // Sportmonks doesn't provide elapsed directly in fixture
    fixtureId: f.id,
  };
}

/**
 * Get all live fixtures currently being played
 */
export async function getLiveFixtures(): Promise<SearchResult[]> {
  try {
    const data = await sportmonksRequest<any[]>('/livescores/inplay', {
      include: 'participants;state;scores;league',
    });

    return (data.data || []).map(fixtureToSearchResult);
  } catch (error: any) {
    // If no live fixtures, Sportmonks returns a message instead of empty array
    if (error.message?.includes('No result')) {
      return [];
    }
    throw error;
  }
}

/**
 * Get all fixtures for a specific date (default: today)
 */
export async function getFixturesByDate(date?: string): Promise<SearchResult[]> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const data = await sportmonksRequest<any[]>(`/fixtures/date/${targetDate}`, {
    include: 'participants;state;scores;league',
  });

  return (data.data || []).map(fixtureToSearchResult);
}

/**
 * Search fixtures by team name for today or a specific date
 * Uses the fixtures/date endpoint and filters by team name match
 */
export async function searchFixtures(
  homeTeam: string,
  awayTeam?: string,
  date?: string
): Promise<SearchResult[]> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  // Get fixtures for the date
  const todayFixtures = await getFixturesByDate(targetDate);

  // Also get live fixtures
  let liveFixtures: SearchResult[] = [];
  if (!date) {
    try {
      liveFixtures = await getLiveFixtures();
    } catch {
      // Ignore live fixture errors
    }
  }

  // Merge and deduplicate
  const allFixtures = [...todayFixtures];
  for (const live of liveFixtures) {
    if (!allFixtures.find(f => f.fixtureId === live.fixtureId)) {
      allFixtures.push(live);
    }
  }

  // Filter by team names
  const homeNorm = normalizeTeamName(homeTeam);
  const awayNorm = awayTeam ? normalizeTeamName(awayTeam) : null;

  const filtered = allFixtures.filter((f) => {
    const fHome = normalizeTeamName(f.homeTeam);
    const fAway = normalizeTeamName(f.awayTeam);

    const homeMatch = fHome.includes(homeNorm) || homeNorm.includes(fHome) ||
                      fAway.includes(homeNorm) || homeNorm.includes(fAway);

    if (!homeMatch) return false;

    if (awayNorm) {
      const awayMatch = fHome.includes(awayNorm) || awayNorm.includes(fHome) ||
                        fAway.includes(awayNorm) || awayNorm.includes(fAway);
      return awayMatch;
    }

    return true;
  });

  // Sort: live first, then by date
  const sortFixtures = (a: SearchResult, b: SearchResult) => {
    const aLive = isLiveStatus(a.statusShort) ? 0 : 1;
    const bLive = isLiveStatus(b.statusShort) ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  };

  return filtered.sort(sortFixtures);
}

/**
 * Get fixture by ID with full details
 */
export async function getFixtureById(fixtureId: number): Promise<SearchResult | null> {
  const data = await sportmonksRequest<any>(`/fixtures/${fixtureId}`, {
    include: 'participants;state;scores;league',
  });

  if (!data.data) return null;
  return fixtureToSearchResult(data.data);
}

/**
 * Get fixture statistics by fixture ID
 * Returns extracted match stats for validation
 */
export async function getFixtureStats(fixtureId: number): Promise<ExtractedMatchStats> {
  const data = await sportmonksRequest<any>(`/fixtures/${fixtureId}`, {
    include: 'participants;state;scores;statistics',
  });

  if (!data.data) {
    throw new Error(`Partida não encontrada: fixture_id ${fixtureId}`);
  }

  const fixture = data.data;
  const participants = fixture.participants || [];
  const home = participants.find((p: any) => p.meta?.location === 'home');
  const away = participants.find((p: any) => p.meta?.location === 'away');

  if (!home || !away) {
    throw new Error(`Participantes não encontrados para fixture ${fixtureId}`);
  }

  // Get scores
  const scores = fixture.scores || [];
  const homeScore = scores.find((s: any) => s.participant_id === home.id && s.description === 'CURRENT');
  const awayScore = scores.find((s: any) => s.participant_id === away.id && s.description === 'CURRENT');

  // Get statistics
  const statistics = fixture.statistics || [];

  const getStatForTeam = (participantId: number, typeId: number): number | null => {
    const stat = statistics.find((s: any) => s.participant_id === participantId && s.type_id === typeId);
    if (!stat || stat.data?.value === undefined || stat.data?.value === null) return null;
    return typeof stat.data.value === 'number' ? stat.data.value : parseFloat(String(stat.data.value)) || null;
  };

  const statusShort = mapStateToStatusShort(fixture.state);
  const statusLong = mapStateToStatusLong(fixture.state);

  return {
    fixtureId,
    homeTeam: home.name,
    awayTeam: away.name,
    homeGoals: homeScore?.score?.goals ?? 0,
    awayGoals: awayScore?.score?.goals ?? 0,
    homeShots: getStatForTeam(home.id, FIXTURE_STAT_TYPES.TOTAL_SHOTS),
    awayShots: getStatForTeam(away.id, FIXTURE_STAT_TYPES.TOTAL_SHOTS),
    homeShotsOnTarget: getStatForTeam(home.id, FIXTURE_STAT_TYPES.SHOTS_ON_TARGET),
    awayShotsOnTarget: getStatForTeam(away.id, FIXTURE_STAT_TYPES.SHOTS_ON_TARGET),
    homeCorners: getStatForTeam(home.id, FIXTURE_STAT_TYPES.CORNERS),
    awayCorners: getStatForTeam(away.id, FIXTURE_STAT_TYPES.CORNERS),
    homeDangerousAttacks: getStatForTeam(home.id, FIXTURE_STAT_TYPES.DANGEROUS_ATTACKS),
    awayDangerousAttacks: getStatForTeam(away.id, FIXTURE_STAT_TYPES.DANGEROUS_ATTACKS),
    homePossession: getStatForTeam(home.id, FIXTURE_STAT_TYPES.POSSESSION),
    awayPossession: getStatForTeam(away.id, FIXTURE_STAT_TYPES.POSSESSION),
    homeXg: null, // Sportmonks doesn't provide xG in fixture stats (available via separate endpoint)
    awayXg: null,
    homeFouls: getStatForTeam(home.id, FIXTURE_STAT_TYPES.FOULS),
    awayFouls: getStatForTeam(away.id, FIXTURE_STAT_TYPES.FOULS),
    homePasses: getStatForTeam(home.id, FIXTURE_STAT_TYPES.PASSES),
    awayPasses: getStatForTeam(away.id, FIXTURE_STAT_TYPES.PASSES),
    homePassAccuracy: getStatForTeam(home.id, FIXTURE_STAT_TYPES.PASS_ACCURACY),
    awayPassAccuracy: getStatForTeam(away.id, FIXTURE_STAT_TYPES.PASS_ACCURACY),
    homeTackles: getStatForTeam(home.id, FIXTURE_STAT_TYPES.TACKLES),
    awayTackles: getStatForTeam(away.id, FIXTURE_STAT_TYPES.TACKLES),
    homeGkSaves: getStatForTeam(home.id, FIXTURE_STAT_TYPES.GK_SAVES),
    awayGkSaves: getStatForTeam(away.id, FIXTURE_STAT_TYPES.GK_SAVES),
    status: statusLong,
    statusShort,
  };
}

/**
 * Check API rate limit status
 */
export async function getApiStatus(): Promise<{ current: number; limit: number }> {
  // Sportmonks provides rate_limit in every response header
  // We'll make a lightweight request to check
  const data = await sportmonksRequest<any[]>('/fixtures/date/2020-01-01', {
    per_page: '1',
  });

  return {
    current: 0, // Sportmonks doesn't track daily usage the same way
    limit: data.rate_limit?.remaining ?? 3000,
  };
}

// Helper functions
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function isLiveStatus(statusShort: string): boolean {
  return ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'].includes(statusShort);
}
