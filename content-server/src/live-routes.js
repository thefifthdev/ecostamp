/**
 * Live routes backend (rail) via transport.rest (HAFAS-based).
 *
 * This is intentionally best-effort:
 * - If the live API is unreachable or can't resolve the locations, callers
 *   should fall back to the demo dataset.
 *
 * Env:
 * - ROUTE_DATA_MODE=live
 * - RAIL_API_BASE_URL=https://v6.db.transport.rest (default)
 */

const DEFAULT_BASE_URL = 'https://v6.db.transport.rest';

function withTimeout(ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(t) };
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

function formatDuration(mins) {
  const m = Math.max(0, Math.floor(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r}m`;
  if (!r) return `${h}h`;
  return `${h}h${String(r).padStart(2, '0')}`;
}

function parseDurationMinutes(d) {
  if (typeof d === 'number' && Number.isFinite(d)) return d;
  if (typeof d !== 'string') return null;
  // ISO-8601 (e.g., PT2H15M)
  const m = d.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (m) {
    const h = Number(m[1] || 0);
    const mm = Number(m[2] || 0);
    const s = Number(m[3] || 0);
    return h * 60 + mm + Math.round(s / 60);
  }
  return null;
}

async function jsonFetch(url, { headers } = {}) {
  const { signal, cancel } = withTimeout(8000);
  try {
    const res = await fetch(url, { headers, signal });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } finally {
    cancel();
  }
}

async function resolveLocationIdAndCoords(baseUrl, query) {
  const u = new URL('/locations', baseUrl);
  u.searchParams.set('query', query);
  u.searchParams.set('results', '1');
  u.searchParams.set('addresses', 'false');
  u.searchParams.set('poi', 'false');
  u.searchParams.set('stops', 'true');

  const { ok, data } = await jsonFetch(u.toString());
  if (!ok || !Array.isArray(data) || !data.length) return null;

  const loc = data[0];
  if (!loc?.id || typeof loc?.location?.latitude !== 'number' || typeof loc?.location?.longitude !== 'number') {
    return null;
  }
  return {
    id: loc.id,
    name: loc.name || query,
    latitude: loc.location.latitude,
    longitude: loc.location.longitude,
  };
}

async function fetchJourneys(baseUrl, fromId, toId, date) {
  const u = new URL('/journeys', baseUrl);
  u.searchParams.set('from', fromId);
  u.searchParams.set('to', toId);
  u.searchParams.set('results', '3');
  u.searchParams.set('stopovers', 'false');
  u.searchParams.set('polylines', 'false');
  u.searchParams.set('language', 'en');
  if (date) u.searchParams.set('departure', date);

  const { ok, data } = await jsonFetch(u.toString());
  if (!ok || !data?.journeys?.length) return [];
  return data.journeys;
}

function operatorFromJourney(journey) {
  const legs = Array.isArray(journey?.legs) ? journey.legs : [];
  const names = [];
  for (const leg of legs) {
    const line = leg?.line;
    const n = line?.name || line?.productName || leg?.operator?.name || null;
    if (n && !names.includes(n)) names.push(n);
  }
  return names.length ? names.join(' + ') : 'Rail';
}

export async function getLiveRouteOptions({
  from,
  to,
  date,
  railApiBaseUrl = DEFAULT_BASE_URL,
}) {
  const baseUrl = String(railApiBaseUrl || DEFAULT_BASE_URL);

  const [fromLoc, toLoc] = await Promise.all([
    resolveLocationIdAndCoords(baseUrl, from),
    resolveLocationIdAndCoords(baseUrl, to),
  ]);
  if (!fromLoc || !toLoc) {
    throw new Error('Could not resolve locations via rail API');
  }

  const journeys = await fetchJourneys(baseUrl, fromLoc.id, toLoc.id, date);
  if (!journeys.length) {
    throw new Error('No rail journeys returned by live API');
  }

  const distKm = haversineKm(fromLoc, toLoc);

  // ADEME-inspired defaults (gCO2 per passenger-km). Used to estimate kgCO2.
  const FACTORS_G_PER_PKM = {
    train: 6,
    bus: 27,
    flight: 255,
  };

  const trainOptions = journeys.slice(0, 3).map((j, i) => {
    const durationMin = parseDurationMinutes(j.duration) ?? 0;
    const operator = operatorFromJourney(j);
    const co2Kg = Number(((distKm * FACTORS_G_PER_PKM.train) / 1000).toFixed(1));
    return {
      rank: i + 1,
      mode: 'train',
      operator,
      duration: formatDuration(durationMin),
      co2: co2Kg,
      cost: '—',
      ecoScore: 92 - i * 2,
      note: `Live rail timetable data via transport.rest (${new URL(baseUrl).host}). CO₂ is estimated from distance.`,
      stampProvider: 'EcoRail Europe',
    };
  });

  // Add a synthetic bus + flight comparison using the same distance estimate.
  const busCo2Kg = Number(((distKm * FACTORS_G_PER_PKM.bus) / 1000).toFixed(1));
  const flightCo2Kg = Number(((distKm * FACTORS_G_PER_PKM.flight) / 1000).toFixed(1));

  const comparisons = [
    {
      rank: trainOptions.length + 1,
      mode: 'bus',
      operator: 'Coach',
      duration: '—',
      co2: busCo2Kg,
      cost: '—',
      ecoScore: 72,
      note: 'Comparison estimate using ADEME-style emission factors.',
      stampProvider: null,
    },
    {
      rank: trainOptions.length + 2,
      mode: 'flight',
      operator: 'Flight',
      duration: '—',
      co2: flightCo2Kg,
      cost: '—',
      ecoScore: 12,
      note: 'Comparison estimate using ADEME-style emission factors (non-RFI).',
      stampProvider: null,
    },
  ];

  const routes = [...trainOptions, ...comparisons];
  const bestTrain = trainOptions[0]?.co2 ?? null;
  const carbonSaved = bestTrain !== null
    ? `${Math.max(0, (flightCo2Kg - bestTrain)).toFixed(1)}kg CO₂ vs flying (est.)`
    : `—`;

  return {
    query: { from, to, date: date || null },
    routes,
    carbonSaved,
    dataSource: `ADEME transport emission factors (est.) + live rail API (${new URL(baseUrl).host})`,
    paidAt: new Date().toISOString(),
  };
}

