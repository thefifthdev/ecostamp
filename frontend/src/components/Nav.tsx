'use client';

import { useState } from 'react';
import { IconLeaf, IconMenu, IconX, IconWallet } from './Icons';

type Section =
  | 'home'
  | 'stamps'
  | 'submit'
  | 'guides'
  | 'impact'
  | 'activity'
  | 'providers'
  | 'apply'
  | 'corporate'
  | 'admin';

interface NavProps {
  activeSection:     Section;
  setActiveSection:  (s: Section) => void;
  walletAddress:     string | null;
  setWalletAddress:  (a: string | null) => void;
  evmAddress:        string | null;
  setEvmAddress:     (a: string | null) => void;
}

const ALL_NAV_ITEMS: { id: Section; label: string; adminOnly?: boolean }[] = [
  { id: 'home',      label: 'Home'      },
  { id: 'stamps',    label: 'My Stamps' },
  { id: 'submit',    label: 'Earn Stamp'},
  { id: 'guides',    label: 'Guides'    },
  { id: 'impact',    label: 'Impact'    },
  { id: 'activity',  label: 'Activity'  },
  { id: 'providers', label: 'Providers' },
  { id: 'apply',     label: 'Apply'     },
  { id: 'corporate', label: 'Corporate' },
  { id: 'admin',     label: 'Admin ⚙',  adminOnly: true },
];

