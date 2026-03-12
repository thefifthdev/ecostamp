'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconGlobe, IconSearch, IconFile, IconVerified, IconArrowRight } from './Icons';
import { CONTRACTS, fetchEcoPoints, fetchStampCount, fetchTier, tierName } from '@/lib/stacks';
import { fetchEarnStampTxs } from '@/lib/hiro';
import { stacksChain } from '@/lib/explorer';

type EmployeeRow = {
  wallet: string;
  stamps: number;
  points: number;
  tier: number;
};

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function isStacksAddress(s: string): boolean {
  return s.startsWith('ST') || s.startsWith('SP');
}

function toCsv(rows: Record<string, string | number | null | undefined>[]): string {
  const headers = unique(rows.flatMap(r => Object.keys(r)));
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    if (/[\",\\n]/.test(s)) return `\"${s.replace(/\"/g, '\"\"')}\"`;
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map(h => esc((r as any)[h])).join(','));
  }
  return lines.join('\n') + '\n';
}

function download(filename: string, content: string, mime = 'text/csv') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CorporateDashboard({ walletAddress }: { walletAddress: string | null }) {
  const [orgName, setOrgName] = useState('EcoCorp');
  const [employeesText, setEmployeesText] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [txRows, setTxRows] = useState<any[]>([]);
  const [error, setError] = useState('');

  const employeeWallets = useMemo(() => {
    const raw = employeesText
      .split(/\\r?\\n|,|;/g)
      .map(s => s.trim())
      .filter(Boolean);
    return unique(raw).filter(isStacksAddress);
  }, [employeesText]);

  const reportUrl = useMemo(() => {
    const base = 'https://explorer.hiro.so';
    const chain = stacksChain();
    const contract = CONTRACTS.stampRegistry;
    if (contract) return `${base}/address/${contract}?chain=${chain}`;
    return `${base}/?chain=${chain}`;
  }, []);

  const qrUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(reportUrl)}`;
  }, [reportUrl]);

  const totals = useMemo(() => {
    const totalStamps = rows.reduce((a, r) => a + r.stamps, 0);
    const totalPoints = rows.reduce((a, r) => a + r.points, 0);
    const estimatedCo2Kg = totalPoints * 5; // demo heuristic: 1 point ~ 5kg CO2e avoided
    return { totalStamps, totalPoints, estimatedCo2Kg };
  }, [rows]);

  const refresh = async () => {
    setError('');
    if (employeeWallets.length === 0) {
      setRows([]);
      setTxRows([]);
      return;
    }

    setLoading(true);
    try {
      const employees: EmployeeRow[] = [];
      const txs: any[] = [];

      for (const w of employeeWallets) {
        const [stamps, points, tier] = await Promise.all([
          fetchStampCount(w).catch(() => 0),
          fetchEcoPoints(w).catch(() => 0),
          fetchTier(w).catch(() => 0),
        ]);
        employees.push({ wallet: w, stamps, points, tier });

        const earned = await fetchEarnStampTxs(w, 50).catch(() => []);
        for (const e of earned) {
          const mintedAt = new Date(e.mintedAt);
          if (fromDate) {
            const from = new Date(fromDate);
            if (mintedAt < from) continue;
          }
          if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            if (mintedAt > to) continue;
          }
          txs.push({
            employeeWallet: w,
            txId: e.txId,
            providerId: e.providerId,
            ecoPoints: e.ecoPoints,
            bookingHash: e.bookingHash,
            mintedAt: mintedAt.toISOString(),
          });
        }
      }

      setRows(employees.sort((a, b) => b.points - a.points));
      setTxRows(txs.sort((a, b) => String(b.mintedAt).localeCompare(String(a.mintedAt))));
      setLoading(false);
    } catch (e: any) {
      setLoading(false);
      setError(e?.message ?? 'Failed to build report');
    }
  };

  useEffect(() => {
    // auto-refresh when filters change
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeWallets.join('|'), fromDate, toDate]);

  const exportCsv = () => {
    const csv = toCsv(txRows.map(r => ({
      org: orgName,
      employeeWallet: r.employeeWallet,
      mintedAt: r.mintedAt,
      providerId: r.providerId,
      ecoPoints: r.ecoPoints,
      bookingHash: r.bookingHash,
      stacksTxId: r.txId,
    })));
    download(`${orgName}-ecostamp-report.csv`, csv);
  };

  const printPdf = () => {
    const title = `${orgName} EcoStamp ESG Report`;
    const now = new Date().toISOString();
    const rowsHtml = txRows.slice(0, 200).map(r => (
      `<tr>
        <td>${r.employeeWallet}</td>
        <td>${new Date(r.mintedAt).toLocaleDateString()}</td>
        <td>${r.providerId}</td>
        <td>${r.ecoPoints}</td>
        <td style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">${r.txId}</td>
      </tr>`
    )).join('');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 32px; color: #0b1410; }
    h1 { margin: 0 0 8px 0; font-size: 22px; }
    .meta { color: #2a3a31; font-size: 12px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 180px; gap: 16px; align-items: start; }
    .card { border: 1px solid #d7e1db; border-radius: 12px; padding: 12px; }
    .kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 12px 0 16px; }
    .kpi div { border: 1px solid #d7e1db; border-radius: 12px; padding: 10px; }
    .kpi .n { font-size: 18px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border-bottom: 1px solid #e6eee9; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f4faf6; }
    .small { font-size: 11px; color: #2a3a31; }
    @media print { a { color: inherit; text-decoration: none; } }
  </style>
</head>
<body>
  <div class="grid">
    <div>
      <h1>${title}</h1>
      <div class="meta">Generated: ${now} · Wallets: ${employeeWallets.length} · Date filter: ${fromDate || '—'} to ${toDate || '—'}</div>

      <div class="kpi">
        <div><div class="small">Total stamps</div><div class="n">${totals.totalStamps}</div></div>
        <div><div class="small">Eco points</div><div class="n">${totals.totalPoints}</div></div>
        <div><div class="small">CO2e avoided (est.)</div><div class="n">${totals.estimatedCo2Kg} kg</div></div>
      </div>

      <div class="card">
        <div class="small"><strong>Verification</strong></div>
        <div class="small">Each row includes a Stacks transaction ID that can be verified independently on-chain.</div>
        <div class="small">On-chain summary link: <a href="${reportUrl}">${reportUrl}</a></div>
      </div>
    </div>
    <div class="card">
      <div class="small"><strong>Verification QR</strong></div>
      <img src="${qrUrl}" alt="Verification QR" style="width: 180px; height: 180px; margin-top: 10px;" />
    </div>
  </div>

  <h2 style="margin: 18px 0 8px; font-size: 14px;">Transactions (latest ${Math.min(txRows.length, 200)})</h2>
  <table>
    <thead>
      <tr>
        <th>Employee wallet</th>
        <th>Date</th>
        <th>Provider</th>
        <th>Points</th>
        <th>Stacks txid</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;

    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <section className="min-h-[calc(100vh-64px)] px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-4xl text-cream-100">Corporate Dashboard</h2>
            <p className="text-sage-400 mt-2">
              Build a verified ESG export from employee EcoStamp activity.
            </p>
          </div>
          <div className="glass-light rounded-xl px-3 py-2 text-xs text-sage-500 font-mono hidden sm:block">
            {walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : 'not connected'}
          </div>
        </div>

        <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs text-sage-500 uppercase tracking-widest mb-2">Organization</label>
              <input className="eco-input" value={orgName} onChange={e => setOrgName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-sage-500 uppercase tracking-widest mb-2">From</label>
                <input type="date" className="eco-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-sage-500 uppercase tracking-widest mb-2">To</label>
                <input type="date" className="eco-input" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-sage-500 uppercase tracking-widest mb-2">Employee wallets (ST… / SP…)</label>
            <textarea
              className="eco-input min-h-[120px] font-mono text-xs"
              value={employeesText}
              onChange={e => setEmployeesText(e.target.value)}
              placeholder={'ST1...\\nST2...\\nSP3...'}
            />
            <div className="text-xs text-sage-600 mt-2">
              Add one wallet per line. This demo aggregates from Stacks explorer data and contract reads.
            </div>
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <div className="flex gap-3 flex-wrap items-center">
            <button
              onClick={refresh}
              disabled={loading}
              className="btn-primary px-5 py-3 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <IconSearch size={14} /> {loading ? 'Building…' : 'Build Report'}
            </button>
            <button
              onClick={exportCsv}
              disabled={txRows.length === 0}
              className="btn-ghost px-5 py-3 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <IconFile size={14} /> Export CSV
            </button>
            <button
              onClick={printPdf}
              disabled={txRows.length === 0}
              className="btn-ghost px-5 py-3 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <IconVerified size={14} /> Print PDF
            </button>
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-glow-400 hover:text-glow-300 transition-colors flex items-center gap-1"
              title="On-chain summary"
            >
              On-chain summary <IconArrowRight size={12} />
            </a>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Employees', value: rows.length, Icon: IconGlobe },
            { label: 'Total Stamps', value: totals.totalStamps, Icon: IconVerified },
            { label: 'Eco Points', value: totals.totalPoints, Icon: IconVerified },
          ].map(kpi => (
            <div key={kpi.label} className="glass rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl glass-light flex items-center justify-center">
                <kpi.Icon size={18} className="text-glow-400" />
              </div>
              <div>
                <div className="text-xs text-sage-500">{kpi.label}</div>
                <div className="font-display text-2xl text-cream-100">{kpi.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-sage-500">Employees</div>
              <div className="font-display text-xl text-cream-100 mt-1">Impact leaderboard</div>
            </div>
            <div className="text-xs text-sage-600">sorted by points</div>
          </div>

          {rows.length === 0 ? (
            <div className="text-sm text-sage-500">No employee wallets added yet.</div>
          ) : (
            <div className="space-y-3">
              {rows.map(r => (
                <div key={r.wallet} className="glass-light rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-cream-200 font-mono">{r.wallet.slice(0, 8)}…{r.wallet.slice(-6)}</div>
                    <div className="text-xs text-sage-600 mt-1">
                      {r.stamps} stamps · {tierName(r.tier)} tier
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-sage-500">Eco points</div>
                    <div className="font-display text-xl text-glow-300">{r.points}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

