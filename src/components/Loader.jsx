import { useEffect, useState } from 'react';

export default function Loader({ onDone }) {
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExit(true), 2400);
    const t2 = setTimeout(() => onDone(), 2800);
    return () => [t1, t2].forEach(clearTimeout);
  }, []);

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${exit ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ background: '#f8faf8' }}>

      {/* Rings */}
      {[1, 2, 3].map(i => (
        <div key={i} className="absolute rounded-full border border-emerald-200 animate-ping"
          style={{ width: 80 + i * 120, height: 80 + i * 120, animationDelay: `${i * 0.3}s`, animationDuration: '2s', opacity: 0.4 }} />
      ))}

      {/* Logo */}
      <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-green-600 shadow-[0_8px_40px_rgba(22,163,74,0.45)] mb-8"
        style={{ animation: 'scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" />
          <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Title */}
      <div className="relative z-10 text-5xl font-black tracking-tight text-gray-900 mb-3"
        style={{ animation: 'fadeUp 0.5s 0.5s ease-out both' }}>
        Acadify
      </div>

      {/* Subtitle */}
      <p className="relative z-10 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600 mb-10"
        style={{ animation: 'fadeUp 0.5s 0.9s ease-out both' }}>
        Intelligence Engine
      </p>

      {/* Dots */}
      <div className="relative z-10 flex gap-2" style={{ animation: 'fadeUp 0.4s 1.2s ease-out both' }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-emerald-500"
            style={{ animation: `bounce 0.8s ${i * 0.15}s ease-in-out infinite` }} />
        ))}
      </div>

      <style>{`
        @keyframes scaleIn { from { transform: scale(0) rotate(-20deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce  { 0%,100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-8px); opacity: 1; } }
      `}</style>
    </div>
  );
}
