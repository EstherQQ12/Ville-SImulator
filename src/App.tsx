import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HudOverlay } from './components/HudOverlay';
import { IconPainterModal } from './components/IconPainterModal';
import { InspectorPanel } from './components/InspectorPanel';
import { MapManagerModal } from './components/MapManagerModal';
import { NewspaperModal } from './components/NewspaperModal';
import { PauseModal } from './components/PauseModal';
import { TitleScreen } from './components/TitleScreen';
import { DEFAULT_BLUEPRINTS, PRESET_MAPS } from './data/defaultBlueprints';
import { isHighwayTile, isIntersectionTile } from './engine/pathfinding';
import { CameraState, HoverState, renderSimulation } from './engine/renderer';
import { CitySimulation } from './engine/simulation';
import {
  BuildingBlueprint,
  CityEventType,
  CrisisType,
  GameState,
  GRID_COLS,
  GRID_ROWS,
  ICON_SIZE,
  RoadIntersectionConfig,
  SavedMapData,
  SelectionTarget,
  SimulationStats,
  TILE_SIZE,
  ToolMode,
} from './types/game';
import { soundEngine } from './utils/sound';

const SAVED_MAPS_STORAGE_KEY = 'cartoville_saved_maps_v1';

function loadSavedMapsFromStorage(): SavedMapData[] {
  try {
    const raw = localStorage.getItem(SAVED_MAPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const simRef = useRef<CitySimulation | null>(null);
  if (!simRef.current) {
    simRef.current = new CitySimulation(PRESET_MAPS[0]);
  }

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<CameraState>({
    x: (GRID_COLS * TILE_SIZE) / 2,
    y: (GRID_ROWS * TILE_SIZE) / 2,
    zoom: 1,
  });
  const hoverRef = useRef<HoverState>({ tileX: -1, tileY: -1, visible: false });
  const heldKeysRef = useRef<Set<string>>(new Set());
  const isPanningRef = useRef(false);
  const isPaintingToolRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPaintedTileRef = useRef<string>('');
  const zebraPaintTargetRef = useRef<boolean>(true);
  const footbridgePaintTargetRef = useRef<boolean>(true);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const sessionInitializedRef = useRef<boolean>(false);

  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_MAPS[0].id);
  const [savedMaps, setSavedMaps] = useState<SavedMapData[]>(() => loadSavedMapsFromStorage());
  const [mapName, setMapName] = useState<string>(simRef.current.mapName);

  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [timeScale, setTimeScale] = useState<number>(1);
  const [toolMode, setToolMode] = useState<ToolMode>('pan');
  const [blueprints, setBlueprints] = useState<BuildingBlueprint[]>(() =>
    simRef.current!.getAllBlueprints()
  );
  const [activeBlueprintId, setActiveBlueprintId] = useState<string>(DEFAULT_BLUEPRINTS[0].id);
  const [showTrafficOverlay, setShowTrafficOverlay] = useState<boolean>(false);
  const showGrid = true;
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState<boolean>(false);
  const [isUiHidden, setIsUiHidden] = useState<boolean>(false);
  const [isNewspaperOpen, setIsNewspaperOpen] = useState<boolean>(false);
  const [draftNewsPhoto, setDraftNewsPhoto] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  const [selection, setSelection] = useState<SelectionTarget | null>(null);
  const [stats, setStats] = useState<SimulationStats>(() => simRef.current!.getStats());
  const [inspectorTick, setInspectorTick] = useState<number>(0);

  const [isMapManagerOpen, setIsMapManagerOpen] = useState<boolean>(false);
  const [painterState, setPainterState] = useState<{
    open: boolean;
    mode: 'create_blueprint' | 'edit_blueprint' | 'edit_placed';
    targetTile?: { x: number; y: number };
    blueprint: BuildingBlueprint;
  } | null>(null);

  // Refs for game loop access without re-binding RAF
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const toolModeRef = useRef(toolMode);
  toolModeRef.current = toolMode;
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const activeBlueprintRef = useRef<BuildingBlueprint | null>(
    blueprints.find((b) => b.id === activeBlueprintId) || blueprints[0] || null
  );
  activeBlueprintRef.current =
    blueprints.find((b) => b.id === activeBlueprintId) || blueprints[0] || null;
  const showTrafficRef = useRef(showTrafficOverlay);
  showTrafficRef.current = showTrafficOverlay;
  const showGridRef = useRef(showGrid);
  showGridRef.current = showGrid;
  const isUiHiddenRef = useRef(isUiHidden);
  isUiHiddenRef.current = isUiHidden;

  const fitCameraToViewport = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const mapW = GRID_COLS * TILE_SIZE;
    const mapH = GRID_ROWS * TILE_SIZE;
    const zoomX = (w - 80) / mapW;
    const zoomY = (h - 170) / mapH;
    const zoom = Math.max(0.55, Math.min(1.35, Math.min(zoomX, zoomY)));
    cameraRef.current = {
      x: mapW / 2,
      y: mapH / 2 + 12,
      zoom,
    };
  }, []);

  useEffect(() => {
    fitCameraToViewport();
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [fitCameraToViewport]);

  // Core 60fps Simulation & Render Loop (decoupled from React)
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;
    let lastSyncedMinute = -1;

    const frame = (now: number) => {
      const rawDt = Math.max(0, (now - lastTime) / 1000);
      lastTime = now;
      const clampedDt = Math.min(rawDt, 0.25);
      const dt = Math.min(rawDt, 0.05);
      const sim = simRef.current!;

      // Camera continuous WASD/Arrow pan during PLAYING
      if (gameStateRef.current === 'PLAYING') {
        const keys = heldKeysRef.current;
        const panSpeed = 460 / cameraRef.current.zoom;
        let dx = 0;
        let dy = 0;
        if (keys.has('w') || keys.has('arrowup')) dy -= 1;
        if (keys.has('s') || keys.has('arrowdown')) dy += 1;
        if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
        if (keys.has('d') || keys.has('arrowright')) dx += 1;
        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy);
          cameraRef.current.x += (dx / len) * panSpeed * dt;
          cameraRef.current.y += (dy / len) * panSpeed * dt;
          clampCamera(cameraRef.current);
        }
      } else if (gameStateRef.current === 'TITLE_MENU') {
        // Gentle atmospheric camera pan across the live running city
        const t = now * 0.00018;
        const mapW = GRID_COLS * TILE_SIZE;
        const mapH = GRID_ROWS * TILE_SIZE;
        cameraRef.current.x = mapW * 0.54 + Math.sin(t) * 140;
        cameraRef.current.y = mapH * 0.5 + Math.cos(t * 0.8) * 75;
        cameraRef.current.zoom = 1.05;
      }

      // Step simulation at most once per frame so brief frame dips never trigger a CPU freeze spiral
      if (gameStateRef.current !== 'PAUSED') {
        const isPlay = gameStateRef.current === 'PLAYING';
        sim.step(dt, isPlay);
        if (clampedDt > dt) {
          sim.advanceClockOnly(clampedDt - dt);
        }
      }

      // Render to isolated Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          ctx.save();
          ctx.scale(dpr, dpr);
          renderSimulation(ctx, window.innerWidth, window.innerHeight, sim, {
            camera: cameraRef.current,
            hover: hoverRef.current,
            selection: gameStateRef.current === 'PLAYING' ? selectionRef.current : null,
            toolMode: gameStateRef.current === 'PLAYING' ? toolModeRef.current : 'select',
            activeBlueprint: activeBlueprintRef.current,
            showTrafficOverlay: showTrafficRef.current,
            showGrid: gameStateRef.current === 'PLAYING' ? showGridRef.current : false,
            wallTimeSeconds: now / 1000,
          });
          ctx.restore();
        }
      }

      // Sync HUD immediately when the game minute advances (or at 4Hz) so the clock ticks smoothly
      hudSyncAccum += clampedDt;
      const currMinute = Math.floor(sim.minutesOfDay);
      if (currMinute !== lastSyncedMinute || hudSyncAccum >= 0.25) {
        hudSyncAccum = 0;
        lastSyncedMinute = currMinute;
        setStats(sim.getStats());
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Keyboard listeners + blur safety
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
      if (isTyping) return;

      if (painterState?.open || isMapManagerOpen || isNewspaperOpen) {
        if (e.key === 'Escape') {
          setPainterState(null);
          setIsMapManagerOpen(false);
          setIsNewspaperOpen(false);
        }
        return;
      }

      if (gameStateRef.current === 'TITLE_MENU') return;

      const lower = e.key.toLowerCase();
      heldKeysRef.current.add(lower);

      if (e.key === 'Escape') {
        e.preventDefault();
        if (gameStateRef.current === 'PLAYING') {
          if (isUiHiddenRef.current) {
            setIsUiHidden(false);
          } else if (selectionRef.current) {
            setSelection(null);
          } else {
            setGameState('PAUSED');
          }
        } else if (gameStateRef.current === 'PAUSED') {
          setGameState('PLAYING');
        }
        return;
      }

      if (gameStateRef.current !== 'PLAYING') return;

      if (e.key === ' ') {
        e.preventDefault();
        const sim = simRef.current!;
        sim.isRunning = !sim.isRunning;
        setIsRunning(sim.isRunning);
        soundEngine.playUiTick();
      } else if (lower === 'm') {
        setToolMode('pan');
        soundEngine.playUiTick();
      } else if (lower === 'h') {
        setIsUiHidden((v) => !v);
        soundEngine.playUiTick();
      } else if (lower === 'v') {
        setToolMode('select');
        soundEngine.playUiTick();
      } else if (lower === 'c') {
        setToolMode('camera');
        soundEngine.playUiTick();
      } else if (lower === 'r') {
        setToolMode('road');
        soundEngine.playUiTick();
      } else if (lower === 'z') {
        setToolMode('zebra');
        soundEngine.playUiTick();
      } else if (lower === 'b') {
        setToolMode('footbridge');
        soundEngine.playUiTick();
      } else if (lower === 'x') {
        setToolMode('bulldoze');
        soundEngine.playUiTick();
      } else if (lower === 't') {
        setShowTrafficOverlay((v) => !v);
        soundEngine.playUiTick();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(e.key.toLowerCase());
    };

    const onBlur = () => {
      heldKeysRef.current.clear();
      activePointersRef.current.clear();
      isPanningRef.current = false;
      isPaintingToolRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [painterState, isMapManagerOpen, isNewspaperOpen]);

  const clampCamera = (cam: CameraState) => {
    const mapW = GRID_COLS * TILE_SIZE;
    const mapH = GRID_ROWS * TILE_SIZE;
    cam.x = Math.max(-120, Math.min(mapW + 120, cam.x));
    cam.y = Math.max(-120, Math.min(mapH + 120, cam.y));
  };

  const screenToTile = (
    clientX: number,
    clientY: number
  ): { tx: number; ty: number; wx: number; wy: number } => {
    const cam = cameraRef.current;
    const wx = (clientX - window.innerWidth / 2) / cam.zoom + cam.x;
    const wy = (clientY - window.innerHeight / 2) / cam.zoom + cam.y;
    return {
      tx: Math.floor(wx / TILE_SIZE),
      ty: Math.floor(wy / TILE_SIZE),
      wx,
      wy,
    };
  };

  const capturePhotoAtClient = (clientX: number, clientY: number) => {
    const sim = simRef.current!;
    const { wx, wy } = screenToTile(clientX, clientY);
    if (!sim.canPublishTodayPhotoNews()) {
      sim.floatingLabels.push({
        wx,
        wy: wy - 12,
        text: '1 photo per day!',
        color: '#FEF3C7',
        bgColor: '#334155',
        age: 0,
        maxAge: 1.6,
      });
      soundEngine.playBulldoze();
      setToolMode('pan');
      return;
    }

    const canvas = canvasRef.current;
    let dataUrl: string | undefined;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const dpr = canvas.width / Math.max(1, rect.width);
      const viewW = 360 * dpr;
      const viewH = 240 * dpr;
      const cx = (clientX - rect.left) * dpr;
      const cy = (clientY - rect.top) * dpr;
      const sx = Math.max(0, Math.min(canvas.width - viewW, cx - viewW / 2));
      const sy = Math.max(0, Math.min(canvas.height - viewH, cy - viewH / 2));
      const sw = Math.min(viewW, canvas.width);
      const sh = Math.min(viewH, canvas.height);

      const out = document.createElement('canvas');
      out.width = 360;
      out.height = 240;
      const oCtx = out.getContext('2d');
      if (oCtx) {
        oCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, 360, 240);
        dataUrl = out.toDataURL('image/jpeg', 0.85);
      }
    }

    soundEngine.playCameraShutter();
    setDraftNewsPhoto(dataUrl || null);
    setToolMode('pan');
    setIsNewspaperOpen(true);
  };

  const applyToolAtTile = (tx: number, ty: number, isClickStart: boolean) => {
    const sim = simRef.current!;
    const tile = sim.getTile(tx, ty);
    if (!tile) return;

    const key = `${tx},${ty}`;
    if (!isClickStart && lastPaintedTileRef.current === key) return;
    lastPaintedTileRef.current = key;

    const mode = toolModeRef.current;

    if (mode === 'select') {
      if (!isClickStart) return;
      if (tile.building) {
        setSelection({ type: 'building', x: tx, y: ty });
        soundEngine.playUiTick();
      } else if (tile.hasRoad) {
        setSelection({ type: 'intersection', x: tx, y: ty });
        soundEngine.playUiTick();
      } else if ((tile.terrain === 'water' && tile.hasFootbridge) || sim.getMarketStallAt(tx, ty)) {
        setSelection({ type: 'tile', x: tx, y: ty });
        soundEngine.playUiTick();
      } else {
        setSelection(null);
      }
      return;
    }

    if (mode === 'road') {
      if (sim.paveRoad(tx, ty)) {
        soundEngine.playPaveRoad();
      }
      return;
    }

    if (mode === 'zebra') {
      if (!tile.hasRoad) return;
      if (isClickStart) {
        zebraPaintTargetRef.current = !tile.hasZebraCrossing;
      }
      if (sim.setZebraCrossing(tx, ty, zebraPaintTargetRef.current)) {
        soundEngine.playPaveRoad();
        setInspectorTick((t) => t + 1);
      }
      return;
    }

    if (mode === 'footbridge') {
      if (tile.terrain !== 'water' || tile.hasRoad || tile.building) return;
      if (isClickStart) {
        footbridgePaintTargetRef.current = !tile.hasFootbridge;
      }
      if (sim.setFootbridge(tx, ty, footbridgePaintTargetRef.current)) {
        soundEngine.playPaveRoad();
        setInspectorTick((t) => t + 1);
      }
      return;
    }

    if (mode === 'water') {
      if (sim.setTerrain(tx, ty, 'water')) {
        soundEngine.playPaveRoad();
      }
      return;
    }

    if (mode === 'forest') {
      if (sim.setTerrain(tx, ty, 'forest')) {
        soundEngine.playPaveRoad();
      }
      return;
    }

    if (mode === 'bulldoze') {
      if (sim.bulldozeTile(tx, ty)) {
        soundEngine.playBulldoze();
        if (selectionRef.current?.x === tx && selectionRef.current?.y === ty) {
          setSelection(null);
        }
      }
      return;
    }

    if (mode === 'plot') {
      const bp = activeBlueprintRef.current;
      if (bp) {
        if (!isClickStart && bp.category === 'city_hall') return;
        if (bp.category === 'city_hall' && sim.hasCityHall()) {
          sim.floatingLabels.push({
            wx: (tx + 0.5) * TILE_SIZE,
            wy: (ty + 0.35) * TILE_SIZE,
            text: 'Max 1 City Hall!',
            color: '#FEF2F2',
            bgColor: '#B91C1C',
            age: 0,
            maxAge: 1.6,
          });
          soundEngine.playBulldoze();
          return;
        }
        const placed = sim.placeBuilding(tx, ty, bp);
        if (placed) {
          soundEngine.playPlaceBuilding();
          setSelection({ type: 'building', x: tx, y: ty });
          setStats(sim.getStats());
          if (placed.category === 'city_hall') {
            setToolMode('select');
          }
        }
      }
    }
  };

  const zoomByFactor = (factor: number, anchorX?: number, anchorY?: number) => {
    const cam = cameraRef.current;
    const cx = anchorX ?? window.innerWidth / 2;
    const cy = anchorY ?? window.innerHeight / 2;
    const nextZoom = Math.max(0.45, Math.min(2.5, cam.zoom * factor));
    const worldBeforeX = (cx - window.innerWidth / 2) / cam.zoom + cam.x;
    const worldBeforeY = (cy - window.innerHeight / 2) / cam.zoom + cam.y;
    cam.zoom = nextZoom;
    cam.x = worldBeforeX - (cx - window.innerWidth / 2) / cam.zoom;
    cam.y = worldBeforeY - (cy - window.innerHeight / 2) / cam.zoom;
    clampCamera(cam);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    // Multi-touch gesture (two-finger pinch-to-zoom & pan) overrides active tool
    if (activePointersRef.current.size >= 2) {
      isPaintingToolRef.current = false;
      isPanningRef.current = false;
      hoverRef.current.visible = false;
      return;
    }

    // Move tool, right-click, middle-click, or Alt+drag pans camera
    if (e.button === 1 || e.button === 2 || e.altKey || toolModeRef.current === 'pan') {
      isPanningRef.current = true;
      return;
    }

    if (e.button === 0) {
      if (toolModeRef.current === 'camera') {
        capturePhotoAtClient(e.clientX, e.clientY);
        return;
      }
      isPaintingToolRef.current = true;
      lastPaintedTileRef.current = '';
      const { tx, ty } = screenToTile(e.clientX, e.clientY);
      applyToolAtTile(tx, ty, true);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pointers = activePointersRef.current;

    // Two-finger pinch-to-zoom & pan on mobile / touchscreens
    if (pointers.size >= 2 && pointers.has(e.pointerId) && gameState === 'PLAYING') {
      const prevList = Array.from(pointers.values());
      const prevA = prevList[0];
      const prevB = prevList[1];
      const prevMidX = (prevA.x + prevB.x) / 2;
      const prevMidY = (prevA.y + prevB.y) / 2;
      const prevDist = Math.hypot(prevB.x - prevA.x, prevB.y - prevA.y);

      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const nextList = Array.from(pointers.values());
      const nextA = nextList[0];
      const nextB = nextList[1];
      const nextMidX = (nextA.x + nextB.x) / 2;
      const nextMidY = (nextA.y + nextB.y) / 2;
      const nextDist = Math.hypot(nextB.x - nextA.x, nextB.y - nextA.y);

      const cam = cameraRef.current;
      cam.x -= (nextMidX - prevMidX) / cam.zoom;
      cam.y -= (nextMidY - prevMidY) / cam.zoom;
      if (prevDist > 10 && nextDist > 10) {
        zoomByFactor(nextDist / prevDist, nextMidX, nextMidY);
      } else {
        clampCamera(cam);
      }
      hoverRef.current.visible = false;
      return;
    }

    if (pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const { tx, ty, wx, wy } = screenToTile(e.clientX, e.clientY);
    hoverRef.current = {
      tileX: tx,
      tileY: ty,
      worldX: wx,
      worldY: wy,
      visible: gameState === 'PLAYING',
    };

    if (isPanningRef.current) {
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      cameraRef.current.x -= dx / cameraRef.current.zoom;
      cameraRef.current.y -= dy / cameraRef.current.zoom;
      clampCamera(cameraRef.current);
      return;
    }

    if (isPaintingToolRef.current && gameState === 'PLAYING') {
      applyToolAtTile(tx, ty, false);
    }
  };

  const handleCanvasPointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) {
      activePointersRef.current.delete(e.pointerId);
    } else {
      activePointersRef.current.clear();
    }
    if (activePointersRef.current.size === 0) {
      isPanningRef.current = false;
      isPaintingToolRef.current = false;
      lastPaintedTileRef.current = '';
    }
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    zoomByFactor(zoomFactor, e.clientX, e.clientY);
  };

  const handleLoadMap = (map: SavedMapData) => {
    const sim = simRef.current!;
    sim.loadMap(map);
    sessionInitializedRef.current = false;
    setSelectedPresetId(map.id);
    setMapName(map.name);
    setBlueprints(sim.getAllBlueprints());
    setSelection(null);
    setDraftNewsPhoto(null);
    setStats(sim.getStats());
    if (gameState === 'PLAYING') {
      fitCameraToViewport();
    }
  };

  const handleSaveMap = (name: string) => {
    const sim = simRef.current!;
    sim.mapName = name;
    setMapName(name);
    const id = `custom_${Date.now()}`;
    sim.mapId = id;
    const exported = sim.exportMapData(name);
    exported.id = id;

    setSavedMaps((prev) => {
      const next = [exported, ...prev];
      try {
        localStorage.setItem(SAVED_MAPS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  const saveResetTimerRef = useRef<number | null>(null);

  const handleSaveChanges = () => {
    const sim = simRef.current!;
    const currentId = sim.mapId.startsWith('preset_') ? `saved_${sim.mapId}` : sim.mapId;
    sim.mapId = currentId;
    const exported = sim.exportMapData(sim.mapName);
    exported.id = currentId;

    setSavedMaps((prev) => {
      const idx = prev.findIndex((m) => m.id === currentId);
      const next = idx >= 0 ? prev.map((m, i) => (i === idx ? exported : m)) : [exported, ...prev];
      try {
        localStorage.setItem(SAVED_MAPS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });

    soundEngine.playSaveIcon();
    setJustSaved(true);
    if (saveResetTimerRef.current !== null) {
      window.clearTimeout(saveResetTimerRef.current);
    }
    saveResetTimerRef.current = window.setTimeout(() => {
      setJustSaved(false);
    }, 2000);
  };

  const handleDeleteSavedMap = (id: string) => {
    setSavedMaps((prev) => {
      const next = prev.filter((m) => m.id !== id);
      try {
        localStorage.setItem(SAVED_MAPS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  const handleStartGame = () => {
    soundEngine.playUiTick();
    if (!sessionInitializedRef.current) {
      simRef.current!.prepareForPlaySession();
      sessionInitializedRef.current = true;
    }
    simRef.current!.isRunning = true;
    setStats(simRef.current!.getStats());
    setGameState('PLAYING');
    setToolMode('pan');
    setIsRunning(true);
    fitCameraToViewport();
  };

  const openCreateBlueprintPainter = () => {
    soundEngine.playUiTick();
    setPainterState({
      open: true,
      mode: 'create_blueprint',
      blueprint: {
        id: `custom_bp_${Date.now()}`,
        name: 'Library',
        category: 'visit_spot',
        iconGrid: new Array<string>(ICON_SIZE * ICON_SIZE).fill(''),
        accentColor: '#EA580C',
        capacity: 24,
        isCustom: true,
      },
    });
  };

  const openEditBlueprintPainter = (bp: BuildingBlueprint) => {
    soundEngine.playUiTick();
    setPainterState({
      open: true,
      mode: 'edit_blueprint',
      blueprint: { ...bp, iconGrid: [...bp.iconGrid] },
    });
  };

  const openEditPlacedBuildingPainter = (x: number, y: number) => {
    const tile = simRef.current!.getTile(x, y);
    if (!tile?.building) return;
    soundEngine.playUiTick();
    setPainterState({
      open: true,
      mode: 'edit_placed',
      targetTile: { x, y },
      blueprint: {
        id: tile.building.blueprintId,
        name: tile.building.name,
        category: tile.building.category,
        iconGrid: [...tile.building.iconGrid],
        accentColor: tile.building.accentColor,
        capacity: tile.building.capacity,
      },
    });
  };

  const handleSavePainter = (result: BuildingBlueprint) => {
    if (!painterState) return;
    const sim = simRef.current!;

    if (painterState.mode === 'edit_placed' && painterState.targetTile) {
      sim.updateBuildingData(painterState.targetTile.x, painterState.targetTile.y, {
        name: result.name,
        category: result.category,
        iconGrid: result.iconGrid,
        accentColor: result.accentColor,
      });
      setInspectorTick((t) => t + 1);
    } else {
      sim.saveBlueprint(result, true);
      setBlueprints([...sim.getAllBlueprints()]);
      setActiveBlueprintId(result.id);
      setToolMode('plot');
    }

    setPainterState(null);
  };

  const selectedTile =
    selection && gameState === 'PLAYING'
      ? simRef.current.getTile(selection.x, selection.y)
      : null;

  const selectedIsIntersection =
    selectedTile && selectedTile.hasRoad
      ? isIntersectionTile(simRef.current.tiles, selectedTile.x, selectedTile.y)
      : false;

  const selectedIsHighway =
    selectedTile && selectedTile.hasRoad
      ? isHighwayTile(simRef.current.tiles, selectedTile.x, selectedTile.y)
      : false;

  return (
    <div
      className="relative w-full h-[100dvh] overflow-hidden isolate touch-none bg-[#0F172A]"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Isolated 60fps Canvas Viewport */}
      <canvas
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        onPointerLeave={() => {
          hoverRef.current.visible = false;
        }}
        onWheel={handleCanvasWheel}
        className={`relative z-0 block w-full h-full touch-none ${
          gameState === 'PLAYING'
            ? toolMode === 'pan'
              ? 'cursor-grab active:cursor-grabbing'
              : toolMode === 'select'
              ? 'cursor-pointer'
              : 'cursor-crosshair'
            : 'cursor-default'
        }`}
      />

      {/* Title Screen */}
      {gameState === 'TITLE_MENU' && (
        <TitleScreen
          selectedPresetId={selectedPresetId}
          savedMaps={savedMaps}
          onSelectMap={handleLoadMap}
          onStartGame={handleStartGame}
        />
      )}

      {/* Active HUD */}
      {gameState !== 'TITLE_MENU' && (
        <HudOverlay
          mapName={mapName}
          stats={stats}
          isRunning={isRunning}
          timeScale={timeScale}
          toolMode={toolMode}
          blueprints={blueprints}
          activeBlueprintId={activeBlueprintId}
          showTrafficOverlay={showTrafficOverlay}
          isMuted={isMuted}
          isMusicEnabled={isMusicEnabled}
          justSaved={justSaved}
          isUiHidden={isUiHidden}
          onToggleRun={() => {
            const sim = simRef.current!;
            sim.isRunning = !sim.isRunning;
            setIsRunning(sim.isRunning);
            soundEngine.playUiTick();
          }}
          onSetTimeScale={(s) => {
            simRef.current!.timeScale = s;
            setTimeScale(s);
            soundEngine.playUiTick();
          }}
          onJumpToMinutes={(mins) => {
            simRef.current!.setMinutesOfDay(mins);
            setStats(simRef.current!.getStats());
            soundEngine.playUiTick();
          }}
          onSelectTool={(mode) => {
            setToolMode(mode);
            soundEngine.playUiTick();
          }}
          onSelectBlueprint={(id) => {
            setActiveBlueprintId(id);
            setToolMode('plot');
            soundEngine.playUiTick();
          }}
          onEditBlueprint={openEditBlueprintPainter}
          onDeleteBlueprint={(bpId) => {
            if (simRef.current!.deleteBlueprint(bpId)) {
              const all = simRef.current!.getAllBlueprints();
              setBlueprints(all);
              if (activeBlueprintId === bpId && all.length > 0) {
                setActiveBlueprintId(all[0].id);
              }
              soundEngine.playBulldoze();
            }
          }}
          onCreateBlueprint={openCreateBlueprintPainter}
          onToggleTrafficOverlay={() => {
            setShowTrafficOverlay((v) => !v);
            soundEngine.playUiTick();
          }}
          onToggleHideUi={() => {
            setIsUiHidden((v) => !v);
            soundEngine.playUiTick();
          }}
          onOpenMaps={() => {
            soundEngine.playUiTick();
            setIsMapManagerOpen(true);
          }}
          onSaveChanges={handleSaveChanges}
          onOpenNewspaper={() => {
            soundEngine.playUiTick();
            simRef.current!.markNewsRead();
            setStats(simRef.current!.getStats());
            setIsNewspaperOpen(true);
          }}
          onToggleMute={() => {
            const next = !isMuted;
            soundEngine.setMuted(next);
            setIsMuted(next);
          }}
          onToggleMusic={() => {
            const next = !isMusicEnabled;
            if (next && isMuted) {
              soundEngine.setMuted(false);
              setIsMuted(false);
            }
            soundEngine.setMusicEnabled(next);
            setIsMusicEnabled(next);
          }}
          onOpenPause={() => {
            soundEngine.playUiTick();
            setGameState('PAUSED');
          }}
          onFocusRobbery={() => {
            const active = simRef.current!.robberies.find((r) => r.status === 'active');
            if (active) {
              cameraRef.current.x = (active.x + 0.5) * TILE_SIZE;
              cameraRef.current.y = (active.y + 0.5) * TILE_SIZE;
              cameraRef.current.zoom = Math.max(cameraRef.current.zoom, 1.25);
              setSelection({ type: 'building', x: active.x, y: active.y });
              soundEngine.playUiTick();
            }
          }}
          onFocusProtest={() => {
            const active = simRef.current!.protests.find((p) => p.status === 'active');
            if (active) {
              cameraRef.current.x = (active.x + 0.5) * TILE_SIZE;
              cameraRef.current.y = (active.y + 0.5) * TILE_SIZE;
              cameraRef.current.zoom = Math.max(cameraRef.current.zoom, 1.25);
              setSelection({ type: 'building', x: active.x, y: active.y });
              soundEngine.playUiTick();
            }
          }}
          onFocusFire={() => {
            const active = simRef.current!.fires.find((f) => f.status === 'active');
            if (active) {
              cameraRef.current.x = active.wx;
              cameraRef.current.y = active.wy;
              cameraRef.current.zoom = Math.max(cameraRef.current.zoom, 1.25);
              setSelection({ type: 'building', x: active.x, y: active.y });
              soundEngine.playUiTick();
            }
          }}
          onFocusCrash={() => {
            const active = simRef.current!.crashes.find((c) => c.status === 'active');
            if (active) {
              cameraRef.current.x = active.wx;
              cameraRef.current.y = active.wy;
              cameraRef.current.zoom = Math.max(cameraRef.current.zoom, 1.3);
              setSelection({ type: 'intersection', x: active.x, y: active.y });
              soundEngine.playUiTick();
            }
          }}
          onFocusBrokenBridge={() => {
            const active = simRef.current!.brokenBridges.find((b) => b.status === 'broken');
            if (active) {
              cameraRef.current.x = (active.x + 0.5) * TILE_SIZE;
              cameraRef.current.y = (active.y + 0.5) * TILE_SIZE;
              cameraRef.current.zoom = Math.max(cameraRef.current.zoom, 1.3);
              setSelection({ type: 'tile', x: active.x, y: active.y });
              soundEngine.playUiTick();
            }
          }}
          onFocusCityHall={() => {
            const hallTile = simRef.current!.tiles.find((t) => t.building?.category === 'city_hall');
            if (hallTile) {
              cameraRef.current.x = (hallTile.x + 0.5) * TILE_SIZE;
              cameraRef.current.y = (hallTile.y + 0.5) * TILE_SIZE;
              cameraRef.current.zoom = Math.max(cameraRef.current.zoom, 1.25);
              setSelection({ type: 'building', x: hallTile.x, y: hallTile.y });
              soundEngine.playUiTick();
            }
          }}
          onCycleSeason={() => {
            simRef.current!.cycleSeason(true);
            setStats(simRef.current!.getStats());
          }}
          onCycleWeather={() => {
            simRef.current!.cycleWeather(true);
            setStats(simRef.current!.getStats());
          }}
        />
      )}

      {/* Contextual Tile / Plot / Intersection Inspector */}
      {gameState === 'PLAYING' && selectedTile && !isUiHidden && (
        <div
          key={`${selectedTile.x}_${selectedTile.y}_${inspectorTick}`}
          className="absolute top-32 xl:top-24 right-[max(0.875rem,env(safe-area-inset-right))] z-30 transform-gpu pointer-events-none max-h-[calc(100dvh-13rem)] overflow-y-auto touch-pan-y"
        >
          <InspectorPanel
            tile={selectedTile}
            neighbourhood={
              selectedTile.building
                ? simRef.current.getNeighbourhoodForBuilding(selectedTile.building.id)
                : null
            }
            robbery={simRef.current.getRobberyAt(selectedTile.x, selectedTile.y)}
            protest={simRef.current.getProtestAt(selectedTile.x, selectedTile.y)}
            cityEvent={simRef.current.getEventAt(selectedTile.x, selectedTile.y)}
            fire={simRef.current.getFireAt(selectedTile.x, selectedTile.y)}
            crash={simRef.current.getCrashAt(selectedTile.x, selectedTile.y)}
            stall={simRef.current.getMarketStallAt(selectedTile.x, selectedTile.y)}
            crises={simRef.current.crises}
            cratersCount={simRef.current.blastCraters.length}
            economyScore={stats.economyScore}
            totalLawsuits={stats.totalLawsuits}
            prisonInmates={stats.prisonInmates}
            totalJailed={stats.totalJailed}
            totalReleased={stats.totalReleased}
            mayorAlive={stats.mayorAlive}
            electionActive={stats.electionActive}
            electionRemaining={stats.electionRemaining}
            basementCount={stats.basementCount}
            chaosCooldowns={stats.chaosCooldowns}
            mayorSpeech={
              selectedTile.building
                ? simRef.current.mayorSpeeches.find(
                    (s) => s.cityHallId === selectedTile.building!.id
                  ) || null
                : null
            }
            isIntersection={selectedIsIntersection}
            isHighway={selectedIsHighway}
            nsSignal={simRef.current.getSignalAspect(selectedTile, 'NS')}
            ewSignal={simRef.current.getSignalAspect(selectedTile, 'EW')}
            onClose={() => setSelection(null)}
            onEditBuildingIcon={openEditPlacedBuildingPainter}
            onRenameBuilding={(x, y, newName) => {
              simRef.current!.updateBuildingData(x, y, { name: newName });
              setInspectorTick((t) => t + 1);
            }}
            onDeleteTile={(x, y) => {
              simRef.current!.bulldozeTile(x, y);
              soundEngine.playBulldoze();
              setSelection(null);
            }}
            onUpdateIntersection={(x, y, cfg: Partial<RoadIntersectionConfig>) => {
              simRef.current!.updateIntersectionConfig(x, y, cfg);
              soundEngine.playUiTick();
              setInspectorTick((t) => t + 1);
            }}
            onTriggerProtest={(x, y) => {
              simRef.current!.triggerProtestAt(x, y, true);
              setStats(simRef.current!.getStats());
              setInspectorTick((t) => t + 1);
            }}
            onHostCityEvent={(x, y, evType: CityEventType) => {
              simRef.current!.hostCityEvent(x, y, evType, undefined, true);
              setStats(simRef.current!.getStats());
              setInspectorTick((t) => t + 1);
            }}
            onTriggerCrisis={(crisisType: CrisisType) => {
              simRef.current!.triggerCrisis(crisisType, undefined, true);
              setStats(simRef.current!.getStats());
              setInspectorTick((t) => t + 1);
            }}
            onTriggerNuke={() => {
              simRef.current!.triggerNukeStrike(undefined, undefined, true);
              setStats(simRef.current!.getStats());
              setInspectorTick((t) => t + 1);
            }}
            onSpawnInvaders={() => {
              simRef.current!.triggerInvasionWave(true);
              setStats(simRef.current!.getStats());
              setInspectorTick((t) => t + 1);
            }}
            onToggleZebraCrossing={(x, y) => {
              if (simRef.current!.setZebraCrossing(x, y)) {
                soundEngine.playPaveRoad();
                setInspectorTick((t) => t + 1);
              }
            }}
            onRemoveFootbridge={(x, y) => {
              if (simRef.current!.setFootbridge(x, y, false)) {
                soundEngine.playBulldoze();
                setSelection(null);
              }
            }}
          />
        </div>
      )}

      {/* Custom Icon Drawing Studio */}
      {painterState && (
        <IconPainterModal
          isOpen={painterState.open}
          mode={painterState.mode}
          initialBlueprint={painterState.blueprint}
          hasCityHall={stats.hasCityHall}
          onClose={() => setPainterState(null)}
          onSave={handleSavePainter}
        />
      )}

      {/* Save / Load Maps Manager */}
      <MapManagerModal
        isOpen={isMapManagerOpen}
        currentMapName={mapName}
        savedMaps={savedMaps}
        onClose={() => setIsMapManagerOpen(false)}
        onSaveMap={handleSaveMap}
        onLoadMap={handleLoadMap}
        onDeleteSavedMap={handleDeleteSavedMap}
      />

      {/* Daily Photojournalism Newspaper Modal */}
      <NewspaperModal
        isOpen={isNewspaperOpen}
        mapName={mapName}
        editions={simRef.current.newspapers}
        dayCount={stats.dayCount}
        dayOfWeek={stats.dayOfWeek}
        season={stats.season}
        weather={stats.weather}
        canPublishToday={simRef.current.canPublishTodayPhotoNews()}
        draftPhotoDataUrl={draftNewsPhoto}
        dailyHints={simRef.current.getDailyNewsHints()}
        onTakePhoto={() => {
          setIsNewspaperOpen(false);
          setToolMode('camera');
          soundEngine.playUiTick();
        }}
        onPublish={(headlineText, summaryText, photoDataUrl) => {
          simRef.current!.publishUserNewspaper(headlineText, summaryText, photoDataUrl);
          setDraftNewsPhoto(null);
          setStats(simRef.current!.getStats());
          soundEngine.playSaveIcon();
        }}
        onClearDraft={() => setDraftNewsPhoto(null)}
        onClose={() => {
          setIsNewspaperOpen(false);
          setDraftNewsPhoto(null);
        }}
      />

      {/* Pause Modal */}
      <PauseModal
        isOpen={gameState === 'PAUSED'}
        mapName={mapName}
        justSaved={justSaved}
        onResume={() => {
          soundEngine.playUiTick();
          setGameState('PLAYING');
        }}
        onSaveChanges={handleSaveChanges}
        onOpenMapManager={() => {
          setGameState('PLAYING');
          setIsMapManagerOpen(true);
        }}
        onReturnToTitle={() => {
          soundEngine.playUiTick();
          setSelection(null);
          setGameState('TITLE_MENU');
        }}
      />
    </div>
  );
}
