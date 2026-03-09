'use client';

import { useState, useEffect } from 'react';
import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import StampGallery from '@/components/StampGallery';
import SubmitProof from '@/components/SubmitProof';
import ImpactDashboard from '@/components/ImpactDashboard';
import Providers from '@/components/Providers';
import Footer from '@/components/Footer';
import ParticleField from '@/components/ParticleField';

export default function Home() {
  const [activeSection, setActiveSection] = useState<'home' | 'stamps' | 'submit' | 'impact' | 'providers'>('home');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient background layers */}
      <div className="fixed inset-0 bg-[#0d1f16]" />
      <div className="fixed inset-0 bg-earth-gradient opacity-80" />
      {/* Radial glow top-center */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]
                      bg-radial-[ellipse_at_top] from-moss-500/20 via-transparent to-transparent
                      pointer-events-none" />
      {/* Subtle grid */}
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
          setActiveSection={setActiveSection}
          walletAddress={walletAddress}
          setWalletAddress={setWalletAddress}
        />

        <main>
          {activeSection === 'home'      && <Hero setActiveSection={setActiveSection} />}
          {activeSection === 'stamps'    && <StampGallery walletAddress={walletAddress} />}
          {activeSection === 'submit'    && <SubmitProof walletAddress={walletAddress} />}
          {activeSection === 'impact'    && <ImpactDashboard walletAddress={walletAddress} />}
          {activeSection === 'providers' && <Providers />}
        </main>

        <Footer />
      </div>
    </div>
  );
}
