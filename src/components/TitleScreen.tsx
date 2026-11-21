import { useEffect } from 'react';
import { PRESET_MAPS } from '../data/defaultBlueprints';
import { SavedMapData } from '../types/game';

interface TitleScreenProps {
  selectedPresetId: string;
  savedMaps: SavedMapData[];
  onSelectMap: (map: SavedMapData) => void;
  onStartGame: () => void;
}

export function TitleScreen({
  selectedPresetId,
  savedMaps,
  onSelectMap,
  onStartGame,
}: TitleScreenProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStartGame]);

  const allMaps = [...PRESET_MAPS, ...savedMaps];

  return (
    <div className="absolute inset-0 z-30 transform-gpu pointer-events-none">
      {/* Subtle left-side scrim so title typography maintains >= 4.5:1 contrast over the live city */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(11, 17, 32, 0.94) 0%, rgba(11, 17, 32, 0.82) 38%, rgba(11, 17, 32, 0.28) 68%, rgba(11, 17, 32, 0.12) 100%)',
        }}
      />

      <div className="relative z-10 w-full h-full overflow-y-auto touch-pan-y flex items-center pointer-events-none">
        <div className="w-full max-w-xl my-auto px-6 sm:px-8 md:px-14 py-8 sm:py-10 flex flex-col gap-6 sm:gap-7 pointer-events-auto">
        {/* Bespoke Inline SVG Title Lockup */}
        <div className="flex flex-col gap-3">
          <svg
            viewBox="0 0 360 64"
            className="w-72 md:w-88 h-auto"
            aria-label="CartoVille"
          >
            {/* Geometric mini city emblem */}
            <g transform="translate(0, 6)">
              <rect x="2" y="16" width="14" height="34" rx="2" fill="#334155" stroke="#64748B" strokeWidth="1.5" />
              <rect x="6" y="22" width="3" height="4" fill="#FDE047" />
              <rect x="10" y="22" width="3" height="4" fill="#FDE047" />
              <rect x="6" y="30" width="3" height="4" fill="#38BDF8" />
              <rect x="10" y="30" width="3" height="4" fill="#FDE047" />

              <polygon points="20,24 32,12 44,24" fill="#EA580C" />
              <rect x="22" y="24" width="20" height="26" fill="#F8FAFC" />
              <rect x="26" y="29" width="4" height="5" fill="#FDE047" />
              <rect x="34" y="29" width="4" height="5" fill="#FDE047" />
              <rect x="30" y="39" width="4" height="11" fill="#78350F" />

              {/* Road base line */}
              <rect x="0" y="49" width="48" height="5" rx="1.5" fill="#1E293B" />
              <line x1="4" y1="51.5" x2="44" y2="51.5" stroke="#FACC15" strokeWidth="1.2" strokeDasharray="4 3" />
            </g>

            {/* Wordmark */}
            <text
              x="60"
              y="46"
              fill="#F8FAFC"
              fontFamily="'Bricolage Grotesque', sans-serif"
              fontWeight="800"
              fontSize="42"
              letterSpacing="-1.2"
            >
              CartoVille
            </text>
          </svg>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-md">
            Design custom city maps, draw your own building icons, pave road networks, and watch rush-hour traffic jams unfold across a live 24-hour day-night cycle.
          </p>
        </div>

        {/* Starting Map Selection */}
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-slate-400">
            Select Starting Map
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-md">
            {allMaps.slice(0, 4).map((m) => {
              const active = m.id === selectedPresetId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMap(m)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    active
                      ? 'bg-slate-800/95 border-amber-400 text-white'
                      : 'bg-slate-900/80 border-slate-700/70 text-slate-300 hover:border-slate-500 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="text-sm font-semibold truncate">{m.name}</div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">{m.subtitle}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onStartGame}
            className="px-7 py-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-base tracking-tight transition-colors shadow-lg cursor-pointer whitespace-nowrap shrink-0"
          >
            Open Map Studio
          </button>
          <span className="text-xs text-slate-400 font-mono-tabular">
            Live 24h Day-Night Cycle
          </span>
        </div>

        {/* Single flat control-hint line */}
        <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 font-mono-tabular">
          Click Plot · Drag Road · WASD Pan · Scroll Zoom · Space Pause · T Traffic View
        </div>
      </div>
      </div>
    </div>
  );
}
