import {
  ArrowRight,
  Car,
  CheckCircle2,
  ChevronLeft,
  Gauge,
  GraduationCap,
  Landmark,
  MousePointerClick,
  Sparkles,
  X,
} from 'lucide-react';

export type TutorialStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type TutorialHighlightTarget =
  | 'city_hall_btn'
  | 'city_hall_inspector'
  | 'select_tool'
  | 'speed_up'
  | 'clock_day'
  | 'permits_news'
  | 'map_traffic_music'
  | 'hide_ui_save'
  | null;

interface TutorialOverlayProps {
  step: TutorialStep;
  hasCityHall: boolean;
  isCityHallSelected: boolean;
  isCityHallToolActive: boolean;
  hasSelectedCar: boolean;
  selectedCarDest?: string;
  timeScale: number;
  dayOfWeek: string;
  dayCount: number;
  formattedTime: string;
  season: string;
  weather: string;
  onSelectCityHallTool: () => void;
  onSelectSelectTool: () => void;
  onFocusCityHall: () => void;
  onSetTimeScale: (scale: number) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onCloseTutorial: () => void;
}

export function TutorialOverlay({
  step,
  hasCityHall,
  isCityHallSelected,
  isCityHallToolActive,
  hasSelectedCar,
  selectedCarDest,
  timeScale,
  dayOfWeek,
  dayCount,
  formattedTime,
  season,
  weather,
  onSelectCityHallTool,
  onSelectSelectTool,
  onFocusCityHall,
  onSetTimeScale,
  onNextStep,
  onPrevStep,
  onCloseTutorial,
}: TutorialOverlayProps) {
  const totalSteps = 10;

  return (
    <div className="absolute bottom-24 left-[max(0.875rem,env(safe-area-inset-left))] z-30 w-[min(20.5rem,calc(100vw-1.75rem))] pointer-events-auto">
      <div className="bg-[#0F172A]/95 border border-amber-400/70 rounded-xl shadow-2xl overflow-hidden text-slate-100 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/95 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-400/20 text-amber-300 shrink-0">
              <GraduationCap className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-amber-300 font-semibold">
                Step {step} / {totalSteps}
              </div>
              <div className="text-xs font-bold text-white truncate">
                {step === 1 && 'Add City Hall'}
                {step === 2 && 'Click Into City Hall'}
                {step === 3 && 'City Hall Chaos & Tools'}
                {step === 4 && 'People Inside & Edit Name'}
                {step === 5 && 'Click a Car to Track It'}
                {step === 6 && 'Speed Up Time'}
                {step === 7 && 'Day, Seasons & Weather'}
                {step === 8 && 'Permits & News'}
                {step === 9 && 'Map, Traffic & Music'}
                {step === 10 && 'Hide/Show UI & Save'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseTutorial}
            title="Exit Tutorial"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close tutorial"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-800 w-full">
          <div
            className="h-full bg-amber-400 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Short Step Body */}
        <div className="p-3 space-y-2 text-xs leading-snug text-slate-300">
          {step === 1 && (
            <>
              <p>
                Tap <span className="font-semibold text-amber-300">City Hall</span> below, then click an empty green tile by a road.
              </p>
              <div className="flex items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  {hasCityHall
                    ? 'Built!'
                    : isCityHallToolActive
                    ? 'Click a green tile'
                    : 'Pick City Hall'}
                </span>
                {!hasCityHall && !isCityHallToolActive && (
                  <button
                    type="button"
                    onClick={onSelectCityHallTool}
                    className="px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold whitespace-nowrap shrink-0"
                  >
                    Pick Tool
                  </button>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p>
                Click your new <span className="font-semibold text-amber-300">City Hall</span> on the map (or tap <span className="font-semibold text-amber-300">City Hall Go</span> below).
              </p>
              <div className="flex items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                  {isCityHallSelected ? 'Opened!' : 'Open City Hall'}
                </span>
                <button
                  type="button"
                  onClick={onFocusCityHall}
                  className="px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold whitespace-nowrap shrink-0"
                >
                  Open Now
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p>City Hall (on the right) holds all your chaos &amp; civic powers:</p>
              <ul className="space-y-1 bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-[11px]">
                <li>
                  <span className="font-semibold text-amber-300">Permits &amp; Events:</span> Approve builds or throw Weddings &amp; Celebrations.
                </li>
                <li>
                  <span className="font-semibold text-rose-300">Chaos:</span> Nuke, Earthquake, Tornado, Flood, War, Virus, Pollution &amp; Protests.
                </li>
              </ul>
            </>
          )}

          {step === 4 && (
            <>
              <p>Click any building to see inside &amp; customize it:</p>
              <ul className="space-y-1 bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-[11px]">
                <li>
                  <span className="font-semibold text-amber-300">People Inside:</span> Live count / max capacity (updates as cars &amp; walkers enter/leave).
                </li>
                <li>
                  <span className="font-semibold text-sky-300">Edit Name:</span> Click the building&apos;s name at the top of its panel to rename it!
                </li>
              </ul>
            </>
          )}

          {step === 5 && (
            <>
              <p>
                With <span className="font-semibold text-amber-300">Select (V)</span>, click any moving <span className="font-semibold text-amber-300">car</span> on a road to see where it&apos;s going!
              </p>
              <div className="flex items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px]">
                <span className="flex items-center gap-1.5 truncate">
                  <Car className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate">
                    {hasSelectedCar && selectedCarDest
                      ? `Heading → ${selectedCarDest}`
                      : 'Click a car on a road'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={onSelectSelectTool}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold whitespace-nowrap shrink-0"
                >
                  Select Tool
                </button>
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <p>
                Top-left bar: click <span className="font-semibold text-amber-300">3×</span> or <span className="font-semibold text-amber-300">8×</span> to speed up time!
              </p>
              <div className="flex items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  Speed: <span className="font-mono-tabular font-semibold text-white">{timeScale}×</span>
                </span>
                {timeScale === 1 && (
                  <button
                    type="button"
                    onClick={() => onSetTimeScale(3)}
                    className="px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold whitespace-nowrap shrink-0"
                  >
                    Try 3×
                  </button>
                )}
              </div>
            </>
          )}

          {step === 7 && (
            <>
              <p>
                Top-left bar (<span className="font-mono-tabular text-amber-200 font-semibold">{formattedTime} · {dayOfWeek} · Day {dayCount}</span>):
              </p>
              <ul className="space-y-1 bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-[11px]">
                <li>
                  <span className="font-semibold text-amber-200">Day &amp; Hours:</span> Auto-saves! Shops 06:00–22:00, school 08:00–16:00.
                </li>
                <li>
                  <span className="font-semibold text-emerald-300">Seasons ({season}):</span> Changes every 10 days (+100 Land via <span className="font-mono-tabular">L</span>).
                </li>
                <li>
                  <span className="font-semibold text-sky-300">Weather ({weather}):</span> Sunny, Rain, Windy trees &amp; Foggy crashes. Click to preview!
                </li>
              </ul>
            </>
          )}

          {step === 8 && (
            <>
              <p>Top-right Mayor actions:</p>
              <ul className="space-y-1 bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-[11px]">
                <li>
                  <span className="font-semibold text-amber-300">Permits:</span> Citizens propose buildings (with location &amp; build time) — Allow or Decline!
                </li>
                <li>
                  <span className="font-semibold text-amber-300">News:</span> Snap &amp; crop a photo once a day, publish, and watch the paperboy deliver as citizens comment!
                </li>
              </ul>
            </>
          )}

          {step === 9 && (
            <>
              <p>Top-right lookup, traffic &amp; audio:</p>
              <ul className="space-y-1 bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-[11px]">
                <li>
                  <span className="font-semibold text-sky-300">Map (F):</span> Search and jump straight to any building or alert.
                </li>
                <li>
                  <span className="font-semibold text-amber-300">Traffic (T):</span> Show live road congestion colors.
                </li>
                <li>
                  <span className="font-semibold text-teal-300">Music &amp; Sound:</span> Toggle relaxing lo-fi music or mute SFX.
                </li>
              </ul>
            </>
          )}

          {step === 10 && (
            <>
              <ul className="space-y-1 bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-[11px]">
                <li>
                  <span className="font-semibold text-white">Hide / Show UI (H):</span> Hide all bars for a clean view; tap <span className="text-amber-300">Show UI</span> anytime.
                </li>
                <li>
                  <span className="font-semibold text-emerald-300">Save &amp; Refresh:</span> Save your town or clear lag without restarting.
                </li>
              </ul>
              <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-500/40 rounded-lg p-2 text-[11px] text-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>You&apos;re ready to run your town!</span>
              </div>
              {timeScale > 1 && (
                <button
                  type="button"
                  onClick={() => onSetTimeScale(1)}
                  className="w-full py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-[11px] transition-colors"
                >
                  Back to 1× Speed
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/95 border-t border-slate-800">
          <div className="flex items-center gap-1">
            {step > 1 && (
              <button
                type="button"
                onClick={onPrevStep}
                className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={onCloseTutorial}
              className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-200 text-[11px] font-medium transition-colors"
            >
              Skip
            </button>
          </div>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={onNextStep}
              disabled={(step === 1 && !hasCityHall) || (step === 2 && !isCityHallSelected)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                (step === 1 && !hasCityHall) || (step === 2 && !isCityHallSelected)
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              }`}
            >
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onCloseTutorial}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
