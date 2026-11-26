import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Eraser,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  Frown,
  GripVertical,
  Hand,
  Leaf,
  MapPin,
  Meh,
  Menu,
  Moon,
  MousePointer2,
  Music,
  Newspaper,
  Paintbrush,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Route,
  Smile,
  Snowflake,
  Sprout,
  Sun,
  Sunrise,
  Sunset,
  Trees,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  X,
} from 'lucide-react';
import {
  BuildingBlueprint,
  HappinessMood,
  SeasonType,
  SimulationStats,
  TimePhase,
  ToolMode,
  WeatherType,
} from '../types/game';
import { PixelIconPreview } from './PixelIconPreview';
import { TutorialHighlightTarget } from './TutorialOverlay';

interface HudOverlayProps {
  mapName: string;
  stats: SimulationStats;
  isRunning: boolean;
  timeScale: number;
  toolMode: ToolMode;
  blueprints: BuildingBlueprint[];
  activeBlueprintId: string;
  showTrafficOverlay: boolean;
  isMuted: boolean;
  isMusicEnabled: boolean;
  isUiHidden: boolean;
  tutorialHighlight?: TutorialHighlightTarget;
  onToggleRun: () => void;
  onSetTimeScale: (scale: number) => void;
  onJumpToMinutes: (minutes: number) => void;
  onSelectTool: (mode: ToolMode) => void;
  onSelectBlueprint: (id: string) => void;
  onEditBlueprint: (bp: BuildingBlueprint) => void;
  onDeleteBlueprint: (bpId: string) => void;
  onCreateBlueprint: () => void;
  onToggleTrafficOverlay: () => void;
  onToggleHideUi: () => void;
  onOpenMaps: () => void;
  onOpenNewspaper: () => void;
  onOpenPermits: () => void;
  onOpenPlaceFinder: () => void;
  onRefreshSimulation: () => void;
  onToggleMute: () => void;
  onToggleMusic: () => void;
  onOpenPause: () => void;
  onFocusRobbery: () => void;
  onFocusProtest: () => void;
  onFocusFire: () => void;
  onFocusCrash: () => void;
  onFocusBrokenBridge: () => void;
  onFocusCityHall: () => void;
  onCycleSeason: () => void;
  onCycleWeather: () => void;
}

function PhaseIcon({ phase }: { phase: TimePhase }) {
  if (phase === 'Dawn') return <Sunrise className="w-4 h-4 text-amber-300" />;
  if (phase === 'Day') return <Sun className="w-4 h-4 text-amber-400" />;
  if (phase === 'Dusk') return <Sunset className="w-4 h-4 text-orange-400" />;
  return <Moon className="w-4 h-4 text-sky-300" />;
}

function SeasonIcon({ season }: { season: SeasonType }) {
  if (season === 'Spring') return <Sprout className="w-3.5 h-3.5 text-pink-300" />;
  if (season === 'Summer') return <Sun className="w-3.5 h-3.5 text-amber-300" />;
  if (season === 'Autumn') return <Leaf className="w-3.5 h-3.5 text-orange-400" />;
  return <Snowflake className="w-3.5 h-3.5 text-sky-200" />;
}

function WeatherIcon({ weather }: { weather: WeatherType }) {
  if (weather === 'Rain') return <CloudRain className="w-3.5 h-3.5 text-sky-300" />;
  if (weather === 'Storm') return <CloudLightning className="w-3.5 h-3.5 text-amber-300" />;
  if (weather === 'Snow') return <Snowflake className="w-3.5 h-3.5 text-sky-100" />;
  if (weather === 'Cloudy') return <Cloud className="w-3.5 h-3.5 text-slate-300" />;
  if (weather === 'Foggy') return <CloudFog className="w-3.5 h-3.5 text-slate-200" />;
  if (weather === 'Windy') return <Wind className="w-3.5 h-3.5 text-teal-300" />;
  return <Sun className="w-3.5 h-3.5 text-amber-300" />;
}

function SentimentIcon({ mood }: { mood: HappinessMood }) {
  if (mood === 'Thriving') return <Smile className="w-4 h-4 text-emerald-400" />;
  if (mood === 'Content') return <Smile className="w-4 h-4 text-sky-300" />;
  if (mood === 'Strained') return <Meh className="w-4 h-4 text-amber-400" />;
  return <Frown className="w-4 h-4 text-rose-400" />;
}

