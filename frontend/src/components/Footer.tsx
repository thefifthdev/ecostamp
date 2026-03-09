import { IconLeaf, IconLink } from './Icons';

export default function Footer() {
  return (
    <footer className="border-t border-glow-300/10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid sm:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-forest-gradient flex items-center justify-center border border-glow-300/20">
                <IconLeaf size={14} className="text-white" />
              </div>
              <span className="font-display text-lg text-cream-100">EcoStamp</span>
            </div>
            <p className="text-xs text-sage-500 leading-relaxed max-w-xs">
              Verifiable travel impact on Stacks Bitcoin L2.
              Mint eco stamps, build reputation, earn sBTC.
            </p>
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-sage-600 mb-3">Protocol</div>
            <div className="space-y-1.5 text-xs text-sage-400">
              {['Stacks Docs', 'SIP-013 Standard', 'Hiro Explorer', 'x402 Protocol'].map(l => (
                <div key={l} className="flex items-center gap-1.5">
                  <IconLink size={10} className="text-sage-600" />
                  <a href="#" className="hover:text-cream-300 transition-colors">{l}</a>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-sage-600 mb-3">Built for</div>
            <div className="glass-light rounded-xl px-3 py-2 inline-block">
              <div className="text-xs text-sage-400">Buidl Battle 2026</div>
              <div className="text-xs text-glow-400">Best x402 Integration</div>
            </div>
          </div>
        </div>

        <div className="border-t border-sage-700/30 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="text-xs text-sage-600">© 2026 EcoStamp Protocol. Phase 1.</div>
          <div className="text-xs text-sage-700 font-mono">Stacks Bitcoin L2 · Testnet</div>
        </div>
      </div>
    </footer>
  );
}