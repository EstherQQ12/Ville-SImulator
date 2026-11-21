import { useState } from 'react';
import { Newspaper, X } from 'lucide-react';
import { NewspaperEdition } from '../types/game';

interface NewspaperModalProps {
  isOpen: boolean;
  mapName: string;
  editions: NewspaperEdition[];
  onClose: () => void;
}

export function NewspaperModal({
  isOpen,
  mapName,
  editions,
  onClose,
}: NewspaperModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isOpen) return null;

  const safeIndex = Math.min(selectedIndex, Math.max(0, editions.length - 1));
  const active = editions[safeIndex] || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-2xl bg-[#FBF8F1] border border-stone-300 rounded-xl shadow-2xl overflow-hidden text-stone-900 flex flex-col max-h-[85dvh]">
        {/* Broadsheet Masthead */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-stone-900 text-stone-50 border-b border-stone-700 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Newspaper className="w-5 h-5 text-amber-300 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold tracking-tight truncate">
                The {mapName} Daily
              </h2>
              <div className="text-[11px] text-stone-300 flex items-center gap-2 whitespace-nowrap">
                <span>Morning Edition</span>
                <span aria-hidden="true">·</span>
                <span>Delivered 06:30 AM</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-colors shrink-0"
            aria-label="Close newspaper"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!active ? (
          <div className="p-8 text-center text-stone-600 text-sm">
            The morning press prints its next edition at 06:30 AM. Check back at sunrise!
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-300 overflow-y-auto md:overflow-hidden touch-pan-y">
            {/* Primary Front Page */}
            <div className="md:col-span-2 p-5 md:min-h-0 md:overflow-y-auto touch-pan-y space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 border-b border-stone-300 pb-2 font-mono-tabular">
                <span className="font-semibold text-stone-900">Day {active.day}</span>
                <span aria-hidden="true">·</span>
                <span>{active.season}</span>
                <span aria-hidden="true">·</span>
                <span>{active.weather}</span>
                <span aria-hidden="true">·</span>
                <span>{active.publishedAtTime}</span>
              </div>

              <h3 className="font-display text-2xl font-bold text-stone-950 leading-snug">
                {active.headline}
              </h3>

              <p className="text-sm text-stone-800 leading-relaxed">{active.summary}</p>

              {active.highlights.length > 0 && (
                <div className="pt-3 border-t border-stone-300">
                  <div className="text-xs font-semibold text-stone-700 mb-2">
                    Town Opinions, Rumors &amp; Wild Sightings
                  </div>
                  <ul className="space-y-1.5 text-xs text-stone-700 list-disc pl-4">
                    {active.highlights.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Archive Column */}
            <div className="p-4 bg-[#F3EFE4] md:min-h-0 md:overflow-y-auto touch-pan-y">
              <div className="text-xs font-semibold text-stone-700 mb-2.5">
                Recent Editions
              </div>
              <div className="space-y-1.5">
                {editions.map((ed, idx) => {
                  const selected = idx === safeIndex;
                  return (
                    <button
                      key={ed.id}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                        selected
                          ? 'bg-stone-900 text-stone-50 border-stone-900'
                          : 'bg-white/80 hover:bg-white text-stone-800 border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono-tabular opacity-80">
                        <span>Day {ed.day}</span>
                        <span>{ed.season}</span>
                      </div>
                      <div className="text-xs font-semibold line-clamp-2 mt-0.5">
                        {ed.headline}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
