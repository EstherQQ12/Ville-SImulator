import {
  Activity,
  AlertTriangle,
  Biohazard,
  Bomb,
  Check,
  Clock,
  Coins,
  Droplets,
  Factory,
  FileText,
  Flame,
  GraduationCap,
  HardHat,
  Heart,
  Home,
  MapPin,
  Megaphone,
  Paintbrush,
  PartyPopper,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sprout,
  Store,
  Swords,
  Trash2,
  Trees,
  Waves,
  Wind,
  Wrench,
  X,
} from 'lucide-react';
import { CATEGORY_LABELS } from '../data/defaultBlueprints';
import {
  ActiveConstruction,
  ChaosCooldowns,
  CityCrisisState,
  CityEvent,
  CityEventType,
  ConstructionProposal,
  CrashIncident,
  CrisisType,
  FireIncident,
  MapTile,
  MarketStall,
  MayorSpeech,
  Neighbourhood,
  ProtestIncident,
  RoadIntersectionConfig,
  RobberyIncident,
} from '../types/game';
import { formatGameDuration } from './PermitProposalsModal';
import { PixelIconPreview } from './PixelIconPreview';

interface InspectorPanelProps {
  tile: MapTile | null;
  neighbourhood: Neighbourhood | null;
  robbery: RobberyIncident | null;
  protest: ProtestIncident | null;
  cityEvent: CityEvent | null;
  fire: FireIncident | null;
  crash: CrashIncident | null;
  stall: MarketStall | null;
  proposal: ConstructionProposal | null;
  construction: ActiveConstruction | null;
  pendingProposalsCount: number;
  crises: CityCrisisState;
  cratersCount: number;
  economyScore: number;
  totalLawsuits: number;
  prisonInmates: number;
  totalJailed: number;
  totalReleased: number;
  mayorAlive: boolean;
  electionActive: boolean;
  electionRemaining: number;
  basementCount: number;
  chaosCooldowns: ChaosCooldowns;
  mayorSpeech: MayorSpeech | null;
  isIntersection: boolean;
  isHighway: boolean;
  nsSignal: 'green' | 'amber' | 'red';
  ewSignal: 'green' | 'amber' | 'red';
  onClose: () => void;
  onEditBuildingIcon: (x: number, y: number) => void;
  onRenameBuilding: (x: number, y: number, name: string) => void;
  onDeleteTile: (x: number, y: number) => void;
  onUpdateIntersection: (x: number, y: number, cfg: Partial<RoadIntersectionConfig>) => void;
  onTriggerProtest: (x: number, y: number) => void;
  onHostCityEvent: (x: number, y: number, type: CityEventType) => void;
  onTriggerCrisis: (type: CrisisType) => void;
  onTriggerNuke: () => void;
  onSpawnInvaders: () => void;
  onToggleZebraCrossing: (x: number, y: number) => void;
  onRemoveFootbridge: (x: number, y: number) => void;
  onOpenPermits: () => void;
  onApproveProposal: (id: string) => void;
  onDeclineProposal: (id: string) => void;
}

