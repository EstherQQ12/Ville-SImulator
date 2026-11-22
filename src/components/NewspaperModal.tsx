import { useEffect, useState } from 'react';
import { Camera, Newspaper, Send, X } from 'lucide-react';
import { NewspaperEdition, SeasonType, WeatherType } from '../types/game';

interface NewspaperModalProps {
  isOpen: boolean;
  mapName: string;
  editions: NewspaperEdition[];
  dayCount: number;
  dayOfWeek: string;
  season: SeasonType;
  weather: WeatherType;
  canPublishToday: boolean;
  draftPhotoDataUrl: string | null;
  dailyHints: string[];
  onTakePhoto: () => void;
  onPublish: (headline: string, summary: string, photoDataUrl?: string) => void;
  onClearDraft: () => void;
  onClose: () => void;
}

export function NewspaperModal({
  isOpen,
  mapName,
  editions,
  dayCount,
  dayOfWeek,
  season,
  weather,
  canPublishToday,
  draftPhotoDataUrl,
  dailyHints,
  onTakePhoto,
  onPublish,
  onClearDraft,
  onClose,
}: NewspaperModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (draftPhotoDataUrl) {
      setHeadline('');
      setSummary('');
    }
  }, [draftPhotoDataUrl]);

  if (!isOpen) return null;

  const isComposing = Boolean(draftPhotoDataUrl) && canPublishToday;
  const safeIndex = Math.min(selectedIndex, Math.max(0, editions.length - 1));
  const active = editions[safeIndex] || null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPublishToday) return;
    onPublish(
      headline.trim() || `${mapName} Daily Snapshot`,
      summary.trim() || `Captured around ${mapName} on ${dayOfWeek}, Day ${dayCount}.`,
      draftPhotoDataUrl || undefined
    );
    setHeadline('');
    setSummary('');
    setSelectedIndex(0);
  };

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
                The {mapName} Press
              </h2>
              <div className="text-[11px] text-stone-300 flex items-center gap-2 whitespace-nowrap">
                <span>{dayOfWeek} · Day {dayCount}</span>
                <span aria-hidden="true">·</span>
                <span>{canPublishToday ? '1 Daily Photo Available' : "Today's Edition Published"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canPublishToday && !isComposing && (
              <button
                type="button"
                onClick={onTakePhoto}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold transition-colors whitespace-nowrap"
              >
                <Camera className="w-3.5 h-3.5" />
                Take Photo
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
              aria-label="Close newspaper"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isComposing ? (
          <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto touch-pan-y p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 border-b border-stone-300 pb-2 font-mono-tabular">
              <span className="font-semibold text-stone-900">
                {dayOfWeek} · Day {dayCount} · {season} · {weather}
              </span>
              <button
                type="button"
                onClick={() => {
                  onClearDraft();
                  onTakePhoto();
                }}
                className="inline-flex items-center gap-1 text-stone-700 hover:text-stone-950 underline"
              >
                <Camera className="w-3 h-3" />
                Retake Photo
              </button>
            </div>

            {draftPhotoDataUrl && (
              <div className="rounded-lg overflow-hidden border border-stone-300 bg-stone-200">
                <img
                  src={draftPhotoDataUrl}
                  alt="Captured town snapshot"
                  className="w-full max-h-56 object-cover"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Headline
              </label>
              <input
                type="text"
                value={headline}
                maxLength={90}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Write a catchy front-page headline..."
                className="w-full px-3 py-2 rounded-lg bg-white border border-stone-300 text-stone-900 text-sm font-semibold focus:outline-none focus:border-stone-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                News Story
              </label>
              <textarea
                rows={4}
                value={summary}
                maxLength={500}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe what you spotted in town today..."
                className="w-full px-3 py-2 rounded-lg bg-white border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-stone-700 resize-y"
              />
            </div>

            {dailyHints.length > 0 && (
              <div className="bg-[#F3EFE4] border border-stone-300 rounded-lg p-3">
                <div className="text-[11px] font-semibold text-stone-700 mb-1.5">
                  Recent Sightings Around Town (click to add)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dailyHints.slice(-4).map((hint, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSummary((prev) => (prev ? `${prev} ${hint}` : hint))}
                      className="text-left text-[11px] px-2 py-1 rounded bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 transition-colors"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClearDraft}
                className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-200 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Publish Paper
              </button>
            </div>
          </form>
        ) : !active ? (
          <div className="p-8 text-center space-y-4">
            <div className="text-stone-700 text-sm max-w-md mx-auto">
              No newspapers published yet! Use the Camera tool to snap 1 photo each game day and write your own front-page story.
            </div>
            {canPublishToday && (
              <button
                type="button"
                onClick={onTakePhoto}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold transition-colors"
              >
                <Camera className="w-4 h-4" />
                Snap Photo on Map
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-300 overflow-y-auto md:overflow-hidden touch-pan-y">
            {/* Primary Front Page */}
            <div className="md:col-span-2 p-5 md:min-h-0 md:overflow-y-auto touch-pan-y space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 border-b border-stone-300 pb-2 font-mono-tabular">
                <span className="font-semibold text-stone-900">
                  {active.dayOfWeek ? `${active.dayOfWeek} · ` : ''}Day {active.day}
                </span>
                <span aria-hidden="true">·</span>
                <span>{active.season}</span>
                <span aria-hidden="true">·</span>
                <span>{active.weather}</span>
                <span aria-hidden="true">·</span>
                <span>{active.publishedAtTime}</span>
              </div>

              {active.photoDataUrl && (
                <div className="rounded-lg overflow-hidden border border-stone-300 bg-stone-200">
                  <img
                    src={active.photoDataUrl}
                    alt={active.headline}
                    className="w-full max-h-60 object-cover"
                  />
                </div>
              )}

              <h3 className="font-display text-2xl font-bold text-stone-950 leading-snug">
                {active.headline}
              </h3>

              <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-line">
                {active.summary}
              </p>

              {active.highlights.length > 0 && (
                <div className="pt-3 border-t border-stone-300">
                  <div className="text-xs font-semibold text-stone-700 mb-2">
                    Town Notes
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
                Published Editions ({editions.length})
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
                        <span>{ed.dayOfWeek ? `${ed.dayOfWeek} D${ed.day}` : `Day ${ed.day}`}</span>
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

