import React, { useMemo, useState } from 'react';
import { MapPin, Navigation, Search, X } from 'lucide-react';
import {
  BuildingCategory,
  Neighbourhood,
  PlacedBuilding,
  SelectionTarget,
} from '../types/game';
import { PixelIconPreview } from './PixelIconPreview';

interface ActiveAlertSpot {
  id: string;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  badgeColor: string;
  selectType: SelectionTarget['type'];
}

interface PlaceFinderModalProps {
  isOpen: boolean;
  mapName: string;
  buildings: PlacedBuilding[];
  neighbourhoods: Neighbourhood[];
  alerts: ActiveAlertSpot[];
  onLocate: (x: number, y: number, selectType?: SelectionTarget['type']) => void;
  onClose: () => void;
}

type FilterTab = 'all' | 'civic' | 'schools_parks' | 'shops_jobs' | 'homes' | 'districts';

const CIVIC_CATS = new Set<BuildingCategory>([
  'city_hall',
  'hospital',
  'police',
  'jail',
  'fire_station',
  'cemetery',
]);
const SCHOOL_PARK_CATS = new Set<BuildingCategory>(['school', 'park']);
const SHOP_JOB_CATS = new Set<BuildingCategory>([
  'commercial',
  'visit_spot',
  'workplace',
  'factory',
  'crops',
  'landmark',
]);

function formatCategoryName(bld: PlacedBuilding): string {
  if (bld.category === 'park') {
    if (bld.parkVariant === 'playground') return 'Playground';
    if (bld.parkVariant === 'garden') return 'Flower Garden';
    if (bld.parkVariant === 'field') return 'Sports Field';
    return 'Park';
  }
  const map: Record<BuildingCategory, string> = {
    residential: 'House',
    city_hall: 'City Hall',
    school: 'School',
    hospital: 'Hospital',
    police: 'Police Station',
    jail: 'City Jail',
    fire_station: 'Fire Station',
    cemetery: 'Cemetery',
    workplace: 'Office',
    factory: 'Factory',
    crops: 'Crops Farm',
    commercial: 'Store',
    visit_spot: 'Spot',
    park: 'Park',
    landmark: 'Landmark',
    road_path: 'Path',
  };
  return map[bld.category] || bld.category;
}

export function PlaceFinderModal({
  isOpen,
  mapName,
  buildings,
  neighbourhoods,
  alerts,
  onLocate,
  onClose,
}: PlaceFinderModalProps) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');

  const searchableBuildings = useMemo(() => {
    return buildings
      .filter((b) => b.category !== 'road_path')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [buildings]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const filteredBuildings = searchableBuildings.filter((b) => {
    if (tab === 'civic' && !CIVIC_CATS.has(b.category)) return false;
    if (tab === 'schools_parks' && !SCHOOL_PARK_CATS.has(b.category)) return false;
    if (tab === 'shops_jobs' && !SHOP_JOB_CATS.has(b.category)) return false;
    if (tab === 'homes' && b.category !== 'residential') return false;
    if (tab === 'districts') return false;

    if (!q) return true;
    const cat = formatCategoryName(b).toLowerCase();
    const status = (b.statusText || '').toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      cat.includes(q) ||
      status.includes(q) ||
      `${b.x},${b.y}`.includes(q)
    );
  });

  const filteredDistricts = neighbourhoods.filter((n) => {
    if (tab !== 'all' && tab !== 'districts') return false;
    if (!q) return true;
    return n.name.toLowerCase().includes(q);
  });

  const filteredAlerts = alerts.filter((a) => {
    if (tab !== 'all' && tab !== 'districts') return false;
    if (!q) return true;
    return a.label.toLowerCase().includes(q) || a.sublabel.toLowerCase().includes(q);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-xl bg-[#0F172A] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[84dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-slate-900/90 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-white truncate">
                Find Places in {mapName}
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Jump directly to any building, store, school, district, or live event
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close place finder"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter Tabs */}
        <div className="p-3.5 border-b border-slate-800 space-y-2.5 bg-slate-900/40 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search schools, stores, houses, parks, districts..."
              autoFocus
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto touch-pan-x pb-0.5">
            {(
              [
                ['all', 'All'],
                ['civic', 'Civic & Safety'],
                ['schools_parks', 'Schools & Parks'],
                ['shops_jobs', 'Stores & Jobs'],
                ['homes', 'Homes'],
                ['districts', 'Districts & Alerts'],
              ] as [FilterTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  tab === id
                    ? 'bg-sky-400 text-slate-950'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y p-3.5 space-y-3">
          {filteredAlerts.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">
                Live Incidents ({filteredAlerts.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredAlerts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      onLocate(a.x, a.y, a.selectType);
                      onClose();
                    }}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: a.badgeColor }}
                        />
                        <span className="text-xs font-semibold text-white truncate">{a.label}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{a.sublabel}</div>
                    </div>
                    <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredDistricts.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
                Neighbourhoods ({filteredDistricts.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredDistricts.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      onLocate(Math.round(n.centerX), Math.round(n.centerY));
                      onClose();
                    }}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: n.color }}
                        />
                        <span className="text-xs font-semibold text-white truncate">{n.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {n.houseIds.length} homes · Safety {Math.round(n.safetyScore)}%
                      </div>
                    </div>
                    <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab !== 'districts' && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Buildings &amp; Plots ({filteredBuildings.length})
              </div>
              {filteredBuildings.length === 0 ? (
                <div className="text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg p-6 text-center">
                  No places matched your search.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {filteredBuildings.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        onLocate(b.x, b.y, 'building');
                        onClose();
                      }}
                      className="flex items-center justify-between gap-2.5 p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/60 text-left transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PixelIconPreview iconGrid={b.iconGrid} size={26} />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{b.name}</div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {formatCategoryName(b)}
                            {b.statusText ? ` · ${b.statusText}` : ''}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono-tabular text-slate-400 shrink-0">
                        ({b.x},{b.y})
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
