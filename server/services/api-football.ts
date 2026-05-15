import { ENV } from "../_core/env";

/**
 * API-Football integration service
 * Docs: https://www.api-football.com/documentation-v3
 * 
 * Capabilities:
 * - Live fixtures: /fixtures?live=all
 * - Today fixtures: /fixtures?date=YYYY-MM-DD
 * - Fixture by ID: /fixtures?id={id}
 * - Statistics: /fixtures/statistics?fixture={id}
 * - 7,500 requests/day
 */

interface ApiFootballResponse<T> {
  get: string;
  parameters: Record<string, string>;
  errors: Record<string, string> | string[];
  results: number;
  paging: { current: number; total: number };
  response: T;
}

export interface FixtureStatistic {
  type: string;
  value: number | string | null;
}

export interface FixtureTeamStats {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  statistics: FixtureStatistic[];
}

export interface FixtureResult {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
  statistics?: FixtureTeamStats[];
}

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

async function apiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<ApiFootballResponse<T>> {
  const url = new URL(endpoint, ENV.apiFootballUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": ENV.apiFootballKey,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Football error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<ApiFootballResponse<T>>;
}

function fixtureToSearchResult(f: FixtureResult): SearchResult {
  return {
    id: f.fixture.id,
    date: f.fixture.date,
    homeTeam: f.teams.home.name,
    homeTeamLogo: f.teams.home.logo,
    awayTeam: f.teams.away.name,
    awayTeamLogo: f.teams.away.logo,
    homeGoals: f.goals.home,
    awayGoals: f.goals.away,
    league: f.league.name,
    leagueLogo: f.league.logo,
    status: f.fixture.status.long,
    statusShort: f.fixture.status.short,
    elapsed: f.fixture.status.elapsed,
    fixtureId: f.fixture.id,
  };
}

/**
 * Get all live fixtures currently being played
 */
export async function getLiveFixtures(): Promise<SearchResult[]> {
  const data = await apiRequest<FixtureResult[]>("/fixtures", {
    live: "all",
  });

  return data.response.map(fixtureToSearchResult);
}

/**
 * Get all fixtures for a specific date (default: today)
 */
export async function getFixturesByDate(date?: string): Promise<SearchResult[]> {
  const targetDate = date || new Date().toISOString().split("T")[0];
  
  const data = await apiRequest<FixtureResult[]>("/fixtures", {
    date: targetDate,
  });

  return data.response.map(fixtureToSearchResult);
}

/**
 * Search fixtures by team name for today or a specific date
 * Filters live/today fixtures by team name match
 */
export async function searchFixtures(
  homeTeam: string,
  awayTeam?: string,
  date?: string
): Promise<SearchResult[]> {
  // Get today's fixtures (or specific date)
  const targetDate = date || new Date().toISOString().split("T")[0];
  const todayFixtures = await getFixturesByDate(targetDate);
  
  // Also get live fixtures to include in-progress games
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

    // Check if home team matches either side
    const homeMatch = fHome.includes(homeNorm) || homeNorm.includes(fHome) ||
                      fAway.includes(homeNorm) || homeNorm.includes(fAway);

    if (!homeMatch) return false;

    // If away team specified, check it too
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

  // Return only matched fixtures, never return all 300+ unrelated fixtures
  return filtered.sort(sortFixtures);
}

/**
 * Get fixture by ID (basic info)
 */
export async function getFixtureById(fixtureId: number): Promise<FixtureResult | null> {
  const data = await apiRequest<FixtureResult[]>("/fixtures", {
    id: fixtureId.toString(),
  });

  if (data.results === 0) return null;
  return data.response[0];
}

/**
 * Get fixture statistics by fixture ID
 * Works for finished games and live games (stats update in real-time)
 */
export async function getFixtureStats(fixtureId: number): Promise<ExtractedMatchStats> {
  const data = await apiRequest<FixtureResult[]>("/fixtures", {
    id: fixtureId.toString(),
  });

  if (data.results === 0) {
    throw new Error(`Partida não encontrada: fixture_id ${fixtureId}`);
  }

  const fixture = data.response[0];

  // Get statistics
  const statsData = await apiRequest<FixtureTeamStats[]>("/fixtures/statistics", {
    fixture: fixtureId.toString(),
  });

  const homeStats = statsData.response.find(
    (s) => s.team.id === fixture.teams.home.id
  );
  const awayStats = statsData.response.find(
    (s) => s.team.id === fixture.teams.away.id
  );

  return {
    fixtureId,
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    homeGoals: fixture.goals.home ?? 0,
    awayGoals: fixture.goals.away ?? 0,
    homeShots: getStatValue(homeStats, "Total Shots"),
    awayShots: getStatValue(awayStats, "Total Shots"),
    homeShotsOnTarget: getStatValue(homeStats, "Shots on Goal"),
    awayShotsOnTarget: getStatValue(awayStats, "Shots on Goal"),
    homeCorners: getStatValue(homeStats, "Corner Kicks"),
    awayCorners: getStatValue(awayStats, "Corner Kicks"),
    homeDangerousAttacks: getStatValue(homeStats, "Dangerous Attacks"),
    awayDangerousAttacks: getStatValue(awayStats, "Dangerous Attacks"),
    homePossession: getStatPercentValue(homeStats, "Ball Possession"),
    awayPossession: getStatPercentValue(awayStats, "Ball Possession"),
    homeXg: getStatFloatValue(homeStats, "expected_goals"),
    awayXg: getStatFloatValue(awayStats, "expected_goals"),
    homeFouls: getStatValue(homeStats, "Fouls"),
    awayFouls: getStatValue(awayStats, "Fouls"),
    homePasses: getStatValue(homeStats, "Total passes"),
    awayPasses: getStatValue(awayStats, "Total passes"),
    homePassAccuracy: getStatPercentValue(homeStats, "Passes accurate"),
    awayPassAccuracy: getStatPercentValue(awayStats, "Passes accurate"),
    homeTackles: getStatValue(homeStats, "Tackles"),
    awayTackles: getStatValue(awayStats, "Tackles"),
    homeGkSaves: getStatValue(homeStats, "Goalkeeper Saves"),
    awayGkSaves: getStatValue(awayStats, "Goalkeeper Saves"),
    status: fixture.fixture.status.long,
    statusShort: fixture.fixture.status.short,
  };
}

/**
 * Check API status (requests used today)
 */
export async function getApiStatus(): Promise<{ current: number; limit: number }> {
  const data = await apiRequest<{ account: any; subscription: any; requests: { current: number; limit_day: number } }>("/status");
  return {
    current: data.response.requests.current,
    limit: data.response.requests.limit_day,
  };
}

// Helper functions
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function isLiveStatus(statusShort: string): boolean {
  return ["1H", "2H", "HT", "ET", "P", "BT", "LIVE"].includes(statusShort);
}

function getStatValue(teamStats: FixtureTeamStats | undefined, type: string): number | null {
  if (!teamStats) return null;
  const stat = teamStats.statistics.find((s) => s.type === type);
  if (!stat || stat.value === null) return null;
  return typeof stat.value === "number" ? stat.value : parseInt(String(stat.value), 10) || null;
}

function getStatPercentValue(teamStats: FixtureTeamStats | undefined, type: string): number | null {
  if (!teamStats) return null;
  const stat = teamStats.statistics.find((s) => s.type === type);
  if (!stat || stat.value === null) return null;
  const str = String(stat.value).replace("%", "");
  return parseFloat(str) || null;
}

function getStatFloatValue(teamStats: FixtureTeamStats | undefined, type: string): number | null {
  if (!teamStats) return null;
  const stat = teamStats.statistics.find((s) => s.type === type);
  if (!stat || stat.value === null) return null;
  return typeof stat.value === "number" ? stat.value : parseFloat(String(stat.value)) || null;
}
