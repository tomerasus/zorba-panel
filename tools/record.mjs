// Runs in GitHub Actions every 10 minutes: reads Zorba's battery and solar from Shelly Cloud
// and appends one row to history.json (kept for 7 days). Key and server come from repo secrets.
// Row: [unix seconds, SoC %, battery A, solar A (4 chargers), Ah left, solar Ah today, alternator out A, fuel sender V]
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
  // alternator segment: "A15,state,error,inV,outV,outA,inA,rssi,heard" -> output A
  const altSeg = (d['text:210']?.value || '').split(';').find(p => p.startsWith('A'));
  const altOut = altSeg ? Number(altSeg.split(',')[5]) : NaN;
  // fuel sender (2026-11-27): Add-on on the fuel Shelly, 10k/10k divider -> sender volts = raw x 2 (not calibrated yet)
  const fr = st['e8f60a7a7d34']?.['voltmeter:100']?.voltage;
  const fuelV = typeof fr === 'number' ? Math.round(fr * 2 * 100) / 100 : null;
  const row = [now, r1(num('number:200')), r1(num('number:202')), r1(solA),
               cons == null ? null : Math.round(BANK_AH - Math.abs(cons)), Math.round(solKWh * 1000 / CHARGE_V),
               Number.isFinite(altOut) ? r1(altOut) : null, fuelV];
  hist.rows.push(row);
  console.log('recorded', JSON.stringify(row));
}
hist.rows = hist.rows.filter(r => r[0] > now - KEEP_S);
hist.updated = now;
writeFileSync(FILE, JSON.stringify(hist));
console.log('rows kept:', hist.rows.length);

// ---- latest.json: one full snapshot of what ZORBA sees, written next to history.json on every run ----
// Readings only (the repo is public): no IPs, MACs, Wi-Fi names or keys. Decoded the same way as index.html shape().
const NAMES = {tankSel:'acebe6f5d2a0',tankFwd:'ccba97c9ae94',running:'ccba97c998d4',steam:'a085e3c81ef4',anchor:'a085e3c9af64',
  deckBow:'ccba97c9dca8',deckStern:'a085e3c89f78',fridge:'a085e3c82c4c',heater:'ccba97c7cd88',bilge:'a085e3c7fe24',fan:'a085e3c95784',
  blower:'acebe6f5ac5c',fuelSh:'e8f60a7a7d34',refUp:'XB211299190193830',refDown:'XB211299198443307',frzUp:'XB211299190201445',
  frzDown:'XB211299191545574',inverter:'XB211299192089294',mainCabin:'XB277409424835537',master:'XB9592269595983',
  flood:'d885acea5d1c',engine:'XB211299198447892'};
const nameOf = Object.fromEntries(Object.entries(NAMES).map(([k, v]) => [v, k]));
const MPPT_STATE = {0:'off',2:'fault',3:'bulk',4:'absorption',5:'float',6:'storage',7:'equalize',245:'starting',247:'recondition',252:'external control'};
const utcS = s => s ? Math.floor(new Date(s.replace(' ', 'T') + 'Z').getTime() / 1000) : null;
const nn = x => x === '' || x == null ? null : Number(x);
const num = k => d?.[k]?.value ?? null, cons = num('number:204');
const fr = st['e8f60a7a7d34']?.['voltmeter:100']?.voltage;
const fuelV = typeof fr === 'number' ? Math.round(fr * 2 * 100) / 100 : null;
const snap = {v: 1, written: now, boatUpdated: updated || null, boatSilent: !d || now - updated > STALE_S,
  battery: null, solar: [], alternator: null, water: null, fuelSenderV: fuelV, bilge: null, relays: {}, climate: {}, flood: null, offline: []};
if (d && d['number:200']) {
  snap.battery = {soc: num('number:200'), voltage: num('number:201'), current: num('number:202'), power: num('number:203'),
    consumedAh: num('number:204'), ahLeft: cons == null ? null : Math.round(BANK_AH - Math.abs(cons)), timeToGo: d['text:205']?.value ?? null};
}
const segs = (d?.['text:210']?.value || '').split(';');
snap.solar = segs.filter(p => p && p[0] !== 'A').slice(0, 4).map((p, i) => {
  const f = p.split(','); if (f.length < 6) return {charger: i + 1, noData: true};
  const h = f[3] ? f[3].split('|').map(nn) : [];
  return {charger: i + 1, pvW: nn(f[0]), batteryA: nn(f[1]), todayKWh: nn(f[2]), yesterdayKWh: h[0] ?? null, history: h,
    state: MPPT_STATE[nn(f[4])] ?? nn(f[4]), error: nn(f[5])};
});
const altSeg = segs.find(p => p.startsWith('A'));
if (altSeg) { const f = altSeg.slice(1).split(',');
  snap.alternator = {state: nn(f[1]), error: nn(f[2]), inV: nn(f[3]), outV: nn(f[4]), outA: nn(f[5]), inA: nn(f[6])}; }
for (const [id, s] of Object.entries(st)) {
  const k = nameOf[id] || id;
  if ((s.cloud?.connected ?? s._dev_info?.online) === false) snap.offline.push(k);
  if (s['switch:0']) snap.relays[k] = !!s['switch:0'].output;
  if (s['temperature:0']) snap.climate[k] = {tC: s['temperature:0'].tC ?? null, rh: s['humidity:0']?.rh ?? null, at: utcS(s._updated)};
  if (s['flood:0']) snap.flood = !!s['flood:0'].alarm;
  if (id === NAMES.bilge) snap.bilge = typeof s['input:0']?.state === 'boolean' ? (s['input:0'].state ? 'wet' : 'dry') : 'unknown';
  if (id === NAMES.tankFwd && s['voltmeter:100']?.voltage != null)
    snap.water = {connectedTank: st[NAMES.tankSel]?.['switch:0']?.output ? 'back' : 'fwd', senderV: Math.round(s['voltmeter:100'].voltage * 3 * 100) / 100};
}
const LATEST = FILE.replace(/[^/]*$/, 'latest.json');
writeFileSync(LATEST, JSON.stringify(snap, null, 1));
console.log('snapshot written:', LATEST);
