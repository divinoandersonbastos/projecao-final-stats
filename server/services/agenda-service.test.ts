import { describe, it, expect } from "vitest";
import {
  mapApiStatus,
  getStatusLabel,
  groupFixturesByLeague,
  filterByStatus,
  filterBySearch,
  AgendaFixture,
} from "./agenda-service";

// Helper to create a mock fixture
function mockFixture(overrides: Partial<AgendaFixture> = {}): AgendaFixture {
  return {
    apiFixtureId: 1001,
    date: "2025-06-15",
    time: "16:00",
    timezone: "America/Sao_Paulo",
    country: "Brazil",
    countryCode: null,
    league: "Serie A",
    leagueId: 71,
    season: 2025,
    round: "Regular Season - 10",
    homeTeam: "Flamengo",
    homeTeamId: 127,
    awayTeam: "Palmeiras",
    awayTeamId: 121,
    homeLogo: null,
    awayLogo: null,
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    statusShort: "NS",
    elapsed: null,
    ...overrides,
  };
}

describe("mapApiStatus", () => {
  it("maps NS to scheduled", () => {
    expect(mapApiStatus("NS")).toBe("scheduled");
  });

  it("maps TBD to scheduled", () => {
    expect(mapApiStatus("TBD")).toBe("scheduled");
  });

  it("maps 1H to live", () => {
    expect(mapApiStatus("1H")).toBe("live");
  });

  it("maps 2H to live", () => {
    expect(mapApiStatus("2H")).toBe("live");
  });

  it("maps HT to halftime", () => {
    expect(mapApiStatus("HT")).toBe("halftime");
  });

  it("maps FT to finished", () => {
    expect(mapApiStatus("FT")).toBe("finished");
  });

  it("maps AET to finished", () => {
    expect(mapApiStatus("AET")).toBe("finished");
  });

  it("maps PEN to finished", () => {
    expect(mapApiStatus("PEN")).toBe("finished");
  });

  it("maps PST to postponed", () => {
    expect(mapApiStatus("PST")).toBe("postponed");
  });

  it("maps SUSP to postponed", () => {
    expect(mapApiStatus("SUSP")).toBe("postponed");
  });

  it("maps CANC to cancelled", () => {
    expect(mapApiStatus("CANC")).toBe("cancelled");
  });

  it("maps ABD to cancelled", () => {
    expect(mapApiStatus("ABD")).toBe("cancelled");
  });

  it("maps unknown codes to unknown", () => {
    expect(mapApiStatus("XYZ")).toBe("unknown");
    expect(mapApiStatus("")).toBe("unknown");
  });
});

describe("getStatusLabel", () => {
  it("returns Portuguese labels for each status", () => {
    expect(getStatusLabel("scheduled")).toBe("Agendado");
    expect(getStatusLabel("live")).toBe("Ao Vivo");
    expect(getStatusLabel("halftime")).toBe("Intervalo");
    expect(getStatusLabel("finished")).toBe("Finalizado");
    expect(getStatusLabel("postponed")).toBe("Adiado");
    expect(getStatusLabel("cancelled")).toBe("Cancelado");
    expect(getStatusLabel("unknown")).toBe("Indefinido");
  });
});

