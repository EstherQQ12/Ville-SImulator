export const GRID_COLS = 34;
export const GRID_ROWS = 22;
export const TILE_SIZE = 48;
export const ICON_SIZE = 20;

export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED';

export type ToolMode =
  | 'pan'
  | 'select'
  | 'road'
  | 'zebra'
  | 'footbridge'
  | 'plot'
  | 'water'
  | 'forest'
  | 'bulldoze';

export type BuildingCategory =
  | 'road_path'
  | 'landmark'
  | 'visit_spot'
  | 'residential'
  | 'city_hall'
  | 'school'
  | 'hospital'
  | 'police'
  | 'jail'
  | 'fire_station'
  | 'cemetery'
  | 'workplace'
  | 'factory'
  | 'commercial'
  | 'park';

export type TerrainType = 'grass' | 'water' | 'forest';

export type TimePhase = 'Dawn' | 'Day' | 'Dusk' | 'Night';

export type SeasonType = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

export type WeatherType = 'Clear' | 'Rain' | 'Storm' | 'Snow';

export type HappinessMood = 'Thriving' | 'Content' | 'Strained' | 'Miserable';

export interface BuildingBlueprint {
  id: string;
  name: string;
  category: BuildingCategory;
  iconGrid: string[]; // ICON_SIZE * ICON_SIZE hex colors or '' for transparent
  accentColor: string;
  capacity: number;
  isCustom?: boolean;
}

export interface PlacedBuilding {
  id: string;
  blueprintId: string;
  name: string;
  category: BuildingCategory;
  iconGrid: string[];
  accentColor: string;
  x: number;
  y: number;
  capacity: number;
  activeTripsOut: number;
  activeTripsIn: number;
  totalVisits: number;
}

