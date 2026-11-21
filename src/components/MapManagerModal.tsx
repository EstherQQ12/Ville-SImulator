import React, { useState } from 'react';
import { FolderOpen, Save, Trash2, X } from 'lucide-react';
import { PRESET_MAPS } from '../data/defaultBlueprints';
import { SavedMapData } from '../types/game';
import { soundEngine } from '../utils/sound';

interface MapManagerModalProps {
  isOpen: boolean;
  currentMapName: string;
  savedMaps: SavedMapData[];
  onClose: () => void;
  onSaveMap: (name: string) => void;
  onLoadMap: (map: SavedMapData) => void;
  onDeleteSavedMap: (id: string) => void;
}

export function MapManagerModal({
  isOpen,
  currentMapName,
  savedMaps,
  onClose,
  onSaveMap,
  onLoadMap,
  onDeleteSavedMap,
}: MapManagerModalProps) {
  const [saveName, setSaveName] = useState(currentMapName);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = saveName.trim() || 'My Custom City';
    soundEngine.playSaveIcon();
    onSaveMap(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-2xl bg-[#0F172A] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Maps &amp; Presets</h2>
            <p className="text-xs text-slate-400">
              Save your custom city layout or load another neighborhood
            </p>
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

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Save Current Map */}
          <form onSubmit={handleSave} className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5">
            <div className="text-xs font-medium text-slate-300 mb-2">Save Current Map</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                maxLength={32}
                placeholder="Enter map name..."
                className="flex-1 px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Save className="w-4 h-4" />
                Save Map
              </button>
            </div>
          </form>

          {/* Saved Custom Maps */}
          <div>
            <div className="text-xs font-medium text-slate-400 mb-2">
              Your Saved Maps ({savedMaps.length})
            </div>
            {savedMaps.length === 0 ? (
              <div className="text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg p-4 text-center">
                No custom maps saved yet. Save your current city above anytime.
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
                        title="Delete saved map"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Built-in Presets */}
          <div>
            <div className="text-xs font-medium text-slate-400 mb-2">Built-In Scenarios</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
        </div>
      </div>
    </div>
  );
}
