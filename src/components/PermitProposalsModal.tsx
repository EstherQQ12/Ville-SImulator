import React from 'react';
import {
  Check,
  Clock,
  FileText,
  HardHat,
  MapPin,
  Navigation,
  X,
} from 'lucide-react';
import { ActiveConstruction, ConstructionProposal } from '../types/game';
import { PixelIconPreview } from './PixelIconPreview';

interface PermitProposalsModalProps {
  isOpen: boolean;
  mapName: string;
  proposals: ConstructionProposal[];
  constructions: ActiveConstruction[];
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onLocate: (x: number, y: number) => void;
  onClose: () => void;
}

export function formatGameDuration(gameMinutes: number): string {
  const mins = Math.max(1, Math.round(gameMinutes));
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs === 0) return `${rem}m`;
  if (rem === 0) return `${hrs}h`;
  return `${hrs}h ${rem}m`;
}

export function PermitProposalsModal({
  isOpen,
  mapName,
  proposals,
  constructions,
  onApprove,
  onDecline,
  onLocate,
  onClose,
}: PermitProposalsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-xl bg-[#0F172A] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[84dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-slate-900/90 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-4 h-4 text-amber-300 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-white truncate">
                Mayor&apos;s Permit File · {mapName}
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Citizens propose buildings to the Mayor—review location &amp; game time to Allow or Decline
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close permit file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y p-4 space-y-4">
          {/* Pending Proposals */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-amber-300">
              <span>Pending Citizen Proposals ({proposals.length})</span>
              {proposals.length > 0 && (
                <span className="text-slate-400 normal-case font-normal">
                  Awaiting your decision
                </span>
              )}
            </div>

            {proposals.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/50 p-5 text-center text-xs text-slate-400">
                No pending building proposals right now. Citizens periodically file requests in this permit file when open roadside lots are available.
              </div>
            ) : (
              <div className="space-y-2.5">
                {proposals.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl bg-slate-900/90 border border-slate-700/80 p-3 flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 shrink-0">
                          <PixelIconPreview iconGrid={p.iconGrid} size={32} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white truncate">
                              {p.blueprintName}
                            </span>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
                              {p.category.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-amber-200/90 mt-0.5">
                            Applicant: <span className="font-semibold text-white">{p.applicantName}</span>
                            <span className="text-slate-500"> · Day {p.createdAtDay}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                            &ldquo;{p.note}&rdquo;
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onLocate(p.x, p.y);
                          onClose();
                        }}
                        title="Center map on proposed construction lot"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
                      >
                        <Navigation className="w-3 h-3" />
                        Locate
                      </button>
                    </div>

                    {/* Where & Game Time Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400">Location</div>
                          <div className="font-medium text-slate-100 truncate font-mono-tabular">
                            {p.areaName} ({p.x}, {p.y})
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400">Build Duration</div>
                          <div className="font-semibold text-amber-200 truncate font-mono-tabular">
                            {formatGameDuration(p.durationGameMinutes)} game time
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* User Allow / Decline Decision */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => onApprove(p.id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Allow Construction
                      </button>
                      <button
                        type="button"
                        onClick={() => onDecline(p.id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Constructions */}
          {constructions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <HardHat className="w-3.5 h-3.5" />
                <span>Under Construction ({constructions.length})</span>
              </div>
              <div className="space-y-2">
                {constructions.map((c) => {
                  const pct = Math.min(
                    100,
                    Math.round((c.elapsedGameMinutes / Math.max(1, c.totalGameMinutes)) * 100)
                  );
                  const remaining = Math.max(0, c.totalGameMinutes - c.elapsedGameMinutes);
                  return (
                    <div
                      key={c.id}
                      className="rounded-lg bg-slate-900/80 border border-slate-800 p-2.5 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PixelIconPreview iconGrid={c.iconGrid} size={26} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {c.blueprintName}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {c.applicantName} · {c.areaName} ({c.x}, {c.y})
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono-tabular text-amber-300 font-semibold">
                            {formatGameDuration(remaining)} left
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onLocate(c.x, c.y);
                              onClose();
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 transition-colors"
                            title="Locate construction site"
                          >
                            <Navigation className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
