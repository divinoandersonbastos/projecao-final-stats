import { describe, it, expect } from "vitest";

describe("API-Football credentials", () => {
  it("should have API_FOOTBALL_KEY configured", () => {
    const key = process.env.API_FOOTBALL_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    expect(typeof key).toBe("string");
  });

  it("should have API_FOOTBALL_URL configured", () => {
    const url = process.env.API_FOOTBALL_URL;
    expect(url).toBeDefined();
    expect(url).toContain("api-sports.io");
  });

  it("should successfully connect to API-Football", async () => {
    const key = process.env.API_FOOTBALL_KEY;
    const url = process.env.API_FOOTBALL_URL || "https://v3.football.api-sports.io";

    const response = await fetch(`${url}/status`, {
      headers: {
        "x-apisports-key": key!,
      },
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.response).toBeDefined();
    expect(data.response.account).toBeDefined();
    console.log("API-Football account:", data.response.account);
    console.log("API-Football requests today:", data.response.requests);
  });
});
