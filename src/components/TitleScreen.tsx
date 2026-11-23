import { useEffect, useState } from 'react';
import { BookOpen, Compass, X } from 'lucide-react';
import { BIOME_TEMPLATES, PRESET_MAPS } from '../data/defaultBlueprints';
import { MapTemplateKind, SavedMapData } from '../types/game';

interface TitleScreenProps {
  selectedPresetId: string;
  savedMaps: SavedMapData[];
  onSelectMap: (map: SavedMapData) => void;
  onCreateBiomeMap: (template: MapTemplateKind) => void;
  onStartGame: () => void;
}

export function TitleScreen({
  selectedPresetId,
  savedMaps,
  onSelectMap,
  onCreateBiomeMap,
  onStartGame,
}: TitleScreenProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [tab, setTab] = useState<'scenarios' | 'biomes'>('scenarios');
  const [selectedBiome, setSelectedBiome] = useState<MapTemplateKind | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isGuideOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsGuideOpen(false);
        }
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStartGame, isGuideOpen]);

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
              viewBox="0 0 420 64"
              className="w-80 md:w-[24rem] h-auto"
              aria-label="VilleSimulator"
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
                fontSize="38"
                letterSpacing="-1"
              >
                VilleSimulator
              </text>
            </svg>

            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-md">
              Build living towns, shape islands or jungles, grow cities every 10 days, snap &amp; crop daily news photos, and weather chaos.
            </p>
          </div>

          {/* Starting Map Selection */}
          <div className="flex flex-col gap-2.5 max-w-md">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-400">Select Starting World</span>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900/90 border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setTab('scenarios')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    tab === 'scenarios'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Towns &amp; Saves
                </button>
                <button
                  type="button"
                  onClick={() => setTab('biomes')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    tab === 'biomes'
                      ? 'bg-emerald-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Compass className="w-3 h-3" />
                  New Biome
                </button>
              </div>
            </div>

            {tab === 'scenarios' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {allMaps.slice(0, 6).map((m) => {
                  const active = m.id === selectedPresetId && selectedBiome === null;
                  const cleanSubtitle = m.subtitle.replace(/^Day\s+\d+\s*·\s*/i, '');
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedBiome(null);
                        onSelectMap(m);
                      }}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        active
                          ? 'bg-slate-800/95 border-amber-400 text-white'
                          : 'bg-slate-900/80 border-slate-700/70 text-slate-300 hover:border-slate-500 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-sm font-semibold truncate">{m.name}</span>
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">{cleanSubtitle}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BIOME_TEMPLATES.map((tpl) => {
                  const active = selectedBiome === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setSelectedBiome(tpl.id);
                        onCreateBiomeMap(tpl.id);
                      }}
                      className={`text-left p-2.5 rounded-lg border transition-colors ${
                        active
                          ? 'bg-slate-800/95 border-emerald-400 text-white'
                          : 'bg-slate-900/80 border-slate-700/70 text-slate-300 hover:border-slate-500 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: tpl.accent }}
                        />
                        <span className="truncate">{tpl.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {tpl.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Primary CTA & Guide Book */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onStartGame}
              className="px-7 py-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-base tracking-tight transition-colors shadow-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              Open Map Studio
            </button>
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-slate-100 font-semibold text-sm transition-colors shadow cursor-pointer whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-4 h-4 text-amber-300" />
              Guide Book
            </button>
          </div>

          {/* Single flat control-hint line */}
          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 font-mono-tabular">
            Slide Paint Plots · L Expand Land · F Find Places · News Photo &amp; Paperboy · Space Pause
          </div>
        </div>
      </div>

      {/* Concise Player Guide Book Modal */}
      {isGuideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 pointer-events-auto"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-xl bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82dvh] text-slate-100">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-amber-300" />
                <h2 className="font-display text-lg font-bold text-white">VilleSimulator Guide Book</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close guide book"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto touch-pan-y space-y-3.5 text-xs leading-relaxed text-slate-300">
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="font-semibold text-amber-300 mb-1">1. Biomes &amp; 10-Day Map Expansion</div>
                <p>
                  Play prebuilt cities or create a Valley, Sandy Island, Isolated Islands, Jungle, River, or Pond. Every 10 days (Day 10, 20, 30...), you unlock 100 boxes of custom Land (press L) to expand wherever you wish!
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="font-semibold text-sky-300 mb-1">2. Daily Schedule, Stores &amp; Foggy Traffic</div>
                <p>
                  Schools hold up to 100 students Mon–Fri (08:00–16:00), and stores open 06:00–22:00 before closing at night. Watch out on occasional Foggy days when cars crash more often!
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="font-semibold text-emerald-300 mb-1">3. Clustered Woods, Map Finder &amp; Smooth Refresh</div>
                <p>
                  Clumps of forest trees spawn cows, pigs, chickens, and birds. Use the Map button beside News to jump to any place, and press Refresh anytime to clear heavy lag without restarting your town.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="font-semibold text-amber-300 mb-1">4. News Photo Cropper, Paperboy &amp; Reader Remarks</div>
                <p>
                  Open News once per day to take a high-res photo, crop your frame, write the headline, and publish! A bicycling paperboy delivers papers to houses as funny citizen comments roll in.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="font-semibold text-rose-300 mb-1">5. Disasters &amp; Underground Basements</div>
                <p>
                  Select City Hall to trigger Tornadoes, Earthquakes, Floods, Wars, or a Nuke. After a nuclear strike, the Mayor urges citizens to build underground basements that protect buildings from future blasts.
                </p>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
