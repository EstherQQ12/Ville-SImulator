import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HudOverlay } from './components/HudOverlay';
import { IconPainterModal } from './components/IconPainterModal';
import { InspectorPanel } from './components/InspectorPanel';
import { MapManagerModal } from './components/MapManagerModal';
import { NewspaperModal, NormalizedCropRect } from './components/NewspaperModal';
import { PauseModal } from './components/PauseModal';
import { PermitProposalsModal } from './components/PermitProposalsModal';
import { PlaceFinderModal } from './components/PlaceFinderModal';
import { TitleScreen } from './components/TitleScreen';
import { TutorialHighlightTarget, TutorialOverlay, TutorialStep } from './components/TutorialOverlay';
import {
  createBiomePreset,
  createCustomBiomePreset,
  createTutorialPreset,
  DEFAULT_BLUEPRINTS,
  PRESET_MAPS,
} from './data/defaultBlueprints';
import { isHighwayTile, isIntersectionTile } from './engine/pathfinding';
import { CameraState, HoverState, renderSimulation } from './engine/renderer';
import { CitySimulation } from './engine/simulation';
import {
  BuildingBlueprint,
  CityEventType,
  CrisisType,
  CustomBiomeConfig,
  GameState,
  ICON_SIZE,
  MapTemplateKind,
  RoadIntersectionConfig,
  SavedMapData,
  SelectionTarget,
  SimulationStats,
  TILE_SIZE,
  ToolMode,
  TrashedMapEntry,
} from './types/game';
import { soundEngine } from './utils/sound';

const SAVED_MAPS_STORAGE_KEY = 'cartoville_saved_maps_v1';
const TRASHED_MAPS_STORAGE_KEY = 'villesim_trashed_maps_v1';
const HIDDEN_PRESETS_STORAGE_KEY = 'villesim_hidden_presets_v1';
const RUNTIME_MAPS_STORAGE_KEY = 'villesim_runtime_maps_v1';
const LAST_ACTIVE_MAP_ID_KEY = 'villesim_last_map_id_v1';

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

