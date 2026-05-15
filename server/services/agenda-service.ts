import { ENV } from "../_core/env";
import { FixtureResult } from "./api-football";

/**
 * Agenda Service - Manages fixture calendar with API-Football integration
 * 
 * Features:
 * - Fetch fixtures by date from API-Football
 * - Map API status to internal status
 * - Transform fixtures for frontend display
 * - Group fixtures by country/league
 */

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
 * Map API-Football status codes to internal status
 * Reference: https://www.api-football.com/documentation-v3#tag/Fixtures/operation/get-fixtures
 */
export function mapApiStatus(statusShort: string): FixtureStatus {
  const mapping: Record<string, FixtureStatus> = {
    // Scheduled
    "TBD": "scheduled",
    "NS": "scheduled",
    // Live
    "1H": "live",
    "2H": "live",
    "ET": "live",
    "P": "live",
    "BT": "live",
    "LIVE": "live",
    // Halftime
    "HT": "halftime",
    // Finished
    "FT": "finished",
    "AET": "finished",
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
 * Transform API-Football fixture response to internal AgendaFixture format
 */
export function transformFixture(fixture: FixtureResult): AgendaFixture {
  const dateObj = new Date(fixture.fixture.date);
  // Format date as YYYY-MM-DD
  const date = dateObj.toISOString().split("T")[0];
  // Format time as HH:MM in local timezone (Brazil)
  const time = dateObj.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  });

  return {
    apiFixtureId: fixture.fixture.id,
    date,
    time,
    timezone: "America/Sao_Paulo",
    country: fixture.league.country,
    countryCode: fixture.league.flag || null,
    league: fixture.league.name,
    leagueId: fixture.league.id,
    season: fixture.league.season || null,
    round: fixture.league.round || null,
    homeTeam: fixture.teams.home.name,
    homeTeamId: fixture.teams.home.id,
    awayTeam: fixture.teams.away.name,
    awayTeamId: fixture.teams.away.id,
    homeLogo: fixture.teams.home.logo || null,
    awayLogo: fixture.teams.away.logo || null,
    homeScore: fixture.goals.home,
    awayScore: fixture.goals.away,
    status: mapApiStatus(fixture.fixture.status.short),
    statusShort: fixture.fixture.status.short,
    elapsed: fixture.fixture.status.elapsed,
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
 * Fetch fixtures from API-Football for a specific date
 * Uses the existing apiRequest pattern from api-football.ts
 */
export async function fetchFixturesFromApi(date: string): Promise<AgendaFixture[]> {
  const url = new URL("/fixtures", ENV.apiFootballUrl);
  url.searchParams.set("date", date);
  url.searchParams.set("timezone", "America/Sao_Paulo");

  const response = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": ENV.apiFootballKey,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Football error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.response || !Array.isArray(data.response)) {
    return [];
  }

  return data.response.map((f: FixtureResult) => transformFixture(f));
}

/**
 * Fetch live fixtures from API-Football
 */
export async function fetchLiveFixturesFromApi(): Promise<AgendaFixture[]> {
  const url = new URL("/fixtures", ENV.apiFootballUrl);
  url.searchParams.set("live", "all");

  const response = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": ENV.apiFootballKey,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Football error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.response || !Array.isArray(data.response)) {
    return [];
  }

  return data.response.map((f: FixtureResult) => transformFixture(f));
}
