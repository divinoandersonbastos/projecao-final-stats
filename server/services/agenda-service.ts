import { ENV } from '../_core/env.js';

/**
 * Agenda Service - Manages fixture calendar with Sportmonks integration
 * 
 * Features:
 * - Fetch fixtures by date from Sportmonks
 * - Fetch live fixtures from Sportmonks
 * - Map Sportmonks state to internal status
 * - Transform fixtures for frontend display
 * - Group fixtures by country/league
 */

const BASE_URL = 'https://api.sportmonks.com/v3/football';

// Internal status types
export type FixtureStatus = "scheduled" | "live" | "halftime" | "finished" | "postponed" | "cancelled" | "unknown";

export interface AgendaFixture {
  apiFixtureId: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  timezone: string;
  country: string;
  countryCode: string | null;
  league: string;
  leagueId: number;
  season: number | null;
  round: string | null;
  homeTeam: string;
  homeTeamId: number;
  awayTeam: string;
  awayTeamId: number;
  homeLogo: string | null;
  awayLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: FixtureStatus;
  statusShort: string;
  elapsed: number | null;
}

export interface LeagueGroupData {
  country: string;
  countryCode: string | null;
  league: string;
  leagueId: number;
  fixtures: AgendaFixture[];
}

/**
 * Map Sportmonks state short_name to internal status
 */
export function mapApiStatus(statusShort: string): FixtureStatus {
  const mapping: Record<string, FixtureStatus> = {
    // Scheduled
    "TBD": "scheduled",
    "NS": "scheduled",
    "TBA": "scheduled",
    // Live
    "1ST": "live",
    "2ND": "live",
    "ET": "live",
    "PEN_LIVE": "live",
    "BT": "live",
    "BREAK": "live",
    "LIVE": "live",
    // Also map our converted short codes
    "1H": "live",
    "2H": "live",
    "P": "live",
    // Halftime
    "HT": "halftime",
    // Finished
    "FT": "finished",
    "AET": "finished",
    "FT_PEN": "finished",
    "PEN": "finished",
    // Postponed
    "PST": "postponed",
    "SUSP": "postponed",
    "INT": "postponed",
    // Cancelled
    "CANC": "cancelled",
    "ABD": "cancelled",
    "AWD": "cancelled",
    "WO": "cancelled",
  };

  return mapping[statusShort] || "unknown";
}

/**
 * Get status display label in Portuguese
 */
export function getStatusLabel(status: FixtureStatus): string {
  const labels: Record<FixtureStatus, string> = {
    scheduled: "Agendado",
    live: "Ao Vivo",
    halftime: "Intervalo",
    finished: "Finalizado",
    postponed: "Adiado",
    cancelled: "Cancelado",
    unknown: "Indefinido",
  };
  return labels[status];
}

/**
 * Transform Sportmonks fixture response to internal AgendaFixture format
 */
export function transformFixture(fixture: any): AgendaFixture {
  const participants = fixture.participants || [];
  const home = participants.find((p: any) => p.meta?.location === 'home');
  const away = participants.find((p: any) => p.meta?.location === 'away');

  // Parse date - Sportmonks returns starting_at in UTC (e.g. '2026-05-16 19:00:00')
  // We must parse as UTC explicitly to avoid timezone interpretation issues
  const rawDate = fixture.starting_at || '';
  const dateObj = new Date(rawDate.replace(' ', 'T') + 'Z');
  // Convert to Sao Paulo timezone for both date and time
  const date = dateObj.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD
  const time = dateObj.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  });

  // Get scores
  const scores = fixture.scores || [];
  const homeScore = scores.find((s: any) => s.participant_id === home?.id && s.description === 'CURRENT');
  const awayScore = scores.find((s: any) => s.participant_id === away?.id && s.description === 'CURRENT');

  // Map state
  const stateShort = fixture.state?.short_name || 'NS';
  const status = mapApiStatus(stateShort);

  // Get league info - Sportmonks includes league when requested
  const league = fixture.league || {};
  const country = league.country?.name || league.country || '';
  const countryFlag = league.country?.image_path || null;

  return {
    apiFixtureId: fixture.id,
    date,
    time,
    timezone: "America/Sao_Paulo",
    country: country,
    countryCode: countryFlag,
    league: league.name || '',
    leagueId: fixture.league_id || league.id || 0,
    season: fixture.season_id || null,
    round: fixture.round?.name || null,
    homeTeam: home?.name || 'Unknown',
    homeTeamId: home?.id || 0,
    awayTeam: away?.name || 'Unknown',
    awayTeamId: away?.id || 0,
    homeLogo: home?.image_path || null,
    awayLogo: away?.image_path || null,
    homeScore: homeScore?.score?.goals ?? null,
    awayScore: awayScore?.score?.goals ?? null,
    status,
    statusShort: stateShort,
    elapsed: null, // Sportmonks doesn't provide elapsed in fixture list
  };
}