export function HudOverlay({
  mapName,
  stats,
  isRunning,
  timeScale,
  toolMode,
  blueprints,
  activeBlueprintId,
  showTrafficOverlay,
  isMuted,
  isMusicEnabled,
  isUiHidden,
  tutorialHighlight = null,
  onToggleRun,
  onSetTimeScale,
  onJumpToMinutes,
  onSelectTool,
  onSelectBlueprint,
  onEditBlueprint,
  onDeleteBlueprint,
  onCreateBlueprint,
  onToggleTrafficOverlay,
  onToggleHideUi,
  onOpenMaps,
  onOpenNewspaper,
  onOpenPermits,
  onOpenPlaceFinder,
  onRefreshSimulation,
  onToggleMute,
  onToggleMusic,
  onOpenPause,
  onFocusRobbery,
  onFocusProtest,
  onFocusFire,
  onFocusCrash,
  onFocusBrokenBridge,
  onFocusCityHall,
  onCycleSeason,
  onCycleWeather,
}: HudOverlayProps) {
  const [topLeftOffset, setTopLeftOffset] = useState({ x: 0, y: 0 });
  const [topRightOffset, setTopRightOffset] = useState({ x: 0, y: 0 });
  const [bottomOffset, setBottomOffset] = useState({ x: 0, y: 0 });
  const bottomToolbarRef = useRef<HTMLDivElement | null>(null);
  const topRightBarRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<{
    bar: 'topLeft' | 'topRight' | 'bottom';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    const attachHorizontalWheel = (el: HTMLDivElement | null) => {
      if (!el) return () => {};
      const onWheel = (e: WheelEvent) => {
        if (el.scrollWidth <= el.clientWidth + 1) return;
        const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (delta !== 0) {
          e.preventDefault();
          e.stopPropagation();
          el.scrollLeft += delta;
        }
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => el.removeEventListener('wheel', onWheel);
    };
    const detachBottom = attachHorizontalWheel(bottomToolbarRef.current);
    const detachTopRight = attachHorizontalWheel(topRightBarRef.current);
    return () => {
      detachBottom();
      detachTopRight();
    };
  }, [isUiHidden]);

  const startBarDrag = (
    bar: 'topLeft' | 'topRight' | 'bottom',
    e: React.PointerEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const current =
      bar === 'topLeft' ? topLeftOffset : bar === 'topRight' ? topRightOffset : bottomOffset;
    dragSessionRef.current = {
      bar,
      startX: e.clientX,
      startY: e.clientY,
      origX: current.x,
      origY: current.y,
    };
  };

  const moveBarDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const sess = dragSessionRef.current;
    if (!sess) return;
    const maxW = Math.max(200, window.innerWidth - 160);
    const maxH = Math.max(120, window.innerHeight - 120);
    const dx = e.clientX - sess.startX;
    const dy = e.clientY - sess.startY;
    const nextX = Math.max(-maxW, Math.min(maxW, sess.origX + dx));
    const nextY = Math.max(-maxH, Math.min(maxH, sess.origY + dy));
    if (sess.bar === 'topLeft') {
      setTopLeftOffset({ x: Math.max(-24, nextX), y: Math.max(-16, nextY) });
    } else if (sess.bar === 'topRight') {
      setTopRightOffset({ x: Math.min(24, nextX), y: Math.max(-16, nextY) });
    } else {
      setBottomOffset({ x: Math.max(-24, nextX), y: Math.min(16, nextY) });
    }
  };

  const endBarDrag = () => {
    dragSessionRef.current = null;
  };

  const flowStatus =
    stats.trafficFlowPercent >= 75
      ? { label: 'Smooth', color: 'text-emerald-400' }
      : stats.trafficFlowPercent >= 45
      ? { label: 'Busy', color: 'text-amber-400' }
      : { label: 'Jammed', color: 'text-rose-400' };

  const moodColor =
    stats.happinessMood === 'Thriving'
      ? 'text-emerald-400'
      : stats.happinessMood === 'Content'
      ? 'text-sky-300'
      : stats.happinessMood === 'Strained'
      ? 'text-amber-400'
      : 'text-rose-400';

  if (isUiHidden) {
    return (
      <div className="absolute top-[max(0.875rem,env(safe-area-inset-top))] right-[max(0.875rem,env(safe-area-inset-right))] z-30 transform-gpu pointer-events-none flex items-center gap-2">
        {toolMode === 'camera' && (
          <button
            type="button"
            onClick={() => onSelectTool('pan')}
            title="Exit Photo Mode (Esc)"
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-lg transition-colors whitespace-nowrap touch-manipulation"
          >
            <X className="w-4 h-4" />
            Cancel Photo
          </button>
        )}
        <button
          type="button"
          onClick={onToggleHideUi}
          title="Show UI (H)"
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F172A]/95 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-white shadow-lg transition-colors whitespace-nowrap touch-manipulation"
        >
          <Eye className="w-4 h-4 text-amber-300" />
          Show UI
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 transform-gpu pointer-events-none flex flex-col justify-between gap-2 p-2.5 sm:p-3.5 pt-[max(0.625rem,env(safe-area-inset-top))] pb-[max(0.625rem,env(safe-area-inset-bottom))] pl-[max(0.625rem,env(safe-area-inset-left))] pr-[max(0.625rem,env(safe-area-inset-right))]">
      {/* Top Perimeter Row */}
      <div className="flex flex-wrap xl:flex-nowrap items-start justify-between gap-2 sm:gap-3 min-w-0">
        {/* Top-Left: Time, Day-Night Cycle & Speed */}
        <div
          style={{ transform: `translate3d(${topLeftOffset.x}px, ${topLeftOffset.y}px, 0)` }}
          className={`pointer-events-auto flex flex-col gap-1.5 sm:gap-2 bg-[#0F172A]/95 border rounded-xl px-2.5 py-2 sm:px-3.5 sm:py-2.5 shadow-lg max-w-full transition-shadow ${
            tutorialHighlight === 'clock_day'
              ? 'border-amber-400 ring-2 ring-amber-400/90 shadow-[0_0_20px_rgba(251,191,36,0.55)]'
              : 'border-slate-700/80'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onPointerDown={(e) => startBarDrag('topLeft', e)}
              onPointerMove={moveBarDrag}
              onPointerUp={endBarDrag}
              onPointerCancel={endBarDrag}
              onDoubleClick={() => setTopLeftOffset({ x: 0, y: 0 })}
              title="Drag to move bar (double-click to reset)"
              className="p-0.5 -ml-1 text-slate-500 hover:text-slate-200 cursor-grab active:cursor-grabbing touch-none shrink-0"
              aria-label="Move clock bar"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2">
              <PhaseIcon phase={stats.timePhase} />
              <span className="font-mono-tabular text-base sm:text-lg font-semibold text-white leading-none">
                {stats.formattedTime}
              </span>
            </div>

            <div className="h-4 w-[1px] bg-slate-700" />

            <div className="flex items-center gap-1.5 text-xs text-slate-300 whitespace-nowrap">
              <span className="font-semibold text-white">{mapName}</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="tabular-nums font-medium text-amber-200">
                {stats.dayOfWeek} · Day {stats.dayCount}
              </span>
              <span aria-hidden="true" className="hidden sm:inline text-slate-500">·</span>
              <button
                type="button"
                onClick={onCycleSeason}
                title="Season cycles every 10 days (click to preview next season)"
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition-colors ${
                  tutorialHighlight === 'clock_day' ? 'ring-1 ring-emerald-400' : ''
                }`}
              >
                <SeasonIcon season={stats.season} />
                <span>{stats.season}</span>
              </button>
              <button
                type="button"
                onClick={onCycleWeather}
                title="Weather cycles naturally (click to preview next weather)"
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition-colors ${
                  tutorialHighlight === 'clock_day' ? 'ring-1 ring-sky-400' : ''
                }`}
              >
                <WeatherIcon weather={stats.weather} />
                <span>{stats.weather}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 pt-1 border-t border-slate-800">
            {/* Play/Pause & Speed */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleRun}
                title={isRunning ? 'Pause simulation (Space)' : 'Resume simulation (Space)'}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isRunning ? 'Pause' : 'Play'}
              </button>
              {[1, 3, 8].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSetTimeScale(s)}
                  title={`${s}x simulation speed`}
                  className={`px-2 py-1 rounded text-xs font-mono-tabular transition-colors whitespace-nowrap shrink-0 ${
                    timeScale === s
                      ? 'bg-amber-400 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  } ${
                    tutorialHighlight === 'speed_up' && s > 1
                      ? 'ring-2 ring-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.75)]'
                      : ''
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>

            {/* Quick Phase Preview Jumps */}
            <div className="flex items-center gap-0.5 sm:gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => onJumpToMinutes(6 * 60 + 45)}
                className="px-1.5 py-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                title="Jump to Dawn (06:45)"
              >
                Dawn
              </button>
              <button
                type="button"
                onClick={() => onJumpToMinutes(12 * 60)}
                className="px-1.5 py-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                title="Jump to Noon (12:00)"
              >
                Noon
              </button>
              <button
                type="button"
                onClick={() => onJumpToMinutes(17 * 60 + 30)}
                className="px-1.5 py-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                title="Jump to Dusk (17:30)"
              >
                Dusk
              </button>
              <button
                type="button"
                onClick={() => onJumpToMinutes(21 * 60 + 30)}
                className="px-1.5 py-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                title="Jump to Night (21:30)"
              >
                Night
              </button>
            </div>
          </div>

          {/* Mobile & Tablet Compact Status Strip */}
          <div className="flex xl:hidden items-center gap-2 pt-1 border-t border-slate-800 text-[11px] text-slate-300 font-mono-tabular whitespace-nowrap">
            <span
              className={`inline-flex items-center gap-1 font-semibold ${moodColor}`}
              title={`Citizen Happiness: ${stats.happinessSummary}`}
            >
              <SentimentIcon mood={stats.happinessMood} />
              {stats.citizenHappiness}%
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{stats.activeCars} Cars</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className={flowStatus.color}>
              {stats.trafficFlowPercent}% {flowStatus.label}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            {stats.tornadoActive ? (
              <button
                type="button"
                onClick={onFocusCityHall}
                className="text-slate-200 font-semibold underline decoration-slate-400/60"
              >
                Tornado Alert
              </button>
            ) : stats.earthquakeActive ? (
              <button
                type="button"
                onClick={onFocusCityHall}
                className="text-orange-300 font-semibold underline decoration-orange-400/60"
              >
                Earthquake
              </button>
            ) : stats.floodActive ? (
              <button
                type="button"
                onClick={onFocusCityHall}
                className="text-sky-300 font-semibold underline decoration-sky-400/60"
              >
                Flood Active
              </button>
            ) : stats.warActive ? (
              <button
                type="button"
                onClick={onFocusCityHall}
                className="text-rose-400 font-semibold underline decoration-rose-400/60"
              >
                {stats.invadersCount > 0 ? `War (${stats.invadersCount} Hostile)` : 'War Active'}
              </button>
            ) : stats.electionActive ? (
              <button
                type="button"
                onClick={onFocusCityHall}
                className="text-indigo-300 font-semibold underline decoration-indigo-400/60"
              >
                Election ({stats.electionRemaining}s)
              </button>
            ) : !stats.mayorAlive && stats.hasCityHall ? (
              <button
                type="button"
                onClick={onFocusCityHall}
                className="text-rose-300 font-semibold underline decoration-rose-400/60"
              >
                Mayor Fallen
              </button>
            ) : stats.virusActive ? (
              <button
                type="button"
                onClick={onFocusCityHall}
                className="text-lime-400 font-semibold underline decoration-lime-400/60"
              >
                Virus ({stats.infectedCitizens})
              </button>
            ) : stats.pollutionActive || stats.pollutionLevel >= 35 ? (
              <button
                type="button"
                onClick={onFocusCityHall}
                className="text-lime-300 font-semibold underline decoration-lime-400/60"
              >
                Polluted {Math.round(stats.pollutionLevel)}%
              </button>
            ) : stats.cratersCount > 0 ? (
              <button
                type="button"
                onClick={onFocusCityHall}
                className="text-orange-400 font-semibold underline decoration-orange-400/60"
              >
                {stats.cratersCount} Craters
              </button>
            ) : stats.povertyActive ? (
              <button
                type="button"
                onClick={onFocusCityHall}
                className="text-amber-300 font-semibold underline decoration-amber-400/60"
              >
                Poverty
              </button>
            ) : stats.activeFires > 0 ? (
              <button
                type="button"
                onClick={onFocusFire}
                className="text-orange-400 font-semibold underline decoration-orange-400/60"
              >
                {stats.activeFires} Fire
              </button>
            ) : stats.activeCrashes > 0 ? (
              <button
                type="button"
                onClick={onFocusCrash}
                className="text-amber-300 font-semibold underline decoration-amber-400/60"
              >
                {stats.activeCrashes} Crash
              </button>
            ) : stats.brokenBridgesCount > 0 ? (
              <button
                type="button"
                onClick={onFocusBrokenBridge}
                className="text-rose-400 font-semibold underline decoration-rose-400/60"
              >
                {stats.brokenBridgesCount} Bridge Out
              </button>
            ) : stats.activeRobberies > 0 ? (
              <button
                type="button"
                onClick={onFocusRobbery}
                className="text-rose-400 font-semibold underline decoration-rose-400/60"
              >
                {stats.activeRobberies} Robbery
              </button>
            ) : stats.activeProtests > 0 ? (
              <button
                type="button"
                onClick={onFocusProtest}
                className="text-violet-300 font-semibold underline decoration-violet-400/60"
              >
                {stats.activeProtests} Protest
              </button>
            ) : stats.activeEscapees > 0 ? (
              <button
                type="button"
                onClick={onFocusCityHall}
                className="text-orange-400 font-semibold underline decoration-orange-400/60"
              >
                {stats.activeEscapees} Escapee
              </button>
            ) : stats.oceanTrashCount >= 6 ? (
              <button
                type="button"
                onClick={onFocusCityHall}
                className="text-sky-300 font-semibold underline decoration-sky-400/60"
              >
                {stats.oceanTrashCount} Ocean Trash
              </button>
            ) : (
              <span>{stats.population} Citizens</span>
            )}
          </div>
        </div>

        {/* Top-Right: Telemetry Readout & Compact Utility Actions */}
        <div
          ref={topRightBarRef}
          style={{ transform: `translate3d(${topRightOffset.x}px, ${topRightOffset.y}px, 0)` }}
          className={`pointer-events-auto ml-auto flex items-center gap-2 bg-[#0F172A]/95 border rounded-xl px-2.5 py-2 shadow-lg max-w-full overflow-x-auto touch-pan-x transition-shadow ${
            tutorialHighlight === 'permits_news' ||
            tutorialHighlight === 'map_traffic_music' ||
            tutorialHighlight === 'hide_ui_refresh'
              ? 'border-amber-400/80 ring-1 ring-amber-400/50'
              : 'border-slate-700/80'
          }`}
        >
          <button
            type="button"
            onPointerDown={(e) => startBarDrag('topRight', e)}
            onPointerMove={moveBarDrag}
            onPointerUp={endBarDrag}
            onPointerCancel={endBarDrag}
            onDoubleClick={() => setTopRightOffset({ x: 0, y: 0 })}
            title="Drag to move bar (double-click to reset)"
            className="p-0.5 -ml-1 text-slate-500 hover:text-slate-200 cursor-grab active:cursor-grabbing touch-none shrink-0"
            aria-label="Move telemetry bar"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <div className="hidden xl:flex items-center gap-2.5 pr-2.5 border-r border-slate-800">
            <div title={stats.happinessSummary} className="cursor-help">
              <div className="text-[10px] text-slate-400">Mood</div>
              <div className={`flex items-center gap-1 font-mono-tabular text-sm font-semibold ${moodColor} whitespace-nowrap`}>
                <SentimentIcon mood={stats.happinessMood} />
                <span>{stats.citizenHappiness}%</span>
                <span className="text-xs font-medium">{stats.happinessMood}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Citizens</div>
              <div className="font-mono-tabular text-sm font-semibold text-white">
                {stats.population}
              </div>
            </div>
            <div className="hidden 2xl:block">
              <div className="text-[10px] text-slate-400">Active Cars</div>
              <div className="font-mono-tabular text-sm font-semibold text-white">
                {stats.activeCars}
              </div>
            </div>
            <div className="whitespace-nowrap">
              <div className="text-[10px] text-slate-400">Traffic</div>
              <div className={`font-mono-tabular text-sm font-semibold ${flowStatus.color}`}>
                {stats.trafficFlowPercent}% · {flowStatus.label}
              </div>
            </div>
            <div className="hidden 2xl:block">
              <div className="text-[10px] text-slate-400">Jammed</div>
              <div
                className={`font-mono-tabular text-sm font-semibold ${
                  stats.jammedCars > 0 ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                {stats.jammedCars}
              </div>
            </div>
            <div className="hidden 2xl:block">
              <div className="text-[10px] text-slate-400">Districts</div>
              <div className="font-mono-tabular text-sm font-semibold text-white">
                {stats.neighbourhoodsCount}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Safety</div>
              {stats.tornadoActive ? (
                <button
                  type="button"
                  onClick={onFocusCityHall}
                  title="Tornado sweeping through town"
                  className="font-mono-tabular text-sm font-semibold text-slate-200 hover:text-white underline decoration-slate-400/60 cursor-pointer whitespace-nowrap"
                >
                  Tornado Alert
                </button>
              ) : stats.earthquakeActive ? (
                <button
                  type="button"
                  onClick={onFocusCityHall}
                  title="Earthquake shaking town"
                  className="font-mono-tabular text-sm font-semibold text-orange-300 hover:text-orange-200 underline decoration-orange-400/60 cursor-pointer whitespace-nowrap"
                >
                  Earthquake
                </button>
              ) : stats.floodActive ? (
                <button
                  type="button"
                  onClick={onFocusCityHall}
                  title="City flood active"
                  className="font-mono-tabular text-sm font-semibold text-sky-300 hover:text-sky-200 underline decoration-sky-400/60 cursor-pointer whitespace-nowrap"
                >
                  Flood Active
                </button>
              ) : stats.warActive ? (
                <button
                  type="button"
                  onClick={onFocusCityHall}
                  title="War active — click to open City Hall"
                  className="font-mono-tabular text-sm font-semibold text-rose-400 hover:text-rose-300 underline decoration-rose-400/60 cursor-pointer whitespace-nowrap"
                >
                  {stats.invadersCount > 0 ? `War (${stats.invadersCount} Hostile)` : 'War Active'}
                </button>
              ) : stats.electionActive ? (
                <button
                  type="button"
                  onClick={onFocusCityHall}
                  title="Mayoral election in progress — click to view City Hall"
                  className="font-mono-tabular text-sm font-semibold text-indigo-300 hover:text-indigo-200 underline decoration-indigo-400/60 cursor-pointer whitespace-nowrap"
                >
                  Election ({stats.electionRemaining}s)
                </button>
              ) : !stats.mayorAlive && stats.hasCityHall ? (
                <button
                  type="button"
                  onClick={onFocusCityHall}
                  title="The Mayor was killed — election begins after war ends"
                  className="font-mono-tabular text-sm font-semibold text-rose-300 hover:text-rose-200 underline decoration-rose-400/60 cursor-pointer whitespace-nowrap"
                >
                  Mayor Fallen
                </button>
              ) : stats.virusActive ? (
                <button
                  type="button"
                  onClick={onFocusCityHall}
                  title="Virus outbreak — click to open City Hall"
                  className="font-mono-tabular text-sm font-semibold text-lime-400 hover:text-lime-300 underline decoration-lime-400/60 cursor-pointer whitespace-nowrap"
                >
                  Virus ({stats.infectedCitizens})
                </button>
              ) : stats.pollutionActive || stats.pollutionLevel >= 35 ? (
                <button
                  type="button"
                  onClick={onFocusCityHall}
                  title="Water & air polluted — click to open City Hall"
                  className="font-mono-tabular text-sm font-semibold text-lime-300 hover:text-lime-200 underline decoration-lime-400/60 cursor-pointer whitespace-nowrap"
                >
                  Polluted {Math.round(stats.pollutionLevel)}%
                </button>
              ) : stats.cratersCount > 0 ? (
                <button
                  type="button"
                  onClick={onFocusCityHall}
                  title="Blast craters need repair — click to open City Hall"
                  className="font-mono-tabular text-sm font-semibold text-orange-400 hover:text-orange-300 underline decoration-orange-400/60 cursor-pointer whitespace-nowrap"
                >
                  {stats.cratersCount} Craters
                </button>
              ) : stats.povertyActive ? (
                <button
                  type="button"
                  onClick={onFocusCityHall}
                  title="Poverty crisis — click to open City Hall"
                  className="font-mono-tabular text-sm font-semibold text-amber-300 hover:text-amber-200 underline decoration-amber-400/60 cursor-pointer whitespace-nowrap"
                >
                  Poverty
                </button>
              ) : stats.activeFires > 0 ? (
                <button
                  type="button"
                  onClick={onFocusFire}
                  title="Click to locate active fire"
                  className="font-mono-tabular text-sm font-semibold text-orange-400 hover:text-orange-300 underline decoration-orange-400/60 cursor-pointer whitespace-nowrap"
                >
                  {stats.activeFires} Fire
                </button>
              ) : stats.activeCrashes > 0 ? (
                <button
                  type="button"
                  onClick={onFocusCrash}
                  title="Click to locate active car crash"
                  className="font-mono-tabular text-sm font-semibold text-amber-300 hover:text-amber-200 underline decoration-amber-400/60 cursor-pointer whitespace-nowrap"
                >
                  {stats.activeCrashes} Crash
                </button>
              ) : stats.brokenBridgesCount > 0 ? (
                <button
                  type="button"
                  onClick={onFocusBrokenBridge}
                  title="Click to locate collapsed bridge under repair"
                  className="font-mono-tabular text-sm font-semibold text-rose-400 hover:text-rose-300 underline decoration-rose-400/60 cursor-pointer whitespace-nowrap"
                >
                  {stats.brokenBridgesCount} Bridge Out
                </button>
              ) : stats.activeRobberies > 0 ? (
                <button
                  type="button"
                  onClick={onFocusRobbery}
                  title="Click to locate active robbery"
                  className="font-mono-tabular text-sm font-semibold text-rose-400 hover:text-rose-300 underline decoration-rose-400/60 cursor-pointer whitespace-nowrap"
                >
                  {stats.activeRobberies} Robbery
                </button>
              ) : stats.activeProtests > 0 ? (
                <button
                  type="button"
                  onClick={onFocusProtest}
                  title="Click to locate protest at City Hall"
                  className="font-mono-tabular text-sm font-semibold text-violet-300 hover:text-violet-200 underline decoration-violet-400/60 cursor-pointer whitespace-nowrap"
                >
                  {stats.activeProtests} Protest
                </button>
              ) : stats.activeEscapees > 0 ? (
                <button
                  type="button"
                  onClick={onFocusCityHall}
                  title="Prisoner escaped — Police pursuing!"
                  className="font-mono-tabular text-sm font-semibold text-orange-400 hover:text-orange-300 underline decoration-orange-400/60 cursor-pointer whitespace-nowrap"
                >
                  {stats.activeEscapees} Escapee
                </button>
              ) : stats.oceanTrashCount >= 6 ? (
                <button
                  type="button"
                  onClick={onFocusCityHall}
                  title="Trash accumulating in ocean water — cleaners dispatched soon"
                  className="font-mono-tabular text-sm font-semibold text-sky-300 hover:text-sky-200 underline decoration-sky-400/60 cursor-pointer whitespace-nowrap"
                >
                  {stats.oceanTrashCount} Ocean Trash
                </button>
              ) : (
                <div className="font-mono-tabular text-sm font-semibold text-emerald-400">
                  Calm
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onOpenNewspaper}
              title={stats.dailyNewsHeadline}
              className={`relative flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-stone-100 transition-colors whitespace-nowrap shrink-0 ${
                tutorialHighlight === 'permits_news'
                  ? 'ring-2 ring-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.75)]'
                  : ''
              }`}
            >
              <Newspaper className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">News</span>
              {stats.unreadNewsCount > 0 && (
                <span className="ml-0.5 px-1 py-0 rounded bg-amber-400 text-slate-950 font-mono-tabular text-[10px] font-bold leading-tight">
                  {stats.unreadNewsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onOpenPermits}
              title="Mayor's Permit File — Allow or decline citizen construction proposals"
              className={`relative flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                stats.pendingProposalsCount > 0
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-200'
              } ${
                tutorialHighlight === 'permits_news'
                  ? 'ring-2 ring-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.75)]'
                  : ''
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Permits</span>
              {stats.pendingProposalsCount > 0 && (
                <span className="ml-0.5 px-1 py-0 rounded bg-amber-400 text-slate-950 font-mono-tabular text-[10px] font-bold leading-tight">
                  {stats.pendingProposalsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onOpenPlaceFinder}
              title="Find Places — Search buildings, stores, schools & alerts (F)"
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-sky-300 transition-colors whitespace-nowrap shrink-0 ${
                tutorialHighlight === 'map_traffic_music'
                  ? 'ring-2 ring-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.75)]'
                  : ''
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Map</span>
            </button>
            <button
              type="button"
              onClick={onRefreshSimulation}
              title="Refresh & Smooth Simulation — Clears laggy clutter without restarting your city"
              className={`p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 transition-colors shrink-0 ${
                tutorialHighlight === 'hide_ui_refresh'
                  ? 'ring-2 ring-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.75)]'
                  : ''
              }`}
              aria-label="Refresh simulation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggleTrafficOverlay}
              title="Toggle Traffic Congestion Heatmap (T)"
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                showTrafficOverlay
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              } ${
                tutorialHighlight === 'map_traffic_music'
                  ? 'ring-2 ring-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.75)]'
                  : ''
              }`}
            >
              <Activity className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenMaps}
              title="Worlds & Biomes (Auto-Saved)"
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors shrink-0"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMusic}
              title={isMusicEnabled ? 'Pause Lo-Fi Music' : 'Play Warm Lo-Fi Music'}
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                isMusicEnabled
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50'
                  : 'text-slate-300 hover:bg-slate-800'
              } ${
                tutorialHighlight === 'map_traffic_music'
                  ? 'ring-2 ring-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.75)]'
                  : ''
              }`}
            >
              <Music className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors shrink-0"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onToggleHideUi}
              title="Hide UI (H)"
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 ${
                tutorialHighlight === 'hide_ui_refresh'
                  ? 'ring-2 ring-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.75)]'
                  : ''
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hide UI</span>
            </button>
            <button
              type="button"
              onClick={onOpenPause}
              title="Menu (Esc)"
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom-Left Compact Dock (Keeps Bottom-Right Corner Empty & Unobstructed) */}
      <div className="flex justify-start w-full min-w-0 pr-40 sm:pr-48">
        <div
          ref={bottomToolbarRef}
          style={{ transform: `translate3d(${bottomOffset.x}px, ${bottomOffset.y}px, 0)` }}
          className="pointer-events-auto max-w-full overflow-x-auto touch-pan-x flex items-center gap-1.5 bg-[#0F172A]/95 border border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-xl"
        >
          <button
            type="button"
            onPointerDown={(e) => startBarDrag('bottom', e)}
            onPointerMove={moveBarDrag}
            onPointerUp={endBarDrag}
            onPointerCancel={endBarDrag}
            onDoubleClick={() => setBottomOffset({ x: 0, y: 0 })}
            title="Drag to move toolbar (double-click to reset)"
            className="p-0.5 text-slate-500 hover:text-slate-200 cursor-grab active:cursor-grabbing touch-none shrink-0"
            aria-label="Move build toolbar"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          {/* Core Map Tools */}
          <div className="flex items-center gap-1 pr-2 border-r border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => onSelectTool('pan')}
              title="Move / Pan View (M) — Drag with 1 finger, or pinch with 2 fingers"
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                toolMode === 'pan'
                  ? 'bg-sky-400 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Hand className="w-4 h-4" />
              Move
            </button>
            <button
              type="button"
              onClick={() => onSelectTool('select')}
              title="Select / Inspect Building, Car, or Intersection (V)"
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                toolMode === 'select'
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              } ${
                tutorialHighlight === 'select_tool'
                  ? 'ring-2 ring-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.75)]'
                  : ''
              }`}
            >
              <MousePointer2 className="w-4 h-4" />
              Select
            </button>
            <button
              type="button"
              onClick={() => onSelectTool('road')}
              title="Build Roads & Bridges (R) — Click & drag"
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                toolMode === 'road'
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Route className="w-4 h-4" />
              Road
            </button>
            <button
              type="button"
              onClick={() => onSelectTool('zebra')}
              title="Place or Remove Zebra Crossing (Z) — Pedestrians cross & cars yield"
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                toolMode === 'zebra'
                  ? 'bg-slate-100 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <svg
                viewBox="0 0 16 16"
                className="w-4 h-4"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="2" y="2.5" width="12" height="2" rx="0.5" />
                <rect x="2" y="7" width="12" height="2" rx="0.5" />
                <rect x="2" y="11.5" width="12" height="2" rx="0.5" />
              </svg>
              Zebra
            </button>
            <button
              type="button"
              onClick={() => onSelectTool('footbridge')}
              title="Build Walking Footbridge Over Water (B) — Pedestrians cross rivers"
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                toolMode === 'footbridge'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <svg
                viewBox="0 0 16 16"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M2 11c2.5-3 9.5-3 12 0" />
                <path d="M2 7.5h12" />
                <path d="M4.5 7.5v3.5M11.5 7.5v3.5" />
              </svg>
              Bridge
            </button>
            <button
              type="button"
              onClick={() => onSelectTool('water')}
              title="Paint River / Water"
              className={`p-2 rounded-lg transition-colors shrink-0 ${
                toolMode === 'water'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Waves className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onSelectTool('forest')}
              title="Paint Trees"
              className={`p-2 rounded-lg transition-colors shrink-0 ${
                toolMode === 'forest'
                  ? 'bg-emerald-400 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Trees className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onSelectTool('bulldoze')}
              title="Remove Plots, Roads, or Terrain (X) — Click or drag"
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                toolMode === 'bulldoze'
                  ? 'bg-rose-500 text-white font-semibold'
                  : 'text-rose-400 hover:bg-rose-950/60'
              }`}
            >
              <Eraser className="w-4 h-4" />
              Remove
            </button>
          </div>

          {/* Building Plots & Custom Icons */}
          <div className="flex items-center gap-1.5">
            {blueprints.map((bp) => {
              const active = toolMode === 'plot' && activeBlueprintId === bp.id;
              const isCityHallCapped = bp.category === 'city_hall' && stats.hasCityHall;
              return (
                <div key={bp.id} className="relative group shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCityHallCapped) {
                        onFocusCityHall();
                      } else {
                        onSelectBlueprint(bp.id);
                      }
                    }}
                    title={
                      isCityHallCapped
                        ? `${bp.name} (1/1 built) — Click to go to City Hall (Chaos, Events & Permits)`
                        : `Plot ${bp.name}`
                    }
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-slate-800 border-amber-400 text-white'
                        : isCityHallCapped
                        ? 'bg-slate-900/80 border-amber-500/40 text-amber-200 hover:border-amber-400 hover:bg-slate-800 hover:text-white'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                    } ${
                      tutorialHighlight === 'city_hall_btn' && bp.category === 'city_hall'
                        ? 'ring-2 ring-amber-400 animate-pulse shadow-[0_0_16px_rgba(251,191,36,0.8)]'
                        : ''
                    }`}
                  >
                    <PixelIconPreview iconGrid={bp.iconGrid} size={22} />
                    <span>{bp.name}</span>
                    {isCityHallCapped && (
                      <span className="font-mono-tabular text-[10px] text-amber-300">Go</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditBlueprint(bp);
                    }}
                    title={`Draw custom icon for ${bp.name}`}
                    className={`${
                      active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                    } absolute -top-1.5 -right-1.5 w-5 h-5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow transition-opacity`}
                  >
                    <Paintbrush className="w-3 h-3" />
                  </button>
                  {bp.isCustom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBlueprint(bp.id);
                      }}
                      title={`Delete custom plot ${bp.name}`}
                      className={`${
                        active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                      } absolute -top-1.5 left-0 w-5 h-5 rounded-md bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow transition-opacity`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={onCreateBlueprint}
              title="Draw a brand-new custom building & icon"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 text-xs font-semibold text-amber-300 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Draw Plot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