function formatCooldown(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

export function InspectorPanel({
  tile,
  neighbourhood,
  robbery,
  protest,
  cityEvent,
  fire,
  crash,
  stall,
  proposal,
  construction,
  pendingProposalsCount,
  crises,
  cratersCount,
  economyScore,
  totalLawsuits,
  prisonInmates,
  totalJailed,
  totalReleased,
  mayorAlive,
  electionActive,
  electionRemaining,
  basementCount,
  chaosCooldowns,
  mayorSpeech,
  isIntersection,
  isHighway,
  nsSignal,
  ewSignal,
  onClose,
  onEditBuildingIcon,
  onRenameBuilding,
  onDeleteTile,
  onUpdateIntersection,
  onTriggerProtest,
  onHostCityEvent,
  onTriggerCrisis,
  onTriggerNuke,
  onSpawnInvaders,
  onToggleZebraCrossing,
  onRemoveFootbridge,
  onOpenPermits,
  onApproveProposal,
  onDeclineProposal,
}: InspectorPanelProps) {
  if (!tile) return null;

  if (tile.building) {
    const b = tile.building;
    return (
      <div className="pointer-events-auto w-72 bg-[#0F172A]/95 border border-slate-700/80 rounded-xl shadow-xl p-3.5 text-slate-100">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 shrink-0">
              <PixelIconPreview iconGrid={b.iconGrid} size={36} />
            </div>
            <div className="min-w-0">
              <input
                type="text"
                value={b.name}
                maxLength={28}
                onChange={(e) => onRenameBuilding(tile.x, tile.y, e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-white border-b border-transparent hover:border-slate-600 focus:border-amber-400 focus:outline-none truncate"
              />
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                {CATEGORY_LABELS[b.category]}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors shrink-0"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2">
            <span className="text-slate-400">
              {b.category === 'cemetery' ? 'Deaths Buried' : 'People Inside'}
            </span>
            <span
              className={`font-mono-tabular text-sm font-semibold ${
                b.category === 'cemetery' ? 'text-slate-200' : 'text-amber-400'
              }`}
            >
              {b.totalVisits} / {b.capacity}
            </span>
          </div>

          {b.statusText && (
            <div className="flex items-center justify-between text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-sky-300" />
                Status
              </span>
              <span className="font-semibold text-sky-200 truncate pl-2">{b.statusText}</span>
            </div>
          )}

          {b.category === 'residential' && (
            <div className="flex items-center justify-between text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-amber-300" />
                Residents
              </span>
              <span className="font-mono-tabular font-semibold text-white">
                {b.residents ?? 0} / 5
              </span>
            </div>
          )}

          {b.category === 'park' && (
            <div className="flex items-center justify-between text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Trees className="w-3.5 h-3.5 text-emerald-400" />
                Park Style
              </span>
              <span className="font-semibold text-emerald-300 capitalize">
                {b.parkVariant === 'field'
                  ? 'Multipurpose Field'
                  : b.parkVariant === 'garden'
                  ? 'Flower Garden'
                  : 'Playground'}
              </span>
            </div>
          )}

          {b.hasBasement && (
            <div className="flex items-center justify-between text-xs bg-emerald-950/60 border border-emerald-700/70 rounded-lg px-3 py-1.5 text-emerald-200">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Underground Basement
              </span>
              <span className="font-semibold text-emerald-300">Blast Safe</span>
            </div>
          )}

          {!tile.isDefaultLand && (
            <div className="flex items-center justify-between text-[11px] bg-slate-900/80 border border-emerald-700/50 rounded-lg px-3 py-1 text-emerald-300">
              <span>Expansion Land</span>
              <span className="font-medium">Relocatable</span>
            </div>
          )}
        </div>

        {b.category === 'city_hall' && (
          <div className="space-y-2.5 mb-3">
            <div className="flex items-center justify-between gap-2 text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-2">
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400">Mayor&apos;s Residence</div>
                <div
                  className={`font-semibold truncate ${
                    electionActive
                      ? 'text-indigo-300'
                      : !mayorAlive
                      ? 'text-rose-400'
                      : 'text-amber-300'
                  }`}
                >
                  {electionActive
                    ? `Mayoral Election (${electionRemaining}s)`
                    : !mayorAlive
                    ? 'Mayor Killed — Election Pending'
                    : protest && protest.status === 'active'
                    ? protest.started
                      ? 'Addressing Protesters'
                      : 'Protesters Approaching'
                    : mayorSpeech
                    ? `Speech: ${mayorSpeech.topic}`
                    : 'Mayor in Residence'}
                </div>
              </div>
              {mayorAlive && !electionActive && (!protest || protest.status !== 'active') && (
                <button
                  type="button"
                  onClick={() => onTriggerProtest(tile.x, tile.y)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Megaphone className="w-3 h-3" />
                  Protest
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-2">
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400">Building Permits File</div>
                <div className="font-semibold text-amber-300 truncate">
                  {pendingProposalsCount > 0
                    ? `${pendingProposalsCount} Citizen Proposal${pendingProposalsCount > 1 ? 's' : ''}`
                    : 'No Pending Requests'}
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenPermits}
                className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <FileText className="w-3 h-3" />
                Open File
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
              <div className="text-[10px] text-slate-400 font-medium mb-1.5">Civic Events</div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => onHostCityEvent(tile.x, tile.y, 'wedding')}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Heart className="w-3 h-3" />
                  Wedding
                </button>
                <button
                  type="button"
                  onClick={() => onHostCityEvent(tile.x, tile.y, 'ceremony')}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3 h-3" />
                  Ceremony
                </button>
                <button
                  type="button"
                  onClick={() => onHostCityEvent(tile.x, tile.y, 'celebration')}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <PartyPopper className="w-3 h-3" />
                  Celebrate
                </button>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-1.5">
                <span>City Chaos</span>
                <span className="font-mono-tabular text-slate-300">
                  Econ {economyScore}%
                  {totalLawsuits > 0 ? (
                    <span className="text-rose-400"> · {totalLawsuits} Sued</span>
                  ) : null}
                  {basementCount > 0 ? (
                    <span className="text-emerald-300"> · {basementCount} Bunkers</span>
                  ) : null}
                  {cratersCount > 0 ? (
                    <span className="text-orange-400"> · {cratersCount} Craters</span>
                  ) : null}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onTriggerCrisis('virus')}
                  disabled={!crises.virusActive && chaosCooldowns.virus > 0}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 font-mono-tabular ${
                    crises.virusActive
                      ? 'bg-lime-500 text-slate-950 hover:bg-lime-400'
                      : chaosCooldowns.virus > 0
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                      : 'bg-slate-800 text-lime-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={
                    crises.virusActive
                      ? 'End virus outbreak'
                      : chaosCooldowns.virus > 0
                      ? `Recharging (${formatCooldown(chaosCooldowns.virus)} cooldown)`
                      : 'Trigger virus outbreak (5m cooldown)'
                  }
                >
                  <Biohazard className="w-3 h-3" />
                  {crises.virusActive
                    ? `Virus ${Math.ceil(crises.virusRemaining)}s`
                    : chaosCooldowns.virus > 0
                    ? `Virus ${formatCooldown(chaosCooldowns.virus)}`
                    : 'Virus'}
                </button>
                <button
                  type="button"
                  onClick={() => onTriggerCrisis('war')}
                  disabled={!crises.warActive && chaosCooldowns.war > 0}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 font-mono-tabular ${
                    crises.warActive
                      ? 'bg-rose-500 text-white hover:bg-rose-400'
                      : chaosCooldowns.war > 0
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                      : 'bg-slate-800 text-rose-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={
                    crises.warActive
                      ? 'Declare peace'
                      : chaosCooldowns.war > 0
                      ? `Recharging (${formatCooldown(chaosCooldowns.war)} cooldown)`
                      : 'Trigger war & defending patrol (5m cooldown)'
                  }
                >
                  <Swords className="w-3 h-3" />
                  {crises.warActive
                    ? `War ${Math.ceil(crises.warRemaining)}s`
                    : chaosCooldowns.war > 0
                    ? `War ${formatCooldown(chaosCooldowns.war)}`
                    : 'War'}
                </button>
                <button
                  type="button"
                  onClick={() => onTriggerCrisis('poverty')}
                  disabled={!crises.povertyActive && chaosCooldowns.poverty > 0}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 font-mono-tabular ${
                    crises.povertyActive
                      ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                      : chaosCooldowns.poverty > 0
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                      : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={
                    crises.povertyActive
                      ? 'End poverty crisis'
                      : chaosCooldowns.poverty > 0
                      ? `Recharging (${formatCooldown(chaosCooldowns.poverty)} cooldown)`
                      : 'Trigger poverty crisis (5m cooldown)'
                  }
                >
                  <Coins className="w-3 h-3" />
                  {crises.povertyActive
                    ? `Poverty ${Math.ceil(crises.povertyRemaining)}s`
                    : chaosCooldowns.poverty > 0
                    ? `Poverty ${formatCooldown(chaosCooldowns.poverty)}`
                    : 'Poverty'}
                </button>
                <button
                  type="button"
                  onClick={() => onTriggerCrisis('pollution')}
                  disabled={!crises.pollutionActive && chaosCooldowns.pollution > 0}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 font-mono-tabular ${
                    crises.pollutionActive
                      ? 'bg-lime-700 text-lime-100 hover:bg-lime-600 border border-lime-500/60'
                      : chaosCooldowns.pollution > 0
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                      : 'bg-slate-800 text-emerald-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={
                    crises.pollutionActive
                      ? 'Clear pollution'
                      : chaosCooldowns.pollution > 0
                      ? `Recharging (${formatCooldown(chaosCooldowns.pollution)} cooldown)`
                      : 'Trigger heavy pollution (5m cooldown)'
                  }
                >
                  <Droplets className="w-3 h-3" />
                  {crises.pollutionActive
                    ? `Polluted ${Math.round(crises.pollutionLevel)}%`
                    : chaosCooldowns.pollution > 0
                    ? `Pol ${formatCooldown(chaosCooldowns.pollution)}`
                    : 'Pollution'}
                </button>
                <button
                  type="button"
                  onClick={onSpawnInvaders}
                  disabled={chaosCooldowns.invade > 0}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 font-mono-tabular ${
                    chaosCooldowns.invade > 0
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-red-900/80 border border-red-800/70 text-red-300'
                  }`}
                  title={
                    chaosCooldowns.invade > 0
                      ? `Invaders recharging (${formatCooldown(chaosCooldowns.invade)} cooldown)`
                      : 'Send invading army wave from city borders (5m cooldown)'
                  }
                >
                  <ShieldAlert className="w-3 h-3" />
                  {chaosCooldowns.invade > 0 ? `Invade ${formatCooldown(chaosCooldowns.invade)}` : 'Invade'}
                </button>
                <button
                  type="button"
                  onClick={() => onTriggerCrisis('tornado')}
                  disabled={!crises.tornadoActive && chaosCooldowns.tornado > 0}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 font-mono-tabular ${
                    crises.tornadoActive
                      ? 'bg-slate-200 text-slate-950 hover:bg-white'
                      : chaosCooldowns.tornado > 0
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={
                    crises.tornadoActive
                      ? 'Dissipate tornado'
                      : chaosCooldowns.tornado > 0
                      ? `Tornado recharging (${formatCooldown(chaosCooldowns.tornado)} cooldown)`
                      : 'Spawn a roving Tornado across town (5m cooldown)'
                  }
                >
                  <Wind className="w-3 h-3" />
                  {crises.tornadoActive
                    ? `Tornado ${Math.ceil(crises.tornadoRemaining)}s`
                    : chaosCooldowns.tornado > 0
                    ? `Twister ${formatCooldown(chaosCooldowns.tornado)}`
                    : 'Tornado'}
                </button>
                <button
                  type="button"
                  onClick={() => onTriggerCrisis('earthquake')}
                  disabled={!crises.earthquakeActive && chaosCooldowns.earthquake > 0}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 font-mono-tabular ${
                    crises.earthquakeActive
                      ? 'bg-amber-600 text-white hover:bg-amber-500'
                      : chaosCooldowns.earthquake > 0
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                      : 'bg-slate-800 text-orange-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={
                    crises.earthquakeActive
                      ? 'Stop earthquake tremors'
                      : chaosCooldowns.earthquake > 0
                      ? `Earthquake recharging (${formatCooldown(chaosCooldowns.earthquake)} cooldown)`
                      : 'Trigger Earthquake shaking ground & bridges (5m cooldown)'
                  }
                >
                  <Activity className="w-3 h-3" />
                  {crises.earthquakeActive
                    ? `Quake ${Math.ceil(crises.earthquakeRemaining)}s`
                    : chaosCooldowns.earthquake > 0
                    ? `Quake ${formatCooldown(chaosCooldowns.earthquake)}`
                    : 'Earthquake'}
                </button>
                <button
                  type="button"
                  onClick={() => onTriggerCrisis('flood')}
                  disabled={!crises.floodActive && chaosCooldowns.flood > 0}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 font-mono-tabular ${
                    crises.floodActive
                      ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                      : chaosCooldowns.flood > 0
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                      : 'bg-slate-800 text-sky-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={
                    crises.floodActive
                      ? 'Drain floodwaters'
                      : chaosCooldowns.flood > 0
                      ? `Flood recharging (${formatCooldown(chaosCooldowns.flood)} cooldown)`
                      : 'Flood rivers & streets (5m cooldown)'
                  }
                >
                  <Waves className="w-3 h-3" />
                  {crises.floodActive
                    ? `Flood ${Math.ceil(crises.floodRemaining)}s`
                    : chaosCooldowns.flood > 0
                    ? `Flood ${formatCooldown(chaosCooldowns.flood)}`
                    : 'Flood'}
                </button>
                <button
                  type="button"
                  onClick={onTriggerNuke}
                  disabled={chaosCooldowns.nuke > 0}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 font-mono-tabular ${
                    chaosCooldowns.nuke > 0
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                      : 'bg-red-600/90 hover:bg-red-500 text-white'
                  }`}
                  title={
                    chaosCooldowns.nuke > 0
                      ? `Nuke recharging (${formatCooldown(chaosCooldowns.nuke)} cooldown)`
                      : 'Launch random nuke strike (basements shield buildings, 5m cooldown)'
                  }
                >
                  <Bomb className="w-3 h-3" />
                  {chaosCooldowns.nuke > 0 ? `Nuke ${formatCooldown(chaosCooldowns.nuke)}` : 'Nuke'}
                </button>
              </div>
            </div>
          </div>
        )}

        {b.category === 'jail' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 mb-3">
            <div className="text-[10px] text-slate-400 font-medium mb-2">Correctional Facility</div>
            <div className="grid grid-cols-3 gap-1.5 text-center mb-2">
              <div className="bg-slate-950/70 border border-slate-800 rounded px-2 py-1.5">
                <div className="text-[10px] text-slate-400">Inmates</div>
                <div className="font-mono-tabular text-sm font-semibold text-amber-300">
                  {prisonInmates}
                </div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded px-2 py-1.5">
                <div className="text-[10px] text-slate-400">Jailed</div>
                <div className="font-mono-tabular text-sm font-semibold text-rose-300">
                  {totalJailed}
                </div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded px-2 py-1.5">
                <div className="text-[10px] text-slate-400">Released</div>
                <div className="font-mono-tabular text-sm font-semibold text-emerald-300">
                  {totalReleased}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400">
              Houses captured robbers, protesters &amp; illicit offenders; inmates may occasionally escape or get released.
            </div>
          </div>
        )}

        {b.category === 'factory' && (
          <div className="flex items-start gap-2 text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-2 mb-3 text-slate-200">
            <Factory className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-semibold text-white">Industrial Plant</div>
              <div className="text-[11px] text-slate-400">
                Boosts city economy &amp; dispatches delivery vans, while smokestacks gradually increase air pollution.
              </div>
            </div>
          </div>
        )}

        {b.category === 'crops' && (
          <div className="flex items-start gap-2 text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-2 mb-3 text-slate-200">
            <Sprout className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-semibold text-white">
                Crops &amp; Farm Plot ·{' '}
                <span className="text-lime-300">
                  {(b.cropStage ?? 1) >= 3
                    ? 'Ripe Harvest'
                    : (b.cropStage ?? 1) === 2
                    ? 'Growing'
                    : (b.cropStage ?? 1) === 1
                    ? 'Sprouting'
                    : 'Freshly Seeded'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Farmers tend &amp; harvest ripe crops to feed citizens and boost the local economy.
              </div>
            </div>
          </div>
        )}

        {protest && protest.status === 'active' && (
          <div className="flex items-center gap-2 text-xs bg-violet-950/70 border border-violet-700/80 rounded-lg px-2.5 py-2 mb-3 text-violet-100">
            <Megaphone className="w-4 h-4 text-violet-300 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-white">
                {protest.reason} ·{' '}
                <span className="font-mono-tabular text-amber-300">
                  {protest.capturedCount}/{protest.totalProtesters} captured
                </span>
              </div>
              <div className="text-[11px] text-violet-300">
                {!protest.started
                  ? 'Protesters marching toward City Hall'
                  : protest.policeArrived
                  ? 'Police officers capturing protesters'
                  : protest.policeDispatched
                  ? 'Police cruiser en route'
                  : 'Connect a Police Station to respond'}
              </div>
            </div>
          </div>
        )}

        {neighbourhood && (
          <div className="flex items-center justify-between text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-2 mb-3">
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400">Neighbourhood</div>
              <div className="font-semibold text-white truncate">
                {neighbourhood.name} · {neighbourhood.houseIds.length} homes
              </div>
            </div>
            <div className="text-right shrink-0 pl-2">
              <div className="text-[10px] text-slate-400">Safety</div>
              <div className="font-mono-tabular font-semibold text-sky-300">
                {neighbourhood.safetyScore}%
              </div>
            </div>
          </div>
        )}

        {robbery && robbery.status === 'active' && (
          <div className="flex items-center gap-2 text-xs bg-rose-950/70 border border-rose-700/80 rounded-lg px-2.5 py-2 mb-3 text-rose-200">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-white">
                Robbery in Progress ·{' '}
                <span className="font-mono-tabular text-amber-300">
                  {Math.max(0, Math.ceil(robbery.escapeLimitSeconds - robbery.elapsedSeconds))}s
                </span>
              </div>
              <div className="text-[11px] text-rose-300">
                {robbery.policeDispatched
                  ? 'Police cruiser dispatched on road'
                  : 'Connect a Police Station to respond'}
              </div>
            </div>
          </div>
        )}

        {fire && fire.status === 'active' && (
          <div className="flex items-center gap-2 text-xs bg-orange-950/75 border border-orange-600/80 rounded-lg px-2.5 py-2 mb-3 text-orange-100">
            <Flame className="w-4 h-4 text-orange-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-white">
                {fire.targetType === 'house' ? 'House on Fire!' : 'Fire Burning!'}
              </div>
              <div className="text-[11px] text-orange-200">
                {fire.fireTruckArrived
                  ? 'Firefighters spraying water'
                  : fire.fireTruckDispatched
                  ? 'Fire truck en route'
                  : 'Connect a Firehouse to respond'}
              </div>
            </div>
          </div>
        )}

        {cityEvent && (
          <div className="flex items-center justify-between gap-2 text-xs bg-pink-950/60 border border-pink-600/70 rounded-lg px-2.5 py-2 mb-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-pink-300">
                {cityEvent.type}
              </div>
              <div className="font-semibold text-white truncate">{cityEvent.title}</div>
              <div className="text-[11px] text-pink-200 font-mono-tabular">
                {cityEvent.guestIds.length} citizens ·{' '}
                {Math.max(0, Math.ceil(cityEvent.durationSeconds - cityEvent.elapsedSeconds))}s left
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEditBuildingIcon(tile.x, tile.y)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Paintbrush className="w-3.5 h-3.5" />
            Draw Icon
          </button>
          <button
            type="button"
            onClick={() => onDeleteTile(tile.x, tile.y)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            title="Remove this plot from the map"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>
      </div>
    );
  }

  if (tile.hasRoad) {
    const cfg = tile.intersection;
    return (
      <div className="pointer-events-auto w-72 bg-[#0F172A]/95 border border-slate-700/80 rounded-xl shadow-xl p-3.5 text-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-white">
              {isIntersection ? 'Road Intersection' : isHighway ? 'Multi-Lane Highway' : 'Road Segment'}
            </div>
            <div className="text-xs text-slate-400 font-mono-tabular">
              Tile ({tile.x}, {tile.y}) ·{' '}
              {tile.terrain === 'water'
                ? tile.isBridgeBroken
                  ? 'Bridge (Collapsed)'
                  : 'Bridge'
                : isHighway
                ? 'Highway'
                : 'Asphalt'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 mb-3">
          <span className="text-slate-400">Congestion Load</span>
          <span className="font-mono-tabular font-semibold text-slate-100">
            {Math.round(tile.congestionScore * 100)}%
          </span>
        </div>

        {tile.isBridgeBroken && (
          <div className="flex items-center gap-2 text-xs bg-rose-950/80 border border-rose-700/80 rounded-lg px-2.5 py-2 mb-3 text-rose-100">
            <Wrench className="w-4 h-4 text-rose-300 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-white">Bridge Collapsed!</div>
              <div className="text-[11px] text-rose-200">
                Road traffic and crossings are blocked until the automatic repair crew rebuilds the span.
              </div>
            </div>
          </div>
        )}

        {crash && crash.status === 'active' && (
          <div className="flex items-center gap-2 text-xs bg-amber-950/75 border border-amber-600/80 rounded-lg px-2.5 py-2 mb-3 text-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-white">
                {crash.severity === 'serious' ? 'Serious Car Crash!' : 'Car Crash on Road'}
              </div>
              <div className="text-[11px] text-amber-200">
                {crash.ambulanceArrived || crash.policeArrived
                  ? 'Emergency crew clearing wreck'
                  : crash.ambulanceDispatched || crash.policeDispatched
                  ? 'Ambulance / Police en route'
                  : 'Connect Hospital or Police to clear faster'}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 mb-3">
          <span className="text-slate-300 font-medium">Zebra Crossing</span>
          <button
            type="button"
            onClick={() => onToggleZebraCrossing(tile.x, tile.y)}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              tile.hasZebraCrossing
                ? 'bg-slate-100 text-slate-950 hover:bg-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {tile.hasZebraCrossing ? 'Enabled' : 'Add Crossing'}
          </button>
        </div>

        {isIntersection && (
          <div className="space-y-3 mb-3">
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => onUpdateIntersection(tile.x, tile.y, { controlType: 'signal' })}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  cfg.controlType === 'signal'
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Traffic Light
              </button>
              <button
                type="button"
                onClick={() => onUpdateIntersection(tile.x, tile.y, { controlType: 'stop' })}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  cfg.controlType === 'stop'
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Open / Stop
              </button>
            </div>

            {cfg.controlType === 'signal' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Live Signal</span>
                  <span className="font-mono-tabular text-slate-200">
                    N/S: {nsSignal.toUpperCase()} · E/W: {ewSignal.toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">Cycle Duration</span>
                    <span className="font-mono-tabular text-amber-400">{cfg.cycleDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={32}
                    step={2}
                    value={cfg.cycleDuration}
                    onChange={(e) =>
                      onUpdateIntersection(tile.x, tile.y, { cycleDuration: Number(e.target.value) })
                    }
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => onDeleteTile(tile.x, tile.y)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 text-xs font-medium transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove Road Tile
        </button>
      </div>
    );
  }

  if (tile.terrain === 'water' && tile.hasFootbridge) {
    return (
      <div className="pointer-events-auto w-72 bg-[#0F172A]/95 border border-slate-700/80 rounded-xl shadow-xl p-3.5 text-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-white">Walking Footbridge</div>
            <div className="text-xs text-slate-400 font-mono-tabular">
              Tile ({tile.x}, {tile.y}) ·{' '}
              {tile.isBridgeBroken ? 'Pedestrian Crossing (Collapsed)' : 'Pedestrian Crossing'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {tile.isBridgeBroken && (
          <div className="flex items-center gap-2 text-xs bg-rose-950/80 border border-rose-700/80 rounded-lg px-2.5 py-2 mb-3 text-rose-100">
            <Wrench className="w-4 h-4 text-rose-300 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-white">Footbridge Collapsed!</div>
              <div className="text-[11px] text-rose-200">
                Pedestrians cannot cross here until city repair crews rebuild the walkway.
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-slate-300 mb-3">
          Connects opposite riverbanks so citizens can walk safely across water.
        </p>
        <button
          type="button"
          onClick={() => onRemoveFootbridge(tile.x, tile.y)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 text-xs font-medium transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove Footbridge
        </button>
      </div>
    );
  }

  if (stall) {
    const isIllicit = stall.goods === 'contraband' || Boolean(stall.isIllicit);
    const isTaintedFish =
      stall.goods === 'fish' && (Boolean(stall.isContaminated) || crises.pollutionLevel >= 35);
    const goodsLabel = isIllicit
      ? 'Illicit Contraband Stall'
      : isTaintedFish
      ? 'Tainted Fish Stall'
      : stall.goods === 'fish'
      ? 'Fresh Fish Stall'
      : stall.goods === 'clothes'
      ? 'Clothes Market Stall'
      : stall.goods === 'produce'
      ? 'Produce Market Stall'
      : stall.goods === 'meat'
      ? 'Fresh Meat Stall'
      : stall.goods === 'kayak'
      ? 'Kayak Rental Stand'
      : 'Handmade Crafts Stall';
    return (
      <div className="pointer-events-auto w-72 bg-[#0F172A]/95 border border-slate-700/80 rounded-xl shadow-xl p-3.5 text-slate-100">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 shrink-0">
              <Store
                className={`w-5 h-5 ${
                  isIllicit ? 'text-purple-400' : isTaintedFish ? 'text-lime-400' : 'text-amber-300'
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{goodsLabel}</div>
              <div className="text-xs text-slate-400 font-mono-tabular">
                Tile ({tile.x}, {tile.y}) · {isIllicit ? 'Hidden Spot' : 'Pop-Up Business'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors shrink-0"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIllicit && (
          <div className="flex items-center gap-2 text-xs bg-purple-950/80 border border-purple-700/80 rounded-lg px-2.5 py-2 mb-3 text-purple-100">
            <ShieldAlert className="w-4 h-4 text-purple-300 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-white">
                {stall.raidDispatched ? 'Police Raid In Progress!' : 'Hidden Contraband Business'}
              </div>
              <div className="text-[11px] text-purple-200">
                {stall.raidDispatched
                  ? 'Police received a tip-off and are arresting vendor & buyers.'
                  : 'Secret buyers visit quietly; police will investigate and raid soon.'}
              </div>
            </div>
          </div>
        )}

        {isTaintedFish && (
          <div className="flex items-center gap-2 text-xs bg-rose-950/75 border border-rose-700/80 rounded-lg px-2.5 py-2 mb-3 text-rose-100">
            <Biohazard className="w-4 h-4 text-lime-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-white">Polluted Water Catch</div>
              <div className="text-[11px] text-rose-200">
                Infected fish spreads virus, triggers lawsuits, and drops city economy.
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2">
            <div className="text-[10px] text-slate-400">Stock Left</div>
            <div className="font-mono-tabular text-sm font-semibold text-white">{stall.stock}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2">
            <div className="text-[10px] text-slate-400">Sales</div>
            <div className="font-mono-tabular text-sm font-semibold text-amber-400">
              {stall.salesCount}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDeleteTile(tile.x, tile.y)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 text-xs font-medium transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Close Stall
        </button>
      </div>
    );
  }

  if (construction) {
    const pct = Math.min(
      100,
      Math.round((construction.elapsedGameMinutes / Math.max(1, construction.totalGameMinutes)) * 100)
    );
    const remaining = Math.max(0, construction.totalGameMinutes - construction.elapsedGameMinutes);
    return (
      <div className="pointer-events-auto w-72 bg-[#0F172A]/95 border border-slate-700/80 rounded-xl shadow-xl p-3.5 text-slate-100">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <PixelIconPreview iconGrid={construction.iconGrid} size={32} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                Building {construction.blueprintName}
              </div>
              <div className="text-xs text-amber-300 font-mono-tabular">
                {construction.areaName} ({tile.x}, {tile.y})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors shrink-0"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 mb-3 text-xs">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-400 flex items-center gap-1.5">
              <HardHat className="w-3.5 h-3.5 text-amber-400" />
              Applicant
            </span>
            <span className="font-semibold text-white">{construction.applicantName}</span>
          </div>
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              Remaining
            </span>
            <span className="font-mono-tabular font-semibold text-amber-300">
              {formatGameDuration(remaining)} ({pct}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDeleteTile(tile.x, tile.y)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 text-xs font-medium transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Cancel Construction
        </button>
      </div>
    );
  }

  if (proposal) {
    return (
      <div className="pointer-events-auto w-72 bg-[#0F172A]/95 border border-amber-500/50 rounded-xl shadow-xl p-3.5 text-slate-100">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <PixelIconPreview iconGrid={proposal.iconGrid} size={32} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                Permit: {proposal.blueprintName}
              </div>
              <div className="text-xs text-amber-300 font-mono-tabular">
                Proposed by {proposal.applicantName}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors shrink-0"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 mb-2.5">&ldquo;{proposal.note}&rdquo;</p>

        <div className="space-y-1.5 mb-3 text-xs">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              Location
            </span>
            <span className="font-mono-tabular font-semibold text-white">
              {proposal.areaName} ({proposal.x}, {proposal.y})
            </span>
          </div>
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              Game Time
            </span>
            <span className="font-mono-tabular font-semibold text-amber-200">
              {formatGameDuration(proposal.durationGameMinutes)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <button
            type="button"
            onClick={() => onApproveProposal(proposal.id)}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Allow
          </button>
          <button
            type="button"
            onClick={() => onDeclineProposal(proposal.id)}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Decline
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenPermits}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-200 text-xs font-medium transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          Open Mayor&apos;s Permit File
        </button>
      </div>
    );
  }

  return null;
}