describe("groupFixturesByLeague", () => {
  it("groups fixtures by country and league", () => {
    const fixtures: AgendaFixture[] = [
      mockFixture({ country: "Brazil", league: "Serie A", leagueId: 71 }),
      mockFixture({ country: "Brazil", league: "Serie A", leagueId: 71, homeTeam: "Corinthians", apiFixtureId: 1002 }),
      mockFixture({ country: "England", league: "Premier League", leagueId: 39, homeTeam: "Arsenal", apiFixtureId: 1003 }),
      mockFixture({ country: "Brazil", league: "Copa do Brasil", leagueId: 73, homeTeam: "Santos", apiFixtureId: 1004 }),
    ];

    const groups = groupFixturesByLeague(fixtures);

    expect(groups).toHaveLength(3);
    // Sorted by country then league
    expect(groups[0].country).toBe("Brazil");
    expect(groups[0].league).toBe("Copa do Brasil");
    expect(groups[0].fixtures).toHaveLength(1);
    expect(groups[1].country).toBe("Brazil");
    expect(groups[1].league).toBe("Serie A");
    expect(groups[1].fixtures).toHaveLength(2);
    expect(groups[2].country).toBe("England");
    expect(groups[2].league).toBe("Premier League");
    expect(groups[2].fixtures).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    expect(groupFixturesByLeague([])).toEqual([]);
  });

  it("sorts fixtures within groups by time", () => {
    const fixtures: AgendaFixture[] = [
      mockFixture({ time: "21:00", apiFixtureId: 1 }),
      mockFixture({ time: "16:00", apiFixtureId: 2 }),
      mockFixture({ time: "19:00", apiFixtureId: 3 }),
    ];

    const groups = groupFixturesByLeague(fixtures);
    expect(groups[0].fixtures[0].time).toBe("16:00");
    expect(groups[0].fixtures[1].time).toBe("19:00");
    expect(groups[0].fixtures[2].time).toBe("21:00");
  });
});

describe("filterByStatus", () => {
  const fixtures: AgendaFixture[] = [
    mockFixture({ status: "scheduled", apiFixtureId: 1 }),
    mockFixture({ status: "live", apiFixtureId: 2 }),
    mockFixture({ status: "finished", apiFixtureId: 3 }),
    mockFixture({ status: "live", apiFixtureId: 4 }),
  ];

  it("returns all fixtures when filter is 'all'", () => {
    expect(filterByStatus(fixtures, "all")).toHaveLength(4);
  });

  it("filters by scheduled", () => {
    expect(filterByStatus(fixtures, "scheduled")).toHaveLength(1);
  });

  it("filters by live", () => {
    expect(filterByStatus(fixtures, "live")).toHaveLength(2);
  });

  it("filters by finished", () => {
    expect(filterByStatus(fixtures, "finished")).toHaveLength(1);
  });

  it("returns empty for status with no matches", () => {
    expect(filterByStatus(fixtures, "cancelled")).toHaveLength(0);
  });
});

describe("filterBySearch", () => {
  const fixtures: AgendaFixture[] = [
    mockFixture({ homeTeam: "Flamengo", awayTeam: "Palmeiras", league: "Serie A", country: "Brazil", apiFixtureId: 1 }),
    mockFixture({ homeTeam: "Arsenal", awayTeam: "Chelsea", league: "Premier League", country: "England", apiFixtureId: 2 }),
    mockFixture({ homeTeam: "São Paulo", awayTeam: "Corinthians", league: "Serie A", country: "Brazil", apiFixtureId: 3 }),
  ];

  it("returns all when query is empty", () => {
    expect(filterBySearch(fixtures, "")).toHaveLength(3);
    expect(filterBySearch(fixtures, "  ")).toHaveLength(3);
  });

  it("filters by team name", () => {
    expect(filterBySearch(fixtures, "Flamengo")).toHaveLength(1);
    expect(filterBySearch(fixtures, "arsenal")).toHaveLength(1);
  });

  it("filters by league", () => {
    expect(filterBySearch(fixtures, "Premier")).toHaveLength(1);
    expect(filterBySearch(fixtures, "Serie A")).toHaveLength(2);
  });

  it("filters by country", () => {
    expect(filterBySearch(fixtures, "Brazil")).toHaveLength(2);
    expect(filterBySearch(fixtures, "England")).toHaveLength(1);
  });

  it("handles accented characters", () => {
    expect(filterBySearch(fixtures, "Sao Paulo")).toHaveLength(1);
    expect(filterBySearch(fixtures, "São Paulo")).toHaveLength(1);
  });

  it("is case insensitive", () => {
    expect(filterBySearch(fixtures, "FLAMENGO")).toHaveLength(1);
    expect(filterBySearch(fixtures, "chelsea")).toHaveLength(1);
  });
});
