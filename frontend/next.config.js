const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of raw.split(/\r?\n/g)) {
      let line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      if (line.startsWith('export ')) line = line.slice('export '.length).trim();

      const idx = line.indexOf('=');
      if (idx < 1) continue;
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();

      // Strip surrounding quotes: KEY="value" or KEY='value'
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }

      // Do not override existing environment variables (fail-safe).
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // Best-effort env loading; Next.js will still work with defaults.
  }
}

// Next.js auto-loads .env/.env.local in this folder, but deploy scripts write
// contract IDs to custom files. Load them early so NEXT_PUBLIC_* gets inlined.
[
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '.env'),
  path.join(__dirname, '.env.local'),
  path.join(__dirname, '.env.contracts'),
  path.join(__dirname, '.env.contracts.phase3'),
].forEach(loadEnvFile);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.testnet.hiro.so', 'api.hiro.so'],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'EcoStamp',
  },
};

module.exports = nextConfig;
