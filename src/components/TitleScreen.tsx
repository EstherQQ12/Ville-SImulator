import { useEffect, useState } from 'react';
import { BookOpen, Compass, GraduationCap, RotateCcw, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { BIOME_TEMPLATES, PRESET_MAPS } from '../data/defaultBlueprints';
import { CustomBiomeConfig, MapTemplateKind, SavedMapData, TrashedMapEntry } from '../types/game';
import { CustomBiomeModal } from './CustomBiomeModal';
import { GUIDE_BOOK_STEPS } from './TutorialOverlay';

interface TitleScreenProps {
  selectedPresetId: string;
  savedMaps: SavedMapData[];
  trashedMaps: TrashedMapEntry[];
  hiddenPresetIds: string[];
  onSelectMap: (map: SavedMapData) => void;
  onCreateBiomeMap: (template: MapTemplateKind) => void;
  onCreateCustomBiome: (config: CustomBiomeConfig) => void;
  onDeleteWorld: (map: SavedMapData) => void;
  onRestoreTrashedMap: (id: string) => void;
  onPermanentDeleteTrashedMap: (id: string) => void;
  onEmptyTrash: () => void;
  onStartGame: () => void;
  onStartTutorial: () => void;
}

export function TitleScreen({
  selectedPresetId,
  savedMaps,
  trashedMaps,
  hiddenPresetIds,
  onSelectMap,
  onCreateBiomeMap,
  onCreateCustomBiome,
  onDeleteWorld,
  onRestoreTrashedMap,
  onPermanentDeleteTrashedMap,
  onEmptyTrash,
  onStartGame,
  onStartTutorial,
}: TitleScreenProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isCustomBiomeOpen, setIsCustomBiomeOpen] = useState(false);
  const [tab, setTab] = useState<'scenarios' | 'biomes'>('scenarios');
  const [selectedBiome, setSelectedBiome] = useState<MapTemplateKind | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isGuideOpen || isTrashOpen || isCustomBiomeOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsGuideOpen(false);
          setIsTrashOpen(false);
          setIsCustomBiomeOpen(false);
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
  }, [onStartGame, isGuideOpen, isTrashOpen, isCustomBiomeOpen]);

  const visiblePresets = PRESET_MAPS.filter((p) => !hiddenPresetIds.includes(p.id));
  const allMaps = [...savedMaps, ...visiblePresets];

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
              Build living towns, approve citizen building permits, shape islands or jungles, grow cities every 10 days, snap news photos, and weather chaos.
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
                  Towns &amp; Worlds
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
              allMaps.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-slate-700 bg-slate-900/70 text-xs text-slate-400 text-center">
                  All worlds are in the Trash Bin. Restore one from Trash Bin or pick a New Biome!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto touch-pan-y pr-1">
                  {allMaps.map((m) => {
                    const active = m.id === selectedPresetId && selectedBiome === null;
                    const cleanSubtitle = m.subtitle.replace(/^Day\s+\d+\s*·\s*/i, '');
                    return (
                      <div
                        key={m.id}
                        className={`relative group rounded-lg border transition-colors ${
                          active
                            ? 'bg-slate-800/95 border-amber-400 text-white'
                            : 'bg-slate-900/80 border-slate-700/70 text-slate-300 hover:border-slate-500 hover:bg-slate-800/70'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBiome(null);
                            onSelectMap(m);
                          }}
                          className="w-full text-left p-3 pr-9"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-sm font-semibold truncate">{m.name}</span>
                          </div>
                          <div className="text-xs text-slate-400 truncate mt-0.5">{cleanSubtitle}</div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteWorld(m);
                          }}
                          title="Move world to Trash Bin"
                          aria-label={`Move ${m.name} to Trash Bin`}
                          className="absolute top-2.5 right-2 p-1.5 rounded-md text-slate-400 hover:text-rose-300 hover:bg-rose-950/70 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsCustomBiomeOpen(true)}
                  className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-colors ${
                    selectedBiome === 'custom'
                      ? 'bg-emerald-950/60 border-emerald-400 text-white'
                      : 'bg-slate-900/90 border-emerald-500/50 text-emerald-200 hover:bg-slate-800/80 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        Customize New Biome
                      </div>
                      <div className="text-[11px] text-slate-300 truncate">
                        Pick map size (up to 52×34), water shape, beaches &amp; forests
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-400 text-slate-950 text-[11px] font-bold whitespace-nowrap shrink-0">
                    Customize
                  </span>
                </button>
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
              </div>
            )}
          </div>

          {/* Primary CTA, Tutorial, Guide Book & Trash Bin */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onStartGame}
              className="px-7 py-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-base tracking-tight transition-colors shadow-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              Open Map Studio
            </button>
            <button
              type="button"
              onClick={onStartTutorial}
              className="flex items-center gap-2 px-4 py-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/60 text-sky-200 font-semibold text-sm transition-colors shadow cursor-pointer whitespace-nowrap shrink-0"
              title="Play interactive step-by-step Tutorial Town"
            >
              <GraduationCap className="w-4 h-4 text-sky-300" />
              Tutorial
            </button>
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-slate-100 font-semibold text-sm transition-colors shadow cursor-pointer whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-4 h-4 text-amber-300" />
              Guide Book
            </button>
            <button
              type="button"
              onClick={() => setIsTrashOpen(true)}
              className="flex items-center gap-2 px-3.5 py-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm transition-colors shadow cursor-pointer whitespace-nowrap shrink-0"
              title="View removed worlds in Trash Bin"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              Trash Bin ({trashedMaps.length})
            </button>
          </div>

          {/* Single flat control-hint line */}
          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 font-mono-tabular">
            Slide Paint Plots · Permits &amp; Mayor File · F Find Places · Space Pause
          </div>
        </div>
      </div>

      {/* Trash Bin Modal */}
      {isTrashOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 pointer-events-auto"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-lg bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82dvh] text-slate-100">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-5 h-5 text-rose-400" />
                <div>
                  <h2 className="font-display text-lg font-bold text-white">World Trash Bin</h2>
                  <p className="text-[11px] text-slate-400">Restore removed worlds anytime or delete them permanently</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTrashOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close trash bin"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto touch-pan-y space-y-2.5">
              {trashedMaps.length === 0 ? (
                <div className="text-xs text-slate-400 border border-dashed border-slate-800 rounded-lg p-6 text-center">
                  Trash Bin is empty. Removed worlds appear here first so you never lose a town by accident.
                </div>
              ) : (
                trashedMaps.map((entry) => (
                  <div
                    key={entry.map.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{entry.map.name}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {entry.map.subtitle.replace(/^Day\s+\d+\s*·\s*/i, '')} · Removed{' '}
                        {new Date(entry.deletedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRestoreTrashedMap(entry.map.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-colors"
                        title="Restore world"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => onPermanentDeleteTrashedMap(entry.map.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-rose-500/15 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold transition-colors"
                        title="Permanently delete world"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
              {trashedMaps.length > 0 ? (
                <button
                  type="button"
                  onClick={onEmptyTrash}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-700/60 text-rose-200 font-semibold text-xs transition-colors"
                >
                  Empty Trash Forever
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setIsTrashOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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

            <div className="p-5 overflow-y-auto touch-pan-y space-y-2.5 text-xs leading-snug text-slate-300">
              {GUIDE_BOOK_STEPS.map((entry) => (
                <div
                  key={entry.step}
                  className={`bg-slate-900/80 border rounded-lg p-3 ${
                    entry.step === 3 ? 'border-rose-500/40' : 'border-slate-800'
                  }`}
                >
                  <div className="font-semibold text-amber-300 mb-1">
                    {entry.step}. {entry.title}
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-300">
                    {entry.items.map((item, idx) => (
                      <p key={idx}>
                        {item.label && (
                          <span className="font-semibold text-sky-300 mr-1">{item.label}</span>
                        )}
                        <span>{item.text}</span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
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

      {/* Custom Biome Builder Modal */}
      <CustomBiomeModal
        isOpen={isCustomBiomeOpen}
        submitLabel="Use Custom Biome"
        onClose={() => setIsCustomBiomeOpen(false)}
        onCreateCustomBiome={(config) => {
          setSelectedBiome('custom');
          onCreateCustomBiome(config);
        }}
      />
    </div>
  );
}
