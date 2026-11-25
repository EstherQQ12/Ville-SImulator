import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, Maximize2, Shuffle, Sparkles, Trees, Waves, X } from 'lucide-react';
import { clampBiomeSize, createCustomBiomePreset } from '../data/defaultBlueprints';
import {
  BiomeWaterStyle,
  CustomBiomeConfig,
  GRID_COLS,
  GRID_ROWS,
  MAX_BIOME_COLS,
  MAX_BIOME_ROWS,
  MIN_BIOME_COLS,
  MIN_BIOME_ROWS,
  TerrainType,
} from '../types/game';
import { soundEngine } from '../utils/sound';

interface CustomBiomeModalProps {
  isOpen: boolean;
  submitLabel?: string;
  onClose: () => void;
  onCreateCustomBiome: (config: CustomBiomeConfig) => void;
}

const SIZE_PRESETS: { label: string; cols: number; rows: number }[] = [
  { label: 'Small', cols: 22, rows: 16 },
  { label: 'Standard', cols: GRID_COLS, rows: GRID_ROWS },
  { label: 'Large', cols: 44, rows: 28 },
  { label: 'Max', cols: MAX_BIOME_COLS, rows: MAX_BIOME_ROWS },
];

const WATER_STYLES: { id: BiomeWaterStyle; label: string }[] = [
  { id: 'none', label: 'Dry' },
  { id: 'river', label: 'River' },
  { id: 'pond', label: 'Pond' },
  { id: 'island', label: 'Island' },
  { id: 'archipelago', label: 'Islands' },
];

const TERRAIN_PREVIEW_COLORS: Record<TerrainType, string> = {
  grass: '#22C55E',
  forest: '#15803D',
  sand: '#FCD34D',
  water: '#0284C7',
  void: '#0F172A',
};