export interface Neighbourhood {
  id: string;
  name: string;
  color: string;
  houseIds: string[];
  tiles: GridPoint[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
  safetyScore: number; // 0..100
}

export interface RobberyIncident {
  id: string;
  buildingId: string;
  buildingName: string;
  neighbourhoodId: string;
  neighbourhoodName: string;
  x: number;
  y: number;
  elapsedSeconds: number;
  escapeLimitSeconds: number;
  policeDispatched: boolean;
  status: 'active' | 'caught' | 'escaped';
  statusTimer: number; // brief display timer after caught/escaped
}

export type HobbyKind =
  | 'fishing'
  | 'painting'
  | 'kite'
  | 'birdwatching'
  | 'music'
  | 'ice_skating'
  | 'snowball_fight'
  | 'snowman'
  | 'raking_leaves'
  | 'harvesting'
  | 'gardening'
  | 'sunbathing';

export type CarryingItem = 'fish' | 'bag' | 'coffee' | 'flowers' | 'books' | 'clothes' | 'produce';

export type StallGoodsType = 'fish' | 'clothes' | 'produce' | 'crafts' | 'contraband';

export type PersonRole =
  | 'woodcutter'
  | 'mayor'
  | 'protester'
  | 'police'
  | 'medic'
  | 'pedestrian'
  | 'celebrant'
  | 'planter'
  | 'arsonist'
  | 'firefighter'
  | 'fisher'
  | 'hobbyist'
  | 'shopper'
  | 'beggar'
  | 'vendor'
  | 'soldier'
  | 'cleaner'
  | 'repairer'
  | 'invader'
  | 'voter';

export interface Person {
  id: string;
  role: PersonRole;
  wx: number;
  wy: number;
  targetWx: number;
  targetWy: number;
  speed: number;
  shirtColor: string;
  hatColor?: string;
  signColor?: string;
  balloonColor?: string;
  animPhase: number;
  state:
    | 'walking'
    | 'chopping'
    | 'idling'
    | 'protesting'
    | 'chasing'
    | 'captured'
    | 'returning'
    | 'planting'
    | 'burning'
    | 'speaking'
    | 'spraying'
    | 'fishing'
    | 'doing_hobby'
    | 'shopping'
    | 'begging'
    | 'vending'
    | 'patrolling'
    | 'cleaning'
    | 'repairing'
    | 'fixing_bridge'
    | 'invading'
    | 'voting';
  homeBuildingId?: string;
  destBuildingId?: string;
  destStallId?: string;
  stallId?: string;
  stallGoods?: StallGoodsType;
  isIllicitVendor?: boolean;
  isShadyBuyer?: boolean;
  raidStallId?: string;
  shootCooldown?: number;
  caughtFishCount?: number;
  isContaminated?: boolean;
  weddingRole?: 'bride' | 'groom' | 'guest';
  isInfected?: boolean;
  infectedTimer?: number;
  targetTileX?: number;
  targetTileY?: number;
  protestId?: string;
  eventId?: string;
  fireId?: string;
  speechTopic?: string;
  targetPersonId?: string;
  escortOfficerId?: string;
  hobbyKind?: HobbyKind;
  facingAngle?: number;
  carryingItem?: CarryingItem;
  pedestrianPath?: GridPoint[];
  pedestrianPathIndex?: number;
  holdTimer: number;
}

export interface MarketStall {
  id: string;
  x: number;
  y: number;
  wx: number;
  wy: number;
  goods: StallGoodsType;
  awningColor: string;
  vendorPersonId: string;
  stock: number;
  salesCount: number;
  isContaminated?: boolean;
  isIllicit?: boolean;
  discoveredTimer?: number;
  discoverDuration?: number;
  raidDispatched?: boolean;
  raidCarId?: string;
  age: number;
  maxAge: number;
}

export type CrisisType = 'virus' | 'war' | 'poverty' | 'pollution';

export interface ChaosCooldowns {
  virus: number;
  war: number;
  poverty: number;
  pollution: number;
  invade: number;
  nuke: number;
}

export interface CityCrisisState {
  virusActive: boolean;
  virusRemaining: number;
  warActive: boolean;
  warRemaining: number;
  povertyActive: boolean;
  povertyRemaining: number;
  pollutionActive: boolean;
  pollutionRemaining: number;
  pollutionLevel: number; // 0..100
}

export interface BlastCrater {
  id: string;
  x: number;
  y: number;
  wx: number;
  wy: number;
  radius: number;
  age: number;
}

export interface NukeBlast {
  id: string;
  x: number;
  y: number;
  wx: number;
  wy: number;
  age: number;
  maxAge: number;
}

export interface FloatingLabel {
  wx: number;
  wy: number;
  text: string;
  color: string;
  bgColor: string;
  age: number;
  maxAge: number;
}

export interface ProtestIncident {
  id: string;
  cityHallId: string;
  cityHallName: string;
  x: number;
  y: number;
  reason: string;
  protesterIds: string[];
  totalProtesters: number;
  capturedCount: number;
  started: boolean;
  gatherTimer: number;
  elapsedSeconds: number;
  durationLimitSeconds: number;
  policeDispatched: boolean;
  policeArrived: boolean;
  policeCarId?: string;
  status: 'active' | 'captured' | 'dispersed';
  statusTimer: number;
}

export interface WoodChipParticle {
  wx: number;
  wy: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  color: string;
}

export interface ChoppedTreeEvent {
  id: string;
  x: number;
  y: number;
  wx: number;
  wy: number;
  age: number;
  maxAge: number;
}

export interface CapturePopup {
  wx: number;
  wy: number;
  age: number;
  maxAge: number;
}

export type CityEventType = 'celebration' | 'campaign' | 'event' | 'wedding' | 'ceremony' | 'election';

export interface GunfireTracer {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  age: number;
  maxAge: number;
  color: string;
}

export interface SleepZzzParticle {
  wx: number;
  wy: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  scale: number;
}

export interface SnowballProjectile {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
  duration: number;
}

export interface SnowmanProp {
  x: number;
  y: number;
  wx: number;
  wy: number;
  age: number;
  maxAge: number;
}

export interface BrokenBridgeIncident {
  id: string;
  x: number;
  y: number;
  wx: number;
  wy: number;
  kind: 'road' | 'footbridge';
  elapsedSeconds: number;
  maxRepairSeconds: number;
  repairerDispatched: boolean;
  repairerArrived: boolean;
  status: 'broken' | 'repaired';
  statusTimer: number;
}

export interface CityEvent {
  id: string;
  type: CityEventType;
  title: string;
  buildingId: string;
  buildingName: string;
  x: number;
  y: number;
  guestIds: string[];
  elapsedSeconds: number;
  durationSeconds: number;
}

export interface ConfettiParticle {
  wx: number;
  wy: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  color: string;
  size: number;
}

export interface FireIncident {
  id: string;
  targetType: 'house' | 'forest' | 'grass';
  buildingId?: string;
  buildingName: string;
  x: number;
  y: number;
  wx: number;
  wy: number;
  intensity: number;
  elapsedSeconds: number;
  maxBurnSeconds: number;
  fireTruckDispatched: boolean;
  fireTruckArrived: boolean;
  fireTruckCarId?: string;
  byArsonist: boolean;
  status: 'active' | 'extinguished';
  statusTimer: number;
}

export interface SmokeParticle {
  wx: number;
  wy: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  size: number;
  color: string;
}

export interface MayorSpeech {
  id: string;
  cityHallId: string;
  x: number;
  y: number;
  topic: string;
  kind: 'reforest' | 'fire_safety' | 'civic';
  elapsedSeconds: number;
  durationSeconds: number;
}

export interface CrashIncident {
  id: string;
  x: number;
  y: number;
  wx: number;
  wy: number;
  carAColor: string;
  carBColor: string;
  carAAngle: number;
  carBAngle: number;
  elapsedSeconds: number;
  maxClearSeconds: number;
  ambulanceDispatched: boolean;
  policeDispatched: boolean;
  ambulanceArrived: boolean;
  policeArrived: boolean;
  responderCarIds: string[];
  severity: 'fender_bender' | 'serious';
  status: 'active' | 'cleared';
  statusTimer: number;
}

export interface RoadIntersectionConfig {
  controlType: 'signal' | 'stop' | 'none';
  cycleDuration: number; // in game minutes (seconds at 1x)
  phaseOffset: number;
}

export interface MapTile {
  x: number;
  y: number;
  terrain: TerrainType;
  hasRoad: boolean;
  hasZebraCrossing?: boolean;
  hasFootbridge?: boolean;
  isBridgeBroken?: boolean;
  intersection: RoadIntersectionConfig;
  building: PlacedBuilding | null;
  congestionScore: number; // 0..1 smoothed local congestion
  jammedCarsCount: number;
}

export interface DeathEvent {
  id: string;
  x: number;
  y: number;
  wx: number;
  wy: number;
  buildingName: string;
  age: number;
  maxAge: number;
  hearseDispatched: boolean;
}

export type VehicleType =
  | 'sedan'
  | 'hatchback'
  | 'bus'
  | 'van'
  | 'ambulance'
  | 'police'
  | 'firetruck'
  | 'hearse';

export interface GridPoint {
  x: number;
  y: number;
}

export interface Car {
  id: string;
  type: VehicleType;
  color: string;
  wx: number; // world x in px
  wy: number; // world y in px
  angle: number; // radians
  speed: number; // px per real second
  maxSpeed: number;
  path: GridPoint[];
  pathIndex: number;
  originBuildingId: string;
  destBuildingId: string;
  originCategory: BuildingCategory;
  destCategory: BuildingCategory;
  waitSeconds: number;
  isBraking: boolean;
  isJammed: boolean;
  hornFlash: number; // countdown seconds for visual honk ripple
  sirenPhase: number;
  targetRobberyId?: string;
  targetProtestId?: string;
  targetFireId?: string;
  targetCrashId?: string;
  targetRaidStallId?: string;
  parkedAtProtest?: boolean;
  parkedAtFire?: boolean;
  parkedAtCrash?: boolean;
  parkedAtRaid?: boolean;
}

export interface HonkRipple {
  wx: number;
  wy: number;
  age: number;
  maxAge: number;
}

export interface SimulationStats {
  dayCount: number;
  minutesOfDay: number; // 0..1440 (1 game minute = 1 real second at 1x)
  formattedTime: string;
  timePhase: TimePhase;
  rushPeriodLabel: string;
  population: number;
  buildingsCount: number;
  roadTilesCount: number;
  activeCars: number;
  jammedCars: number;
  trafficFlowPercent: number;
  completedTrips: number;
  neighbourhoodsCount: number;
  activeRobberies: number;
  stoppedRobberies: number;
  totalDeaths: number;
  activeProtests: number;
  capturedProtesters: number;
  choppedTrees: number;
  plantedTrees: number;
  activeFires: number;
  activeCrashes: number;
  totalCrashes: number;
  activeEvents: number;
  fishCaught: number;
  activeStalls: number;
  infectedCitizens: number;
  virusActive: boolean;
  warActive: boolean;
  povertyActive: boolean;
  pollutionActive: boolean;
  pollutionLevel: number;
  cratersCount: number;
  invadersCount: number;
  citizenHappiness: number;
  happinessMood: HappinessMood;
  happinessSummary: string;
  economyScore: number;
  totalLawsuits: number;
  hasCityHall: boolean;
  prisonInmates: number;
  totalJailed: number;
  totalReleased: number;
  mayorAlive: boolean;
  electionActive: boolean;
  electionRemaining: number;
  brokenBridgesCount: number;
  season: SeasonType;
  weather: WeatherType;
  chaosCooldowns: ChaosCooldowns;
}

export interface SavedMapData {
  id: string;
  name: string;
  subtitle: string;
  updatedAt: number;
  tiles: {
    x: number;
    y: number;
    terrain: TerrainType;
    hasRoad: boolean;
    hasZebraCrossing?: boolean;
    hasFootbridge?: boolean;
    intersection?: RoadIntersectionConfig;
    building?: PlacedBuilding | null;
  }[];
  customBlueprints: BuildingBlueprint[];
}

export interface SelectionTarget {
  type: 'building' | 'intersection' | 'tile';
  x: number;
  y: number;
}

