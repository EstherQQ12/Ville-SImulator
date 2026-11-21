import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Eraser,
  FlipHorizontal2,
  PaintBucket,
  Paintbrush,
  Pipette,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  CIVIC_PLOT_BEHAVIORS,
  CUSTOM_PLOT_BEHAVIORS,
  DEFAULT_BLUEPRINTS,
  PAINTER_PALETTE,
  WINDOW_GLOW_COLORS,
} from '../data/defaultBlueprints';
import { BuildingBlueprint, BuildingCategory, ICON_SIZE } from '../types/game';
import { soundEngine } from '../utils/sound';
import { PixelIconPreview } from './PixelIconPreview';

type PaintTool = 'brush' | 'eraser' | 'fill' | 'eyedropper';

interface IconPainterModalProps {
  isOpen: boolean;
  mode: 'create_blueprint' | 'edit_blueprint' | 'edit_placed';
  initialBlueprint: BuildingBlueprint;
  hasCityHall?: boolean;
  onClose: () => void;
  onSave: (result: BuildingBlueprint) => void;
  onDelete?: (id: string) => void;
}

export function IconPainterModal({
  isOpen,
  mode,
  initialBlueprint,
  hasCityHall = false,
  onClose,
  onSave,
  onDelete,
}: IconPainterModalProps) {
  const [name, setName] = useState(initialBlueprint.name);
  const [category, setCategory] = useState<BuildingCategory>(initialBlueprint.category);
  const [capacity, setCapacity] = useState(initialBlueprint.capacity);
  const [grid, setGrid] = useState<string[]>([...initialBlueprint.iconGrid]);
  const [history, setHistory] = useState<string[][]>([]);

  const [tool, setTool] = useState<PaintTool>('brush');
  const [brushSize, setBrushSize] = useState<1 | 2>(1);
  const [activeColor, setActiveColor] = useState<string>('#C2410C');
  const [mirrorX, setMirrorX] = useState<boolean>(false);

  const isPaintingRef = useRef(false);
  const strokeSnapshotRef = useRef<string[] | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialBlueprint.name);
      setCategory(initialBlueprint.category);
      setCapacity(initialBlueprint.capacity);
      setGrid([...initialBlueprint.iconGrid]);
      setHistory([]);
      setTool('brush');
    }
  }, [isOpen, initialBlueprint]);

  const pushHistory = useCallback((prevGrid: string[]) => {
    setHistory((h) => [...h.slice(-29), [...prevGrid]]);
  }, []);

  const handleUndo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setGrid(prev);
      soundEngine.playUiTick();
      return h.slice(0, -1);
    });
  };

  const floodFill = (startGrid: string[], sx: number, sy: number, replacement: string): string[] => {
    const next = [...startGrid];
    const target = next[sy * ICON_SIZE + sx];
    if (target === replacement) return next;

    const stack: [number, number][] = [[sx, sy]];
    const visited = new Uint8Array(ICON_SIZE * ICON_SIZE);

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const idx = cy * ICON_SIZE + cx;
      if (visited[idx]) continue;
      if (next[idx] !== target) continue;
      visited[idx] = 1;
      next[idx] = replacement;

      if (cx > 0) stack.push([cx - 1, cy]);
      if (cx < ICON_SIZE - 1) stack.push([cx + 1, cy]);
      if (cy > 0) stack.push([cx, cy - 1]);
      if (cy < ICON_SIZE - 1) stack.push([cx, cy + 1]);
    }
    return next;
  };

  const applyAtCell = (px: number, py: number, isStart: boolean, forceErase = false) => {
    if (px < 0 || px >= ICON_SIZE || py < 0 || py >= ICON_SIZE) return;

    if (tool === 'eyedropper' && !forceErase) {
      const picked = grid[py * ICON_SIZE + px];
      if (picked) {
        setActiveColor(picked);
        setTool('brush');
        soundEngine.playUiTick();
      }
      return;
    }

    if (tool === 'fill' && !forceErase) {
      if (!isStart) return;
      pushHistory(grid);
      const filled = floodFill(grid, px, py, activeColor);
      setGrid(filled);
      soundEngine.playUiTick();
      return;
    }

    const colorToPaint = forceErase || tool === 'eraser' ? '' : activeColor;

    setGrid((current) => {
      const next = [...current];
      let changed = false;

      const paintPoint = (cx: number, cy: number) => {
        if (cx < 0 || cx >= ICON_SIZE || cy < 0 || cy >= ICON_SIZE) return;
        const idx = cy * ICON_SIZE + cx;
        if (next[idx] !== colorToPaint) {
          next[idx] = colorToPaint;
          changed = true;
        }
        if (mirrorX) {
          const mx = ICON_SIZE - 1 - cx;
          const mIdx = cy * ICON_SIZE + mx;
          if (next[mIdx] !== colorToPaint) {
            next[mIdx] = colorToPaint;
            changed = true;
          }
        }
      };

      for (let dy = 0; dy < brushSize; dy++) {
        for (let dx = 0; dx < brushSize; dx++) {
          paintPoint(px + dx, py + dy);
        }
      }

      return changed ? next : current;
    });
  };

  const getCellFromPointer = (clientX: number, clientY: number): [number, number] | null => {
    const el = canvasRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const rx = (clientX - rect.left) / rect.width;
    const ry = (clientY - rect.top) / rect.height;
    const px = Math.floor(rx * ICON_SIZE);
    const py = Math.floor(ry * ICON_SIZE);
    if (px < 0 || px >= ICON_SIZE || py < 0 || py >= ICON_SIZE) return null;
    return [px, py];
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const cell = getCellFromPointer(e.clientX, e.clientY);
    if (!cell) return;
    const isRightClick = e.button === 2;
    isPaintingRef.current = true;
    strokeSnapshotRef.current = [...grid];
    applyAtCell(cell[0], cell[1], true, isRightClick);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPaintingRef.current) return;
    const cell = getCellFromPointer(e.clientX, e.clientY);
    if (!cell) return;
    const isRightClick = (e.buttons & 2) === 2;
    applyAtCell(cell[0], cell[1], false, isRightClick);
  };

  const handlePointerUp = () => {
    if (isPaintingRef.current && strokeSnapshotRef.current && tool !== 'fill' && tool !== 'eyedropper') {
      // Push snapshot if grid changed
      const before = strokeSnapshotRef.current;
      const changed = before.some((val, idx) => val !== grid[idx]);
      if (changed) {
        pushHistory(before);
      }
    }
    isPaintingRef.current = false;
    strokeSnapshotRef.current = null;
  };

  const handleClear = () => {
    pushHistory(grid);
    setGrid(new Array(ICON_SIZE * ICON_SIZE).fill(''));
    soundEngine.playUiTick();
  };

  const handleLoadTemplate = (bpId: string) => {
    const found = DEFAULT_BLUEPRINTS.find((b) => b.id === bpId);
    if (!found) return;
    pushHistory(grid);
    setGrid([...found.iconGrid]);
    soundEngine.playUiTick();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim() || 'Custom Plot';
    soundEngine.playSaveIcon();
    onSave({
      ...initialBlueprint,
      name: cleanName,
      category,
      capacity,
      iconGrid: [...grid],
      accentColor: activeColor || initialBlueprint.accentColor,
      isCustom: mode === 'create_blueprint' ? true : initialBlueprint.isCustom,
    });
  };

  if (!isOpen) return null;

  const modalTitle =
    mode === 'create_blueprint'
      ? 'Create Custom Building Plot'
      : mode === 'edit_blueprint'
      ? 'Edit Building Icon'
      : 'Customize Plot Icon';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="w-full max-w-3xl max-h-[92dvh] flex flex-col bg-[#0F172A] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-white">
              {modalTitle}
            </h2>
            <p className="text-xs text-slate-400">
              Draw a 20×20 icon · Yellow or Neon Cyan pixels glow warmly at night
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close icon painter"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 grid grid-cols-1 md:grid-cols-[1fr_290px] gap-6 overflow-y-auto touch-pan-y">
          {/* Left: Pixel Canvas & Drawing Toolbar */}
          <div className="flex flex-col gap-3">
            {/* Tool Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded-lg p-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTool('brush')}
                  title="Brush (Left-click drag)"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    tool === 'brush'
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  Draw
                </button>
                <button
                  type="button"
                  onClick={() => setTool('fill')}
                  title="Fill Bucket"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    tool === 'fill'
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <PaintBucket className="w-3.5 h-3.5" />
                  Fill
                </button>
                <button
                  type="button"
                  onClick={() => setTool('eraser')}
                  title="Eraser (or Right-click)"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    tool === 'eraser'
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" />
                  Erase
                </button>
                <button
                  type="button"
                  onClick={() => setTool('eyedropper')}
                  title="Pick color from canvas"
                  className={`p-1.5 rounded transition-colors ${
                    tool === 'eyedropper'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Pipette className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBrushSize((s) => (s === 1 ? 2 : 1))}
                  title="Toggle 1px / 2px brush"
                  className="px-2 py-1 rounded text-xs font-mono-tabular bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                >
                  {brushSize}×{brushSize}
                </button>
                <button
                  type="button"
                  onClick={() => setMirrorX((m) => !m)}
                  title="Horizontal Symmetry"
                  className={`p-1.5 rounded transition-colors ${
                    mirrorX ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FlipHorizontal2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  title="Undo"
                  className="p-1.5 rounded text-slate-300 hover:bg-slate-800 disabled:opacity-35 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  title="Clear Canvas"
                  className="p-1.5 rounded text-rose-400 hover:bg-rose-950/60 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 20x20 Interactive Grid */}
            <div className="flex items-center justify-center bg-[#182234] border border-slate-800 rounded-lg p-4">
              <div
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative grid touch-none cursor-crosshair border border-slate-600 shadow-inner"
                style={{
                  width: 320,
                  height: 320,
                  gridTemplateColumns: `repeat(${ICON_SIZE}, 1fr)`,
                  gridTemplateRows: `repeat(${ICON_SIZE}, 1fr)`,
                  backgroundImage:
                    'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  backgroundColor: '#0f172a',
                }}
              >
                {grid.map((cellColor, i) => (
                  <div
                    key={i}
                    className="border-[0.5px] border-slate-700/25 pointer-events-none"
                    style={{
                      backgroundColor: cellColor || 'transparent',
                    }}
                  />
                ))}
                {mirrorX && (
                  <div className="absolute inset-y-0 left-1/2 w-[1px] bg-sky-400/60 pointer-events-none" />
                )}
              </div>
            </div>

            {/* Starter Templates */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Load starter shape:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DEFAULT_BLUEPRINTS.slice(0, 5).map((bp) => (
                  <button
                    key={bp.id}
                    type="button"
                    onClick={() => handleLoadTemplate(bp.id)}
                    className="px-2 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition-colors whitespace-nowrap shrink-0"
                  >
                    {bp.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Palette, Live Previews, & Plot Config */}
          <div className="flex flex-col justify-between gap-4">
            <div className="space-y-4">
              {/* Day / Night Live Preview */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="text-xs font-medium text-slate-300 mb-2">
                  Map Tile Preview
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col items-center gap-1.5 p-2 rounded bg-[#4C8C57] border border-slate-700/60">
                    <div className="p-1 bg-[#CBD5E1] rounded-sm shadow">
                      <PixelIconPreview iconGrid={grid} size={44} />
                    </div>
                    <span className="text-[11px] font-medium text-slate-950 bg-white/75 px-1.5 rounded">
                      Daylight
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-2 rounded bg-[#0A1329] border border-slate-700/60">
                    <div className="p-1 bg-[#1E293B] rounded-sm shadow">
                      <PixelIconPreview iconGrid={grid} size={44} nightMode />
                    </div>
                    <span className="text-[11px] font-medium text-amber-200">
                      Night Glow
                    </span>
                  </div>
                </div>
              </div>

              {/* Architectural Swatches */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-300">Color Palette</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <span>Custom</span>
                    <input
                      type="color"
                      value={activeColor}
                      onChange={(e) => {
                        setActiveColor(e.target.value);
                        setTool('brush');
                      }}
                      className="w-6 h-5 rounded border border-slate-600 bg-transparent cursor-pointer"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {PAINTER_PALETTE.map((swatch) => {
                    const selected = activeColor.toUpperCase() === swatch.hex.toUpperCase() && tool !== 'eraser';
                    return (
                      <button
                        key={swatch.hex}
                        type="button"
                        title={`${swatch.name}${swatch.glowsAtNight ? ' (Glows at night)' : ''}`}
                        onClick={() => {
                          setActiveColor(swatch.hex);
                          if (tool === 'eraser' || tool === 'eyedropper') setTool('brush');
                        }}
                        className={`relative w-7 h-7 rounded border transition-transform ${
                          selected
                            ? 'border-white scale-110 ring-2 ring-amber-400'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      >
                        {WINDOW_GLOW_COLORS.has(swatch.hex.toUpperCase()) && (
                          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/90" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plot Name & Behavior */}
              <div className="space-y-3 pt-1 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Plot Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={28}
                    placeholder="e.g. Library, Cafe, Alleyway, Statue"
                    className="w-full px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Plot Behavior
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    {[
                      { id: 'road_path' as BuildingCategory, label: 'Path for Cars', hint: 'Cars drive across' },
                      { id: 'landmark' as BuildingCategory, label: 'Not for Cars', hint: 'Scenic / no traffic' },
                      { id: 'workplace' as BuildingCategory, label: 'Job Opportunities', hint: 'Commuter workplace' },
                      { id: 'visit_spot' as BuildingCategory, label: 'Go & Leave', hint: 'e.g. Library, Cafe' },
                    ].map((opt) => {
                      const active = category === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setCategory(opt.id)}
                          className={`text-left px-2.5 py-2 rounded-lg border transition-colors ${
                            active
                              ? 'bg-amber-400/15 border-amber-400 text-white'
                              : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          <div className="text-xs font-semibold leading-tight">{opt.label}</div>
                          <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{opt.hint}</div>
                        </button>
                      );
                    })}
                  </div>

                  {!CUSTOM_PLOT_BEHAVIORS.includes(category) && (
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as BuildingCategory)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    >
                      <optgroup label="Custom Plot Behaviors">
                        {CUSTOM_PLOT_BEHAVIORS.map((cat) => (
                          <option key={cat} value={cat}>
                            {CATEGORY_LABELS[cat]}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Civic &amp; Neighbourhood Roles">
                        {CIVIC_PLOT_BEHAVIORS.map((cat) => {
                          const disabled =
                            cat === 'city_hall' &&
                            hasCityHall &&
                            initialBlueprint.category !== 'city_hall';
                          return (
                            <option key={cat} value={cat} disabled={disabled}>
                              {CATEGORY_LABELS[cat]}
                              {disabled ? ' (1/1 Built)' : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    </select>
                  )}
                </div>

                {category !== 'road_path' && category !== 'landmark' && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-300">Occupancy / Traffic Weight</span>
                      <span className="font-mono-tabular text-amber-400">{capacity}</span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={60}
                      step={2}
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <div>
                {mode === 'edit_blueprint' && initialBlueprint.isCustom && onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(initialBlueprint.id)}
                    className="px-3 py-2 text-xs font-medium text-rose-400 hover:text-white bg-rose-950/60 hover:bg-rose-600 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Remove Plot
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Save Plot Icon
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
