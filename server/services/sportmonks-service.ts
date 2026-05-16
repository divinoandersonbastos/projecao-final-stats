/**
 * Sportmonks Football API v3 Service
 * Busca estatísticas agregadas de times por temporada
 * Docs: https://docs.sportmonks.com/v3
 */

import { ENV } from '../_core/env.js';

const BASE_URL = 'https://api.sportmonks.com/v3/football';

// Sportmonks statistic type IDs
export const STAT_TYPES = {
  DANGEROUS_ATTACKS: 44,    // { count, average }
  ATTACKS: 43,              // { count, average }
  SHOTS: 1677,              // { total, on_target, off_target, inside_box, outside_box, blocked, average }
  CORNERS: 34,              // { count, average } - NOTE: type 56 also has corners with same structure
  GOALS_SCORED: 52,         // { all: { count, average }, home: {...}, away: {...} }
  GOALS_CONCEDED: 88,       // { all: { count, average, first }, home: {...}, away: {...} }
  FOULS: 56,                // { count, average }
  RATING: 118,              // { value: "6.88" }
  BTTS: 192,                // { all: { count, percentage }, home: {...}, away: {...} }
  CLEAN_SHEETS: 194,        // { all: { count, percentage }, home: {...}, away: {...} }
  FAILED_TO_SCORE: 216,     // { all: { count, percentage }, home: {...}, away: {...} }
  SHOTS_ON_TARGET_PCT: 9682, // { pct_shots_on_target: "29.90" }
  SCORING_FREQUENCY: 27248, // { scoring_frequency: 54 }
  OVER_UNDER: 27261,        // { gf_over_0_5, gf_over_1_5, ... ga_over_0_5, ... }
  WINS: 214,                // { all: { count, percentage }, home: {...}, away: {...} }
} as const;

// Key stat types we need for match quality analysis
const QUALITY_STAT_TYPES = [
  STAT_TYPES.DANGEROUS_ATTACKS,
  STAT_TYPES.ATTACKS,
  STAT_TYPES.SHOTS,
  STAT_TYPES.CORNERS,
  STAT_TYPES.GOALS_SCORED,
  STAT_TYPES.GOALS_CONCEDED,
  STAT_TYPES.RATING,
  STAT_TYPES.BTTS,
  STAT_TYPES.CLEAN_SHEETS,
  STAT_TYPES.FAILED_TO_SCORE,
  STAT_TYPES.OVER_UNDER,
  STAT_TYPES.WINS,
];

export interface TeamStats {
  teamId: number;
  teamName: string;
  seasonId: number;
  dangerousAttacksAvg: number;
  attacksAvg: number;
  shotsTotal: number;
  shotsOnTarget: number;
  shotsAvg: number;
  cornersAvg: number;
  goalsScored: { all: number; home: number; away: number; avgAll: number; avgHome: number; avgAway: number };
  goalsConceded: { all: number; home: number; away: number; avgAll: number; avgHome: number; avgAway: number };
  rating: number;
  btts: { allPct: number; homePct: number; awayPct: number };
  cleanSheets: { allPct: number; homePct: number; awayPct: number };
  failedToScore: { allPct: number; homePct: number; awayPct: number };
  wins: { allPct: number; homePct: number; awayPct: number };
  overUnder: {
    gfOver05: number; gfOver15: number; gfOver25: number;
    gaOver05: number; gaOver15: number; gaOver25: number;
  };
  gamesPlayed: number;
}

export interface SportmonksFixture {
  id: number;
  sportId: number;
  leagueId: number;
  seasonId: number;
  stageId: number;
  name: string;
  startingAt: string;
  resultInfo: string | null;
  leg: string;
  length: number;
  state: { id: number; state: string; name: string; short_name: string };
  participants: Array<{
    id: number;
    name: string;
    short_code: string;
    image_path: string;
    meta: { location: 'home' | 'away'; winner?: boolean; position?: number };
  }>;
  league?: { id: number; name: string; image_path: string; country_id: number };
  scores?: Array<{ participant_id: number; score: { goals: number } }>;
}

async function sportmonksRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
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

  return response.json() as Promise<T>;
}

/**
 * Get available leagues in the subscription
 */
export async function getAvailableLeagues(): Promise<Array<{ id: number; name: string; countryId: number; currentSeasonId: number | null }>> {
  const data = await sportmonksRequest<any>('/leagues', {
    include: 'currentSeason',
  });

  return (data.data || []).map((league: any) => ({
    id: league.id,
    name: league.name,
    countryId: league.country_id,
    currentSeasonId: league.currentseason?.id || null,
  }));
}

/**
 * Get fixtures for a specific date from Sportmonks
 */
export async function getFixturesByDate(date: string): Promise<SportmonksFixture[]> {
  const data = await sportmonksRequest<any>('/fixtures/date/' + date, {
    include: 'participants;league;state;scores',
  });

  return (data.data || []).map((f: any) => ({
    id: f.id,
    sportId: f.sport_id,
    leagueId: f.league_id,
    seasonId: f.season_id,
    stageId: f.stage_id,
    name: f.name,
    startingAt: f.starting_at,
    resultInfo: f.result_info,
    leg: f.leg,
    length: f.length,
    state: f.state,
    participants: f.participants || [],
    league: f.league,
    scores: f.scores,
  }));
}