const DEMO_MODE      = process.env.NEXT_PUBLIC_DEMO_MODE    === 'true';
const ADMIN_ADDRESS  = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS  || '').trim();
const STACKS_NETWORK = (process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet').trim();

export default function Nav({
  activeSection, setActiveSection,
  walletAddress, setWalletAddress,
  evmAddress,    setEvmAddress,
}: NavProps) {
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [evmConnecting, setEvmConnecting] = useState(false);

  // Admin check: wallet must match NEXT_PUBLIC_ADMIN_ADDRESS exactly.
  // If NEXT_PUBLIC_ADMIN_ADDRESS is blank, admin tab is never shown (fail-closed).
  const isAdmin = ADMIN_ADDRESS !== '' && walletAddress === ADMIN_ADDRESS;

  const visibleNavItems = ALL_NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  // ── Stacks wallet (Leather / Xverse) ──────────────────────────────────────
  const connectWallet = async () => {
    try {
      const { showConnect } = await import('@stacks/connect');
      showConnect({
        appDetails: { name: 'EcoStamp', icon: '/icon.png' },
        onFinish: (data: any) => {
          // Resolve address from the network set in .env
          const stxAddr = data.userSession?.loadUserData()?.profile?.stxAddress;
          const addr = STACKS_NETWORK === 'mainnet'
            ? stxAddr?.mainnet
            : stxAddr?.testnet;
          if (addr) setWalletAddress(addr);
        },
        onCancel: () => {},
      });
    } catch {
      // Dev fallback when @stacks/connect is not available
      const fallback = STACKS_NETWORK === 'mainnet'
        ? 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'
        : 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
      setWalletAddress(fallback);
    }
  };

  const disconnect = () => {
    setWalletAddress(null);
    setEvmAddress(null);
    // If admin panel was active and we disconnect, redirect home
    if (activeSection === 'admin') setActiveSection('home');
  };

  // ── EVM wallet (MetaMask / Coinbase Wallet) ────────────────────────────────
  // Only used in production mode for real USDC signing via viem.
  // Hidden when DEMO_MODE=true — randomHex signatures are used instead.
  const connectEvmWallet = async () => {
    if (DEMO_MODE) return;
    setEvmConnecting(true);
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        alert('No EVM wallet found. Install MetaMask or Coinbase Wallet.');
        return;
      }
      const { createWalletClient, custom } = await import('viem');
      const x402Network = process.env.NEXT_PUBLIC_X402_NETWORK || 'base-sepolia';
      const chain = x402Network === 'base'
        ? await import('viem/chains').then(m => m.base)
        : await import('viem/chains').then(m => m.baseSepolia);
      const client = createWalletClient({ chain, transport: custom(window.ethereum) });
      const [address] = await client.requestAddresses();
      if (address) setEvmAddress(address);
    } catch (e: any) {
      console.error('EVM connect failed:', e.message);
    } finally {
      setEvmConnecting(false);
    }
  };

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  const NavButton = ({ item }: { item: typeof ALL_NAV_ITEMS[0] }) => (
    <button
      key={item.id}
      onClick={() => setActiveSection(item.id)}
      className={`
        px-2.5 lg:px-4 py-2 rounded-xl text-[13px] lg:text-sm font-medium transition-all duration-200
        whitespace-nowrap shrink-0
        ${activeSection === item.id
          ? 'bg-moss-500/30 text-glow-300 border border-glow-300/20'
          : item.adminOnly
            ? 'text-amber-400/70 hover:text-amber-300 hover:bg-amber-400/10'
            : 'text-sage-300 hover:text-cream-200 hover:bg-forest-700/40'
        }
      `}
    >
      {item.label}
    </button>
  );

  return (
    <nav className="sticky top-0 z-50">
      <div className="glass border-b border-glow-300/10 mx-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <button
              onClick={() => setActiveSection('home')}
              className="flex items-center gap-2.5 group"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-forest-gradient flex items-center justify-center
                                border border-glow-300/30 group-hover:border-glow-300/60
                                transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(168,230,184,0.2)]">
                  <IconLeaf size={16} className="text-white" />
                </div>
              </div>
              <span className="font-display font-semibold text-lg text-cream-100 tracking-tight">
                EcoStamp
              </span>
            </button>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center px-2 min-w-0 overflow-x-auto no-scrollbar">
              {visibleNavItems.map(item => <NavButton key={item.id} item={item} />)}
            </div>

            {/* Wallet area */}
            <div className="flex items-center gap-2">
              {walletAddress ? (
                <div className="flex items-center gap-2">

                  {/* Stacks chip */}
                  <div className="flex items-center gap-2 glass-light rounded-xl px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-glow-400 animate-pulse" />
                    <span className="text-sm font-mono text-sage-300">{truncate(walletAddress)}</span>
                    {isAdmin && (
                      <span className="text-[10px] text-amber-400/80 font-medium ml-0.5">admin</span>
                    )}
                  </div>

                  {/* EVM chip — prod only */}
                  {!DEMO_MODE && (
                    evmAddress ? (
                      <div className="hidden md:flex items-center gap-2 glass-light rounded-xl px-2.5 lg:px-3 py-2 border border-blue-400/20">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-xs font-mono text-blue-300">{truncate(evmAddress)}</span>
                      </div>
                    ) : (
                      <button
                        onClick={connectEvmWallet}
                        disabled={evmConnecting}
                        className="hidden md:flex items-center gap-1.5 glass-light rounded-xl px-2.5 lg:px-3 py-2
                                   text-xs text-sage-400 hover:text-cream-200 border border-dashed
                                   border-sage-500/30 hover:border-blue-400/30 transition-all duration-200
                                   disabled:opacity-50"
                        title="Connect EVM wallet for USDC payments"
                      >
                        <IconWallet size={12} />
                        {evmConnecting ? 'Connecting…' : (
                          <>
                            <span className="lg:hidden">EVM</span>
                            <span className="hidden lg:inline">EVM Wallet</span>
                          </>
                        )}
                      </button>
                    )
                  )}

                  <button onClick={disconnect} className="text-xs text-earth-400 hover:text-sage-400 transition-colors" title="Disconnect">
                    ✕
                  </button>
                </div>
              ) : (
                <button onClick={connectWallet} className="btn-primary text-sm py-2 px-4">
                  Connect Wallet
                </button>
              )}

              {/* Mobile hamburger */}
              <button
                className="md:hidden text-sage-400 hover:text-cream-200"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <IconX size={20} /> : <IconMenu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-glow-300/10 px-4 py-3 space-y-1">
            {visibleNavItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveSection(item.id); setMenuOpen(false); }}
                className={`
                  w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${activeSection === item.id
                    ? 'bg-moss-500/30 text-glow-300'
                    : item.adminOnly
                      ? 'text-amber-400/70 hover:text-amber-300 hover:bg-amber-400/10'
                      : 'text-sage-300 hover:text-cream-200 hover:bg-forest-700/40'
                  }
                `}
              >
                {item.label}
              </button>
            ))}
            {!DEMO_MODE && walletAddress && !evmAddress && (
              <button
                onClick={() => { connectEvmWallet(); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-sage-400
                           hover:text-cream-200 hover:bg-forest-700/40 transition-all flex items-center gap-2"
              >
                <IconWallet size={14} />
                Connect EVM Wallet (USDC payments)
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
