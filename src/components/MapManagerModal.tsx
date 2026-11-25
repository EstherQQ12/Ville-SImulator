import React, { useState } from 'react';
import {
  Compass,
  FolderOpen,
  GraduationCap,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { BIOME_TEMPLATES, PRESET_MAPS } from '../data/defaultBlueprints';
import { CustomBiomeConfig, MapTemplateKind, SavedMapData, TrashedMapEntry } from '../types/game';
import { soundEngine } from '../utils/sound';
import { CustomBiomeModal } from './CustomBiomeModal';

interface MapManagerModalProps {
  isOpen: boolean;
  savedMaps: SavedMapData[];
  trashedMaps: TrashedMapEntry[];
  onClose: () => void;
  onLoadMap: (map: SavedMapData) => void;
  onCreateBiomeMap: (template: MapTemplateKind, name?: string) => void;
  onCreateCustomBiome: (config: CustomBiomeConfig) => void;
  onDeleteSavedMap: (id: string) => void;
  onRestoreTrashedMap: (id: string) => void;
  onPermanentDeleteTrashedMap: (id: string) => void;
  onEmptyTrash: () => void;
  onStartTutorial: () => void;
}

export function MapManagerModal({
  isOpen,
  savedMaps,
  trashedMaps,
  onClose,
  onLoadMap,
  onCreateBiomeMap,
  onCreateCustomBiome,
  onDeleteSavedMap,
  onRestoreTrashedMap,
  onPermanentDeleteTrashedMap,
  onEmptyTrash,
  onStartTutorial,
}: MapManagerModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<MapTemplateKind>('island');
  const [newMapName, setNewMapName] = useState('');
  const [view, setView] = useState<'maps' | 'trash'>('maps');
  const [isCustomBiomeOpen, setIsCustomBiomeOpen] = useState(false);

  if (!isOpen) return null;

  const handleCreateBiome = (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playUiTick();
    onCreateBiomeMap(selectedTemplate, newMapName.trim() || undefined);
    setNewMapName('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-2xl bg-[#0F172A] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Worlds &amp; Biomes</h2>
            <p className="text-xs text-slate-400">
              All cities auto-save automatically — switch worlds, create biomes, or check Trash Bin
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setView('maps')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  view === 'maps' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Worlds
              </button>
              <button
                type="button"
                onClick={() => setView('trash')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  view === 'trash' ? 'bg-rose-500 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Trash Bin ({trashedMaps.length})
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close map manager"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 max-h-[78dvh] overflow-y-auto touch-pan-y">
          {view === 'trash' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-slate-300">
                  Removed Worlds ({trashedMaps.length})
                </div>
                {trashedMaps.length > 0 && (
                  <button
                    type="button"
                    onClick={onEmptyTrash}
                    className="px-3 py-1 rounded-md bg-rose-950/70 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-semibold transition-colors"
                  >
                    Empty Trash Forever
                  </button>
                )}
              </div>
              {trashedMaps.length === 0 ? (
                <div className="text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg p-6 text-center">
                  Trash Bin is empty. Any saved world you remove lands here first so you can restore it later.
                </div>
              ) : (
                <div className="space-y-2">
                  {trashedMaps.map((entry) => (
                    <div
                      key={entry.map.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{entry.map.name}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {entry.map.subtitle.replace(/^Day\s+\d+\s*·\s*/i, '')} · Deleted{' '}
                          {new Date(entry.deletedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onRestoreTrashedMap(entry.map.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => onPermanentDeleteTrashedMap(entry.map.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-rose-500/15 hover:bg-rose-600/30 border border-rose-500/40 text-xs font-semibold text-rose-300 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Forever
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>

              {/* Create New Terrain Biome */}
              <form onSubmit={handleCreateBiome} className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                    <Compass className="w-3.5 h-3.5" />
                    Create New World Biome
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiTick();
                      setIsCustomBiomeOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-200 text-[11px] font-semibold transition-colors"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    Customize Size &amp; Terrain...
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BIOME_TEMPLATES.map((tpl) => {
                    const active = selectedTemplate === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setSelectedTemplate(tpl.id)}
                        className={`text-left p-2.5 rounded-lg border transition-colors ${
                          active
                            ? 'bg-slate-800 border-amber-400 text-white'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: tpl.accent }}
                          />
                          <span className="truncate">{tpl.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {tpl.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMapName}
                    onChange={(e) => setNewMapName(e.target.value)}
                    maxLength={28}
                    placeholder="Optional world name..."
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                  >
                    Create &amp; Play
                  </button>
                </div>
              </form>

              {/* Saved Custom Maps */}
              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">
                  Your Custom &amp; Biome Worlds ({savedMaps.length})
                </div>
                {savedMaps.length === 0 ? (
                  <div className="text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg p-4 text-center">
                    No custom biome worlds yet. Create one above and it will auto-save here!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {savedMaps.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 p-3 rounded-lg bg-slate-900/70 border border-slate-800"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{m.name}</div>
                          <div className="text-xs text-slate-400 truncate">{m.subtitle}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiTick();
                              onLoadMap(m);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition-colors"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSavedMap(m.id)}
                            className="p-1.5 rounded text-rose-400 hover:bg-rose-950/70 transition-colors"
                            title="Move saved map to Trash Bin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Built-in Presets & Tutorial */}
              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">Built-In Scenarios</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiTick();
                      onStartTutorial();
                      onClose();
                    }}
                    className="text-left p-3 rounded-lg bg-sky-950/40 hover:bg-sky-900/50 border border-sky-500/50 hover:border-sky-400 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-sky-200 truncate">
                      <GraduationCap className="w-4 h-4 text-sky-300 shrink-0" />
                      <span>Tutorial Town</span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1 line-clamp-2">
                      Interactive step-by-step guide: City Hall, chaos, speed &amp; day clock
                    </div>
                  </button>
                  {PRESET_MAPS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiTick();
                        onLoadMap(preset);
                        onClose();
                      }}
                      className="text-left p-3 rounded-lg bg-slate-900/70 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 transition-colors"
                    >
                      <div className="text-sm font-semibold text-white truncate">{preset.name}</div>
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">{preset.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <CustomBiomeModal
        isOpen={isCustomBiomeOpen}
        submitLabel="Create & Play"
        onClose={() => setIsCustomBiomeOpen(false)}
        onCreateCustomBiome={(config) => {
          onCreateCustomBiome(config);
          onClose();
        }}
      />
    </div>
  );
}