/**
 * Get aggregated team statistics for a specific season
 */
export async function getTeamStats(teamId: number, seasonId: number): Promise<TeamStats | null> {
  const filterTypes = QUALITY_STAT_TYPES.join(',');

  const data = await sportmonksRequest<any>(`/teams/${teamId}`, {
    include: 'statistics.details',
    filters: `teamStatisticSeasons:${seasonId};teamStatisticDetailTypes:${filterTypes}`,
  });

  if (!data.data || !data.data.statistics || data.data.statistics.length === 0) {
    return null;
  }

  const teamName = data.data.name;
  const details = data.data.statistics[0].details || [];

  // Parse each stat type
  const getDetail = (typeId: number) => details.find((d: any) => d.type_id === typeId);

  const dangerousAttacks = getDetail(STAT_TYPES.DANGEROUS_ATTACKS);
  const attacks = getDetail(STAT_TYPES.ATTACKS);
  const shots = getDetail(STAT_TYPES.SHOTS);
  const corners = getDetail(STAT_TYPES.CORNERS);
  const goalsScored = getDetail(STAT_TYPES.GOALS_SCORED);
  const goalsConceded = getDetail(STAT_TYPES.GOALS_CONCEDED);
  const rating = getDetail(STAT_TYPES.RATING);
  const btts = getDetail(STAT_TYPES.BTTS);
  const cleanSheets = getDetail(STAT_TYPES.CLEAN_SHEETS);
  const failedToScore = getDetail(STAT_TYPES.FAILED_TO_SCORE);
  const overUnder = getDetail(STAT_TYPES.OVER_UNDER);
  const wins = getDetail(STAT_TYPES.WINS);

  // Calculate games played from goals data
  const totalGoals = goalsScored?.value?.all?.count || 0;
  const avgGoals = goalsScored?.value?.all?.average || 0;
  const gamesPlayed = avgGoals > 0 ? Math.round(totalGoals / avgGoals) : 0;

  return {
    teamId,
    teamName,
    seasonId,
    dangerousAttacksAvg: dangerousAttacks?.value?.average || 0,
    attacksAvg: attacks?.value?.average || 0,
    shotsTotal: shots?.value?.total || 0,
    shotsOnTarget: shots?.value?.on_target || 0,
    shotsAvg: shots?.value?.average || 0,
    cornersAvg: corners?.value?.average || 0,
    goalsScored: {
      all: goalsScored?.value?.all?.count || 0,
      home: goalsScored?.value?.home?.count || 0,
      away: goalsScored?.value?.away?.count || 0,
      avgAll: goalsScored?.value?.all?.average || 0,
      avgHome: goalsScored?.value?.home?.average || 0,
      avgAway: goalsScored?.value?.away?.average || 0,
    },
    goalsConceded: {
      all: goalsConceded?.value?.all?.count || 0,
      home: goalsConceded?.value?.home?.count || 0,
      away: goalsConceded?.value?.away?.count || 0,
      avgAll: goalsConceded?.value?.all?.average || 0,
      avgHome: goalsConceded?.value?.home?.average || 0,
      avgAway: goalsConceded?.value?.away?.average || 0,
    },
    rating: parseFloat(rating?.value?.value || '0'),
    btts: {
      allPct: btts?.value?.all?.percentage || 0,
      homePct: btts?.value?.home?.percentage || 0,
      awayPct: btts?.value?.away?.percentage || 0,
    },
    cleanSheets: {
      allPct: cleanSheets?.value?.all?.percentage || 0,
      homePct: cleanSheets?.value?.home?.percentage || 0,
      awayPct: cleanSheets?.value?.away?.percentage || 0,
    },
    failedToScore: {
      allPct: failedToScore?.value?.all?.percentage || 0,
      homePct: failedToScore?.value?.home?.percentage || 0,
      awayPct: failedToScore?.value?.away?.percentage || 0,
    },
    wins: {
      allPct: wins?.value?.all?.percentage || 0,
      homePct: wins?.value?.home?.percentage || 0,
      awayPct: wins?.value?.away?.percentage || 0,
    },
    overUnder: {
      gfOver05: overUnder?.value?.gf_over_0_5 || 0,
      gfOver15: overUnder?.value?.gf_over_1_5 || 0,
      gfOver25: overUnder?.value?.gf_over_2_5 || 0,
      gaOver05: overUnder?.value?.ga_over_0_5 || 0,
      gaOver15: overUnder?.value?.ga_over_1_5 || 0,
      gaOver25: overUnder?.value?.ga_over_2_5 || 0,
    },
    gamesPlayed,
  };
}

/**
 * Get team ID from Sportmonks by searching team name
 */
export async function searchTeam(name: string): Promise<Array<{ id: number; name: string; shortCode: string; leagueId?: number }>> {
  const data = await sportmonksRequest<any>('/teams/search/' + encodeURIComponent(name));

  return (data.data || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    shortCode: t.short_code,
  }));
}

/**
 * Get standings for a season (to get all team IDs in a league)
 */
export async function getSeasonStandings(seasonId: number): Promise<Array<{ teamId: number; position: number; points: number }>> {
  const data = await sportmonksRequest<any>(`/standings/seasons/${seasonId}`);

  return (data.data || []).map((s: any) => ({
    teamId: s.participant_id,
    position: s.position,
    points: s.points,
  }));
}