function loadRuntimeMapsFromStorage(): Record<string, SavedMapData> {
  try {
    const raw = localStorage.getItem(RUNTIME_MAPS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getLastActiveMapId(): string | null {
  try {
    return localStorage.getItem(LAST_ACTIVE_MAP_ID_KEY);
  } catch {
    return null;
  }
}

function writeRuntimeMapToStorage(data: SavedMapData): Record<string, SavedMapData> {
  const all = loadRuntimeMapsFromStorage();
  all[data.id] = data;
  try {
    localStorage.setItem(RUNTIME_MAPS_STORAGE_KEY, JSON.stringify(all));
    localStorage.setItem(LAST_ACTIVE_MAP_ID_KEY, data.id);
  } catch {
    // Ignore storage quota errors
  }
  return all;
}

function loadTrashedMapsFromStorage(): TrashedMapEntry[] {
  try {
    const raw = localStorage.getItem(TRASHED_MAPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadHiddenPresetIdsFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function removeRuntimeMapFromStorage(id: string) {
  try {
    const all = loadRuntimeMapsFromStorage();
    if (all[id]) {
      delete all[id];
      localStorage.setItem(RUNTIME_MAPS_STORAGE_KEY, JSON.stringify(all));
    }
    if (localStorage.getItem(LAST_ACTIVE_MAP_ID_KEY) === id) {
      localStorage.removeItem(LAST_ACTIVE_MAP_ID_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export default function App() {
  const initialSavedMaps = loadSavedMapsFromStorage();
  const initialTrashedMaps = loadTrashedMapsFromStorage();
  const initialHiddenPresetIds = loadHiddenPresetIdsFromStorage();
  const initialRuntimeMaps = loadRuntimeMapsFromStorage();
  const simRef = useRef<CitySimulation | null>(null);
  if (!simRef.current) {
    const lastId = getLastActiveMapId();
    const visiblePresets = PRESET_MAPS.filter((m) => !initialHiddenPresetIds.includes(m.id));
    const fallbackMap = initialSavedMaps[0] || visiblePresets[0] || PRESET_MAPS[0];
    const initialMap =
      (lastId && initialRuntimeMaps[lastId]) ||
      (lastId && initialSavedMaps.find((m) => m.id === lastId)) ||
      (lastId && visiblePresets.find((m) => m.id === lastId)) ||
      initialRuntimeMaps[fallbackMap.id] ||
      fallbackMap;
    simRef.current = new CitySimulation(initialMap);
  }

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<CameraState>({
    x: (simRef.current.gridCols * TILE_SIZE) / 2,
    y: (simRef.current.gridRows * TILE_SIZE) / 2,
    zoom: 1,
  });
  const hoverRef = useRef<HoverState>({ tileX: -1, tileY: -1, visible: false });
  const heldKeysRef = useRef<Set<string>>(new Set());
  const isPanningRef = useRef(false);
  const isPaintingToolRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPaintedTileRef = useRef<string>('');
  const lastPointerTileRef = useRef<{ x: number; y: number } | null>(null);
  const zebraPaintTargetRef = useRef<boolean>(true);
  const footbridgePaintTargetRef = useRef<boolean>(true);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const sessionInitializedRef = useRef<boolean>(Boolean(simRef.current.dayCount > 1));
  const lastWallClockMsRef = useRef<number>(Date.now());

  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(simRef.current.mapId);
  const [savedMaps, setSavedMaps] = useState<SavedMapData[]>(initialSavedMaps);
  const [trashedMaps, setTrashedMaps] = useState<TrashedMapEntry[]>(initialTrashedMaps);
  const [hiddenPresetIds, setHiddenPresetIds] = useState<string[]>(initialHiddenPresetIds);
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
  const [draftInitialCrop, setDraftInitialCrop] = useState<NormalizedCropRect | null>(null);

  const [selection, setSelection] = useState<SelectionTarget | null>(null);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [stats, setStats] = useState<SimulationStats>(() => simRef.current!.getStats());
  const [inspectorTick, setInspectorTick] = useState<number>(0);

  const [isMapManagerOpen, setIsMapManagerOpen] = useState<boolean>(false);
  const [isPlaceFinderOpen, setIsPlaceFinderOpen] = useState<boolean>(false);
  const [isPermitsOpen, setIsPermitsOpen] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<TutorialStep | null>(null);
  const [painterState, setPainterState] = useState<{
    open: boolean;
    mode: 'create_blueprint' | 'edit_blueprint' | 'edit_placed';
    targetTile?: { x: number; y: number };
    blueprint: BuildingBlueprint;
  } | null>(null);

  const tutorialStepRef = useRef<TutorialStep | null>(tutorialStep);
  tutorialStepRef.current = tutorialStep;

  // Refs for game loop access without re-binding RAF
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const toolModeRef = useRef(toolMode);
  toolModeRef.current = toolMode;
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const selectedCarIdRef = useRef(selectedCarId);
  selectedCarIdRef.current = selectedCarId;
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
  const uiWasHiddenBeforeCameraRef = useRef<boolean>(false);

  const persistCurrentRuntimeMap = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    const exported = sim.exportMapData(sim.mapName);
    const isTrashed = loadTrashedMapsFromStorage().some((t) => t.map.id === exported.id);
    if (isTrashed) return;
    writeRuntimeMapToStorage(exported);
    const isPreset = PRESET_MAPS.some((p) => p.id === exported.id);
    if (!isPreset && exported.id !== 'tutorial_town') {
      try {
        const existing = loadSavedMapsFromStorage();
        const idx = existing.findIndex((m) => m.id === exported.id);
        const next = idx >= 0 ? existing.map((m, i) => (i === idx ? exported : m)) : [exported, ...existing];
        localStorage.setItem(SAVED_MAPS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
    }
  }, []);

  const fitCameraToViewport = useCallback(() => {
    const sim = simRef.current!;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const mapW = sim.gridCols * TILE_SIZE;
    const mapH = sim.gridRows * TILE_SIZE;
    const zoomX = (w - 80) / mapW;
    const zoomY = (h - 170) / mapH;
    const zoom = Math.max(0.5, Math.min(1.35, Math.min(zoomX, zoomY)));
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

      const wallNowMs = Date.now();
      const hiddenGapSec = (wallNowMs - lastWallClockMsRef.current) / 1000;
      lastWallClockMsRef.current = wallNowMs;
      if (hiddenGapSec > 1.2 && gameStateRef.current !== 'PAUSED' && sim.isRunning) {
        sim.advanceBackgroundSeconds(hiddenGapSec);
      }

      const camShift = sim.consumePendingCameraShift();
      if (camShift) {
        cameraRef.current.x += camShift.dx;
        cameraRef.current.y += camShift.dy;
      }

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
        const mapW = sim.gridCols * TILE_SIZE;
        const mapH = sim.gridRows * TILE_SIZE;
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
            selectedCarId: gameStateRef.current === 'PLAYING' ? selectedCarIdRef.current : null,
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

  // Background Tab Time Progression + Periodic Auto-Save Per Map
  useEffect(() => {
    const tickBackground = () => {
      const sim = simRef.current;
      if (!sim) return;
      const nowMs = Date.now();
      const elapsedSec = (nowMs - lastWallClockMsRef.current) / 1000;
      if (document.hidden && sim.isRunning && gameStateRef.current !== 'PAUSED' && elapsedSec > 0.5) {
        lastWallClockMsRef.current = nowMs;
        sim.advanceBackgroundSeconds(elapsedSec);
        setStats(sim.getStats());
      }
      if (gameStateRef.current === 'PLAYING') {
        persistCurrentRuntimeMap();
      }
    };

    const intervalId = window.setInterval(tickBackground, 4000);
    const onVisibility = () => {
      const sim = simRef.current;
      if (!sim) return;
      const nowMs = Date.now();
      if (document.hidden) {
        lastWallClockMsRef.current = nowMs;
        persistCurrentRuntimeMap();
      } else {
        const elapsedSec = (nowMs - lastWallClockMsRef.current) / 1000;
        lastWallClockMsRef.current = nowMs;
        if (elapsedSec > 0.5 && sim.isRunning && gameStateRef.current !== 'PAUSED') {
          sim.advanceBackgroundSeconds(elapsedSec);
          setStats(sim.getStats());
        }
      }
    };
    const onUnload = () => {
      persistCurrentRuntimeMap();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
    };
  }, [persistCurrentRuntimeMap]);

  // Keyboard listeners + blur safety
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
      if (isTyping) return;

      if (painterState?.open || isMapManagerOpen || isNewspaperOpen || isPlaceFinderOpen) {
        if (e.key === 'Escape') {
          setPainterState(null);
          setIsMapManagerOpen(false);
          setIsNewspaperOpen(false);
          setIsPlaceFinderOpen(false);
        }
        return;
      }

      if (gameStateRef.current === 'TITLE_MENU') return;

      const lower = e.key.toLowerCase();
      heldKeysRef.current.add(lower);

      if (e.key === 'Escape') {
        e.preventDefault();
        if (gameStateRef.current === 'PLAYING') {
          if (toolModeRef.current === 'camera') {
            setToolMode('pan');
            setIsUiHidden(uiWasHiddenBeforeCameraRef.current);
            soundEngine.playUiTick();
          } else if (isUiHiddenRef.current) {
            setIsUiHidden(false);
          } else if (selectionRef.current || selectedCarIdRef.current) {
            setSelection(null);
            setSelectedCarId(null);
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
        uiWasHiddenBeforeCameraRef.current = isUiHiddenRef.current;
        setIsUiHidden(true);
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
      } else if (lower === 'f') {
        setIsPlaceFinderOpen(true);
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
  }, [painterState, isMapManagerOpen, isNewspaperOpen, isPlaceFinderOpen]);

  const clampCamera = (cam: CameraState) => {
    const sim = simRef.current!;
    const mapW = sim.gridCols * TILE_SIZE;
    const mapH = sim.gridRows * TILE_SIZE;
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
      setIsUiHidden(uiWasHiddenBeforeCameraRef.current);
      return;
    }

    const canvas = canvasRef.current;
    let dataUrl: string | undefined;
    let initCrop: NormalizedCropRect = { x: 0.22, y: 0.2, w: 0.56, h: 0.56 };

    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const vw = Math.max(320, Math.round(rect.width || window.innerWidth));
      const vh = Math.max(240, Math.round(rect.height || window.innerHeight));
      const scale = Math.min(2, window.devicePixelRatio || 1.5);

      const snap = document.createElement('canvas');
      snap.width = Math.round(vw * scale);
      snap.height = Math.round(vh * scale);
      const sCtx = snap.getContext('2d');
      if (sCtx) {
        sCtx.save();
        sCtx.scale(scale, scale);
        renderSimulation(sCtx, vw, vh, sim, {
          camera: cameraRef.current,
          hover: { tileX: -1, tileY: -1, visible: false },
          selection: null,
          toolMode: 'pan',
          activeBlueprint: activeBlueprintRef.current,
          showTrafficOverlay: showTrafficRef.current,
          showGrid: showGridRef.current,
          wallTimeSeconds: performance.now() / 1000,
        });
        sCtx.restore();
        dataUrl = snap.toDataURL('image/png');
      }

      const cropW = Math.min(0.88, Math.max(0.24, (360 * cameraRef.current.zoom) / vw));
      const cropH = Math.min(0.88, Math.max(0.24, (240 * cameraRef.current.zoom) / vh));
      const relX = (clientX - rect.left) / vw;
      const relY = (clientY - rect.top) / vh;
      initCrop = {
        x: Math.max(0, Math.min(1 - cropW, relX - cropW / 2)),
        y: Math.max(0, Math.min(1 - cropH, relY - cropH / 2)),
        w: cropW,
        h: cropH,
      };
    }

    soundEngine.playCameraShutter();
    setDraftInitialCrop(initCrop);
    setDraftNewsPhoto(dataUrl || null);
    setToolMode('pan');
    setIsUiHidden(uiWasHiddenBeforeCameraRef.current);
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
      } else if (
        (tile.terrain === 'water' && tile.hasFootbridge) ||
        sim.getMarketStallAt(tx, ty) ||
        sim.getProposalAt(tx, ty) ||
        sim.getConstructionAt(tx, ty)
      ) {
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
          setStats(sim.getStats());
          if (placed.category === 'city_hall') {
            setToolMode('select');
            if (tutorialStepRef.current === 1) {
              setSelection(null);
              setTutorialStep(2);
              sim.floatingLabels.push({
                wx: (tx + 0.5) * TILE_SIZE,
                wy: (ty + 0.2) * TILE_SIZE,
                text: 'Now click City Hall!',
                color: '#0F172A',
                bgColor: '#FACC15',
                age: 0,
                maxAge: 3.4,
              });
            } else {
              setSelection({ type: 'building', x: tx, y: ty });
            }
          } else {
            setSelection({ type: 'building', x: tx, y: ty });
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
      lastPointerTileRef.current = null;
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
      const { tx, ty, wx, wy } = screenToTile(e.clientX, e.clientY);
      if (toolModeRef.current === 'select') {
        let nearestCarId: string | null = null;
        let bestDist = 18;
        for (const car of simRef.current!.cars) {
          const d = Math.hypot(car.wx - wx, car.wy - wy);
          if (d < bestDist) {
            bestDist = d;
            nearestCarId = car.id;
          }
        }
        if (nearestCarId) {
          setSelectedCarId(nearestCarId);
          setSelection(null);
          soundEngine.playUiTick();
          return;
        }
        setSelectedCarId(null);
      } else {
        setSelectedCarId(null);
      }
      isPaintingToolRef.current = true;
      lastPaintedTileRef.current = '';
      lastPointerTileRef.current = { x: tx, y: ty };
      applyToolAtTile(tx, ty, true);
    }
  };

  // Supercover grid walk so fast pointer sweeps never skip intermediate tiles
  const getGridLineTiles = (x0: number, y0: number, x1: number, y1: number) => {
    const pts: { x: number; y: number }[] = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let x = x0;
    let y = y0;
    let n = 1 + dx + dy;
    let err = dx - dy;
    const dx2 = dx * 2;
    const dy2 = dy * 2;
    for (; n > 0; --n) {
      pts.push({ x, y });
      if (x === x1 && y === y1) break;
      if (err > 0) {
        x += sx;
        err -= dy2;
      } else if (err < 0) {
        y += sy;
        err += dx2;
      } else {
        // Step orthogonally first, then diagonally, so adjacent chains stay 4-connected
        pts.push({ x: x + sx, y });
        x += sx;
        y += sy;
        err += dx2 - dy2;
        n--;
      }
    }
    return pts;
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
      const prev = lastPointerTileRef.current;
      if (prev && (prev.x !== tx || prev.y !== ty)) {
        const line = getGridLineTiles(prev.x, prev.y, tx, ty);
        for (let i = 1; i < line.length; i++) {
          applyToolAtTile(line[i].x, line[i].y, false);
        }
      } else {
        applyToolAtTile(tx, ty, false);
      }
      lastPointerTileRef.current = { x: tx, y: ty };
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
      lastPointerTileRef.current = null;
    }
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    zoomByFactor(zoomFactor, e.clientX, e.clientY);
  };

  const handleLoadMap = (map: SavedMapData, preferRuntime = true, skipPersist = false) => {
    if (!skipPersist) {
      persistCurrentRuntimeMap();
    }
    const sim = simRef.current!;
    const runtimeMaps = loadRuntimeMapsFromStorage();
    const target = preferRuntime && runtimeMaps[map.id] ? runtimeMaps[map.id] : map;
    sim.loadMap(target);
    try {
      localStorage.setItem(LAST_ACTIVE_MAP_ID_KEY, target.id);
    } catch {
      // Ignore storage quota errors
    }
    sessionInitializedRef.current = Boolean(target.simState);
    setSelectedPresetId(target.id);
    setMapName(target.name);
    setBlueprints(sim.getAllBlueprints());
    setSelection(null);
    setSelectedCarId(null);
    setTutorialStep(null);
    setDraftNewsPhoto(null);
    setDraftInitialCrop(null);
    setStats(sim.getStats());
    fitCameraToViewport();
  };

  const loadGeneratedBiome = (created: SavedMapData, startImmediately: boolean) => {
    const sim = simRef.current!;
    sim.loadMap(created);
    try {
      localStorage.setItem(LAST_ACTIVE_MAP_ID_KEY, created.id);
    } catch {
      // Ignore storage quota errors
    }
    sessionInitializedRef.current = false;
    setSelectedPresetId(created.id);
    setMapName(created.name);
    setBlueprints(sim.getAllBlueprints());
    setSelection(null);
    setSelectedCarId(null);
    setTutorialStep(null);
    setDraftNewsPhoto(null);
    setDraftInitialCrop(null);
    setStats(sim.getStats());
    persistCurrentRuntimeMap();
    setSavedMaps(loadSavedMapsFromStorage());
    if (startImmediately) {
      sim.prepareForPlaySession();
      sessionInitializedRef.current = true;
      sim.isRunning = true;
      setGameState('PLAYING');
      setToolMode('pan');
      setIsRunning(true);
    }
    fitCameraToViewport();
  };

  const handleCreateBiomeMap = (template: MapTemplateKind, customName?: string, startImmediately = false) => {
    persistCurrentRuntimeMap();
    const created = createBiomePreset(template, customName);
    loadGeneratedBiome(created, startImmediately);
  };

  const handleCreateCustomBiome = (config: CustomBiomeConfig, startImmediately = false) => {
    persistCurrentRuntimeMap();
    const created = createCustomBiomePreset(config);
    loadGeneratedBiome(created, startImmediately);
  };

  const handleStartTutorial = () => {
    persistCurrentRuntimeMap();
    const tutMap = createTutorialPreset();
    const sim = simRef.current!;
    sim.loadMap(tutMap);
    sim.prepareForPlaySession();
    sim.timeScale = 1;
    sim.isRunning = true;
    sessionInitializedRef.current = true;
    setSelectedPresetId(tutMap.id);
    setMapName(tutMap.name);
    setBlueprints(sim.getAllBlueprints());
    setSelection(null);
    setSelectedCarId(null);
    setDraftNewsPhoto(null);
    setDraftInitialCrop(null);
    setTimeScale(1);
    setIsRunning(true);
    setToolMode('pan');
    setActiveBlueprintId('city_hall');
    setGameState('PLAYING');
    setTutorialStep(1);
    setStats(sim.getStats());
    cameraRef.current = {
      x: 16 * TILE_SIZE,
      y: 11 * TILE_SIZE,
      zoom: Math.max(0.95, Math.min(1.25, window.innerWidth / (26 * TILE_SIZE))),
    };
    clampCamera(cameraRef.current);
    sim.floatingLabels.push({
      wx: 16.5 * TILE_SIZE,
      wy: 11.25 * TILE_SIZE,
      text: 'Place City Hall here!',
      color: '#0F172A',
      bgColor: '#FACC15',
      age: 0,
      maxAge: 4.5,
    });
    soundEngine.playUiTick();
  };

  const handleMoveWorldToTrash = (mapToTrash: SavedMapData) => {
    const isPreset = PRESET_MAPS.some((p) => p.id === mapToTrash.id);
    const runtimeSnapshot =
      simRef.current && simRef.current.mapId === mapToTrash.id
        ? simRef.current.exportMapData(simRef.current.mapName)
        : loadRuntimeMapsFromStorage()[mapToTrash.id] || mapToTrash;

    if (isPreset) {
      setHiddenPresetIds((prev) => {
        if (prev.includes(mapToTrash.id)) return prev;
        const next = [...prev, mapToTrash.id];
        try {
          localStorage.setItem(HIDDEN_PRESETS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        return next;
      });
    } else {
      setSavedMaps((prev) => {
        const next = prev.filter((m) => m.id !== mapToTrash.id);
        try {
          localStorage.setItem(SAVED_MAPS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        return next;
      });
    }

    setTrashedMaps((prev) => {
      const next = [
        { map: runtimeSnapshot, deletedAt: Date.now(), isPreset },
        ...prev.filter((item) => item.map.id !== mapToTrash.id),
      ];
      try {
        localStorage.setItem(TRASHED_MAPS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });

    if (selectedPresetId === mapToTrash.id) {
      const remainingSaved = savedMaps.filter((m) => m.id !== mapToTrash.id);
      const remainingPresets = PRESET_MAPS.filter(
        (m) => m.id !== mapToTrash.id && !hiddenPresetIds.includes(m.id)
      );
      const nextFallback = remainingSaved[0] || remainingPresets[0] || createBiomePreset('valley');
      handleLoadMap(nextFallback, true, true);
    }
    soundEngine.playBulldoze();
  };

  const handleDeleteSavedMap = (id: string) => {
    const target = savedMaps.find((m) => m.id === id);
    if (target) {
      handleMoveWorldToTrash(target);
    }
  };

  const handleRestoreTrashedMap = (id: string) => {
    const entry = trashedMaps.find((t) => t.map.id === id);
    if (!entry) return;

    setTrashedMaps((prev) => {
      const next = prev.filter((t) => t.map.id !== id);
      try {
        localStorage.setItem(TRASHED_MAPS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });

    if (entry.isPreset) {
      setHiddenPresetIds((prev) => {
        const next = prev.filter((pid) => pid !== id);
        try {
          localStorage.setItem(HIDDEN_PRESETS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        return next;
      });
    } else {
      setSavedMaps((prev) => {
        const next = [entry.map, ...prev.filter((m) => m.id !== id)];
        try {
          localStorage.setItem(SAVED_MAPS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        return next;
      });
    }

    writeRuntimeMapToStorage(entry.map);
    soundEngine.playSaveIcon();
  };

  const handlePermanentDeleteTrashedMap = (id: string) => {
    setTrashedMaps((prev) => {
      const next = prev.filter((t) => t.map.id !== id);
      try {
        localStorage.setItem(TRASHED_MAPS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
    removeRuntimeMapFromStorage(id);
    soundEngine.playBulldoze();
  };

  const handleEmptyTrash = () => {
    for (const entry of trashedMaps) {
      removeRuntimeMapFromStorage(entry.map.id);
    }
    setTrashedMaps([]);
    try {
      localStorage.setItem(TRASHED_MAPS_STORAGE_KEY, JSON.stringify([]));
    } catch {
      // Ignore storage quota errors
    }
    soundEngine.playBulldoze();
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
    persistCurrentRuntimeMap();
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
      ? isIntersectionTile(
          simRef.current.tiles,
          selectedTile.x,
          selectedTile.y,
          simRef.current.gridCols,
          simRef.current.gridRows
        )
      : false;

  const selectedIsHighway =
    selectedTile && selectedTile.hasRoad
      ? isHighwayTile(simRef.current.tiles, selectedTile.x, selectedTile.y)
      : false;

  const isCityHallSelected = Boolean(selectedTile?.building?.category === 'city_hall');

  // Auto-advance interactive tutorial steps on real player actions
  useEffect(() => {
    if (gameState !== 'PLAYING' || tutorialStep === null) return;
    if (tutorialStep === 1 && stats.hasCityHall) {
      setTutorialStep(2);
    } else if (tutorialStep === 2 && isCityHallSelected) {
      setTutorialStep(3);
    }
  }, [gameState, tutorialStep, stats.hasCityHall, isCityHallSelected]);

  const selectedCarObj =
    selectedCarId && gameState === 'PLAYING'
      ? simRef.current.cars.find((c) => c.id === selectedCarId) || null
      : null;

  useEffect(() => {
    if (gameState !== 'PLAYING' || tutorialStep !== 6 || timeScale <= 1) return;
    const timer = window.setTimeout(() => {
      setTutorialStep((prev) => (prev === 6 ? 7 : prev));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [gameState, tutorialStep, timeScale]);

  const tutorialHighlight: TutorialHighlightTarget =
    gameState === 'PLAYING' && tutorialStep !== null
      ? tutorialStep === 1 || tutorialStep === 2
        ? 'city_hall_btn'
        : tutorialStep === 3 || tutorialStep === 4
        ? 'city_hall_inspector'
        : tutorialStep === 5
        ? 'select_tool'
        : tutorialStep === 6
        ? 'speed_up'
        : tutorialStep === 7
        ? 'clock_day'
        : tutorialStep === 8
        ? 'permits_news'
        : tutorialStep === 9
        ? 'map_traffic_music'
        : tutorialStep === 10
        ? 'hide_ui_refresh'
        : null
      : null;

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
          trashedMaps={trashedMaps}
          hiddenPresetIds={hiddenPresetIds}
          onSelectMap={(map) => handleLoadMap(map, true)}
          onCreateBiomeMap={(tpl) => handleCreateBiomeMap(tpl, undefined, false)}
          onCreateCustomBiome={(cfg) => handleCreateCustomBiome(cfg, false)}
          onDeleteWorld={handleMoveWorldToTrash}
          onRestoreTrashedMap={handleRestoreTrashedMap}
          onPermanentDeleteTrashedMap={handlePermanentDeleteTrashedMap}
          onEmptyTrash={handleEmptyTrash}
          onStartGame={handleStartGame}
          onStartTutorial={handleStartTutorial}
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
          isUiHidden={isUiHidden}
          tutorialHighlight={tutorialHighlight}
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
            if (mode === 'camera') {
              uiWasHiddenBeforeCameraRef.current = isUiHiddenRef.current;
              setIsUiHidden(true);
            } else if (toolModeRef.current === 'camera') {
              setIsUiHidden(uiWasHiddenBeforeCameraRef.current);
            }
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
            persistCurrentRuntimeMap();
            setSavedMaps(loadSavedMapsFromStorage());
            soundEngine.playUiTick();
            setIsMapManagerOpen(true);
          }}
          onOpenNewspaper={() => {
            soundEngine.playUiTick();
            simRef.current!.markNewsRead();
            setStats(simRef.current!.getStats());
            setIsNewspaperOpen(true);
          }}
          onOpenPermits={() => {
            soundEngine.playUiTick();
            setIsPermitsOpen(true);
          }}
          onOpenPlaceFinder={() => {
            soundEngine.playUiTick();
            setIsPlaceFinderOpen(true);
          }}
          onRefreshSimulation={() => {
            simRef.current!.refreshSimulationPerformance();
            lastWallClockMsRef.current = Date.now();
            setStats(simRef.current!.getStats());
            soundEngine.playSaveIcon();
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
              setToolMode('select');
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
          className={`absolute top-32 xl:top-24 right-[max(0.875rem,env(safe-area-inset-right))] z-30 transform-gpu pointer-events-none max-h-[calc(100dvh-13rem)] overflow-y-auto touch-pan-y rounded-xl ${
            tutorialHighlight === 'city_hall_inspector' && isCityHallSelected
              ? 'ring-2 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.55)]'
              : ''
          }`}
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
            proposal={simRef.current.getProposalAt(selectedTile.x, selectedTile.y)}
            construction={simRef.current.getConstructionAt(selectedTile.x, selectedTile.y)}
            pendingProposalsCount={stats.pendingProposalsCount}
            crises={simRef.current.crises}
            cratersCount={simRef.current.blastCraters.length}
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
            onTriggerRobbery={(x, y) => {
              simRef.current!.triggerRobberyAt(x, y, true);
              setStats(simRef.current!.getStats());
              setInspectorTick((t) => t + 1);
            }}
            onTriggerFire={(x, y) => {
              simRef.current!.triggerFireAt(x, y, true);
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
            onOpenPermits={() => {
              soundEngine.playUiTick();
              setIsPermitsOpen(true);
            }}
            onApproveProposal={(id) => {
              if (simRef.current!.approveProposal(id)) {
                soundEngine.playPlaceBuilding();
                setStats(simRef.current!.getStats());
                setInspectorTick((t) => t + 1);
              }
            }}
            onDeclineProposal={(id) => {
              if (simRef.current!.declineProposal(id)) {
                soundEngine.playBulldoze();
                setStats(simRef.current!.getStats());
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

      {/* Worlds & Biomes Manager */}
      <MapManagerModal
        isOpen={isMapManagerOpen}
        savedMaps={savedMaps}
        trashedMaps={trashedMaps}
        onClose={() => setIsMapManagerOpen(false)}
        onLoadMap={(map) => handleLoadMap(map, true)}
        onCreateBiomeMap={(tpl, name) => handleCreateBiomeMap(tpl, name, true)}
        onCreateCustomBiome={(cfg) => handleCreateCustomBiome(cfg, true)}
        onDeleteSavedMap={handleDeleteSavedMap}
        onRestoreTrashedMap={handleRestoreTrashedMap}
        onPermanentDeleteTrashedMap={handlePermanentDeleteTrashedMap}
        onEmptyTrash={handleEmptyTrash}
        onStartTutorial={handleStartTutorial}
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
        draftInitialCrop={draftInitialCrop}
        dailyHints={simRef.current.getDailyNewsHints()}
        onTakePhoto={() => {
          setIsNewspaperOpen(false);
          uiWasHiddenBeforeCameraRef.current = isUiHiddenRef.current;
          setIsUiHidden(true);
          setToolMode('camera');
          soundEngine.playUiTick();
        }}
        onPublish={(headlineText, summaryText, photoDataUrl) => {
          simRef.current!.publishUserNewspaper(headlineText, summaryText, photoDataUrl);
          setDraftNewsPhoto(null);
          setDraftInitialCrop(null);
          setStats(simRef.current!.getStats());
          persistCurrentRuntimeMap();
          soundEngine.playSaveIcon();
        }}
        onClearDraft={() => {
          setDraftNewsPhoto(null);
          setDraftInitialCrop(null);
        }}
        onClose={() => {
          setIsNewspaperOpen(false);
          setDraftNewsPhoto(null);
          setDraftInitialCrop(null);
        }}
      />

      {/* Find Places Modal */}
      <PlaceFinderModal
        isOpen={isPlaceFinderOpen}
        mapName={mapName}
        buildings={simRef.current.getBuildings()}
        neighbourhoods={simRef.current.neighbourhoods}
        alerts={[
          ...simRef.current.robberies
            .filter((r) => r.status === 'active')
            .map((r) => ({
              id: r.id,
              label: `Robbery at ${r.buildingName}`,
              sublabel: r.neighbourhoodName,
              x: r.x,
              y: r.y,
              badgeColor: '#F43F5E',
              selectType: 'building' as const,
            })),
          ...simRef.current.fires
            .filter((f) => f.status === 'active')
            .map((f) => ({
              id: f.id,
              label: `Fire at ${f.buildingName}`,
              sublabel: f.byArsonist ? 'Arson fire active' : 'Firefighters dispatched',
              x: f.x,
              y: f.y,
              badgeColor: '#FB923C',
              selectType: 'building' as const,
            })),
          ...simRef.current.crashes
            .filter((c) => c.status === 'active')
            .map((c) => ({
              id: c.id,
              label: 'Traffic Crash',
              sublabel: 'Emergency responders en route',
              x: c.x,
              y: c.y,
              badgeColor: '#FACC15',
              selectType: 'intersection' as const,
            })),
          ...simRef.current.protests
            .filter((p) => p.status === 'active')
            .map((p) => ({
              id: p.id,
              label: `Protest at ${p.cityHallName}`,
              sublabel: p.reason,
              x: p.x,
              y: p.y,
              badgeColor: '#A78BFA',
              selectType: 'building' as const,
            })),
        ]}
        onLocate={(x, y, selectType) => {
          cameraRef.current.x = (x + 0.5) * TILE_SIZE;
          cameraRef.current.y = (y + 0.5) * TILE_SIZE;
          cameraRef.current.zoom = Math.max(cameraRef.current.zoom, 1.25);
          clampCamera(cameraRef.current);
          if (selectType) {
            setSelection({ type: selectType, x, y });
          } else {
            setSelection(null);
          }
          soundEngine.playUiTick();
        }}
        onClose={() => setIsPlaceFinderOpen(false)}
      />

      {/* Mayor's Citizen Construction Permit File Modal */}
      <PermitProposalsModal
        isOpen={isPermitsOpen}
        mapName={mapName}
        proposals={simRef.current.pendingProposals}
        constructions={simRef.current.activeConstructions}
        onApprove={(id) => {
          if (simRef.current!.approveProposal(id)) {
            soundEngine.playPlaceBuilding();
            setStats(simRef.current!.getStats());
            setInspectorTick((t) => t + 1);
          }
        }}
        onDecline={(id) => {
          if (simRef.current!.declineProposal(id)) {
            soundEngine.playBulldoze();
            setStats(simRef.current!.getStats());
            setInspectorTick((t) => t + 1);
          }
        }}
        onLocate={(x, y) => {
          cameraRef.current.x = (x + 0.5) * TILE_SIZE;
          cameraRef.current.y = (y + 0.5) * TILE_SIZE;
          cameraRef.current.zoom = Math.max(cameraRef.current.zoom, 1.3);
          clampCamera(cameraRef.current);
          setSelection({ type: 'tile', x, y });
          soundEngine.playUiTick();
        }}
        onClose={() => setIsPermitsOpen(false)}
      />

      {/* Pause Modal */}
      <PauseModal
        isOpen={gameState === 'PAUSED'}
        mapName={mapName}
        onResume={() => {
          soundEngine.playUiTick();
          setGameState('PLAYING');
        }}
        onOpenMapManager={() => {
          persistCurrentRuntimeMap();
          setSavedMaps(loadSavedMapsFromStorage());
          setGameState('PLAYING');
          setIsMapManagerOpen(true);
        }}
        onReturnToTitle={() => {
          soundEngine.playUiTick();
          persistCurrentRuntimeMap();
          setSavedMaps(loadSavedMapsFromStorage());
          setSelection(null);
          setSelectedCarId(null);
          setTutorialStep(null);
          setGameState('TITLE_MENU');
        }}
      />

      {/* Interactive Step-by-Step Tutorial Guide */}
      {gameState === 'PLAYING' && tutorialStep !== null && !isUiHidden && (
        <TutorialOverlay
          step={tutorialStep}
          hasCityHall={stats.hasCityHall}
          isCityHallSelected={isCityHallSelected}
          isCityHallToolActive={toolMode === 'plot' && activeBlueprintId === 'city_hall'}
          hasSelectedCar={Boolean(selectedCarObj)}
          selectedCarDest={selectedCarObj?.destLabel || selectedCarObj?.destCategory}
          timeScale={timeScale}
          dayOfWeek={stats.dayOfWeek}
          dayCount={stats.dayCount}
          formattedTime={stats.formattedTime}
          season={stats.season}
          weather={stats.weather}
          onSelectCityHallTool={() => {
            setActiveBlueprintId('city_hall');
            setToolMode('plot');
            soundEngine.playUiTick();
          }}
          onSelectSelectTool={() => {
            setToolMode('select');
            soundEngine.playUiTick();
          }}
          onFocusCityHall={() => {
            const hallTile = simRef.current!.tiles.find((t) => t.building?.category === 'city_hall');
            if (hallTile) {
              cameraRef.current.x = (hallTile.x + 0.5) * TILE_SIZE;
              cameraRef.current.y = (hallTile.y + 0.5) * TILE_SIZE;
              cameraRef.current.zoom = Math.max(cameraRef.current.zoom, 1.25);
              clampCamera(cameraRef.current);
              setToolMode('select');
              setSelection({ type: 'building', x: hallTile.x, y: hallTile.y });
              soundEngine.playUiTick();
            }
          }}
          onSetTimeScale={(s) => {
            simRef.current!.timeScale = s;
            setTimeScale(s);
            soundEngine.playUiTick();
          }}
          onNextStep={() => {
            soundEngine.playUiTick();
            setTutorialStep((prev) => {
              if (prev === null) return null;
              return prev < 10 ? ((prev + 1) as TutorialStep) : null;
            });
          }}
          onPrevStep={() => {
            soundEngine.playUiTick();
            setTutorialStep((prev) => {
              if (prev === null || prev <= 1) return prev;
              return (prev - 1) as TutorialStep;
            });
          }}
          onCloseTutorial={() => {
            soundEngine.playUiTick();
            setTutorialStep(null);
          }}
        />
      )}
    </div>
  );
}
