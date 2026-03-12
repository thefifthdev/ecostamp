export type ActivityKind = 'x402' | 'stamp' | 'reward';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
  timestamp: string; // ISO
  txId?: string;
  url?: string;
  amount?: string;
  network?: string;
}

const KEY = 'ecostamp.activity.v1';

function safeParse(json: string | null): ActivityItem[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function loadActivity(): ActivityItem[] {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(KEY));
}

export function saveActivity(items: ActivityItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, 200)));
}

export function addActivity(item: ActivityItem) {
  const items = loadActivity();
  items.unshift(item);
  saveActivity(items);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ecostamp:activity'));
  }
}

export function clearActivity() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}
