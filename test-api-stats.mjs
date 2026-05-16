// Test API-Football endpoints for team statistics
import https from 'https';

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'v3.football.api-sports.io';

function apiRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path: endpoint,
      method: 'GET',
      headers: { 'x-apisports-key': API_KEY }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function main() {
  if (!API_KEY) {
    console.error('API_FOOTBALL_KEY not set');
    process.exit(1);
  }

  console.log('=== TEST 1: Team Statistics (Aston Villa id=66, PL 2024) ===');
  try {
    const stats = await apiRequest('/teams/statistics?team=66&season=2024&league=39');
    const r = stats.response;
    console.log('Team:', r.team?.name);
    console.log('Fixtures played:', JSON.stringify(r.fixtures?.played));
    console.log('Goals for avg:', JSON.stringify(r.goals?.for?.average));
    console.log('Goals against avg:', JSON.stringify(r.goals?.against?.average));
    console.log('Clean sheets:', JSON.stringify(r.clean_sheet));
    console.log('Failed to score:', JSON.stringify(r.failed_to_score));
    console.log('Full keys:', Object.keys(r));
  } catch(e) { console.error('Error:', e.message); }

  console.log('\n=== TEST 2: Fixture Statistics (last PL match) ===');
  try {
    const fixtures = await apiRequest('/fixtures?league=39&season=2024&last=1');
    const fid = fixtures.response[0]?.fixture?.id;
    console.log('Fixture:', fixtures.response[0]?.teams?.home?.name, 'vs', fixtures.response[0]?.teams?.away?.name);
    
    const fStats = await apiRequest(`/fixtures/statistics?fixture=${fid}`);
    for (const team of fStats.response) {
      console.log(`\n${team.team.name}:`);
      for (const stat of team.statistics) {
        console.log(`  ${stat.type}: ${stat.value}`);
      }
    }
  } catch(e) { console.error('Error:', e.message); }

  console.log('\n=== TEST 3: Last 10 fixtures with stats for Aston Villa ===');
  try {
    const last10 = await apiRequest('/fixtures?team=66&last=3');
    for (const f of last10.response) {
      const fid = f.fixture.id;
      console.log(`\n${f.teams.home.name} ${f.goals.home}-${f.goals.away} ${f.teams.away.name}`);
      const fStats = await apiRequest(`/fixtures/statistics?fixture=${fid}`);
      for (const team of fStats.response) {
        const shots = team.statistics.find(s => s.type === 'Total Shots')?.value;
        const shotsOn = team.statistics.find(s => s.type === 'Shots on Goal')?.value;
        const corners = team.statistics.find(s => s.type === 'Corner Kicks')?.value;
        const attacks = team.statistics.find(s => s.type === 'Dangerous Attacks')?.value;
        console.log(`  ${team.team.name}: shots=${shots}, shotsOn=${shotsOn}, corners=${corners}, dangerousAttacks=${attacks}`);
      }
    }
  } catch(e) { console.error('Error:', e.message); }

  console.log('\n=== TEST 4: API requests used ===');
  try {
    const status = await apiRequest('/status');
    console.log('Requests:', status.response?.requests?.current, '/', status.response?.requests?.limit_day);
  } catch(e) { console.error('Error:', e.message); }
}

main().catch(console.error);
