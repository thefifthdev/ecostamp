'use client';

import { useState, useEffect } from 'react';
import Nav           from '@/components/Nav';
import Hero          from '@/components/Hero';
import StampGallery  from '@/components/StampGallery';
import SubmitProof   from '@/components/SubmitProof';
import ImpactDashboard from '@/components/ImpactDashboard';
import Providers     from '@/components/Providers';
import Guides        from '@/components/Guides';
import ProviderApply from '@/components/ProviderApply';
import Activity      from '@/components/Activity';
import CorporateDashboard from '@/components/CorporateDashboard';
import AdminPanel    from '@/components/AdminPanel';
import Footer        from '@/components/Footer';
import ParticleField from '@/components/ParticleField';

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

// NEXT_PUBLIC_ADMIN_ADDRESS controls who sees and can access the Admin panel.
// If blank, admin is unreachable by anyone (fail-closed).
const ADMIN_ADDRESS = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '').trim();

export default function Home() {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [evmAddress,    setEvmAddress]    = useState<string | null>(null);
  const [mounted,       setMounted]       = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Derived: true only when the connected wallet matches the configured admin address
  const isAdmin = ADMIN_ADDRESS !== '' && walletAddress === ADMIN_ADDRESS;

  // Guard: if someone navigates directly to admin without being admin, bounce home
  const safeSetSection = (s: Section) => {
    if (s === 'admin' && !isAdmin) return;
    setActiveSection(s);
  };

  // If wallet disconnects while on admin, go home
  useEffect(() => {
    if (activeSection === 'admin' && !isAdmin) {
      setActiveSection('home');
    }
  }, [walletAddress, isAdmin, activeSection]);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient background layers */}
      <div className="fixed inset-0 bg-[#0d1f16]" />
      <div className="fixed inset-0 bg-earth-gradient opacity-80" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]
                      bg-radial-[ellipse_at_top] from-moss-500/20 via-transparent to-transparent
                      pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
           style={{
             backgroundImage: `
               linear-gradient(rgba(168,230,184,0.5) 1px, transparent 1px),
               linear-gradient(90deg, rgba(168,230,184,0.5) 1px, transparent 1px)`,
             backgroundSize: '64px 64px',
           }} />

      <ParticleField />

      <div className="relative z-10">
        <Nav
          activeSection={activeSection}
          setActiveSection={safeSetSection}
          walletAddress={walletAddress}
          setWalletAddress={setWalletAddress}
          evmAddress={evmAddress}
          setEvmAddress={setEvmAddress}
        />

        <main>
          {activeSection === 'home'      && <Hero setActiveSection={safeSetSection} />}
          {activeSection === 'stamps'    && <StampGallery walletAddress={walletAddress} />}
          {activeSection === 'submit'    && <SubmitProof walletAddress={walletAddress} />}
          {activeSection === 'impact'    && <ImpactDashboard walletAddress={walletAddress} />}
          {activeSection === 'activity'  && <Activity walletAddress={walletAddress} />}
          {activeSection === 'providers' && <Providers />}
          {activeSection === 'guides'    && <Guides walletAddress={walletAddress} evmAddress={evmAddress} />}
          {activeSection === 'apply'     && <ProviderApply walletAddress={walletAddress} evmAddress={evmAddress} />}
          {activeSection === 'corporate' && <CorporateDashboard walletAddress={walletAddress} />}
          {activeSection === 'admin'     && isAdmin && <AdminPanel walletAddress={walletAddress} />}
          {activeSection === 'admin'     && !isAdmin && <AccessDenied />}
        </main>

        <Footer />
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <section className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="font-display text-2xl text-cream-200 mb-2">Access denied</h3>
        <p className="text-sage-400 text-sm">
          Connect the admin wallet configured in{' '}
          <code className="text-glow-400 text-xs bg-forest-800 px-1.5 py-0.5 rounded">
            NEXT_PUBLIC_ADMIN_ADDRESS
          </code>{' '}
          to access this panel.
        </p>
      </div>
    </section>
  );
}
