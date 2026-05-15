import { ENV } from "../_core/env";

/**
 * API-Football integration service
 * Docs: https://www.api-football.com/documentation-v3
 * 
 * Free plan limitations:
 * - Seasons: 2022 to 2024 only
 * - No `last` parameter
 * - Requires league + season for fixture searches
 * - 100 requests/day
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
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
  league: string;
  status: string;
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
  status: string;
}

// Brazilian leagues commonly used
const BRAZILIAN_LEAGUES = [
  { id: 71, name: "Serie A" },
  { id: 72, name: "Serie B" },
  { id: 73, name: "Copa Do Brasil" },
  { id: 75, name: "Serie C" },
  { id: 13, name: "CONMEBOL Libertadores" },
  { id: 11, name: "CONMEBOL Sudamericana" },
];

// Available seasons for free plan
const AVAILABLE_SEASONS = [2024, 2023, 2022];

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

/**
 * Search for team ID by name
 */
async function findTeamId(teamName: string): Promise<{ id: number; name: string } | null> {
  const data = await apiRequest<Array<{ team: { id: number; name: string } }>>("/teams", {
    search: teamName,
  });

  if (data.results === 0) return null;

  // Try to find exact match first
  const normalized = normalizeTeamName(teamName);
  const exactMatch = data.response.find(
    (t) => normalizeTeamName(t.team.name) === normalized
  );
  if (exactMatch) return exactMatch.team;

  // Try partial match
  const partialMatch = data.response.find(
    (t) => normalizeTeamName(t.team.name).includes(normalized) || normalized.includes(normalizeTeamName(t.team.name))
  );
  if (partialMatch) return partialMatch.team;

  // Return first result
  return data.response[0].team;
}

/**
 * Search for fixtures by team names
 * Uses league + season + date range (compatible with free plan)
 */
export async function searchFixtures(
  homeTeam: string,
  awayTeam: string,
  dateFrom?: string,
  dateTo?: string
): Promise<SearchResult[]> {
  // Find team IDs
  const homeTeamData = await findTeamId(homeTeam);
  if (!homeTeamData) {
    throw new Error(`Time não encontrado: ${homeTeam}`);
  }

  const allResults: SearchResult[] = [];

  // Search across available seasons and Brazilian leagues
  for (const season of AVAILABLE_SEASONS) {
    for (const league of BRAZILIAN_LEAGUES) {
      const params: Record<string, string> = {
        team: homeTeamData.id.toString(),
        league: league.id.toString(),
        season: season.toString(),
        status: "FT",
      };

      // If date range provided, use it
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;

      // If no date range, search last 3 months of the season
      if (!dateFrom && !dateTo) {
        const yearEnd = season;
        params.from = `${yearEnd}-01-01`;
        params.to = `${yearEnd}-12-31`;
      }

      try {
        const fixturesData = await apiRequest<FixtureResult[]>("/fixtures", params);

        if (fixturesData.results > 0) {
          const results = fixturesData.response.map((f) => ({
            id: f.fixture.id,
            date: f.fixture.date,
            homeTeam: f.teams.home.name,
            awayTeam: f.teams.away.name,
            homeGoals: f.goals.home,
            awayGoals: f.goals.away,
            league: `${f.league.name} ${f.league.season}`,
            status: f.fixture.status.long,
            fixtureId: f.fixture.id,
          }));
          allResults.push(...results);
        }
      } catch {
        // Skip errors for specific league/season combos
        continue;
      }

      // Stop if we have enough results
      if (allResults.length >= 20) break;
    }
    if (allResults.length >= 20) break;
  }

  // Filter by away team name if possible
  const awayNormalized = normalizeTeamName(awayTeam);
  const filtered = allResults.filter((f) => {
    const awayName = normalizeTeamName(f.awayTeam);
    const homeName = normalizeTeamName(f.homeTeam);
    return (
      awayName.includes(awayNormalized) ||
      awayNormalized.includes(awayName) ||
      homeName.includes(awayNormalized) ||
      awayNormalized.includes(homeName)
    );
  });

  // Sort by date descending (most recent first)
  const sortByDate = (a: SearchResult, b: SearchResult) =>
    new Date(b.date).getTime() - new Date(a.date).getTime();

  // Return filtered results if any, otherwise all results for manual selection
  if (filtered.length > 0) {
    return filtered.sort(sortByDate);
  }

  return allResults.sort(sortByDate);
}

/**
 * Get fixture statistics by fixture ID
 */
export async function getFixtureStats(fixtureId: number): Promise<ExtractedMatchStats> {
  const data = await apiRequest<FixtureResult[]>("/fixtures", {
    id: fixtureId.toString(),
  });

  if (data.results === 0) {
    throw new Error(`Partida não encontrada: fixture_id ${fixtureId}`);
  }

  const fixture = data.response[0];

  // Now get statistics
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
    status: fixture.fixture.status.long,
  };
}

/**
 * Get fixture by ID (basic info without statistics)
 */
export async function getFixtureById(fixtureId: number): Promise<FixtureResult | null> {
  const data = await apiRequest<FixtureResult[]>("/fixtures", {
    id: fixtureId.toString(),
  });

  if (data.results === 0) return null;
  return data.response[0];
}

// Helper functions
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
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
