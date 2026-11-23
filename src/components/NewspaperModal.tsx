import React, { useEffect, useRef, useState } from 'react';
import { Camera, Crop, MessageSquareQuote, Newspaper, Send, X } from 'lucide-react';
import { NewspaperEdition, SeasonType, WeatherType } from '../types/game';

export interface NormalizedCropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

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
  draftInitialCrop?: NormalizedCropRect | null;
  dailyHints: string[];
  onTakePhoto: () => void;
  onPublish: (headline: string, summary: string, photoDataUrl?: string) => void;
  onClearDraft: () => void;
  onClose: () => void;
}

function clampCrop(r: NormalizedCropRect): NormalizedCropRect {
  const w = Math.max(0.14, Math.min(1, r.w));
  const h = Math.max(0.14, Math.min(1, r.h));
  const x = Math.max(0, Math.min(1 - w, r.x));
  const y = Math.max(0, Math.min(1 - h, r.y));
  return { x, y, w, h };
}

function renderCroppedPhoto(
  imgEl: HTMLImageElement,
  crop: NormalizedCropRect
): string {
  const natW = imgEl.naturalWidth || imgEl.width;
  const natH = imgEl.naturalHeight || imgEl.height;
  if (natW <= 0 || natH <= 0) return imgEl.src;

  const sx = Math.round(crop.x * natW);
  const sy = Math.round(crop.y * natH);
  const sw = Math.max(24, Math.round(crop.w * natW));
  const sh = Math.max(24, Math.round(crop.h * natH));

  const maxOutW = 960;
  const scale = Math.min(2, maxOutW / sw);
  const outW = Math.min(maxOutW, Math.max(320, Math.round(sw * scale)));
  const outH = Math.max(180, Math.round(outW * (sh / sw)));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return imgEl.src;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, outW, outH);
  return canvas.toDataURL('image/png');
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
  draftInitialCrop,
  dailyHints,
  onTakePhoto,
  onPublish,
  onClearDraft,
  onClose,
}: NewspaperModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [cropRect, setCropRect] = useState<NormalizedCropRect>({ x: 0.2, y: 0.2, w: 0.6, h: 0.6 });
  const cropBoxContainerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    mode: 'move' | 'nw' | 'ne' | 'sw' | 'se';
    startX: number;
    startY: number;
    orig: NormalizedCropRect;
  } | null>(null);

  useEffect(() => {
    if (draftPhotoDataUrl) {
      setHeadline('');
      setSummary('');
      setCropRect(
        clampCrop(
          draftInitialCrop || {
            x: 0.22,
            y: 0.2,
            w: 0.56,
            h: 0.56,
          }
        )
      );
    }
  }, [draftPhotoDataUrl, draftInitialCrop]);

  if (!isOpen) return null;

  const isComposing = Boolean(draftPhotoDataUrl) && canPublishToday;
  const safeIndex = Math.min(selectedIndex, Math.max(0, editions.length - 1));
  const active = editions[safeIndex] || null;

  const startCropDrag = (
    mode: 'move' | 'nw' | 'ne' | 'sw' | 'se',
    e: React.PointerEvent<HTMLElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...cropRect },
    };
  };

  const moveCropDrag = (e: React.PointerEvent<HTMLElement>) => {
    const sess = dragRef.current;
    const container = cropBoxContainerRef.current;
    if (!sess || !container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return;

    const dx = (e.clientX - sess.startX) / rect.width;
    const dy = (e.clientY - sess.startY) / rect.height;
    const o = sess.orig;

    if (sess.mode === 'move') {
      setCropRect(clampCrop({ x: o.x + dx, y: o.y + dy, w: o.w, h: o.h }));
      return;
    }

    const minSz = 0.14;
    let nx = o.x;
    let ny = o.y;
    let nw = o.w;
    let nh = o.h;

    if (sess.mode === 'nw' || sess.mode === 'sw') {
      const right = o.x + o.w;
      nx = Math.max(0, Math.min(right - minSz, o.x + dx));
      nw = right - nx;
    } else {
      nw = Math.max(minSz, Math.min(1 - o.x, o.w + dx));
    }

    if (sess.mode === 'nw' || sess.mode === 'ne') {
      const bottom = o.y + o.h;
      ny = Math.max(0, Math.min(bottom - minSz, o.y + dy));
      nh = bottom - ny;
    } else {
      nh = Math.max(minSz, Math.min(1 - o.y, o.h + dy));
    }

    setCropRect(clampCrop({ x: nx, y: ny, w: nw, h: nh }));
  };

  const endCropDrag = () => {
    dragRef.current = null;
  };

  const applyPresetScale = (scale: number) => {
    const cx = cropRect.x + cropRect.w / 2;
    const cy = cropRect.y + cropRect.h / 2;
    const w = scale;
    const h = scale;
    setCropRect(clampCrop({ x: cx - w / 2, y: cy - h / 2, w, h }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPublishToday) return;
    let finalPhoto = draftPhotoDataUrl || undefined;
    if (draftPhotoDataUrl && imgRef.current) {
      finalPhoto = renderCroppedPhoto(imgRef.current, cropRect);
    }
    onPublish(
      headline.trim() || `${mapName} Daily Snapshot`,
      summary.trim() || `Captured around ${mapName} on ${dayOfWeek}, Day ${dayCount}.`,
      finalPhoto
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
      <div className="w-full max-w-2xl bg-[#FBF8F1] border border-stone-300 rounded-xl shadow-2xl overflow-hidden text-stone-900 flex flex-col max-h-[88dvh]">
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
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-stone-800">
                    <Crop className="w-3.5 h-3.5 text-amber-700" />
                    Drag box or corners to crop your photo
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: 'Tight', s: 0.35 },
                      { label: 'Medium', s: 0.56 },
                      { label: 'Wide', s: 0.8 },
                      { label: 'Full', s: 1 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyPresetScale(p.s)}
                        className="px-2 py-0.5 rounded border border-stone-300 bg-white hover:bg-stone-100 text-[11px] font-medium text-stone-700"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  ref={cropBoxContainerRef}
                  className="relative w-full rounded-lg overflow-hidden border border-stone-400 bg-stone-900 select-none touch-none"
                >
                  <img
                    ref={imgRef}
                    src={draftPhotoDataUrl}
                    alt="Full town snapshot for cropping"
                    draggable={false}
                    className="block w-full h-auto max-h-72 object-contain mx-auto pointer-events-none"
                  />

                  {/* Dimmed exterior masks */}
                  <div
                    className="absolute inset-x-0 top-0 bg-slate-950/55 pointer-events-none"
                    style={{ height: `${cropRect.y * 100}%` }}
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 bg-slate-950/55 pointer-events-none"
                    style={{ height: `${(1 - (cropRect.y + cropRect.h)) * 100}%` }}
                  />
                  <div
                    className="absolute left-0 bg-slate-950/55 pointer-events-none"
                    style={{
                      top: `${cropRect.y * 100}%`,
                      height: `${cropRect.h * 100}%`,
                      width: `${cropRect.x * 100}%`,
                    }}
                  />
                  <div
                    className="absolute right-0 bg-slate-950/55 pointer-events-none"
                    style={{
                      top: `${cropRect.y * 100}%`,
                      height: `${cropRect.h * 100}%`,
                      width: `${(1 - (cropRect.x + cropRect.w)) * 100}%`,
                    }}
                  />

                  {/* Interactive Crop Selection Box */}
                  <div
                    onPointerDown={(e) => startCropDrag('move', e)}
                    onPointerMove={moveCropDrag}
                    onPointerUp={endCropDrag}
                    onPointerCancel={endCropDrag}
                    style={{
                      left: `${cropRect.x * 100}%`,
                      top: `${cropRect.y * 100}%`,
                      width: `${cropRect.w * 100}%`,
                      height: `${cropRect.h * 100}%`,
                    }}
                    className="absolute border-2 border-amber-400 shadow-[0_0_0_1px_rgba(15,23,42,0.7)] cursor-move touch-none"
                  >
                    <button
                      type="button"
                      aria-label="Resize crop top-left"
                      onPointerDown={(e) => startCropDrag('nw', e)}
                      onPointerMove={moveCropDrag}
                      onPointerUp={endCropDrag}
                      onPointerCancel={endCropDrag}
                      className="absolute -top-2 -left-2 w-4 h-4 rounded-sm bg-amber-400 border border-stone-900 cursor-nwse-resize"
                    />
                    <button
                      type="button"
                      aria-label="Resize crop top-right"
                      onPointerDown={(e) => startCropDrag('ne', e)}
                      onPointerMove={moveCropDrag}
                      onPointerUp={endCropDrag}
                      onPointerCancel={endCropDrag}
                      className="absolute -top-2 -right-2 w-4 h-4 rounded-sm bg-amber-400 border border-stone-900 cursor-nesw-resize"
                    />
                    <button
                      type="button"
                      aria-label="Resize crop bottom-left"
                      onPointerDown={(e) => startCropDrag('sw', e)}
                      onPointerMove={moveCropDrag}
                      onPointerUp={endCropDrag}
                      onPointerCancel={endCropDrag}
                      className="absolute -bottom-2 -left-2 w-4 h-4 rounded-sm bg-amber-400 border border-stone-900 cursor-nesw-resize"
                    />
                    <button
                      type="button"
                      aria-label="Resize crop bottom-right"
                      onPointerDown={(e) => startCropDrag('se', e)}
                      onPointerMove={moveCropDrag}
                      onPointerUp={endCropDrag}
                      onPointerCancel={endCropDrag}
                      className="absolute -bottom-2 -right-2 w-4 h-4 rounded-sm bg-amber-400 border border-stone-900 cursor-nwse-resize"
                    />
                  </div>
                </div>
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
                Publish &amp; Deliver
              </button>
            </div>
          </form>
        ) : !active ? (
          <div className="p-8 text-center space-y-4">
            <div className="text-stone-700 text-sm max-w-md mx-auto">
              No newspapers published yet! Use the Camera tool to snap 1 photo each game day, crop it how you like, and send the bicycling paperboy to deliver it to every doorstep!
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
                <div className="rounded-lg overflow-hidden border border-stone-300 bg-stone-900">
                  <img
                    src={active.photoDataUrl}
                    alt={active.headline}
                    className="w-full max-h-64 object-contain mx-auto"
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

              {active.readerComments && active.readerComments.length > 0 && (
                <div className="pt-3 border-t border-stone-300 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                    <MessageSquareQuote className="w-3.5 h-3.5 text-amber-700" />
                    Reader Feedback &amp; Porch Remarks
                  </div>
                  <div className="space-y-2">
                    {active.readerComments.map((rc) => (
                      <div
                        key={rc.id}
                        className="rounded-lg bg-[#F3EFE4] border border-stone-300/90 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] mb-0.5">
                          <span className="font-bold text-stone-900">{rc.author}</span>
                          <span className="text-stone-600 font-medium">{rc.mood}</span>
                        </div>
                        <p className="text-xs text-stone-800 leading-snug">&ldquo;{rc.text}&rdquo;</p>
                      </div>
                    ))}
                  </div>
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
