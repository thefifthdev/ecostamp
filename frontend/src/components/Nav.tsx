'use client';

import { useState } from 'react';
import { IconLeaf, IconMenu, IconX, IconWallet } from './Icons';

type Section = 'home' | 'stamps' | 'submit' | 'impact' | 'providers' | 'guides' | 'apply' | 'admin';

interface NavProps {
  activeSection: Section;
  setActiveSection: (s: Section) => void;
  walletAddress: string | null;
  setWalletAddress: (a: string | null) => void;
}

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: 'home',      label: 'Home'      },
  { id: 'stamps',    label: 'My Stamps' },
  { id: 'submit',    label: 'Earn Stamp'},
  { id: 'guides',    label: 'Guides'    },
  { id: 'impact',    label: 'Impact'    },
  { id: 'providers', label: 'Providers' },
  { id: 'apply',     label: 'Apply'     },
  { id: 'admin',     label: 'Admin'     },
];

export default function Nav({ activeSection, setActiveSection, walletAddress, setWalletAddress }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const connectWallet = async () => {
    // stacks.js connect — works with Leather & Xverse
    try {
      const { showConnect } = await import('@stacks/connect');
      showConnect({
        appDetails: { name: 'EcoStamp', icon: '/icon.png' },
        onFinish: (data: any) => {
          const addr = data.userSession?.loadUserData()?.profile?.stxAddress?.testnet
                    || data.userSession?.loadUserData()?.profile?.stxAddress?.mainnet;
          if (addr) setWalletAddress(addr);
        },
        onCancel: () => {},
      });
    } catch {
      // Fallback for demo without wallet extension
      setWalletAddress('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
    }
  };

  const disconnect = () => setWalletAddress(null);

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

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
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${activeSection === item.id
                      ? 'bg-moss-500/30 text-glow-300 border border-glow-300/20'
                      : 'text-sage-300 hover:text-cream-200 hover:bg-forest-700/40'
                    }
                  `}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Wallet button */}
            <div className="flex items-center gap-3">
              {walletAddress ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 glass-light rounded-xl px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-glow-400 animate-pulse" />
                    <span className="text-sm font-mono text-sage-300">{truncate(walletAddress)}</span>
                  </div>
                  <button
                    onClick={disconnect}
                    className="text-xs text-earth-400 hover:text-sage-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="btn-primary text-sm py-2 px-4"
                >
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
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveSection(item.id); setMenuOpen(false); }}
                className={`
                  w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${activeSection === item.id
                    ? 'bg-moss-500/30 text-glow-300'
                    : 'text-sage-300 hover:text-cream-200 hover:bg-forest-700/40'
                  }
                `}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}