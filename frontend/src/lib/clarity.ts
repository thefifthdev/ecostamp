import { bufferCV } from '@stacks/transactions';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, '');
  if (clean.length === 0) return new Uint8Array();
  if (clean.length % 2 !== 0) throw new Error('Invalid hex length');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bufferCvFromHex(hex: string) {
  const bytes = hexToBytes(hex);
  // `bufferCV` accepts a byte array at runtime; TS types are stricter than runtime.
  return bufferCV(bytes as any);
}