/**
 * Group fixtures by country and league
 */
export function groupFixturesByLeague(fixtures: AgendaFixture[]): LeagueGroupData[] {
  const groups = new Map<string, LeagueGroupData>();

  for (const fixture of fixtures) {
    const key = `${fixture.country}|${fixture.leagueId}`;
    if (!groups.has(key)) {
      groups.set(key, {
        country: fixture.country,
        countryCode: fixture.countryCode,
        league: fixture.league,
        leagueId: fixture.leagueId,
        fixtures: [],
      });
    }
    groups.get(key)!.fixtures.push(fixture);
  }

  // Sort groups: by country name, then league name
  const sorted = Array.from(groups.values()).sort((a, b) => {
    const countryCompare = a.country.localeCompare(b.country);
    if (countryCompare !== 0) return countryCompare;
    return a.league.localeCompare(b.league);
  });

  // Sort fixtures within each group by time
  for (const group of sorted) {
    group.fixtures.sort((a, b) => a.time.localeCompare(b.time));
  }

  return sorted;
}

/**
 * Filter fixtures by status
 */
export function filterByStatus(fixtures: AgendaFixture[], status: FixtureStatus | "all"): AgendaFixture[] {
  if (status === "all") return fixtures;
  return fixtures.filter((f) => f.status === status);
}

/**
 * Filter fixtures by search query (team name, league, or country)
 */
export function filterBySearch(fixtures: AgendaFixture[], query: string): AgendaFixture[] {
  if (!query.trim()) return fixtures;
  const normalized = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  return fixtures.filter((f) => {
    const fields = [f.homeTeam, f.awayTeam, f.league, f.country];
    return fields.some((field) =>
      field.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalized)
    );
  });
}

/**
 * Sportmonks API request helper
 */
async function sportmonksAgendaRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
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
 * Fetch fixtures from Sportmonks for a specific date
 */
export async function fetchFixturesFromApi(date: string): Promise<AgendaFixture[]> {
  // Sportmonks paginates results - we need to handle pagination
  let allFixtures: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await sportmonksAgendaRequest<any>(`/fixtures/date/${date}`, {
      include: 'participants;state;scores;league.country',
      per_page: '50',
      page: String(page),
    });

    const fixtures = data.data || [];
    allFixtures = allFixtures.concat(fixtures);

    // Check pagination
    hasMore = data.pagination?.has_more === true;
    page++;

    // Safety limit to avoid infinite loops
    if (page > 20) break;
  }

  return allFixtures.map(transformFixture);
}

/**
 * Fetch live fixtures from Sportmonks
 */
export async function fetchLiveFixturesFromApi(): Promise<AgendaFixture[]> {
  try {
    const data = await sportmonksAgendaRequest<any>('/livescores/inplay', {
      include: 'participants;state;scores;league.country',
    });

    return (data.data || []).map(transformFixture);
  } catch (error: any) {
    // Sportmonks returns error message when no live fixtures
    if (error.message?.includes('No result') || error.message?.includes('404')) {
      return [];
    }
    throw error;
  }
}
