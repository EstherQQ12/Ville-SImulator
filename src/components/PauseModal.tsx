interface PauseModalProps {
  isOpen: boolean;
  mapName: string;
  onResume: () => void;
  onOpenMapManager: () => void;
  onReturnToTitle: () => void;
}

export function PauseModal({
  isOpen,
  mapName,
  onResume,
  onOpenMapManager,
  onReturnToTitle,
}: PauseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-md bg-[#0F172A] border border-slate-700/80 rounded-xl shadow-2xl p-6 text-slate-100">
        <div className="mb-5">
          <h2 className="font-display text-2xl font-bold text-white">Simulation Paused</h2>
          <p className="text-xs text-slate-400 mt-1">
            Active map: <span className="text-slate-200 font-medium">{mapName}</span>
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3.5 mb-5 space-y-2 text-xs text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">Pan Camera</span>
            <span className="font-mono-tabular text-slate-200">WASD / Arrows / Right-Drag</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Zoom Map</span>
            <span className="font-mono-tabular text-slate-200">Mouse Wheel</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tools</span>
            <span className="font-mono-tabular text-slate-200">V Select · R Road · X Bulldoze</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Traffic Overlay</span>
            <span className="font-mono-tabular text-slate-200">T Key</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Play / Pause Clock</span>
            <span className="font-mono-tabular text-slate-200">Space</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm transition-colors"
          >
            Resume Simulation
          </button>
          <button
            type="button"
            onClick={onOpenMapManager}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm transition-colors border border-slate-700"
          >
            Save / Load Maps
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-colors border border-slate-800"
          >
            Return to Title Screen
          </button>
        </div>
      </div>
    </div>
  );
}