export function CustomBiomeModal({
  isOpen,
  submitLabel = 'Create & Play',
  onClose,
  onCreateCustomBiome,
}: CustomBiomeModalProps) {
  const [name, setName] = useState('');
  const [cols, setCols] = useState(GRID_COLS);
  const [rows, setRows] = useState(GRID_ROWS);
  const [baseGround, setBaseGround] = useState<'grass' | 'sand'>('grass');
  const [waterStyle, setWaterStyle] = useState<BiomeWaterStyle>('river');
  const [waterAmount, setWaterAmount] = useState(42);
  const [forestDensity, setForestDensity] = useState(34);
  const [sandAmount, setSandAmount] = useState(32);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 9000) + 100);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const clampedSize = useMemo(() => clampBiomeSize(cols, rows), [cols, rows]);

  const previewConfig = useMemo<CustomBiomeConfig>(
    () => ({
      name: name.trim() || undefined,
      cols: clampedSize.cols,
      rows: clampedSize.rows,
      baseGround,
      waterStyle,
      waterAmount: waterStyle === 'none' ? 0 : waterAmount,
      forestDensity,
      sandAmount: baseGround === 'sand' ? 100 : sandAmount,
      seed,
    }),
    [name, clampedSize, baseGround, waterStyle, waterAmount, forestDensity, sandAmount, seed]
  );

  const previewMap = useMemo(() => createCustomBiomePreset(previewConfig), [previewConfig]);

  const counts = useMemo(() => {
    let land = 0;
    let water = 0;
    let forest = 0;
    let sand = 0;
    for (const t of previewMap.tiles) {
      if (t.terrain === 'water') water++;
      else if (t.terrain === 'forest') forest++;
      else if (t.terrain === 'sand') {
        sand++;
        land++;
      } else if (t.terrain === 'grass') {
        land++;
      }
    }
    return { land, water, forest, sand };
  }, [previewMap]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mapCols = previewMap.gridCols || clampedSize.cols;
    const mapRows = previewMap.gridRows || clampedSize.rows;
    const cw = canvas.width;
    const ch = canvas.height;

    ctx.fillStyle = '#090F1D';
    ctx.fillRect(0, 0, cw, ch);

    const pad = 10;
    const cell = Math.min((cw - pad * 2) / mapCols, (ch - pad * 2) / mapRows);
    const drawW = cell * mapCols;
    const drawH = cell * mapRows;
    const offsetX = (cw - drawW) / 2;
    const offsetY = (ch - drawH) / 2;

    for (const tile of previewMap.tiles) {
      ctx.fillStyle = TERRAIN_PREVIEW_COLORS[tile.terrain] || '#22C55E';
      ctx.fillRect(
        offsetX + tile.x * cell,
        offsetY + tile.y * cell,
        Math.ceil(cell),
        Math.ceil(cell)
      );
    }

    ctx.strokeStyle = 'rgba(248, 250, 252, 0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, drawW, drawH);
  }, [isOpen, previewMap, clampedSize]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playPlaceBuilding();
    onCreateCustomBiome(previewConfig);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4 pointer-events-auto"
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-2xl bg-[#0F172A] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Compass className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold text-white truncate">
                Customize New Biome
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Shape terrain, water &amp; forests · Size limit {MIN_BIOME_COLS}–{MAX_BIOME_COLS} × {MIN_BIOME_ROWS}–{MAX_BIOME_ROWS}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close custom biome builder"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto touch-pan-y space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {/* Left: Live Terrain Preview */}
            <div className="md:col-span-5 space-y-2.5">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1.5 px-1">
                  <span className="font-semibold text-white">Live Preview</span>
                  <span className="font-mono-tabular text-amber-300 font-semibold">
                    {clampedSize.cols} × {clampedSize.rows} ({clampedSize.cols * clampedSize.rows} tiles)
                  </span>
                </div>
                <canvas
                  ref={previewCanvasRef}
                  width={300}
                  height={200}
                  className="w-full h-auto rounded-lg bg-[#090F1D]"
                />
                <div className="grid grid-cols-4 gap-1 mt-2 text-center text-[10px] font-mono-tabular">
                  <div className="bg-slate-900 rounded py-1 text-emerald-300">
                    Land {counts.land}
                  </div>
                  <div className="bg-slate-900 rounded py-1 text-sky-300">
                    Water {counts.water}
                  </div>
                  <div className="bg-slate-900 rounded py-1 text-green-400">
                    Trees {counts.forest}
                  </div>
                  <div className="bg-slate-900 rounded py-1 text-amber-300">
                    Sand {counts.sand}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={32}
                  placeholder="World name (optional)..."
                  className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiTick();
                    setSeed(Math.floor(Math.random() * 90000) + 100);
                  }}
                  title="Randomize terrain seed"
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-100 transition-colors shrink-0"
                >
                  <Shuffle className="w-3.5 h-3.5 text-amber-300" />
                  Shuffle
                </button>
              </div>
            </div>

            {/* Right: Size Limits & Terrain Controls */}
            <div className="md:col-span-7 space-y-3.5">
              {/* Map Size with Enforced Limit */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                    Map Size
                  </span>
                  <span className="text-[10px] font-mono-tabular text-slate-400">
                    Limit: {MIN_BIOME_COLS}–{MAX_BIOME_COLS} W × {MIN_BIOME_ROWS}–{MAX_BIOME_ROWS} H
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {SIZE_PRESETS.map((preset) => {
                    const active = clampedSize.cols === preset.cols && clampedSize.rows === preset.rows;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiTick();
                          setCols(preset.cols);
                          setRows(preset.rows);
                        }}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                          active
                            ? 'bg-amber-400 border-amber-300 text-slate-950'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div>{preset.label}</div>
                        <div className={`text-[10px] font-mono-tabular ${active ? 'text-slate-900' : 'text-slate-400'}`}>
                          {preset.cols}×{preset.rows}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-300">Width (Cols)</span>
                      <span className="font-mono-tabular font-semibold text-amber-300">
                        {clampedSize.cols} / {MAX_BIOME_COLS}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={MIN_BIOME_COLS}
                      max={MAX_BIOME_COLS}
                      value={clampedSize.cols}
                      onChange={(e) => setCols(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-300">Height (Rows)</span>
                      <span className="font-mono-tabular font-semibold text-amber-300">
                        {clampedSize.rows} / {MAX_BIOME_ROWS}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={MIN_BIOME_ROWS}
                      max={MAX_BIOME_ROWS}
                      value={clampedSize.rows}
                      onChange={(e) => setRows(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Base Ground & Water Shape */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] font-medium text-slate-300 mb-1">Base Ground</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBaseGround('grass')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                          baseGround === 'grass'
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        Grass
                      </button>
                      <button
                        type="button"
                        onClick={() => setBaseGround('sand')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                          baseGround === 'sand'
                            ? 'bg-amber-300 border-amber-200 text-slate-950'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        Sand
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <Waves className="w-3 h-3 text-sky-400" />
                      Water Shape
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {WATER_STYLES.map((ws) => (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => setWaterStyle(ws.id)}
                          className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                            waterStyle === ws.id
                              ? 'bg-sky-400 border-sky-300 text-slate-950'
                              : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {ws.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Terrain Sliders */}
                <div className="space-y-2 pt-1">
                  <div className={waterStyle === 'none' ? 'opacity-45 pointer-events-none' : ''}>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="text-slate-300 flex items-center gap-1">
                        <Waves className="w-3 h-3 text-sky-400" />
                        Water Amount
                      </span>
                      <span className="font-mono-tabular text-sky-300 font-semibold">
                        {waterStyle === 'none' ? '0%' : `${waterAmount}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={85}
                      value={waterAmount}
                      disabled={waterStyle === 'none'}
                      onChange={(e) => setWaterAmount(Number(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="text-slate-300 flex items-center gap-1">
                        <Trees className="w-3 h-3 text-emerald-400" />
                        Forest Density
                      </span>
                      <span className="font-mono-tabular text-emerald-300 font-semibold">
                        {forestDensity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={85}
                      value={forestDensity}
                      onChange={(e) => setForestDensity(Number(e.target.value))}
                      className="w-full accent-emerald-400"
                    />
                  </div>

                  <div className={baseGround === 'sand' ? 'opacity-45 pointer-events-none' : ''}>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="text-slate-300">Sand &amp; Beaches</span>
                      <span className="font-mono-tabular text-amber-300 font-semibold">
                        {baseGround === 'sand' ? '100%' : `${sandAmount}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={85}
                      value={sandAmount}
                      disabled={baseGround === 'sand'}
                      onChange={(e) => setSandAmount(Number(e.target.value))}
                      className="w-full accent-amber-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400">
              Seed #{seed} · Land expansion works on custom biomes too
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold transition-colors shadow-lg"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
