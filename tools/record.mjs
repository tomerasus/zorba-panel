// Runs in GitHub Actions every 10 minutes: reads Zorba's battery and solar from Shelly Cloud
// and appends one row to history.json (kept for 7 days). Key and server come from repo secrets.
// Row: [unix seconds, SoC %, battery A, solar A (4 chargers), Ah left, solar Ah today]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const KEY = process.env.SHELLY_KEY, SERVER = process.env.SHELLY_SERVER;
const FILE = process.argv[2] || 'history.json';
const DEVICE = 'a085e3c89f78';          // stern-light Shelly: BMV + MPPT scripts
const BANK_AH = 1120, CHARGE_V = 13.5;
const KEEP_S = 7 * 24 * 3600;
const STALE_S = 15 * 60;                 // boat silent longer than this: record nothing (gap in graph)

if (!KEY || !SERVER) { console.error('SHELLY_KEY / SHELLY_SERVER secrets missing'); process.exit(1); }

async function allStatus() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(SERVER + '/device/all_status', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ auth_key: KEY }),
    });
    const j = await r.json().catch(() => ({}));
    if (j.isok) return j.data.devices_status;
    await new Promise(res => setTimeout(res, 3000)); // shared rate limit with the phones
  }
  throw new Error('Shelly Cloud did not answer');
}

const st = await allStatus();
const d = st[DEVICE];
const now = Math.floor(Date.now() / 1000);
const hist = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : { v: 1, rows: [] };

const updated = d?._updated ? Math.floor(new Date(d._updated.replace(' ', 'T') + 'Z').getTime() / 1000) : 0;
if (!d || now - updated > STALE_S) {
  console.log('Boat silent since', d?._updated, '- no row recorded');
} else {
  const num = k => d[k]?.value ?? null;
  // first 4 segments are the solar chargers; a segment starting with "A" is the alternator
  const solar = (d['text:210']?.value || '').split(';').filter(p => p && !p.startsWith('A')).slice(0, 4).map(p => p.split(','));
  const solA = solar.reduce((a, f) => a + (Number(f[1]) || 0), 0);
  const solKWh = solar.reduce((a, f) => a + (Number(f[2]) || 0), 0);
  const cons = num('number:204');
  const r1 = v => v == null ? null : Math.round(v * 10) / 10;
  const row = [now, r1(num('number:200')), r1(num('number:202')), r1(solA),
               cons == null ? null : Math.round(BANK_AH - Math.abs(cons)), Math.round(solKWh * 1000 / CHARGE_V)];
  hist.rows.push(row);
  console.log('recorded', JSON.stringify(row));
}
hist.rows = hist.rows.filter(r => r[0] > now - KEEP_S);
hist.updated = now;
writeFileSync(FILE, JSON.stringify(hist));
console.log('rows kept:', hist.rows.length);
