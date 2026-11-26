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
  | 'hide_ui_refresh'
  | null;

export interface GuideBookStep {
  step: TutorialStep;
  title: string;
  items: { label?: string; text: string; tone?: 'amber' | 'sky' | 'rose' | 'emerald' | 'teal' | 'white' }[];
}

export const GUIDE_BOOK_STEPS: GuideBookStep[] = [
  {
    step: 1,
    title: 'Add City Hall',
    items: [
      {
        text: 'Tap City Hall below, then click an empty green tile by a road.',
        tone: 'amber',
      },
    ],
  },
  {
    step: 2,
    title: 'Click Into City Hall',
    items: [
      {
        text: 'Click your City Hall on the map (or tap City Hall Go / Map F) to open it.',
        tone: 'amber',
      },
    ],
  },
  {
    step: 3,
    title: 'City Hall Chaos & Tools',
    items: [
      {
        label: 'Permits & Events:',
        text: 'Approve builds or throw Weddings & Celebrations.',
        tone: 'amber',
      },
      {
        label: 'Chaos & Disasters:',
        text: 'Nuke, Earthquake, Tornado, Flood, War, Virus, Pollution & Protests (disasters also strike naturally!).',
        tone: 'rose',
      },
    ],
  },
  {
    step: 4,
    title: 'People Inside, Name & Alerts',
    items: [
      {
        label: 'People Inside:',
        text: 'Click any building to see live count / max capacity as cars & walkers visit.',
        tone: 'amber',
      },
      {
        label: 'Edit Name & Alerts:',
        text: 'Click the building name to rename it, or trigger a Robbery or Fire call.',
        tone: 'sky',
      },
    ],
  },
  {
    step: 5,
    title: 'Click a Car to Track It',
    items: [
      {
        text: 'With Select (V), click any moving car on a road to see where it is going.',
        tone: 'amber',
      },
    ],
  },
  {
    step: 6,
    title: 'Speed Up Time',
    items: [
      {
        text: 'Top-left bar: click 3× or 8× to speed up time (Space pauses/resumes).',
        tone: 'amber',
      },
    ],
  },
  {
    step: 7,
    title: 'Day, Seasons, Weather & Land',
    items: [
      {
        label: 'Hours:',
        text: 'Shops open 06:00–22:00; schools run Mon–Fri 08:00–16:00.',
        tone: 'amber',
      },
      {
        label: 'Seasons & Auto Land:',
        text: 'Changes every 10 days and automatically expands new land around your town.',
        tone: 'emerald',
      },
      {
        label: 'Weather:',
        text: 'Sunny, Rain, Storm, Windy trees & Foggy crashes. Click to preview!',
        tone: 'sky',
      },
    ],
  },
  {
    step: 8,
    title: 'Permits & News',
    items: [
      {
        label: 'Permits:',
        text: 'Citizens propose buildings (with location & build time) — Allow or Decline.',
        tone: 'amber',
      },
      {
        label: 'News:',
        text: 'Snap a daily photo (UI auto-hides), crop & publish as the paperboy delivers and citizens comment.',
        tone: 'amber',
      },
    ],
  },
  {
    step: 9,
    title: 'Map, Traffic & Music',
    items: [
      {
        label: 'Map (F):',
        text: 'Search and jump straight to any building or alert.',
        tone: 'sky',
      },
      {
        label: 'Traffic (T):',
        text: 'Show live road congestion colors.',
        tone: 'amber',
      },
      {
        label: 'Music & Sound:',
        text: 'Toggle relaxing lo-fi music or mute SFX anytime.',
        tone: 'teal',
      },
    ],
  },
  {
    step: 10,
    title: 'Hide/Show UI, Refresh & Auto-Save',
    items: [
      {
        label: 'Hide / Show UI (H):',
        text: 'Hide all bars for a clean view; tap Show UI anytime.',
        tone: 'white',
      },
      {
        label: 'Refresh & Auto-Save:',
        text: 'Refresh clears lag without restarting. Your city auto-saves automatically as you play and before you leave!',
        tone: 'emerald',
      },
    ],
  },
];

const TONE_CLASSES: Record<NonNullable<GuideBookStep['items'][number]['tone']>, string> = {
  amber: 'text-amber-300',
  sky: 'text-sky-300',
  rose: 'text-rose-300',
  emerald: 'text-emerald-300',
  teal: 'text-teal-300',
  white: 'text-white',
};

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
  const totalSteps = GUIDE_BOOK_STEPS.length;
  const activeStep = GUIDE_BOOK_STEPS[step - 1];

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
              <div className="text-xs font-bold text-white truncate">{activeStep.title}</div>
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

        {/* Short Step Body (synced with Guide Book) */}
        <div className="p-3 space-y-2 text-xs leading-snug text-slate-300">
          {step === 7 && (
            <p className="font-mono-tabular text-[11px] text-amber-200 font-semibold">
              {formattedTime} · {dayOfWeek} · Day {dayCount} · {season} · {weather}
            </p>
          )}

          {activeStep.items.length === 1 && !activeStep.items[0].label ? (
            <p>{activeStep.items[0].text}</p>
          ) : (
            <ul className="space-y-1 bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-[11px]">
              {activeStep.items.map((item, idx) => (
                <li key={idx}>
                  {item.label && (
                    <span className={`font-semibold ${TONE_CLASSES[item.tone || 'amber']} mr-1`}>
                      {item.label}
                    </span>
                  )}
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          )}

          {step === 1 && (
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
          )}

          {step === 2 && (
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
          )}

          {step === 5 && (
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
          )}

          {step === 6 && (
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
          )}

          {step === 10 && (
            <>
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
