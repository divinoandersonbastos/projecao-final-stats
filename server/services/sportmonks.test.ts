import { describe, it, expect } from 'vitest';

describe('Sportmonks API Token Validation', () => {
  it('should successfully authenticate with the Sportmonks API', async () => {
    const token = process.env.SPORTMONKS_API_TOKEN;
    expect(token).toBeDefined();
    expect(token!.length).toBeGreaterThan(10);

    const response = await fetch('https://api.sportmonks.com/v3/core/types', {
      headers: {
        'Authorization': token!,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should be able to fetch team statistics from Sportmonks', async () => {
    const token = process.env.SPORTMONKS_API_TOKEN;
    
    // Fetch Palmeiras (team ID 3422 in Sportmonks) statistics for Serie A 2026 (season 26763)
    const response = await fetch(
      'https://api.sportmonks.com/v3/football/teams/3422?include=statistics.details&filters=teamStatisticSeasons:26763;teamStatisticDetailTypes:44,1677,34,52,88',
      {
        headers: {
          'Authorization': token!,
        },
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('id');
    expect(data.data.name).toBe('Palmeiras');
    // Verify statistics are included
    expect(data.data.statistics).toBeDefined();
    expect(data.data.statistics.length).toBeGreaterThan(0);
    // Verify we get dangerous attacks (type 44)
    const details = data.data.statistics[0].details;
    const dangerousAttacks = details.find((d: any) => d.type_id === 44);
    expect(dangerousAttacks).toBeDefined();
    expect(dangerousAttacks.value.average).toBeGreaterThan(0);
  });
});
