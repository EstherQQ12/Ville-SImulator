import { DEFAULT_BLUEPRINTS, PRESET_MAPS } from '../data/defaultBlueprints';
import {
  ActiveConstruction,
  Animal,
  AnimalKind,
  BlastCrater,
  BrokenBridgeIncident,
  BuildingBlueprint,
  BuildingCategory,
  CapturePopup,
  Car,
  CarryingItem,
  ChaosCooldowns,
  ChoppedTreeEvent,
  CityCrisisState,
  CityEvent,
  CityEventType,
  ConfettiParticle,
  ConstructionProposal,
  CrashIncident,
  CrisisType,
  DeathEvent,
  FireIncident,
  FloatingLabel,
  GRID_COLS,
  GRID_ROWS,
  GridPoint,
  GunfireTracer,
  HappinessMood,
  HobbyKind,
  HonkRipple,
  MapTile,
  MarketStall,
  MayorSpeech,
  Neighbourhood,
  NewspaperComment,
  NewspaperEdition,
  NukeBlast,
  ParkVariant,
  Person,
  PlacedBuilding,
  PorchPaperProp,
  ProtestIncident,
  RoadIntersectionConfig,
  RobberyIncident,
  SavedMapData,
  SavedSimState,
  SeasonType,
  SimulationStats,
  SleepZzzParticle,
  SmokeParticle,
  SnowballProjectile,
  SnowmanProp,
  StallGoodsType,
  TerrainType,
  TILE_SIZE,
  TimePhase,
  TrashItem,
  VehicleType,
  WeatherType,
  WoodChipParticle,
} from '../types/game';
import { soundEngine } from '../utils/sound';
import {
  findAdjacentRoadTile as pfFindAdjacentRoadTile,
  findClosestReachableRoad as pfFindClosestReachableRoad,
  findNearestRoadTile as pfFindNearestRoadTile,
  findNearestWalkableTile as pfFindNearestWalkableTile,
  findPedestrianPath as pfFindPedestrianPath,
  findRoadPath as pfFindRoadPath,
  getRoadNeighbors as pfGetRoadNeighbors,
  inBounds as pfInBounds,
  isHighwayTile,
  isIntersectionTile as pfIsIntersectionTile,
  isPedestrianTileWalkable,
} from './pathfinding';

const CAR_COLORS = [
  '#F8FAFC', // pearl white
  '#38BDF8', // sky blue
  '#FB7185', // coral rose
  '#34D399', // mint emerald
  '#FB923C', // tangerine
  '#FACC15', // sunny yellow
  '#60A5FA', // periwinkle
  '#A78BFA', // lavender
];

const MAX_CARS = 110;
const LANE_OFFSET = 9.5; // right-hand driving offset in px

const NEIGHBOURHOOD_NAMES = [
  'Oakwood Quarter',
  'Maple District',
  'Cedar Row',
  'Elm Terrace',
  'Birchwood Court',
  'Willow Heights',
  'Pinecrest Block',
  'Sunlit Greens',
  'Alder Square',
  'Riverbend Homes',
];

const NEIGHBOURHOOD_COLORS = [
  '#F59E0B',
  '#38BDF8',
  '#10B981',
  '#F97316',
  '#A855F7',
  '#EC4899',
];

export type SignalAspect = 'green' | 'amber' | 'red';

export class CitySimulation {
  public tiles: MapTile[] = [];
  public cars: Car[] = [];
  public honkRipples: HonkRipple[] = [];
  public customBlueprints: BuildingBlueprint[] = [];
  public neighbourhoods: Neighbourhood[] = [];
  public robberies: RobberyIncident[] = [];
  public deathEvents: DeathEvent[] = [];
  public people: Person[] = [];
  public protests: ProtestIncident[] = [];
  public woodChips: WoodChipParticle[] = [];
  public choppedTreeEvents: ChoppedTreeEvent[] = [];
  public capturePopups: CapturePopup[] = [];
  public cityEvents: CityEvent[] = [];
  public confetti: ConfettiParticle[] = [];
  public fires: FireIncident[] = [];
  public smokeParticles: SmokeParticle[] = [];
  public mayorSpeeches: MayorSpeech[] = [];
  public crashes: CrashIncident[] = [];
  public floatingLabels: FloatingLabel[] = [];
  public marketStalls: MarketStall[] = [];
  public blastCraters: BlastCrater[] = [];
  public nukeBlasts: NukeBlast[] = [];
  public gunfireTracers: GunfireTracer[] = [];
  public sleepZzzParticles: SleepZzzParticle[] = [];
  public snowballs: SnowballProjectile[] = [];
  public snowmen: SnowmanProp[] = [];
  public brokenBridges: BrokenBridgeIncident[] = [];
  public trashItems: TrashItem[] = [];
  public gridCols = GRID_COLS;
  public gridRows = GRID_ROWS;
  public expansionCredits = 0;
  public lastExpansionMilestone = 0;
  public porchPapers: PorchPaperProp[] = [];
  private pendingCameraShift: { dx: number; dy: number } | null = null;
  public animals: Animal[] = [];
  public pendingProposals: ConstructionProposal[] = [];
  public activeConstructions: ActiveConstruction[] = [];
  public newspapers: NewspaperEdition[] = [];
  public unreadNewsCount = 0;
  public dailyHighlights: string[] = [];
  public hasNukeOccurred = false;
  public earthquakeShakeIntensity = 0;
  public crises: CityCrisisState = {
    virusActive: false,
    virusRemaining: 0,
    warActive: false,
    warRemaining: 0,
    povertyActive: false,
    povertyRemaining: 0,
    pollutionActive: false,
    pollutionRemaining: 0,
    pollutionLevel: 0,
    tornadoActive: false,
    tornadoRemaining: 0,
    tornadoWx: (GRID_COLS * TILE_SIZE) / 2,
    tornadoWy: (GRID_ROWS * TILE_SIZE) / 2,
    earthquakeActive: false,
    earthquakeRemaining: 0,
    floodActive: false,
    floodRemaining: 0,
  };

  public mapId = 'preset_oakridge';
  public mapName = 'Oakridge Valley';

  // Time: 1 real minute = 4 game hours
  public dayCount = 1;
  public minutesOfDay = 7 * 60 + 5; // 07:05 AM right as morning rush begins
  public timeScale = 1;
  public isRunning = true;

  public season: SeasonType = 'Spring';
  public seasonIndex = 0;
  public weather: WeatherType = 'Sunny';
  public weatherTimer = 95;
  public lightningFlash = 0;
  public weatherParticles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    color?: string;
  }[] = [];

  public citizenHappiness = 76;
  public happinessSummary = 'Balanced city mood';
  public totalLawsuits = 0;
  private lawsuitShock = 0;
  public readonly CHAOS_COOLDOWN_SECONDS = 300; // 5 minutes
  public chaosCooldowns: ChaosCooldowns = {
    virus: 0,
    war: 0,
    poverty: 0,
    pollution: 0,
    invade: 0,
    nuke: 0,
    tornado: 0,
    earthquake: 0,
    flood: 0,
  };

  public completedTrips = 0;
  public stoppedRobberies = 0;
  public totalDeaths = 0;
  public capturedProtesters = 0;
  public choppedTrees = 0;
  public plantedTrees = 0;
  public totalCrashes = 0;
  public fishCaught = 0;
  public prisonInmates = 0;
  public totalJailed = 0;
  public totalReleased = 0;
  public mayorAlive = true;
  public electionActive = false;
  public electionRemaining = 0;
  private spawnAccumulator = 0;
  private robberyCheckAccumulator = 15;
  private deathCheckAccumulator = 12;
  private protestCheckAccumulator = 22;
  private woodcutterSpawnAccumulator = 2;
  private pedestrianSpawnAccumulator = 1;
  private fisherSpawnAccumulator = 3;
  private hobbyistSpawnAccumulator = 2;
  private shopperSpawnAccumulator = 1.5;
  private beggarSpawnAccumulator = 4;
  private vendorSpawnAccumulator = 4;
  private illicitStallCheckAccumulator = 18;
  private prisonReleaseAccumulator = 0;
  private carPedHitCooldown = 14;
  private electionVoterAccumulator = 0;
  private virusTickAccumulator = 0;
  private warTickAccumulator = 0;
  private invasionTickAccumulator = 0;
  private pollutionTickAccumulator = 0;
  private eventCheckAccumulator = 0;
  private fireCheckAccumulator = 24;
  private speechCheckAccumulator = 18;
  private planterCheckAccumulator = 12;
  private crashCheckAccumulator = 0;
  private bridgeBreakAccumulator = 36;
  private zzzAccumulator = 0;
  private sadIndoorAccumulator = 0;
  private factorySmokeAccumulator = 0;
  private litterCheckAccumulator = 6;
  private escapeeCheckAccumulator = 24;
  private prisonBreakAccumulator = 18;
  private fieldTripAccumulator = 14;
  private citizenBuildAccumulator = 72;
  private kayakerAccumulator = 8;
  private schoolCommuteAccumulator = 3;
  private animalSpawnAccumulator = 4;
  private farmerButcherAccumulator = 6;
  private butcherMeatReserve = 0;
  private basementSpreadAccumulator = 0;
  private tornadoVx = 28;
  private tornadoVy = 18;
  private tornadoCasualtyCount = 0;
  private tornadoBasementLabelCooldown = 0;
  private floodDrownAccumulator = 0;
  private floodDrownCount = 0;
  private floodNewsLogged = false;
  private naturalDisasterAccumulator = 42;
  private naturalDisasterCooldown = 120;
  private lastSchoolBellKey = '';
  private lastFestivalDay = -3;
  private lastCeremonyDay = -3;
  private deforestationPressure = 0;
  private tileChopProgress = new Map<string, number>();
  private carIdCounter = 1;
  private buildingIdCounter = 1;
  private robberyIdCounter = 1;
  private deathIdCounter = 1;
  private personIdCounter = 1;
  private protestIdCounter = 1;
  private chopIdCounter = 1;
  private eventIdCounter = 1;
  private fireIdCounter = 1;
  private speechIdCounter = 1;
  private crashIdCounter = 1;
  private stallIdCounter = 1;
  private craterIdCounter = 1;
  private nukeIdCounter = 1;
  private brokenBridgeIdCounter = 1;
  private snowballIdCounter = 1;
  private snowmanIdCounter = 1;
  private trashIdCounter = 1;
  private newsIdCounter = 1;
  private animalIdCounter = 1;
  private porchPaperIdCounter = 1;
  private proposalIdCounter = 1;
  private constructionIdCounter = 1;
  private playgroundCheckAccumulator = 3;
  private roadTilesCount = 0;
  private buildingsList: PlacedBuilding[] = [];

  constructor(initialMap?: SavedMapData) {
    this.loadMap(initialMap || PRESET_MAPS[0]);
  }

  private inBounds(x: number, y: number): boolean {
    return pfInBounds(x, y, this.gridCols, this.gridRows);
  }

  private getRoadNeighbors(tiles: MapTile[], x: number, y: number) {
    return pfGetRoadNeighbors(tiles, x, y, this.gridCols, this.gridRows);
  }

  private findAdjacentRoadTile(tiles: MapTile[], x: number, y: number) {
    return pfFindAdjacentRoadTile(tiles, x, y, this.gridCols, this.gridRows);
  }

  private findNearestRoadTile(tiles: MapTile[], x: number, y: number, maxRadius = 6) {
    return pfFindNearestRoadTile(tiles, x, y, maxRadius, this.gridCols, this.gridRows);
  }

  private findClosestReachableRoad(
    tiles: MapTile[],
    start: GridPoint,
    goalX: number,
    goalY: number
  ) {
    return pfFindClosestReachableRoad(tiles, start, goalX, goalY, this.gridCols, this.gridRows);
  }

  private findBestPoliceDispatchRoute(destX: number, destY: number): {
    station: PlacedBuilding;
    roadPath: GridPoint[] | null;
    fullRoadReached: boolean;
  } | null {
    const stations = this.buildingsList.filter((b) => b.category === 'police');
    if (stations.length === 0) return null;

    const sortedStations = [...stations].sort(
      (a, b) => Math.hypot(a.x - destX, a.y - destY) - Math.hypot(b.x - destX, b.y - destY)
    );

    const destRoad = this.findNearestRoadTile(this.tiles, destX, destY, 6);
    if (destRoad) {
      for (const st of sortedStations) {
        const startRoad = this.findNearestRoadTile(this.tiles, st.x, st.y, 4);
        if (!startRoad) continue;
        const roadPath = this.findRoadPath(this.tiles, startRoad, destRoad, 0.8);
        if (roadPath && roadPath.length >= 1) {
          return { station: st, roadPath, fullRoadReached: true };
        }
      }
    }

    // Fallback 1: No continuous road links the station to the target (e.g. far across water, broken bridge, or separate road).
    // Drive cruiser along connected roads as close as possible, then deploy foot officers!
    for (const st of sortedStations) {
      const startRoad = this.findNearestRoadTile(this.tiles, st.x, st.y, 4);
      if (!startRoad) continue;
      const closestRoad = this.findClosestReachableRoad(this.tiles, startRoad, destX, destY);
      if (!closestRoad) continue;
      const roadPath = this.findRoadPath(this.tiles, startRoad, closestRoad, 0.8);
      if (roadPath && roadPath.length >= 1) {
        return { station: st, roadPath, fullRoadReached: false };
      }
    }

    // Fallback 2: Police Station has no nearby road at all — dispatch foot officers directly
    return { station: sortedStations[0], roadPath: null, fullRoadReached: false };
  }

  private findPoliceFootPath(start: GridPoint, goal: GridPoint): GridPoint[] | null {
    const allowFrozen = this.season === 'Winter';
    return (
      this.findPedestrianPath(this.tiles, start, goal, allowFrozen, false) ||
      this.findPedestrianPath(this.tiles, start, goal, allowFrozen, true)
    );
  }

  private findNearestWalkableTile(
    tiles: MapTile[],
    x: number,
    y: number,
    maxRadius = 2,
    allowFrozenWater = false
  ) {
    return pfFindNearestWalkableTile(tiles, x, y, maxRadius, allowFrozenWater, this.gridCols, this.gridRows);
  }

  private findRoadPath(
    tiles: MapTile[],
    start: GridPoint,
    end: GridPoint,
    congestionWeight = 2.6
  ) {
    return pfFindRoadPath(tiles, start, end, congestionWeight, this.gridCols, this.gridRows);
  }

  private findPedestrianPath(
    tiles: MapTile[],
    start: GridPoint,
    end: GridPoint,
    allowFrozenWater = false,
    allowAllTiles = false
  ) {
    return pfFindPedestrianPath(tiles, start, end, allowFrozenWater, allowAllTiles, this.gridCols, this.gridRows);
  }

  private isIntersectionTile(tiles: MapTile[], x: number, y: number): boolean {
    return pfIsIntersectionTile(tiles, x, y, this.gridCols, this.gridRows);
  }

  private incrementBuildingOccupancy(b: PlacedBuilding, amount = 1) {
    const cap = b.capacity > 0 ? b.capacity : 999;
    b.totalVisits = Math.min(cap, b.totalVisits + amount);
  }

  public consumePendingCameraShift(): { dx: number; dy: number } | null {
    const shift = this.pendingCameraShift;
    this.pendingCameraShift = null;
    return shift;
  }

  public loadMap(data: SavedMapData) {
    const savedState = data.simState;
    this.gridCols = savedState?.gridCols || data.gridCols || GRID_COLS;
    this.gridRows = savedState?.gridRows || data.gridRows || GRID_ROWS;
    this.mapId = data.id;
    this.mapName = data.name;
    this.customBlueprints = data.customBlueprints ? [...data.customBlueprints] : [];
    this.cars = [];
    this.honkRipples = [];
    this.robberies = [];
    this.deathEvents = [];
    this.people = [];
    this.protests = [];
    this.woodChips = [];
    this.choppedTreeEvents = [];
    this.capturePopups = [];
    this.cityEvents = [];
    this.confetti = [];
    this.fires = [];
    this.smokeParticles = [];
    this.mayorSpeeches = [];
    this.crashes = [];
    this.floatingLabels = [];
    this.marketStalls = [];
    this.blastCraters = [];
    this.nukeBlasts = [];
    this.gunfireTracers = [];
    this.sleepZzzParticles = [];
    this.snowballs = [];
    this.snowmen = [];
    this.brokenBridges = [];
    this.trashItems = [];
    this.animals = [];
    this.pendingProposals = [];
    this.activeConstructions = [];
    this.newspapers = [];
    this.unreadNewsCount = 0;
    this.dailyHighlights = [];
    this.porchPapers = [];
    this.pendingCameraShift = null;
    this.playgroundCheckAccumulator = 3;
    this.expansionCredits = 0;
    this.lastExpansionMilestone = 0;
    this.hasNukeOccurred = false;
    this.earthquakeShakeIntensity = 0;
    this.tornadoCasualtyCount = 0;
    this.tornadoBasementLabelCooldown = 0;
    this.floodDrownAccumulator = 0;
    this.floodDrownCount = 0;
    this.floodNewsLogged = false;
    this.lastSchoolBellKey = '';
    this.crises = {
      virusActive: false,
      virusRemaining: 0,
      warActive: false,
      warRemaining: 0,
      povertyActive: false,
      povertyRemaining: 0,
      pollutionActive: false,
      pollutionRemaining: 0,
      pollutionLevel: 0,
      tornadoActive: false,
      tornadoRemaining: 0,
      tornadoWx: (this.gridCols * TILE_SIZE) / 2,
      tornadoWy: (this.gridRows * TILE_SIZE) / 2,
      earthquakeActive: false,
      earthquakeRemaining: 0,
      floodActive: false,
      floodRemaining: 0,
    };
    this.tileChopProgress.clear();
    this.completedTrips = 0;
    this.stoppedRobberies = 0;
    this.totalDeaths = 0;
    this.capturedProtesters = 0;
    this.choppedTrees = 0;
    this.plantedTrees = 0;
    this.totalCrashes = 0;
    this.fishCaught = 0;
    this.prisonInmates = 0;
    this.totalJailed = 0;
    this.totalReleased = 0;
    this.mayorAlive = true;
    this.electionActive = false;
    this.electionRemaining = 0;
    this.totalLawsuits = 0;
    this.lawsuitShock = 0;
    this.deforestationPressure = 0;
    this.robberyCheckAccumulator = 15;
    this.deathCheckAccumulator = 12;
    this.protestCheckAccumulator = 22;
    this.woodcutterSpawnAccumulator = 2;
    this.pedestrianSpawnAccumulator = 1;
    this.fisherSpawnAccumulator = 3;
    this.hobbyistSpawnAccumulator = 2;
    this.shopperSpawnAccumulator = 1.5;
    this.beggarSpawnAccumulator = 4;
    this.vendorSpawnAccumulator = 4;
    this.illicitStallCheckAccumulator = 18;
    this.prisonReleaseAccumulator = 0;
    this.carPedHitCooldown = 14;
    this.electionVoterAccumulator = 0;
    this.virusTickAccumulator = 0;
    this.warTickAccumulator = 0;
    this.invasionTickAccumulator = 0;
    this.pollutionTickAccumulator = 0;
    this.eventCheckAccumulator = 0;
    this.fireCheckAccumulator = 24;
    this.speechCheckAccumulator = 18;
    this.planterCheckAccumulator = 12;
    this.crashCheckAccumulator = 0;
    this.bridgeBreakAccumulator = 36;
    this.zzzAccumulator = 0;
    this.sadIndoorAccumulator = 0;
    this.factorySmokeAccumulator = 0;
    this.litterCheckAccumulator = 6;
    this.escapeeCheckAccumulator = 24;
    this.fieldTripAccumulator = 14;
    this.citizenBuildAccumulator = 72;
    this.kayakerAccumulator = 8;
    this.schoolCommuteAccumulator = 3;
    this.animalSpawnAccumulator = 4;
    this.farmerButcherAccumulator = 6;
    this.butcherMeatReserve = 0;
    this.basementSpreadAccumulator = 0;
    this.naturalDisasterAccumulator = 42;
    this.naturalDisasterCooldown = 120;
    this.lastFestivalDay = -3;
    this.lastCeremonyDay = -3;
    this.dayCount = 1;
    this.minutesOfDay = 7 * 60 + 5;
    this.seasonIndex = 0;
    this.season = 'Spring';
    this.weather = 'Sunny';
    this.weatherTimer = 95;
    this.lightningFlash = 0;
    this.weatherParticles = [];
    this.citizenHappiness = 76;
    this.happinessSummary = 'Balanced city mood';
    this.chaosCooldowns = {
      virus: 0,
      war: 0,
      poverty: 0,
      pollution: 0,
      invade: 0,
      nuke: 0,
      tornado: 0,
      earthquake: 0,
      flood: 0,
    };

    this.tiles = [];
    for (let y = 0; y < this.gridRows; y++) {
      for (let x = 0; x < this.gridCols; x++) {
        this.tiles.push({
          x,
          y,
          terrain: 'grass',
          isDefaultLand: false,
          hasRoad: false,
          hasZebraCrossing: false,
          hasFootbridge: false,
          isBridgeBroken: false,
          isFlooded: false,
          intersection: { controlType: 'signal', cycleDuration: 18, phaseOffset: (x + y) % 10 },
          building: null,
          congestionScore: 0,
          jammedCarsCount: 0,
        });
      }
    }

    let hasLoadedCityHall = false;
    for (const savedTile of data.tiles) {
      if (!this.inBounds(savedTile.x, savedTile.y)) continue;
      const idx = savedTile.y * this.gridCols + savedTile.x;
      this.tiles[idx].terrain = savedTile.terrain;
      this.tiles[idx].isDefaultLand =
        savedTile.terrain === 'void' ? false : savedTile.isDefaultLand ?? true;
      this.tiles[idx].hasRoad = savedTile.hasRoad;
      this.tiles[idx].hasZebraCrossing = Boolean(savedTile.hasZebraCrossing);
      this.tiles[idx].hasFootbridge = Boolean(savedTile.hasFootbridge);
      if (savedTile.intersection) {
        this.tiles[idx].intersection = { ...savedTile.intersection };
      }
      if (savedTile.building) {
        if (savedTile.building.category === 'city_hall') {
          if (hasLoadedCityHall) continue;
          hasLoadedCityHall = true;
        }
        const bld: PlacedBuilding = {
          ...savedTile.building,
          iconGrid: [...savedTile.building.iconGrid],
          activeTripsOut: 0,
          activeTripsIn: 0,
        };
        this.initializeBuildingProps(bld);
        this.tiles[idx].building = bld;
      }
    }

    if (savedState) {
      this.dayCount = Math.max(1, savedState.dayCount ?? 1);
      this.minutesOfDay = ((savedState.minutesOfDay ?? 7 * 60 + 5) % 1440 + 1440) % 1440;
      this.seasonIndex = savedState.seasonIndex ?? 0;
      this.season = savedState.season ?? 'Spring';
      this.weather = savedState.weather ?? 'Sunny';
      this.weatherTimer = savedState.weatherTimer ?? 95;
      this.expansionCredits = savedState.expansionCredits ?? 0;
      this.lastExpansionMilestone =
        savedState.lastExpansionMilestone ?? Math.floor(this.dayCount / 10);
      this.newspapers = savedState.newspapers
        ? savedState.newspapers.map((n) => ({
            ...n,
            highlights: [...n.highlights],
            readerComments: n.readerComments ? n.readerComments.map((c) => ({ ...c })) : undefined,
          }))
        : [];
      this.hasNukeOccurred = Boolean(savedState.hasNukeOccurred);
      this.totalDeaths = savedState.totalDeaths ?? 0;
      this.mayorAlive = savedState.mayorAlive ?? true;
      this.completedTrips = savedState.completedTrips ?? 0;
      this.stoppedRobberies = savedState.stoppedRobberies ?? 0;
      this.capturedProtesters = savedState.capturedProtesters ?? 0;
      this.choppedTrees = savedState.choppedTrees ?? 0;
      this.plantedTrees = savedState.plantedTrees ?? 0;
      this.totalCrashes = savedState.totalCrashes ?? 0;
      this.fishCaught = savedState.fishCaught ?? 0;
      this.prisonInmates = savedState.prisonInmates ?? 0;
      this.totalJailed = savedState.totalJailed ?? 0;
      this.totalReleased = savedState.totalReleased ?? 0;
      this.totalLawsuits = savedState.totalLawsuits ?? 0;
      this.citizenHappiness = savedState.citizenHappiness ?? 76;
      this.pendingProposals = savedState.pendingProposals
        ? savedState.pendingProposals.map((pr) => ({ ...pr, iconGrid: [...pr.iconGrid] }))
        : [];
      this.activeConstructions = savedState.activeConstructions
        ? savedState.activeConstructions.map((ac) => ({ ...ac, iconGrid: [...ac.iconGrid] }))
        : [];
      const curMin = Math.floor(this.minutesOfDay);
      if (curMin >= 970) {
        this.lastSchoolBellKey = `${this.dayCount}_end`;
      } else if (curMin >= 490) {
        this.lastSchoolBellKey = `${this.dayCount}_start`;
      }
      if (Math.floor(this.dayCount / 10) > this.lastExpansionMilestone) {
        this.checkExpansionMilestone();
      }
    }

    this.rebuildCaches();
    this.deduplicateExistingBuildingNames();
    // Seed initial traffic & roaming farm/wild animals
    this.seedInitialTraffic(14);
    this.seedInitialAnimals();
  }

  private initializeBuildingProps(bld: PlacedBuilding) {
    if (bld.category === 'park' && !bld.parkVariant) {
      const variants: ParkVariant[] = ['playground', 'garden', 'field'];
      bld.parkVariant = variants[Math.floor(Math.random() * variants.length)];
    }
    if (bld.category === 'residential') {
      if (bld.residents === undefined || bld.residents < 1 || bld.residents > 5) {
        bld.residents = Math.max(1, Math.min(5, Math.min(bld.capacity || 4, 2 + Math.floor(Math.random() * 4))));
      }
      if (!bld.totalVisits) {
        bld.totalVisits = bld.residents;
      }
    }
    if (bld.category === 'crops') {
      if (bld.cropStage === undefined) bld.cropStage = 1 + Math.floor(Math.random() * 2);
      if (bld.cropTimer === undefined) bld.cropTimer = 0;
    }
  }

  public exportMapData(name?: string, subtitle?: string): SavedMapData {
    const simState: SavedSimState = {
      dayCount: this.dayCount,
      minutesOfDay: this.minutesOfDay,
      seasonIndex: this.seasonIndex,
      season: this.season,
      weather: this.weather,
      weatherTimer: this.weatherTimer,
      gridCols: this.gridCols,
      gridRows: this.gridRows,
      expansionCredits: this.expansionCredits,
      lastExpansionMilestone: this.lastExpansionMilestone,
      newspapers: this.newspapers.map((n) => ({
        ...n,
        highlights: [...n.highlights],
        readerComments: n.readerComments ? n.readerComments.map((c) => ({ ...c })) : undefined,
      })),
      hasNukeOccurred: this.hasNukeOccurred,
      totalDeaths: this.totalDeaths,
      mayorAlive: this.mayorAlive,
      completedTrips: this.completedTrips,
      stoppedRobberies: this.stoppedRobberies,
      capturedProtesters: this.capturedProtesters,
      choppedTrees: this.choppedTrees,
      plantedTrees: this.plantedTrees,
      totalCrashes: this.totalCrashes,
      fishCaught: this.fishCaught,
      prisonInmates: this.prisonInmates,
      totalJailed: this.totalJailed,
      totalReleased: this.totalReleased,
      totalLawsuits: this.totalLawsuits,
      citizenHappiness: this.citizenHappiness,
      pendingProposals: this.pendingProposals.map((pr) => ({ ...pr, iconGrid: [...pr.iconGrid] })),
      activeConstructions: this.activeConstructions.map((ac) => ({ ...ac, iconGrid: [...ac.iconGrid] })),
    };
    return {
      id: this.mapId,
      name: name || this.mapName,
      subtitle: subtitle || `${this.buildingsList.length} plots · ${this.roadTilesCount} roads`,
      updatedAt: Date.now(),
      gridCols: this.gridCols,
      gridRows: this.gridRows,
      tiles: this.tiles.map((t) => ({
        x: t.x,
        y: t.y,
        terrain: t.terrain,
        isDefaultLand: t.isDefaultLand,
        hasRoad: t.hasRoad,
        hasZebraCrossing: t.hasZebraCrossing || undefined,
        hasFootbridge: t.hasFootbridge || undefined,
        intersection: t.hasRoad ? { ...t.intersection } : undefined,
        building: t.building ? { ...t.building, iconGrid: [...t.building.iconGrid] } : null,
      })),
      customBlueprints: this.customBlueprints.map((bp) => ({ ...bp, iconGrid: [...bp.iconGrid] })),
      simState,
    };
  }

  private rebuildCaches() {
    let roads = 0;
    const buildings: PlacedBuilding[] = [];
    for (const t of this.tiles) {
      if (t.hasRoad) roads++;
      if (t.building) buildings.push(t.building);
    }
    this.roadTilesCount = roads;
    this.buildingsList = buildings;
    this.recomputeNeighbourhoods();
  }

  private recomputeNeighbourhoods() {
    const houses = this.buildingsList.filter((b) => b.category === 'residential');
    const policeStations = this.buildingsList.filter((b) => b.category === 'police');
    const visited = new Set<string>();
    const clusters: PlacedBuilding[][] = [];

    for (const house of houses) {
      if (visited.has(house.id)) continue;
      const cluster: PlacedBuilding[] = [];
      const queue: PlacedBuilding[] = [house];
      visited.add(house.id);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        cluster.push(curr);

        for (const other of houses) {
          if (visited.has(other.id)) continue;
          // Nearby within 2 tiles (adjacent or across a 1-tile street)
          const chebyshev = Math.max(Math.abs(curr.x - other.x), Math.abs(curr.y - other.y));
          if (chebyshev <= 2) {
            visited.add(other.id);
            queue.push(other);
          }
        }
      }

      if (cluster.length >= 3) {
        clusters.push(cluster);
      }
    }

    // Sort clusters deterministically top-left to bottom-right for stable naming
    clusters.sort((a, b) => {
      const ay = Math.min(...a.map((h) => h.y));
      const by = Math.min(...b.map((h) => h.y));
      if (ay !== by) return ay - by;
      const ax = Math.min(...a.map((h) => h.x));
      const bx = Math.min(...b.map((h) => h.x));
      return ax - bx;
    });

    this.neighbourhoods = clusters.map((cluster, idx) => {
      const minX = Math.min(...cluster.map((h) => h.x));
      const maxX = Math.max(...cluster.map((h) => h.x));
      const minY = Math.min(...cluster.map((h) => h.y));
      const maxY = Math.max(...cluster.map((h) => h.y));
      const centerX = cluster.reduce((acc, h) => acc + h.x, 0) / cluster.length;
      const centerY = cluster.reduce((acc, h) => acc + h.y, 0) / cluster.length;

      let minPoliceDist = Infinity;
      for (const p of policeStations) {
        const d = Math.hypot(p.x - centerX, p.y - centerY);
        if (d < minPoliceDist) minPoliceDist = d;
      }
      const safetyScore =
        policeStations.length === 0
          ? 35
          : Math.max(40, Math.min(98, Math.round(98 - minPoliceDist * 3.5)));

      return {
        id: `nb_${minX}_${minY}`,
        name: NEIGHBOURHOOD_NAMES[idx % NEIGHBOURHOOD_NAMES.length],
        color: NEIGHBOURHOOD_COLORS[idx % NEIGHBOURHOOD_COLORS.length],
        houseIds: cluster.map((h) => h.id),
        tiles: cluster.map((h) => ({ x: h.x, y: h.y })),
        minX,
        maxX,
        minY,
        maxY,
        centerX,
        centerY,
        safetyScore,
      };
    });
  }

  public getNeighbourhoodForBuilding(buildingId: string): Neighbourhood | null {
    return this.neighbourhoods.find((n) => n.houseIds.includes(buildingId)) || null;
  }

  public getRobberyAt(x: number, y: number): RobberyIncident | null {
    return this.robberies.find((r) => r.x === x && r.y === y) || null;
  }

  public getProtestAt(x: number, y: number): ProtestIncident | null {
    return this.protests.find((p) => p.x === x && p.y === y) || null;
  }

  public getEventAt(x: number, y: number): CityEvent | null {
    return this.cityEvents.find((ev) => ev.x === x && ev.y === y) || null;
  }

  public getFireAt(x: number, y: number): FireIncident | null {
    return this.fires.find((f) => f.x === x && f.y === y) || null;
  }

  public getCrashAt(x: number, y: number): CrashIncident | null {
    return this.crashes.find((c) => c.x === x && c.y === y) || null;
  }

  public getMarketStallAt(x: number, y: number): MarketStall | null {
    return this.marketStalls.find((s) => s.x === x && s.y === y) || null;
  }

  public getProposalAt(x: number, y: number): ConstructionProposal | null {
    return this.pendingProposals.find((p) => p.x === x && p.y === y) || null;
  }

  public getConstructionAt(x: number, y: number): ActiveConstruction | null {
    return this.activeConstructions.find((c) => c.x === x && c.y === y) || null;
  }

  public approveProposal(id: string): boolean {
    const idx = this.pendingProposals.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    const prop = this.pendingProposals[idx];
    const tile = this.getTile(prop.x, prop.y);
    if (
      !tile ||
      (tile.terrain !== 'grass' && tile.terrain !== 'sand') ||
      tile.hasRoad ||
      tile.building ||
      this.activeConstructions.some((c) => c.x === prop.x && c.y === prop.y)
    ) {
      this.pendingProposals.splice(idx, 1);
      return false;
    }

    this.pendingProposals.splice(idx, 1);
    const constructionId = `con_${this.constructionIdCounter++}`;
    this.removeStallOnTile(prop.x, prop.y);
    const active: ActiveConstruction = {
      id: constructionId,
      applicantName: prop.applicantName,
      blueprintId: prop.blueprintId,
      blueprintName: prop.blueprintName,
      category: prop.category,
      iconGrid: [...prop.iconGrid],
      accentColor: prop.accentColor,
      x: prop.x,
      y: prop.y,
      areaName: prop.areaName,
      totalGameMinutes: prop.durationGameMinutes,
      elapsedGameMinutes: 0,
    };
    this.activeConstructions.push(active);
    this.dispatchBuildersForConstruction(active);
    this.floatingLabels.push({
      wx: (prop.x + 0.5) * TILE_SIZE,
      wy: (prop.y + 0.25) * TILE_SIZE,
      text: 'Permit Approved!',
      color: '#ECFDF5',
      bgColor: '#059669',
      age: 0,
      maxAge: 2.0,
    });
    return true;
  }

  public declineProposal(id: string): boolean {
    const idx = this.pendingProposals.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    const prop = this.pendingProposals[idx];
    this.pendingProposals.splice(idx, 1);
    this.floatingLabels.push({
      wx: (prop.x + 0.5) * TILE_SIZE,
      wy: (prop.y + 0.25) * TILE_SIZE,
      text: 'Permit Declined',
      color: '#FEF2F2',
      bgColor: '#B91C1C',
      age: 0,
      maxAge: 1.8,
    });
    return true;
  }

  private clearPermitsAtTile(x: number, y: number) {
    for (let i = this.pendingProposals.length - 1; i >= 0; i--) {
      if (this.pendingProposals[i].x === x && this.pendingProposals[i].y === y) {
        this.pendingProposals.splice(i, 1);
      }
    }
    for (let i = this.activeConstructions.length - 1; i >= 0; i--) {
      const c = this.activeConstructions[i];
      if (c.x === x && c.y === y) {
        this.activeConstructions.splice(i, 1);
        for (const p of this.people) {
          if (p.targetConstructionId === c.id) {
            p.targetConstructionId = undefined;
            if (!this.assignReturnRoute(p)) {
              p.state = 'returning';
              p.holdTimer = 0;
            }
          }
        }
      }
    }
  }

  public getEventVenues(): PlacedBuilding[] {
    const priority: Record<BuildingCategory, number> = {
      city_hall: 1,
      park: 2,
      visit_spot: 3,
      commercial: 4,
      school: 5,
      residential: 6,
      workplace: 7,
      factory: 7,
      crops: 7,
      hospital: 8,
      police: 9,
      jail: 9,
      fire_station: 10,
      cemetery: 11,
      landmark: 12,
      road_path: 13,
    };
    return this.buildingsList
      .filter((b) => b.category !== 'road_path')
      .sort((a, b) => priority[a.category] - priority[b.category]);
  }

  public getAllBlueprints(): BuildingBlueprint[] {
    return [...DEFAULT_BLUEPRINTS, ...this.customBlueprints];
  }

  public getTile(x: number, y: number): MapTile | null {
    if (!this.inBounds(x, y)) return null;
    return this.tiles[y * this.gridCols + x];
  }

  public canPlaceExpansionLandAt(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile || tile.terrain !== 'void' || this.expansionCredits <= 0) return false;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx) + Math.abs(dy) > 2) continue;
        const nt = this.getTile(x + dx, y + dy);
        if (nt && nt.terrain !== 'void') return true;
      }
    }
    return false;
  }

  public canRemoveExpansionLandAt(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return Boolean(tile && tile.terrain !== 'void' && !tile.isDefaultLand);
  }

  private removeExpansionLandTileNoRebuild(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile || tile.terrain === 'void' || tile.isDefaultLand) return false;
    tile.building = null;
    tile.hasRoad = false;
    tile.hasZebraCrossing = false;
    tile.hasFootbridge = false;
    tile.isFlooded = false;
    this.resolveBrokenBridgeAt(x, y);
    this.removeStallOnTile(x, y);
    this.cars = this.cars.filter(
      (c) => !(Math.floor(c.wx / TILE_SIZE) === x && Math.floor(c.wy / TILE_SIZE) === y)
    );
    this.people = this.people.filter(
      (p) =>
        p.role === 'mayor' ||
        !(Math.floor(p.wx / TILE_SIZE) === x && Math.floor(p.wy / TILE_SIZE) === y)
    );
    for (let i = this.crashes.length - 1; i >= 0; i--) {
      if (this.crashes[i].x === x && this.crashes[i].y === y) {
        this.releaseCrashCars(this.crashes[i].id);
        this.crashes.splice(i, 1);
      }
    }
    this.clearPermitsAtTile(x, y);
    tile.terrain = 'void';
    tile.isDefaultLand = false;
    this.expansionCredits += 1;
    return true;
  }

  public applyExpansionLand(
    x: number,
    y: number,
    mode: 'toggle' | 'add' | 'remove' = 'toggle'
  ): boolean {
    const tile = this.getTile(x, y);
    if (!tile) return false;
    if (tile.terrain === 'void') {
      if (mode === 'remove' || !this.canPlaceExpansionLandAt(x, y)) return false;
      tile.terrain = 'grass';
      tile.isDefaultLand = false;
      this.expansionCredits = Math.max(0, this.expansionCredits - 1);
      this.rebuildCaches();
      return true;
    }
    if (mode === 'add' || tile.isDefaultLand) return false;
    const removed = this.removeExpansionLandTileNoRebuild(x, y);
    if (removed) {
      this.rebuildCaches();
    }
    return removed;
  }

  public applyExpansionLandBrush(
    cx: number,
    cy: number,
    brushSize: number,
    mode: 'add' | 'remove' = 'add'
  ): {
    changedCount: number;
    affectedTiles: { x: number; y: number }[];
    outOfCredits: boolean;
    lockedOriginalOnly: boolean;
  } {
    const size = Math.max(1, Math.min(5, Math.floor(brushSize || 1)));
    const start = -Math.floor((size - 1) / 2);
    const end = start + size - 1;
    const affectedTiles: { x: number; y: number }[] = [];
    let outOfCredits = false;
    let sawLockedOriginal = false;

    if (mode === 'add') {
      // Run wavefront passes so multi-tile brushes chain cleanly from existing land outward
      for (let pass = 0; pass < size; pass++) {
        let passAdded = 0;
        for (let dy = start; dy <= end; dy++) {
          for (let dx = start; dx <= end; dx++) {
            if (this.expansionCredits <= 0) {
              outOfCredits = true;
              break;
            }
            const tx = cx + dx;
            const ty = cy + dy;
            const tile = this.getTile(tx, ty);
            if (!tile || tile.terrain !== 'void') continue;
            if (!this.canPlaceExpansionLandAt(tx, ty)) continue;
            tile.terrain = 'grass';
            tile.isDefaultLand = false;
            this.expansionCredits = Math.max(0, this.expansionCredits - 1);
            affectedTiles.push({ x: tx, y: ty });
            passAdded++;
          }
          if (this.expansionCredits <= 0) break;
        }
        if (passAdded === 0 || this.expansionCredits <= 0) break;
      }

      if (this.expansionCredits <= 0) {
        for (let dy = start; dy <= end; dy++) {
          for (let dx = start; dx <= end; dx++) {
            const tile = this.getTile(cx + dx, cy + dy);
            if (tile && tile.terrain === 'void') {
              outOfCredits = true;
              break;
            }
          }
          if (outOfCredits) break;
        }
      }
    } else {
      for (let dy = start; dy <= end; dy++) {
        for (let dx = start; dx <= end; dx++) {
          const tx = cx + dx;
          const ty = cy + dy;
          const tile = this.getTile(tx, ty);
          if (!tile || tile.terrain === 'void') continue;
          if (tile.isDefaultLand) {
            sawLockedOriginal = true;
            continue;
          }
          if (this.removeExpansionLandTileNoRebuild(tx, ty)) {
            affectedTiles.push({ x: tx, y: ty });
          }
        }
      }
    }

    if (affectedTiles.length > 0) {
      this.rebuildCaches();
    }

    return {
      changedCount: affectedTiles.length,
      affectedTiles,
      outOfCredits,
      lockedOriginalOnly: affectedTiles.length === 0 && sawLockedOriginal,
    };
  }

  private checkExpansionMilestone() {
    const milestone = Math.floor(this.dayCount / 10);
    while (milestone > this.lastExpansionMilestone) {
      this.lastExpansionMilestone += 1;
      const padX = 3;
      const padY = 2;
      const newCols = this.gridCols + padX * 2;
      const newRows = this.gridRows + padY * 2;
      const newTiles: MapTile[] = [];
      for (let y = 0; y < newRows; y++) {
        for (let x = 0; x < newCols; x++) {
          newTiles.push({
            x,
            y,
            terrain: 'void',
            isDefaultLand: false,
            hasRoad: false,
            hasZebraCrossing: false,
            hasFootbridge: false,
            isBridgeBroken: false,
            isFlooded: false,
            intersection: { controlType: 'signal', cycleDuration: 18, phaseOffset: (x + y) % 10 },
            building: null,
            congestionScore: 0,
            jammedCarsCount: 0,
          });
        }
      }
      for (const oldTile of this.tiles) {
        const nx = oldTile.x + padX;
        const ny = oldTile.y + padY;
        const nIdx = ny * newCols + nx;
        const movedBld = oldTile.building
          ? { ...oldTile.building, x: nx, y: ny }
          : null;
        newTiles[nIdx] = {
          ...oldTile,
          x: nx,
          y: ny,
          building: movedBld,
        };
      }
      this.tiles = newTiles;
      this.gridCols = newCols;
      this.gridRows = newRows;

      const shiftPxX = padX * TILE_SIZE;
      const shiftPxY = padY * TILE_SIZE;
      for (const car of this.cars) {
        car.wx += shiftPxX;
        car.wy += shiftPxY;
        car.path = car.path.map((pt) => ({ x: pt.x + padX, y: pt.y + padY }));
      }
      for (const p of this.people) {
        p.wx += shiftPxX;
        p.wy += shiftPxY;
        p.targetWx += shiftPxX;
        p.targetWy += shiftPxY;
        if (p.targetTileX !== undefined) p.targetTileX += padX;
        if (p.targetTileY !== undefined) p.targetTileY += padY;
        if (p.waterTileX !== undefined) p.waterTileX += padX;
        if (p.waterTileY !== undefined) p.waterTileY += padY;
        if (p.pedestrianPath) {
          p.pedestrianPath = p.pedestrianPath.map((pt) => ({ x: pt.x + padX, y: pt.y + padY }));
        }
      }
      for (const a of this.animals) {
        a.wx += shiftPxX;
        a.wy += shiftPxY;
        a.targetWx += shiftPxX;
        a.targetWy += shiftPxY;
      }
      for (const s of this.marketStalls) {
        s.x += padX;
        s.y += padY;
        s.wx += shiftPxX;
        s.wy += shiftPxY;
      }
      for (const r of this.robberies) {
        r.x += padX;
        r.y += padY;
      }
      for (const pr of this.protests) {
        pr.x += padX;
        pr.y += padY;
      }
      for (const f of this.fires) {
        f.x += padX;
        f.y += padY;
        f.wx += shiftPxX;
        f.wy += shiftPxY;
      }
      for (const c of this.crashes) {
        c.x += padX;
        c.y += padY;
        c.wx += shiftPxX;
        c.wy += shiftPxY;
      }
      for (const ev of this.cityEvents) {
        ev.x += padX;
        ev.y += padY;
      }
      for (const d of this.deathEvents) {
        d.x += padX;
        d.y += padY;
        d.wx += shiftPxX;
        d.wy += shiftPxY;
      }
      for (const ms of this.mayorSpeeches) {
        ms.x += padX;
        ms.y += padY;
      }
      for (const cr of this.blastCraters) {
        cr.x += padX;
        cr.y += padY;
        cr.wx += shiftPxX;
        cr.wy += shiftPxY;
      }
      for (const nb of this.nukeBlasts) {
        nb.x += padX;
        nb.y += padY;
        nb.wx += shiftPxX;
        nb.wy += shiftPxY;
      }
      for (const br of this.brokenBridges) {
        br.x += padX;
        br.y += padY;
        br.wx += shiftPxX;
        br.wy += shiftPxY;
      }
      for (const tr of this.trashItems) {
        tr.x += padX;
        tr.y += padY;
        tr.wx += shiftPxX;
        tr.wy += shiftPxY;
      }
      for (const pp of this.porchPapers) {
        if (pp.x !== undefined) pp.x += padX;
        if (pp.y !== undefined) pp.y += padY;
        pp.wx += shiftPxX;
        pp.wy += shiftPxY;
      }
      for (const sm of this.snowmen) {
        sm.x += padX;
        sm.y += padY;
        sm.wx += shiftPxX;
        sm.wy += shiftPxY;
      }
      for (const pr of this.pendingProposals) {
        pr.x += padX;
        pr.y += padY;
      }
      for (const ac of this.activeConstructions) {
        ac.x += padX;
        ac.y += padY;
      }
      for (const sb of this.snowballs) {
        sb.x1 += shiftPxX;
        sb.y1 += shiftPxY;
        sb.x2 += shiftPxX;
        sb.y2 += shiftPxY;
      }
      for (const fl of this.floatingLabels) {
        fl.wx += shiftPxX;
        fl.wy += shiftPxY;
      }
      for (const sp of this.smokeParticles) {
        sp.wx += shiftPxX;
        sp.wy += shiftPxY;
      }
      for (const wc of this.woodChips) {
        wc.wx += shiftPxX;
        wc.wy += shiftPxY;
      }
      for (const cf of this.confetti) {
        cf.wx += shiftPxX;
        cf.wy += shiftPxY;
      }
      for (const hr of this.honkRipples) {
        hr.wx += shiftPxX;
        hr.wy += shiftPxY;
      }
      for (const gt of this.gunfireTracers) {
        gt.x1 += shiftPxX;
        gt.y1 += shiftPxY;
        gt.x2 += shiftPxX;
        gt.y2 += shiftPxY;
      }
      for (const sz of this.sleepZzzParticles) {
        sz.wx += shiftPxX;
        sz.wy += shiftPxY;
      }
      for (const ce of this.choppedTreeEvents) {
        ce.x += padX;
        ce.y += padY;
        ce.wx += shiftPxX;
        ce.wy += shiftPxY;
      }
      for (const cp of this.capturePopups) {
        cp.wx += shiftPxX;
        cp.wy += shiftPxY;
      }
      const nextChop = new Map<string, number>();
      this.tileChopProgress.forEach((v, k) => {
        const [kx, ky] = k.split(',').map(Number);
        nextChop.set(`${kx + padX},${ky + padY}`, v);
      });
      this.tileChopProgress = nextChop;
      this.crises.tornadoWx += shiftPxX;
      this.crises.tornadoWy += shiftPxY;
      this.pendingCameraShift = {
        dx: (this.pendingCameraShift?.dx ?? 0) + shiftPxX,
        dy: (this.pendingCameraShift?.dy ?? 0) + shiftPxY,
      };

      const landBonus = 100;
      this.expansionCredits += landBonus;
      this.rebuildCaches();
      this.floatingLabels.push({
        wx: (this.gridCols * TILE_SIZE) / 2,
        wy: (this.gridRows * TILE_SIZE) / 2 - 20,
        text: `DAY ${this.dayCount} MILESTONE! +${landBonus} Boxes of Land`,
        color: '#ECFDF5',
        bgColor: '#047857',
        age: 0,
        maxAge: 3.4,
      });
      this.logDailyNews(
        `BIGGER MAP UNLOCKED (Day ${this.dayCount}): Surveyors cleared ${landBonus} new boxes of land around ${this.mapName}—use the Land tool to place them wherever you want!`
      );
    }
  }

  private removeStallOnTile(x: number, y: number): boolean {
    let removed = false;
    for (let i = this.marketStalls.length - 1; i >= 0; i--) {
      const s = this.marketStalls[i];
      if (s.x === x && s.y === y) {
        this.marketStalls.splice(i, 1);
        removed = true;
        for (const p of this.people) {
          if (p.stallId === s.id) {
            p.stallId = undefined;
            if (!this.assignReturnRoute(p)) {
              p.state = 'returning';
              p.holdTimer = 0;
            }
          }
        }
      }
    }
    return removed;
  }

  private resolveBrokenBridgeAt(x: number, y: number) {
    const tile = this.getTile(x, y);
    if (tile) tile.isBridgeBroken = false;
    for (let i = this.brokenBridges.length - 1; i >= 0; i--) {
      if (this.brokenBridges[i].x === x && this.brokenBridges[i].y === y) {
        this.brokenBridges.splice(i, 1);
      }
    }
  }

  public setTerrain(x: number, y: number, terrain: TerrainType): boolean {
    if (terrain === 'void') return false;
    const tile = this.getTile(x, y);
    if (!tile || tile.terrain === 'void') return false;
    if (tile.terrain === terrain) return false;
    if (terrain !== 'water') {
      tile.hasFootbridge = false;
      this.resolveBrokenBridgeAt(x, y);
    }
    if (terrain === 'water' || terrain === 'forest') {
      if (tile.building) tile.building = null;
      if (terrain === 'forest') tile.hasRoad = false;
      this.removeStallOnTile(x, y);
      this.clearPermitsAtTile(x, y);
    }
    tile.terrain = terrain;
    this.rebuildCaches();
    return true;
  }

  public paveRoad(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile || tile.terrain === 'void') return false;
    if (tile.hasRoad) return false;
    if (tile.building) return false;
    if (tile.terrain === 'forest') tile.terrain = 'grass';
    tile.hasFootbridge = false;
    this.resolveBrokenBridgeAt(x, y);
    tile.hasRoad = true;
    tile.intersection = {
      controlType: 'signal',
      cycleDuration: 18,
      phaseOffset: ((x * 3 + y * 5) % 12),
    };
    this.removeStallOnTile(x, y);
    this.clearPermitsAtTile(x, y);
    this.rebuildCaches();
    return true;
  }

  public setFootbridge(x: number, y: number, enabled?: boolean): boolean {
    const tile = this.getTile(x, y);
    if (!tile || tile.terrain !== 'water' || tile.hasRoad || tile.building) return false;
    const next = enabled !== undefined ? enabled : !tile.hasFootbridge;
    if (Boolean(tile.hasFootbridge) === next) return false;
    tile.hasFootbridge = next;
    this.resolveBrokenBridgeAt(x, y);
    return true;
  }

  public hasCityHall(): boolean {
    return this.buildingsList.some((b) => b.category === 'city_hall');
  }

  private generateUniquePlotName(rawBaseName: string, excludeId?: string, includePending = false): string {
    const trimmed = (rawBaseName || 'Plot').trim();
    const baseName = trimmed.replace(/\s+#?\d+$/, '').trim() || trimmed;
    if (baseName.toLowerCase() === 'city hall' && !this.hasCityHall()) {
      return 'City Hall';
    }
    const usedNames = new Set<string>();
    for (const b of this.buildingsList) {
      if (excludeId && b.id === excludeId) continue;
      usedNames.add(b.name.trim().toLowerCase());
    }
    for (const c of this.activeConstructions) {
      usedNames.add(c.blueprintName.trim().toLowerCase());
    }
    if (includePending) {
      for (const pr of this.pendingProposals) {
        usedNames.add(pr.blueprintName.trim().toLowerCase());
      }
    }
    let idx = 1;
    while (usedNames.has(`${baseName} ${idx}`.toLowerCase())) {
      idx++;
    }
    return `${baseName} ${idx}`;
  }

  private deduplicateExistingBuildingNames() {
    const counts = new Map<string, number>();
    for (const b of this.buildingsList) {
      const key = b.name.trim().toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const hasDuplicates = Array.from(counts.values()).some((c) => c > 1);
    if (!hasDuplicates) return;

    const usedNames = new Set<string>();
    for (const b of this.buildingsList) {
      const key = b.name.trim().toLowerCase();
      if ((counts.get(key) || 0) <= 1 && !usedNames.has(key)) {
        usedNames.add(key);
        continue;
      }
      const base = b.name.replace(/\s+#?\d+$/, '').trim() || b.name.trim() || 'Plot';
      let n = 1;
      while (usedNames.has(`${base} ${n}`.toLowerCase())) {
        n++;
      }
      b.name = `${base} ${n}`;
      usedNames.add(b.name.toLowerCase());
    }
  }

  public placeBuilding(x: number, y: number, blueprint: BuildingBlueprint): PlacedBuilding | null {
    const tile = this.getTile(x, y);
    if (!tile || tile.terrain === 'void') return null;
    if (blueprint.category === 'city_hall' && this.hasCityHall()) {
      return null;
    }
    const isRoadPath = blueprint.category === 'road_path';
    if (tile.terrain === 'water') return null;
    if (tile.hasRoad && !isRoadPath) return null;

    if (tile.terrain === 'forest') {
      tile.terrain = 'grass';
    }
    tile.hasFootbridge = false;
    this.removeStallOnTile(x, y);
    this.clearPermitsAtTile(x, y);
    if (isRoadPath) {
      if (!tile.hasRoad) {
        tile.hasRoad = true;
        tile.intersection = {
          controlType: 'signal',
          cycleDuration: 18,
          phaseOffset: (x * 3 + y * 5) % 12,
        };
      }
    }
    const uniqueName = this.generateUniquePlotName(blueprint.name);
    const bld: PlacedBuilding = {
      id: `bld_${this.buildingIdCounter++}_${Date.now().toString(36)}`,
      blueprintId: blueprint.id,
      name: uniqueName,
      category: blueprint.category,
      iconGrid: [...blueprint.iconGrid],
      accentColor: blueprint.accentColor,
      x,
      y,
      capacity: blueprint.category === 'residential' ? Math.min(5, Math.max(1, blueprint.capacity)) : blueprint.capacity,
      activeTripsOut: 0,
      activeTripsIn: 0,
      totalVisits: 0,
    };
    this.initializeBuildingProps(bld);
    tile.building = bld;
    this.rebuildCaches();
    return bld;
  }

  public bulldozeTile(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile || tile.terrain === 'void') return false;
    if (tile.hasFootbridge) {
      tile.hasFootbridge = false;
      this.resolveBrokenBridgeAt(x, y);
      this.rebuildCaches();
      return true;
    }
    let changed = false;
    if (tile.building) {
      tile.building = null;
      changed = true;
    }
    if (tile.hasRoad) {
      tile.hasRoad = false;
      tile.hasZebraCrossing = false;
      this.resolveBrokenBridgeAt(x, y);
      changed = true;
    }
    if (tile.terrain !== 'grass') {
      tile.terrain = 'grass';
      this.resolveBrokenBridgeAt(x, y);
      changed = true;
    }
    if (this.removeStallOnTile(x, y)) {
      changed = true;
    }
    if (this.pendingProposals.some((p) => p.x === x && p.y === y) || this.activeConstructions.some((c) => c.x === x && c.y === y)) {
      this.clearPermitsAtTile(x, y);
      changed = true;
    }
    if (changed) {
      // Remove cars currently stranded on this deleted road tile
      this.cars = this.cars.filter((c) => {
        const cx = Math.floor(c.wx / TILE_SIZE);
        const cy = Math.floor(c.wy / TILE_SIZE);
        return !(cx === x && cy === y);
      });
      // Clear any crash on this deleted road tile
      for (let i = this.crashes.length - 1; i >= 0; i--) {
        if (this.crashes[i].x === x && this.crashes[i].y === y) {
          this.releaseCrashCars(this.crashes[i].id);
          this.crashes.splice(i, 1);
        }
      }
      this.rebuildCaches();
    }
    return changed;
  }

  public setZebraCrossing(x: number, y: number, enabled?: boolean): boolean {
    const tile = this.getTile(x, y);
    if (!tile || !tile.hasRoad) return false;
    const next = enabled !== undefined ? enabled : !tile.hasZebraCrossing;
    if (Boolean(tile.hasZebraCrossing) === next) return false;
    tile.hasZebraCrossing = next;
    return true;
  }

  public updateBuildingData(
    x: number,
    y: number,
    updates: Partial<Pick<PlacedBuilding, 'name' | 'category' | 'iconGrid' | 'accentColor'>>
  ) {
    const tile = this.getTile(x, y);
    if (!tile?.building) return;
    const prevCategory = tile.building.category;
    if (updates.name !== undefined) tile.building.name = updates.name;
    if (
      updates.category !== undefined &&
      !(updates.category === 'city_hall' && prevCategory !== 'city_hall' && this.hasCityHall())
    ) {
      tile.building.category = updates.category;
      if (updates.category === 'road_path') {
        tile.hasRoad = true;
      } else if (prevCategory === 'road_path') {
        tile.hasRoad = false;
        tile.hasZebraCrossing = false;
      }
      this.rebuildCaches();
    }
    if (updates.iconGrid !== undefined) tile.building.iconGrid = [...updates.iconGrid];
    if (updates.accentColor !== undefined) tile.building.accentColor = updates.accentColor;
  }

  public updateIntersectionConfig(x: number, y: number, config: Partial<RoadIntersectionConfig>) {
    const tile = this.getTile(x, y);
    if (!tile || !tile.hasRoad) return;
    tile.intersection = { ...tile.intersection, ...config };
  }

  public saveBlueprint(bp: BuildingBlueprint, alsoUpdatePlaced = true) {
    const idx = this.customBlueprints.findIndex((b) => b.id === bp.id);
    const defaultIdx = DEFAULT_BLUEPRINTS.findIndex((b) => b.id === bp.id);

    if (defaultIdx !== -1) {
      // Override or store custom variant
      const clone: BuildingBlueprint = { ...bp, iconGrid: [...bp.iconGrid] };
      if (idx !== -1) {
        this.customBlueprints[idx] = clone;
      } else {
        // Update default in-place for this session? Better: replace matching placed buildings & keep in customBlueprints if new
        DEFAULT_BLUEPRINTS[defaultIdx].iconGrid = [...bp.iconGrid];
        DEFAULT_BLUEPRINTS[defaultIdx].name = bp.name;
      }
    } else if (idx !== -1) {
      this.customBlueprints[idx] = { ...bp, iconGrid: [...bp.iconGrid] };
    } else {
      this.customBlueprints.push({ ...bp, isCustom: true, iconGrid: [...bp.iconGrid] });
    }

    if (alsoUpdatePlaced) {
      for (const t of this.tiles) {
        if (t.building && t.building.blueprintId === bp.id) {
          t.building.iconGrid = [...bp.iconGrid];
          t.building.accentColor = bp.accentColor;
        }
      }
    }
  }

  public deleteBlueprint(bpId: string): boolean {
    const idx = this.customBlueprints.findIndex((b) => b.id === bpId);
    if (idx === -1) return false;
    this.customBlueprints.splice(idx, 1);
    return true;
  }

  public setMinutesOfDay(minutes: number) {
    this.minutesOfDay = ((minutes % 1440) + 1440) % 1440;
  }

  public getTimePhase(): TimePhase {
    const h = this.minutesOfDay / 60;
    if (h >= 5.5 && h < 7.5) return 'Dawn';
    if (h >= 7.5 && h < 17.0) return 'Day';
    if (h >= 17.0 && h < 19.5) return 'Dusk';
    return 'Night';
  }

  public isRainingOrStorming(): boolean {
    return this.weather === 'Rain' || this.weather === 'Storm';
  }

  public isOutdoorCurfew(): boolean {
    return this.getTimePhase() === 'Night' || this.isRainingOrStorming();
  }

  public getDemandMultiplier(): number {
    const h = this.minutesOfDay / 60;
    if (h >= 21.5 || h < 5.5) return 0.45; // Quiet overnight traffic
    if (h >= 8.0 && h < 18.0) return 1.15; // Steady daytime activity
    return 0.85;
  }

  public getSignalAspect(tile: MapTile, axis: 'NS' | 'EW'): SignalAspect {
    if (tile.intersection.controlType !== 'signal') return 'green';
    const cycle = Math.max(8, tile.intersection.cycleDuration);
    const t = ((this.minutesOfDay + tile.intersection.phaseOffset) % cycle) / cycle;

    // 0..0.42 NS green, 0.42..0.50 NS amber, 0.50..0.92 EW green, 0.92..1.0 EW amber
    if (axis === 'NS') {
      if (t < 0.42) return 'green';
      if (t < 0.50) return 'amber';
      return 'red';
    } else {
      if (t >= 0.50 && t < 0.92) return 'green';
      if (t >= 0.92) return 'amber';
      return 'red';
    }
  }

  public seedInitialTraffic(count: number) {
    for (let i = 0; i < count; i++) {
      this.trySpawnCar();
    }
  }

  public getDayOfWeek(): string {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[(Math.max(1, this.dayCount) - 1) % 7];
  }

  public isWeekend(): boolean {
    const d = this.getDayOfWeek();
    return d === 'Sat' || d === 'Sun';
  }

  public prepareForPlaySession() {
    // Preserve ongoing dayCount, minutesOfDay, season, and user newspapers across Home/Resume
    this.crashCheckAccumulator = 0;
  }

  public advanceClockOnly(extraDt: number) {
    if (!this.isRunning || extraDt <= 0) return;
    const clamped = Math.min(extraDt, 0.2);
    this.minutesOfDay += clamped * this.timeScale * 4;
    if (this.minutesOfDay >= 1440) {
      this.minutesOfDay -= 1440;
      this.dayCount += 1;
      if ((this.dayCount - 1) % 10 === 0) {
        this.cycleSeason(false);
      }
      this.checkExpansionMilestone();
    }
  }

  public advanceBackgroundSeconds(elapsedSec: number) {
    if (!this.isRunning || elapsedSec <= 0) return;
    const clampedSec = Math.min(elapsedSec, 3600 * 6);
    const simSec = clampedSec * this.timeScale;
    this.minutesOfDay += simSec * 4;
    while (this.minutesOfDay >= 1440) {
      this.minutesOfDay -= 1440;
      this.dayCount += 1;
      if ((this.dayCount - 1) % 10 === 0) {
        this.cycleSeason(false);
      }
      this.checkExpansionMilestone();
    }
    this.weatherTimer -= simSec;
    while (this.weatherTimer <= 0) {
      this.weatherTimer += 65 + Math.random() * 65;
      this.weather = this.rollWeatherForSeason();
      this.weatherParticles = [];
    }
    for (const b of this.buildingsList) {
      if (b.category === 'crops' && (b.cropStage ?? 1) < 3) {
        b.cropTimer = (b.cropTimer ?? 0) + simSec;
        while (b.cropTimer >= 22 && (b.cropStage ?? 1) < 3) {
          b.cropTimer -= 22;
          b.cropStage = (b.cropStage ?? 1) + 1;
        }
      }
    }
  }

  public isStoreOpen(): boolean {
    const h = this.minutesOfDay / 60;
    return h >= 6.0 && h < 22.0;
  }

  public getBuildings(): PlacedBuilding[] {
    return this.buildingsList;
  }

  public refreshSimulationPerformance(): { clearedEntities: number } {
    let cleared = 0;

    // Clear heavy transient visual particle queues while keeping the city & timeline completely intact
    cleared +=
      this.woodChips.length +
      this.confetti.length +
      this.smokeParticles.length +
      this.weatherParticles.length +
      this.gunfireTracers.length +
      this.snowballs.length +
      this.honkRipples.length +
      this.floatingLabels.length +
      this.sleepZzzParticles.length;

    this.woodChips = [];
    this.confetti = [];
    this.smokeParticles = [];
    this.weatherParticles = [];
    this.gunfireTracers = [];
    this.snowballs = [];
    this.honkRipples = [];
    this.floatingLabels = [];
    this.sleepZzzParticles = [];

    // Keep emergency cars and up to 18 active flowing civilian cars; clear jammed stalls
    const keptCars: Car[] = [];
    let civilianKept = 0;
    for (const c of this.cars) {
      const isEmergency =
        c.type === 'ambulance' || c.type === 'police' || c.type === 'firetruck' || c.type === 'hearse';
      if (isEmergency || (!c.isJammed && civilianKept < 18)) {
        c.waitSeconds = 0;
        c.isJammed = false;
        keptCars.push(c);
        if (!isEmergency) civilianKept++;
      } else {
        cleared++;
      }
    }
    this.cars = keptCars;

    // Keep essential civic roles and trim excess ambient crowd walkers causing CPU pressure
    const keepAlways = new Set<Person['role']>([
      'mayor',
      'invader',
      'soldier',
      'police',
      'firefighter',
      'medic',
      'protester',
      'escapee',
      'paperboy',
    ]);
    const keptPeople: Person[] = [];
    let ambientCount = 0;
    for (const p of this.people) {
      if (keepAlways.has(p.role)) {
        p.rerouteCooldown = 0;
        keptPeople.push(p);
      } else if (ambientCount < 28) {
        p.rerouteCooldown = 0;
        keptPeople.push(p);
        ambientCount++;
      } else {
        cleared++;
      }
    }
    this.people = keptPeople;

    // Clear tile congestion backlog & accumulators
    for (const t of this.tiles) {
      t.congestionScore = 0;
      t.jammedCarsCount = 0;
    }
    this.spawnAccumulator = 0;
    this.crashCheckAccumulator = 0;

    this.floatingLabels.push({
      wx: (this.gridCols * TILE_SIZE) / 2,
      wy: (this.gridRows * TILE_SIZE) / 2 - 12,
      text: 'Refreshed & Smoothed!',
      color: '#ECFDF5',
      bgColor: '#0F766E',
      age: 0,
      maxAge: 1.8,
    });
    return { clearedEntities: cleared };
  }

  public step(rawDt: number, playAudio = true) {
    const dt = Math.min(rawDt, 0.05);
    if (!this.isRunning) return;

    const steps = Math.min(3, Math.max(1, Math.ceil(this.timeScale / 2)));
    const scaledDt = dt * this.timeScale;
    const subDt = scaledDt / steps;

    for (let s = 0; s < steps; s++) {
      this.stepSubFrame(subDt, playAudio && s === 0);
    }
  }

  private stepSubFrame(simDt: number, playAudio: boolean) {
    // Advance time: 1 real minute = 4 game hours (240 game mins / 60 real sec = 4x)
    this.minutesOfDay += simDt * 4;
    if (this.minutesOfDay >= 1440) {
      this.minutesOfDay -= 1440;
      this.dayCount += 1;
      if ((this.dayCount - 1) % 10 === 0) {
        this.cycleSeason(false);
      }
      this.checkExpansionMilestone();
    }

    // Spawn cars according to road capacity, building count & time-of-day rush multiplier
    const maxCars = Math.min(64, Math.max(16, Math.round(this.roadTilesCount * 0.42)));
    if (this.buildingsList.length >= 2 && this.cars.length < maxCars) {
      const demand = this.getDemandMultiplier();
      const baseRate = Math.min(1.85, 0.24 + this.buildingsList.length * 0.032);
      this.spawnAccumulator += simDt * baseRate * demand;
      let attempts = 0;
      while (this.spawnAccumulator >= 1 && attempts < 2) {
        this.spawnAccumulator -= 1;
        this.trySpawnCar();
        attempts++;
      }
    }

    // Decay tile congestion scores smoothly
    for (const t of this.tiles) {
      t.congestionScore = Math.max(0, t.congestionScore - simDt * 0.14);
      t.jammedCarsCount = 0;
    }

    // Step honk ripples
    for (let i = this.honkRipples.length - 1; i >= 0; i--) {
      this.honkRipples[i].age += simDt;
      if (this.honkRipples[i].age >= this.honkRipples[i].maxAge) {
        this.honkRipples.splice(i, 1);
      }
    }

    // Step floating labels
    for (let i = this.floatingLabels.length - 1; i >= 0; i--) {
      this.floatingLabels[i].age += simDt;
      if (this.floatingLabels[i].age >= this.floatingLabels[i].maxAge) {
        this.floatingLabels.splice(i, 1);
      }
    }

    // Step gunfire tracers
    for (let i = this.gunfireTracers.length - 1; i >= 0; i--) {
      this.gunfireTracers[i].age += simDt;
      if (this.gunfireTracers[i].age >= this.gunfireTracers[i].maxAge) {
        this.gunfireTracers.splice(i, 1);
      }
    }

    // Step Neighbourhood Robberies & Police Dispatch
    this.updateRobberies(simDt, playAudio);

    // Step Citizen Deaths & Cemetery Hearses
    this.updateDeaths(simDt, simDt, playAudio);

    // Step Weekday School Bell, Parents & Students, Playgrounds, and Building Statuses
    this.updateSchoolAndBuildingStatuses(simDt, simDt, playAudio);
    this.updateNewspaperDelivery(simDt, simDt, playAudio);

    // Step Woodcutters, Planters, Arsonists, Firefighters & Mayor
    this.updatePeopleAndChop(simDt, simDt, playAudio);

    // Step Fishers, Hobbyists & Small Business Shoppers
    this.updateCitizensAndHobbies(simDt, simDt, playAudio);

    // Step Littering, Ocean Trash & Cleanup
    this.updateTrashAndLittering(simDt, simDt, playAudio);

    // Step Roaming Animals, Crop Growth, Farmers & Butchers
    this.updateAnimalsAndFarms(simDt, simDt, playAudio);

    // Step Kayakers, Field Trips & Citizen Self-Building
    this.updateCommunityActivities(simDt, simDt, playAudio);

    // Step Pop-up Market Stalls, Illicit Stalls & Beggars
    this.updateMarketStallsAndBeggars(simDt, simDt, playAudio);

    // Step Jail Releases & Prison Escapes
    this.updateJailAndReleases(simDt, simDt, playAudio);

    // Step City Hall Chaos Crises (Virus Outbreak, War, Poverty) & Post-Invasion Elections
    this.updateCrises(simDt, simDt, playAudio);

    // Step Natural / Chaos Disasters (Tornado, Earthquake, Flood)
    this.updateDisasters(simDt, simDt, playAudio);

    // Step Mayor Speeches & Reforestation Drives
    this.updateMayorSpeeches(simDt);

    // Step Protests at City Hall & Police Captures
    this.updateProtests(simDt, simDt, playAudio);

    // Step Arsonists, House Fires & Fire Truck Dispatch
    this.updateFiresAndArson(simDt, simDt, playAudio);

    // Step Natural Rare Celebrations, Ceremonies, Weddings & Events
    this.updateCityEvents(simDt, simDt, playAudio);

    // Step Car Crashes & Emergency Responders
    this.updateCarCrashes(simDt, simDt, playAudio);

    // Step Seasons, Weather, Seasonal Particles, Broken Bridges & Citizen Happiness
    this.updateWeather(simDt, simDt);
    this.updateSeasonalParticlesAndIndoorMood(simDt, simDt);
    this.updateBrokenBridges(simDt, simDt, playAudio);
    this.updateCitizenHappiness(simDt, simDt);

    // Step cars physics (including occasional car-vs-pedestrian impacts)
    this.carPedHitCooldown = Math.max(0, this.carPedHitCooldown - simDt);
    this.updateCars(simDt, simDt, playAudio);

    // Keep particle & popup queues strictly bounded so long 8x sessions stay silky smooth
    if (this.woodChips.length > 160) this.woodChips.splice(0, this.woodChips.length - 160);
    if (this.confetti.length > 160) this.confetti.splice(0, this.confetti.length - 160);
    if (this.smokeParticles.length > 180) this.smokeParticles.splice(0, this.smokeParticles.length - 180);
    if (this.floatingLabels.length > 40) this.floatingLabels.splice(0, this.floatingLabels.length - 40);
    if (this.snowballs.length > 30) this.snowballs.splice(0, this.snowballs.length - 30);
    if (this.gunfireTracers.length > 30) this.gunfireTracers.splice(0, this.gunfireTracers.length - 30);
    if (this.sleepZzzParticles.length > 30) this.sleepZzzParticles.splice(0, this.sleepZzzParticles.length - 30);
    if (this.honkRipples.length > 30) this.honkRipples.splice(0, this.honkRipples.length - 30);
  }

  private updateDeaths(simDt: number, realDt: number, playAudio: boolean) {
    for (let i = this.deathEvents.length - 1; i >= 0; i--) {
      this.deathEvents[i].age += realDt;
      if (this.deathEvents[i].age >= this.deathEvents[i].maxAge) {
        this.deathEvents.splice(i, 1);
      }
    }

    const livingPlaces = this.buildingsList.filter(
      (b) => b.category === 'residential' || b.category === 'hospital'
    );
    if (livingPlaces.length === 0) return;

    const isVirusOrWar = this.crises.virusActive || this.crises.warActive;
    const isHeavyPollution = this.crises.pollutionLevel >= 65;
    const checkInterval = isVirusOrWar ? 11 : isHeavyPollution ? 32 : 74;
    this.deathCheckAccumulator += simDt;
    if (this.deathCheckAccumulator >= checkInterval) {
      this.deathCheckAccumulator = 0;
      const baseChance = isVirusOrWar ? 0.68 : isHeavyPollution ? 0.34 : 0.18;
      const chance = Math.min(0.86, baseChance + livingPlaces.length * 0.012);
      if (Math.random() < chance) {
        const origin = livingPlaces[Math.floor(Math.random() * livingPlaces.length)];
        this.spawnDeathEvent(origin, playAudio);
      }
    }
  }

  private recordCoordinateDeath(
    x: number,
    y: number,
    wx: number,
    wy: number,
    buildingName: string,
    playAudio: boolean
  ) {
    this.deathEvents.push({
      id: `death_${this.deathIdCounter++}`,
      x,
      y,
      wx,
      wy,
      buildingName,
      age: 0,
      maxAge: 8.5,
      hearseDispatched: false,
    });
    this.totalDeaths += 1;
    if (playAudio) soundEngine.playDeathChime();
  }

  private spawnDeathEvent(origin: PlacedBuilding, playAudio: boolean) {
    const hearseDispatched = this.dispatchHearseToCemetery(origin);
    const ev: DeathEvent = {
      id: `death_${this.deathIdCounter++}`,
      x: origin.x,
      y: origin.y,
      wx: (origin.x + 0.5) * TILE_SIZE,
      wy: (origin.y + 0.5) * TILE_SIZE,
      buildingName: origin.name,
      age: 0,
      maxAge: 8.5,
      hearseDispatched,
    };
    this.deathEvents.push(ev);
    this.totalDeaths += 1;
    if (!this.crises.warActive && origin.category !== 'city_hall' && Math.random() < 0.28) {
      const celebrities = [
        'Legendary Pie Chef Barnaby Crustwell',
        'Famous Crosswalk Conductor Pip Sterling',
        'Renowned Honeybee Whisperer Agatha Honeycutt',
        'Retro Stunt Cyclist Evelina Sparks',
        'Record-Holding Accordion Virtuoso Maestro Figaro',
        'Beloved Roller-Skate Postmistress Mabel Swift',
      ];
      const celeb = celebrities[Math.floor(Math.random() * celebrities.length)];
      this.logDailyNews(`TRIBUTE TO A LEGEND: ${celeb} passed away at ${origin.name}—citizens left flowers and cinnamon rolls by the gate.`);
    }
    if (playAudio) soundEngine.playDeathChime();
  }

  private dispatchHearseToCemetery(origin: PlacedBuilding): boolean {
    const cemeteries = this.buildingsList.filter((b) => b.category === 'cemetery');
    if (cemeteries.length === 0) return false;

    const startRoad = this.findAdjacentRoadTile(this.tiles, origin.x, origin.y);
    if (!startRoad) return false;

    const sortedCemeteries = [...cemeteries].sort(
      (a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y)
    );

    for (const cem of sortedCemeteries) {
      const endRoad = this.findAdjacentRoadTile(this.tiles, cem.x, cem.y);
      if (!endRoad) continue;
      const roadPath = this.findRoadPath(this.tiles, startRoad, endRoad, 1.0);
      if (!roadPath || roadPath.length < 2) continue;

      const fullPath: GridPoint[] = [{ x: origin.x, y: origin.y }, ...roadPath, { x: cem.x, y: cem.y }];
      const p0 = fullPath[0];
      const p1 = fullPath[1];
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

      const hearse: Car = {
        id: `car_${this.carIdCounter++}`,
        type: 'hearse',
        color: '#0F172A',
        wx: (p0.x + 0.5) * TILE_SIZE,
        wy: (p0.y + 0.5) * TILE_SIZE,
        angle,
        speed: 28,
        maxSpeed: 54,
        path: fullPath,
        pathIndex: 1,
        originBuildingId: origin.id,
        destBuildingId: cem.id,
        destLabel: cem.name,
        originCategory: origin.category,
        destCategory: 'cemetery',
        waitSeconds: 0,
        isBraking: false,
        isJammed: false,
        hornFlash: 0,
        sirenPhase: 0,
      };
      origin.activeTripsOut += 1;
      cem.activeTripsIn += 1;
      this.cars.push(hearse);
      return true;
    }

    return false;
  }

  private updateRobberies(simDt: number, playAudio: boolean) {
    // Step foot police officers responding to remote/off-road robberies
    for (let pi = this.people.length - 1; pi >= 0; pi--) {
      const officer = this.people[pi];
      if (officer.role !== 'police' || !officer.targetRobberyId) continue;
      const rob = this.robberies.find(
        (r) => r.id === officer.targetRobberyId && r.status === 'active'
      );
      if (!rob) {
        officer.targetRobberyId = undefined;
        if (officer.homeBuildingId) {
          officer.speed = 24;
          if (!this.assignReturnRoute(officer)) this.people.splice(pi, 1);
        } else {
          this.people.splice(pi, 1);
        }
        continue;
      }

      const res = this.stepPersonAlongPath(officer, simDt, 9);
      const dist = Math.hypot(
        officer.wx - (rob.x + 0.5) * TILE_SIZE,
        officer.wy - (rob.y + 0.5) * TILE_SIZE
      );
      if (res === 'arrived' || dist < 14) {
        rob.status = 'caught';
        rob.statusTimer = 4.0;
        this.stoppedRobberies += 1;
        this.sendToJail(1);
        this.capturePopups.push({
          wx: (rob.x + 0.5) * TILE_SIZE,
          wy: (rob.y + 0.25) * TILE_SIZE,
          age: 0,
          maxAge: 1.5,
        });
        this.logDailyNews(
          `HOT TAKE: That burglar in ${rob.neighbourhoodName} really thought nobody would spot a bright getaway sprint—Police bagged 'em in seconds!`
        );
        soundEngine.playPoliceResolved();
        const cruiser = this.cars.find((c) => c.targetRobberyId === rob.id);
        if (cruiser && !this.sendVehicleBackToStation(cruiser, undefined, true)) {
          this.finishTrip(cruiser);
          const ci = this.cars.indexOf(cruiser);
          if (ci !== -1) this.cars.splice(ci, 1);
        }
        officer.targetRobberyId = undefined;
        if (officer.homeBuildingId) {
          officer.speed = 24;
          if (!this.assignReturnRoute(officer)) this.people.splice(pi, 1);
        } else {
          this.people.splice(pi, 1);
        }
      } else if (res === 'blocked') {
        const curPt = {
          x: Math.max(0, Math.min(this.gridCols - 1, Math.floor(officer.wx / TILE_SIZE))),
          y: Math.max(0, Math.min(this.gridRows - 1, Math.floor(officer.wy / TILE_SIZE))),
        };
        const retryPath = this.findPoliceFootPath(curPt, { x: rob.x, y: rob.y });
        if (retryPath) {
          officer.pedestrianPath = retryPath;
          officer.pedestrianPathIndex = retryPath.length > 1 ? 1 : 0;
        } else {
          const dx = (rob.x + 0.5) * TILE_SIZE - officer.wx;
          const dy = (rob.y + 0.5) * TILE_SIZE - officer.wy;
          const d = Math.hypot(dx, dy);
          if (d > 1) {
            officer.wx += (dx / d) * officer.speed * simDt;
            officer.wy += (dy / d) * officer.speed * simDt;
            officer.animPhase += simDt * 10;
          }
        }
      }
    }

    // Update existing robbery timers
    for (let i = this.robberies.length - 1; i >= 0; i--) {
      const rob = this.robberies[i];
      if (rob.status === 'active') {
        if (rob.policeDispatched) {
          const hasResponder =
            this.cars.some((c) => c.targetRobberyId === rob.id) ||
            this.people.some((p) => p.role === 'police' && p.targetRobberyId === rob.id);
          if (!hasResponder) {
            rob.policeDispatched = false;
          }
        }
        // Give far-away dispatched cruisers enough travel time before the burglar slips away
        rob.elapsedSeconds += rob.policeDispatched ? simDt * 0.35 : simDt;
        // Retry police dispatch if a player just built/connected a Police Station
        if (!rob.policeDispatched) {
          this.dispatchPoliceToRobbery(rob);
        }
        if (rob.elapsedSeconds >= rob.escapeLimitSeconds) {
          rob.status = 'escaped';
          rob.statusTimer = 4.0;
          const cruiser = this.cars.find((c) => c.targetRobberyId === rob.id);
          if (cruiser && !this.sendVehicleBackToStation(cruiser, undefined, false)) {
            this.finishTrip(cruiser);
            const ci = this.cars.indexOf(cruiser);
            if (ci !== -1) this.cars.splice(ci, 1);
          }
        }
      } else {
        rob.statusTimer -= simDt;
        if (rob.statusTimer <= 0) {
          this.robberies.splice(i, 1);
        }
      }
    }

    // Occasionally trigger a robbery inside a detected Neighbourhood (rare unless Poverty is active)
    if (this.neighbourhoods.length === 0) return;
    const activeCount = this.robberies.filter((r) => r.status === 'active').length;
    const maxRobberies = this.crises.povertyActive ? 2 : 1;
    if (activeCount >= maxRobberies) return;

    const phase = this.getTimePhase();
    const rateMultiplier =
      (phase === 'Night' ? 1.55 : phase === 'Dusk' ? 1.25 : 0.75) *
      (this.crises.povertyActive ? 1.9 : 1.0);
    this.robberyCheckAccumulator += simDt * rateMultiplier;

    if (this.robberyCheckAccumulator >= 78) {
      this.robberyCheckAccumulator = 0;
      const nb = this.neighbourhoods[Math.floor(Math.random() * this.neighbourhoods.length)];
      const risk = (100 - nb.safetyScore) / 100; // 0.02..0.65
      const baseChance = this.crises.povertyActive ? 0.36 : 0.16;
      const chance = Math.min(0.75, baseChance + risk * 0.38);
      if (Math.random() < chance) {
        this.spawnRobberyInNeighbourhood(nb, playAudio);
      }
    }
  }

  public triggerRandomRobbery(playAudio = true): RobberyIncident | null {
    if (this.neighbourhoods.length === 0) return null;
    const nb = this.neighbourhoods[Math.floor(Math.random() * this.neighbourhoods.length)];
    return this.spawnRobberyInNeighbourhood(nb, playAudio);
  }

  public triggerRobberyAt(x: number, y: number, playAudio = true): RobberyIncident | null {
    const tile = this.getTile(x, y);
    const target = tile?.building;
    if (!target || target.category === 'road_path') return null;
    if (this.robberies.some((r) => r.buildingId === target.id && r.status === 'active')) {
      return null;
    }

    // Clear any fading resolved robbery on this building so the new active robbery surfaces immediately
    for (let i = this.robberies.length - 1; i >= 0; i--) {
      if (this.robberies[i].buildingId === target.id && this.robberies[i].status !== 'active') {
        this.robberies.splice(i, 1);
      }
    }

    const nb = this.getNeighbourhoodForBuilding(target.id);
    const incident: RobberyIncident = {
      id: `rob_${this.robberyIdCounter++}`,
      buildingId: target.id,
      buildingName: target.name,
      neighbourhoodId: nb?.id ?? 'custom',
      neighbourhoodName: nb?.name ?? this.describeArea(target.x, target.y),
      x: target.x,
      y: target.y,
      elapsedSeconds: 0,
      escapeLimitSeconds: 75,
      policeDispatched: false,
      status: 'active',
      statusTimer: 0,
    };

    this.robberies.push(incident);
    if (playAudio) soundEngine.playRobberyAlert();
    this.dispatchPoliceToRobbery(incident);
    return incident;
  }

  private spawnRobberyInNeighbourhood(nb: Neighbourhood, playAudio: boolean): RobberyIncident | null {
    const candidates = nb.houseIds
      .map((id) => this.buildingsList.find((b) => b.id === id))
      .filter((b): b is PlacedBuilding => Boolean(b))
      .filter((b) => !this.robberies.some((r) => r.buildingId === b.id));

    if (candidates.length === 0) return null;
    const target = candidates[Math.floor(Math.random() * candidates.length)];

    const incident: RobberyIncident = {
      id: `rob_${this.robberyIdCounter++}`,
      buildingId: target.id,
      buildingName: target.name,
      neighbourhoodId: nb.id,
      neighbourhoodName: nb.name,
      x: target.x,
      y: target.y,
      elapsedSeconds: 0,
      escapeLimitSeconds: 75,
      policeDispatched: false,
      status: 'active',
      statusTimer: 0,
    };

    this.robberies.push(incident);
    if (playAudio) soundEngine.playRobberyAlert();
    this.dispatchPoliceToRobbery(incident);
    return incident;
  }

  private dispatchPoliceToRobbery(incident: RobberyIncident): boolean {
    const route = this.findBestPoliceDispatchRoute(incident.x, incident.y);
    if (!route) return false;

    const { station, roadPath, fullRoadReached } = route;
    if (roadPath && roadPath.length >= 1) {
      const lastRoad = roadPath[roadPath.length - 1];
      const closeEnough =
        fullRoadReached &&
        Math.hypot(lastRoad.x - incident.x, lastRoad.y - incident.y) <= 2.5;
      const fullPath: GridPoint[] = closeEnough
        ? [{ x: station.x, y: station.y }, ...roadPath, { x: incident.x, y: incident.y }]
        : [{ x: station.x, y: station.y }, ...roadPath];
      const p0 = fullPath[0];
      const p1 = fullPath[1] || fullPath[0];
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

      const cruiser: Car = {
        id: `car_${this.carIdCounter++}`,
        type: 'police',
        color: '#1E293B',
        wx: (p0.x + 0.5) * TILE_SIZE,
        wy: (p0.y + 0.5) * TILE_SIZE,
        angle,
        speed: 68,
        maxSpeed: 132,
        path: fullPath,
        pathIndex: fullPath.length > 1 ? 1 : 0,
        originBuildingId: station.id,
        destBuildingId: incident.buildingId,
        destLabel: incident.buildingName,
        returnStationId: station.id,
        originCategory: 'police',
        destCategory: this.getTile(incident.x, incident.y)?.building?.category || 'residential',
        waitSeconds: 0,
        isBraking: false,
        isJammed: false,
        hornFlash: 0,
        sirenPhase: 0,
        targetRobberyId: incident.id,
      };

      station.activeTripsOut += 1;
      this.cars.push(cruiser);
      incident.policeDispatched = true;
      incident.escapeLimitSeconds = Math.max(incident.escapeLimitSeconds, 110);
      return true;
    }

    // No road near Police Station — dispatch fast foot officer directly
    const footPath = this.findPoliceFootPath(
      { x: station.x, y: station.y },
      { x: incident.x, y: incident.y }
    );
    if (!footPath) return false;
    this.people.push({
      id: `ppl_${this.personIdCounter++}`,
      role: 'police',
      wx: (station.x + 0.5) * TILE_SIZE,
      wy: (station.y + 0.8) * TILE_SIZE,
      targetWx: (incident.x + 0.5) * TILE_SIZE,
      targetWy: (incident.y + 0.5) * TILE_SIZE,
      targetTileX: incident.x,
      targetTileY: incident.y,
      pedestrianPath: footPath,
      pedestrianPathIndex: footPath.length > 1 ? 1 : 0,
      speed: 58,
      shirtColor: '#1D4ED8',
      hatColor: '#1E3A8A',
      animPhase: 0,
      state: 'chasing',
      homeBuildingId: station.id,
      targetRobberyId: incident.id,
      holdTimer: 0,
    });
    incident.policeDispatched = true;
    incident.escapeLimitSeconds = Math.max(incident.escapeLimitSeconds, 130);
    return true;
  }

  private pickOriginAndDest(): { origin: PlacedBuilding; dest: PlacedBuilding; vehicleType: VehicleType } | null {
    const connected = this.buildingsList.filter(
      (b) =>
        b.category !== 'road_path' &&
        b.category !== 'landmark' &&
        this.getRoadNeighbors(this.tiles, b.x, b.y).length > 0
    );
    if (connected.length < 2) return null;

    const h = this.minutesOfDay / 60;
    const byCat = (cat: BuildingCategory) => connected.filter((b) => b.category === cat);

    const homes = byCat('residential');
    const schools = byCat('school');
    const hospitals = byCat('hospital');
    const crops = byCat('crops');
    const offices = [...byCat('workplace'), ...byCat('factory'), ...byCat('city_hall'), ...crops];
    const storesOpen = this.isStoreOpen();
    const visitSpots = [
      ...byCat('visit_spot'),
      ...(storesOpen ? byCat('commercial') : []),
    ];
    const parks = byCat('park');

    let originPool: PlacedBuilding[] = connected;
    let destPool: PlacedBuilding[] = connected;
    let vehicleType: VehicleType = Math.random() < 0.55 ? 'sedan' : 'hatchback';

    const r = Math.random();

    // Boost trips toward active celebrations, campaigns & community events
    const connectedEvents = this.cityEvents
      .map((ev) => connected.find((b) => b.id === ev.buildingId))
      .filter((b): b is PlacedBuilding => Boolean(b));
    if (connectedEvents.length > 0 && r < 0.28) {
      destPool = connectedEvents;
    }

    const isSchoolDay = !this.isWeekend();

    // Ambulances occasionally originate from a Hospital station (and drive back to hospital)
    if (hospitals.length > 0 && r < 0.05) {
      vehicleType = 'ambulance';
      originPool = hospitals;
      destPool = homes.length ? homes : connected;
    } else if (crops.length > 0 && visitSpots.length > 0 && r >= 0.05 && r < 0.12) {
      vehicleType = 'van';
      originPool = crops;
      destPool = visitSpots;
    } else if (h >= 7.25 && h < 10.0) {
      // Morning commute: Homes -> Schools (Mon-Fri 8am bell), Offices & Shops
      originPool = homes.length ? homes : connected;
      if (isSchoolDay && schools.length && r < 0.34) {
        destPool = schools;
        if (Math.random() < 0.55) vehicleType = 'bus';
      } else if (offices.length && r < 0.72) {
        destPool = offices;
      } else if (visitSpots.length) {
        destPool = visitSpots;
        if (Math.random() < 0.2) vehicleType = 'van';
      }
    } else if (h >= 10.0 && h < 16.0) {
      // School hours (8am-4pm) & daytime errands / deliveries / parks
      const daytimeSpots = [...visitSpots, ...parks, ...offices];
      if (isSchoolDay && schools.length && homes.length && h >= 15.25 && r < 0.34) {
        // Pre-4pm school dismissal pickups
        originPool = schools;
        destPool = homes;
        if (Math.random() < 0.55) vehicleType = 'bus';
      } else if (homes.length && daytimeSpots.length && r < 0.65) {
        originPool = homes;
        destPool = daytimeSpots;
      } else if (daytimeSpots.length && homes.length) {
        originPool = daytimeSpots;
        destPool = homes;
      }
    } else if (isSchoolDay && h >= 16.0 && h < 17.0 && schools.length && homes.length && r < 0.36) {
      // 4:00 PM final school dismissal heading straight home
      originPool = schools;
      destPool = homes;
      vehicleType = Math.random() < 0.65 ? 'bus' : 'sedan';
    } else {
      // After 4pm, evenings & weekends (no school runs)
      const outSpots = [...offices, ...visitSpots, ...parks];
      if (outSpots.length && homes.length && r < 0.76) {
        originPool = outSpots;
        destPool = homes;
      } else if (homes.length && visitSpots.length) {
        originPool = homes;
        destPool = visitSpots;
      }
    }

    const origin = originPool[Math.floor(Math.random() * originPool.length)];
    const availableDestPool = destPool.filter(
      (b) => b.id !== origin.id && (b.capacity <= 0 || b.totalVisits < b.capacity)
    );
    const effectiveDestPool =
      availableDestPool.length > 0 ? availableDestPool : destPool.filter((b) => b.id !== origin.id);
    let dest =
      effectiveDestPool.length > 0
        ? effectiveDestPool[Math.floor(Math.random() * effectiveDestPool.length)]
        : destPool[Math.floor(Math.random() * destPool.length)];
    if (dest.id === origin.id) {
      const others = connected.filter((b) => b.id !== origin.id);
      if (others.length === 0) return null;
      dest = others[Math.floor(Math.random() * others.length)];
    }

    if (
      (origin.category === 'factory' || dest.category === 'factory' || origin.category === 'crops' || dest.category === 'crops') &&
      vehicleType !== 'ambulance' &&
      Math.random() < 0.42
    ) {
      vehicleType = 'van';
    }

    return { origin, dest, vehicleType };
  }

  private trySpawnCar(): boolean {
    if (this.cars.length >= MAX_CARS) return false;
    const pair = this.pickOriginAndDest();
    if (!pair) return false;

    const { origin, dest, vehicleType } = pair;
    return this.spawnCarBetweenBuildings(origin, dest, vehicleType);
  }

  private spawnCarBetweenBuildings(
    origin: PlacedBuilding,
    dest: PlacedBuilding,
    vehicleType: VehicleType
  ): boolean {
    if (this.cars.length >= MAX_CARS) return false;
    const startRoad = this.findAdjacentRoadTile(this.tiles, origin.x, origin.y);
    const endRoad = this.findAdjacentRoadTile(this.tiles, dest.x, dest.y);
    if (!startRoad || !endRoad) return false;

    const roadPath = this.findRoadPath(this.tiles, startRoad, endRoad);
    if (!roadPath || roadPath.length < 2) return false;

    const isEmergency = vehicleType === 'ambulance' || vehicleType === 'police' || vehicleType === 'firetruck';
    // Every car visibly exits origin plot onto the road and pulls right into destination plot!
    const path: GridPoint[] = [{ x: origin.x, y: origin.y }, ...roadPath, { x: dest.x, y: dest.y }];

    const p0 = path[0];
    const p1 = path[1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const angle = Math.atan2(dy, dx);
    // p0 is off-road plot tile so center spawn at tile middle
    const spawnWx = (p0.x + 0.5) * TILE_SIZE;
    const spawnWy = (p0.y + 0.5) * TILE_SIZE;

    // Prevent spawning directly on top of another car
    for (const other of this.cars) {
      const distSq = (other.wx - spawnWx) ** 2 + (other.wy - spawnWy) ** 2;
      if (distSq < 26 * 26) return false;
    }

    let maxSpeed = 66 + Math.random() * 14;
    let color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
    if (vehicleType === 'bus') {
      color = '#F59E0B';
      maxSpeed = 54;
    } else if (vehicleType === 'van') {
      color = '#F8FAFC';
      maxSpeed = 60;
    } else if (vehicleType === 'ambulance') {
      color = '#FFFFFF';
      maxSpeed = 92;
    }

    const car: Car = {
      id: `car_${this.carIdCounter++}`,
      type: vehicleType,
      color,
      wx: spawnWx,
      wy: spawnWy,
      angle,
      speed: maxSpeed * 0.45,
      maxSpeed,
      path,
      pathIndex: 1,
      originBuildingId: origin.id,
      destBuildingId: dest.id,
      destLabel: dest.name,
      returnStationId: isEmergency ? origin.id : undefined,
      originCategory: origin.category,
      destCategory: dest.category,
      waitSeconds: 0,
      isBraking: false,
      isJammed: false,
      hornFlash: 0,
      sirenPhase: Math.random() * Math.PI * 2,
    };

    origin.activeTripsOut += 1;
    if (!isEmergency) {
      origin.totalVisits = Math.max(0, origin.totalVisits - 1);
    }
    dest.activeTripsIn += 1;
    this.cars.push(car);
    return true;
  }

  private getTargetWorldPos(car: Car, index: number): { tx: number; ty: number; angle: number } {
    const pt = car.path[index];
    const prev = car.path[Math.max(0, index - 1)];
    const next = car.path[Math.min(car.path.length - 1, index + 1)];

    let dx = pt.x - prev.x;
    let dy = pt.y - prev.y;
    if (dx === 0 && dy === 0) {
      dx = next.x - pt.x;
      dy = next.y - pt.y;
    }
    const angle = Math.atan2(dy, dx);
    const onRoad = Boolean(this.getTile(pt.x, pt.y)?.hasRoad);
    const rightX = onRoad ? -Math.sin(angle) * LANE_OFFSET : 0;
    const rightY = onRoad ? Math.cos(angle) * LANE_OFFSET : 0;

    return {
      tx: (pt.x + 0.5) * TILE_SIZE + rightX,
      ty: (pt.y + 0.5) * TILE_SIZE + rightY,
      angle,
    };
  }

  private updateCars(dt: number, realDt: number, playAudio: boolean) {
    if (dt <= 0) return;

    // Micro-step kinematics when timeScale is fast (3x/8x) so cars never overshoot turns/waypoints or freeze
    const subSteps = Math.max(1, Math.min(4, Math.ceil(dt / 0.038)));
    const stepDt = dt / subSteps;

    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];
      if (car.hornFlash > 0) car.hornFlash = Math.max(0, car.hornFlash - dt);
      if (car.type === 'ambulance' || car.type === 'police' || car.type === 'firetruck') {
        car.sirenPhase += dt * 11;
      }

      if (car.parkedAtProtest || car.parkedAtFire || car.parkedAtCrash || car.parkedAtRaid) {
        car.speed = 0;
        car.isBraking = false;
        car.isJammed = false;
        car.waitSeconds = 0;
        continue;
      }

      let removedCar = false;
      for (let sub = 0; sub < subSteps; sub++) {
        if (car.pathIndex >= car.path.length) {
          if (!this.handleEmergencyArrival(car)) {
            this.finishTrip(car);
            this.cars.splice(i, 1);
          }
          removedCar = true;
          break;
        }

        // Advance past any reached or overshot waypoints BEFORE computing steering & target
        let targetInfo = this.getTargetWorldPos(car, car.pathIndex);
        let toX = targetInfo.tx - car.wx;
        let toY = targetInfo.ty - car.wy;
        let distToTarget = Math.hypot(toX, toY);
        let advanceGuard = 0;
        while (car.pathIndex < car.path.length && advanceGuard < 3) {
          const reachRadius = Math.max(11, car.speed * stepDt + 5);
          const alongSeg =
            toX * Math.cos(targetInfo.angle) + toY * Math.sin(targetInfo.angle);
          const passedWaypoint = alongSeg <= 2 && distToTarget < TILE_SIZE * 1.15;
          if (distToTarget < reachRadius || passedWaypoint) {
            car.pathIndex += 1;
            advanceGuard += 1;
            if (car.pathIndex >= car.path.length) break;
            targetInfo = this.getTargetWorldPos(car, car.pathIndex);
            toX = targetInfo.tx - car.wx;
            toY = targetInfo.ty - car.wy;
            distToTarget = Math.hypot(toX, toY);
          } else {
            break;
          }
        }

        if (car.pathIndex >= car.path.length) {
          if (!this.handleEmergencyArrival(car)) {
            this.finishTrip(car);
            this.cars.splice(i, 1);
          }
          removedCar = true;
          break;
        }

        const segmentAngle = targetInfo.angle;
        const desiredAngle = distToTarget > 1 ? Math.atan2(toY, toX) : segmentAngle;
        if (!Number.isFinite(car.angle)) car.angle = desiredAngle;
        const rawDiff = desiredAngle - car.angle;
        const angleDiff = Number.isFinite(rawDiff)
          ? Math.atan2(Math.sin(rawDiff), Math.cos(rawDiff))
          : 0;
        const turnRate = distToTarget < 18 && Math.abs(angleDiff) > 1.0 ? 18 : 13;
        car.angle += angleDiff * Math.min(1, stepDt * turnRate);

        const fwdX = Math.cos(car.angle);
        const fwdY = Math.sin(car.angle);

        // 1. Check car-following distance ahead in same lane & direction
        const isEmergency =
          car.type === 'ambulance' || car.type === 'police' || car.type === 'firetruck';
        const weatherSpeedMult = isEmergency
          ? 1
          : this.weather === 'Storm'
          ? 0.78
          : this.weather === 'Rain' || this.weather === 'Snow' || this.weather === 'Foggy'
          ? 0.88
          : this.weather === 'Windy'
          ? 0.94
          : 1;
        const curCarTile = this.getTile(
          Math.floor(car.wx / TILE_SIZE),
          Math.floor(car.wy / TILE_SIZE)
        );
        const floodMult = curCarTile?.isFlooded ? 0.52 : 1;
        let desiredMaxSpeed = car.maxSpeed * weatherSpeedMult * floodMult;
        let blockedByVehicle = false;
        let blockedByHazard = false;
        const safeGap = car.type === 'bus' ? 28 : 23;
        const lookAhead = 48;

        for (let j = 0; j < this.cars.length; j++) {
          if (i === j) continue;
          const other = this.cars[j];
          const rx = other.wx - car.wx;
          const ry = other.wy - car.wy;
          const projFwd = rx * fwdX + ry * fwdY;
          if (projFwd <= 0 || projFwd > lookAhead) continue;

          const projSide = Math.abs(-rx * fwdY + ry * fwdX);
          if (projSide > 10.5) continue;

          // Only follow vehicles traveling in a compatible forward direction (prevents perpendicular deadlocks)
          const headingDot = Math.cos(other.angle) * fwdX + Math.sin(other.angle) * fwdY;
          if (headingDot < 0.52) continue;

          if (projFwd < safeGap) {
            desiredMaxSpeed = 0;
            blockedByVehicle = true;
            break;
          } else {
            const factor = (projFwd - safeGap) / (lookAhead - safeGap);
            const cap = Math.min(car.maxSpeed, other.speed + factor * car.maxSpeed * 0.75);
            if (cap < desiredMaxSpeed) {
              desiredMaxSpeed = cap;
              if (cap < 18) blockedByVehicle = true;
            }
          }
        }

        // Emergency responders stuck behind slower civilian traffic gently pull around instead of sitting deadlocked
        if (isEmergency && blockedByVehicle && car.waitSeconds > 1.7) {
          desiredMaxSpeed = Math.max(desiredMaxSpeed, 32);
          blockedByVehicle = false;
        }

        // 1.25 Yield or swerve safely around cows, pigs & chickens on roads (never kill animals!)
        let targetSwerve = 0;
        for (const ani of this.animals) {
          if (ani.kind === 'bird') continue;
          const arx = ani.wx - car.wx;
          const ary = ani.wy - car.wy;
          const aprojFwd = arx * fwdX + ary * fwdY;
          if (aprojFwd < -4 || aprojFwd > 48) continue;
          const aprojSide = -arx * fwdY + ary * fwdX; // +right, -left
          if (Math.abs(aprojSide) > 13.5) continue;

          const aniTile = this.getTile(
            Math.floor(ani.wx / TILE_SIZE),
            Math.floor(ani.wy / TILE_SIZE)
          );
          if (!aniTile?.hasRoad && Math.abs(aprojSide) > 9) continue;

          // Swerve toward opposite side of the lane if road space allows, otherwise wait for animal to cross
          const swerveDir = aprojSide >= 0 ? -7.5 : 7.5;
          const swerveCheckX = car.wx + (-fwdY * swerveDir);
          const swerveCheckY = car.wy + (fwdX * swerveDir);
          const swerveTile = this.getTile(
            Math.floor(swerveCheckX / TILE_SIZE),
            Math.floor(swerveCheckY / TILE_SIZE)
          );
          const canSwerveSafely =
            Boolean(swerveTile?.hasRoad) &&
            Math.abs(aprojSide - swerveDir) >= 7.2 &&
            Math.abs(aprojSide) >= 2.2;

          if (aprojFwd < 18 && (!canSwerveSafely || Math.abs(aprojSide) < 4.8)) {
            desiredMaxSpeed = 0;
            blockedByVehicle = true;
            blockedByHazard = true;
            break;
          } else if (canSwerveSafely) {
            targetSwerve = swerveDir;
            desiredMaxSpeed = Math.min(desiredMaxSpeed, car.maxSpeed * 0.62);
          } else {
            desiredMaxSpeed = Math.min(desiredMaxSpeed, aprojFwd < 26 ? 10 : car.maxSpeed * 0.4);
          }
        }
        const prevSwerve = car.swerveOffset ?? 0;
        car.swerveOffset = prevSwerve + (targetSwerve - prevSwerve) * Math.min(1, stepDt * 8.5);

        // 1.5 Check active Car Crash obstruction ahead on the road
        if (
          !car.targetCrashId &&
          car.type !== 'ambulance' &&
          car.type !== 'police' &&
          car.type !== 'firetruck'
        ) {
          for (const crash of this.crashes) {
            if (crash.status !== 'active') continue;
            const rx = crash.wx - car.wx;
            const ry = crash.wy - car.wy;
            const projFwd = rx * fwdX + ry * fwdY;
            if (projFwd <= 0 || projFwd > 42) continue;
            const projSide = Math.abs(-rx * fwdY + ry * fwdX);
            if (projSide > 16) continue;
            if (projFwd < 25) {
              desiredMaxSpeed = 0;
              blockedByVehicle = true;
              blockedByHazard = true;
            } else {
              desiredMaxSpeed = Math.min(
                desiredMaxSpeed,
                ((projFwd - 25) / 17) * car.maxSpeed * 0.45
              );
            }
          }

          // 1.6 Check Nuke Blast Craters blocking the road ahead (causes real traffic jams)
          for (const crater of this.blastCraters) {
            const rx = crater.wx - car.wx;
            const ry = crater.wy - car.wy;
            const projFwd = rx * fwdX + ry * fwdY;
            if (projFwd <= 0 || projFwd > 44) continue;
            const projSide = Math.abs(-rx * fwdY + ry * fwdX);
            if (projSide > 17) continue;
            if (projFwd < 26) {
              desiredMaxSpeed = 0;
              blockedByVehicle = true;
              blockedByHazard = true;
              break;
            } else {
              desiredMaxSpeed = Math.min(
                desiredMaxSpeed,
                ((projFwd - 26) / 18) * car.maxSpeed * 0.4
              );
            }
          }
        }

        // 2. Check upcoming intersection traffic signal & highway speed / broken bridges
        const currTileX = Math.floor(car.wx / TILE_SIZE);
        const currTileY = Math.floor(car.wy / TILE_SIZE);
        if (isHighwayTile(this.tiles, currTileX, currTileY)) {
          desiredMaxSpeed *= 1.32;
        }
        const inIntersectionNow = this.isIntersectionTile(this.tiles, currTileX, currTileY);
        const nextPt = car.path[car.pathIndex];
        const nextTile = this.getTile(nextPt.x, nextPt.y);

        // If a road tile along the middle of the path was bulldozed, abort trip cleanly instead of stalling forever
        if (car.pathIndex < car.path.length - 1 && (!nextTile || !nextTile.hasRoad)) {
          if (!this.handleEmergencyArrival(car)) {
            this.finishTrip(car);
            this.cars.splice(i, 1);
          }
          removedCar = true;
          break;
        }

        if (
          nextTile &&
          nextTile.isBridgeBroken &&
          (currTileX !== nextPt.x || currTileY !== nextPt.y)
        ) {
          desiredMaxSpeed = 0;
          blockedByVehicle = true;
          blockedByHazard = true;
        }

        if (
          !inIntersectionNow &&
          nextTile &&
          nextTile.hasRoad &&
          (currTileX !== nextPt.x || currTileY !== nextPt.y) &&
          this.isIntersectionTile(this.tiles, nextPt.x, nextPt.y)
        ) {
          const prevPt = car.path[Math.max(0, car.pathIndex - 1)];
          const adx = Math.sign(nextPt.x - prevPt.x);
          const ady = Math.sign(nextPt.y - prevPt.y);

          if (adx !== 0 || ady !== 0) {
            // Signed longitudinal distance to the stop line (8px outside the intersection tile)
            const stopLineDist =
              ((nextPt.x + 0.5) * TILE_SIZE - car.wx) * adx +
              ((nextPt.y + 0.5) * TILE_SIZE - car.wy) * ady -
              (TILE_SIZE * 0.5 + 8);

            // Only apply signal/box checks while car is still BEFORE the stop line
            if (stopLineDist > 0 && stopLineDist < 36) {
              let shouldHoldAtStopLine = false;

              if (
                nextTile.intersection.controlType === 'signal' &&
                car.type !== 'ambulance' &&
                car.type !== 'police' &&
                car.type !== 'firetruck' &&
                car.waitSeconds < 5.0
              ) {
                const movingVertical = Math.abs(ady) > Math.abs(adx);
                const aspect = this.getSignalAspect(nextTile, movingVertical ? 'NS' : 'EW');
                if (aspect === 'red' || (aspect === 'amber' && stopLineDist > 8)) {
                  shouldHoldAtStopLine = true;
                }
              }

              // Don't Block the Box: if exit lane beyond intersection is jammed, wait before stop line
              if (
                !shouldHoldAtStopLine &&
                stopLineDist < 16 &&
                car.waitSeconds < 5.5 &&
                car.pathIndex + 1 < car.path.length
              ) {
                const exitPt = car.path[car.pathIndex + 1];
                const edx = Math.sign(exitPt.x - nextPt.x);
                const edy = Math.sign(exitPt.y - nextPt.y);
                const exitAngle = Math.atan2(edy, edx);
                const exitRightX = -Math.sin(exitAngle) * LANE_OFFSET;
                const exitRightY = Math.cos(exitAngle) * LANE_OFFSET;
                const exitEntryX = (exitPt.x + 0.5) * TILE_SIZE + exitRightX;
                const exitEntryY = (exitPt.y + 0.5) * TILE_SIZE + exitRightY;

                for (let j = 0; j < this.cars.length; j++) {
                  if (i === j) continue;
                  const other = this.cars[j];
                  const sameExitDir =
                    Math.cos(other.angle) * edx + Math.sin(other.angle) * edy > 0.5;
                  if (
                    sameExitDir &&
                    other.speed < 10 &&
                    Math.hypot(other.wx - exitEntryX, other.wy - exitEntryY) < 22
                  ) {
                    shouldHoldAtStopLine = true;
                    break;
                  }
                }
              }

              if (shouldHoldAtStopLine) {
                if (stopLineDist < 7) {
                  desiredMaxSpeed = 0;
                } else {
                  desiredMaxSpeed = Math.min(
                    desiredMaxSpeed,
                    (stopLineDist / 36) * car.maxSpeed * 0.55
                  );
                }
              }
            }
          }
        }

        // 2.5 Yield to anyone crossing on upcoming Zebra Crossing (skip after 4s wait to avoid stalemate)
        if (
          nextTile &&
          nextTile.hasRoad &&
          nextTile.hasZebraCrossing &&
          car.waitSeconds < 4.0 &&
          (currTileX !== nextPt.x || currTileY !== nextPt.y) &&
          car.type !== 'ambulance' &&
          car.type !== 'police' &&
          car.type !== 'firetruck'
        ) {
          const hasPedestrianOnCrossing = this.people.some((p) => {
            const ptx = Math.floor(p.wx / TILE_SIZE);
            const pty = Math.floor(p.wy / TILE_SIZE);
            if (ptx === nextPt.x && pty === nextPt.y) return true;
            if (
              p.role === 'pedestrian' &&
              p.targetTileX === nextPt.x &&
              p.targetTileY === nextPt.y
            ) {
              return true;
            }
            if (p.pedestrianPath && p.pedestrianPathIndex !== undefined) {
              const nextWp = p.pedestrianPath[p.pedestrianPathIndex];
              if (
                nextWp &&
                nextWp.x === nextPt.x &&
                nextWp.y === nextPt.y &&
                Math.hypot(
                  (nextPt.x + 0.5) * TILE_SIZE - p.wx,
                  (nextPt.y + 0.5) * TILE_SIZE - p.wy
                ) <
                  TILE_SIZE * 0.72
              ) {
                return true;
              }
            }
            return false;
          });
          if (hasPedestrianOnCrossing) {
            const prevPt = car.path[Math.max(0, car.pathIndex - 1)];
            const adx = Math.sign(nextPt.x - prevPt.x);
            const ady = Math.sign(nextPt.y - prevPt.y);
            if (adx !== 0 || ady !== 0) {
              const zebraDist =
                ((nextPt.x + 0.5) * TILE_SIZE - car.wx) * adx +
                ((nextPt.y + 0.5) * TILE_SIZE - car.wy) * ady -
                (TILE_SIZE * 0.5 + 6);
              if (zebraDist > 0 && zebraDist < 30) {
                if (zebraDist < 7) {
                  desiredMaxSpeed = 0;
                } else {
                  desiredMaxSpeed = Math.min(
                    desiredMaxSpeed,
                    (zebraDist / 30) * car.maxSpeed * 0.5
                  );
                }
              }
            }
          }
        }

        // Anti-stall guarantee: clear intersections & resolve non-hazard traffic deadlocks at high speed
        if (inIntersectionNow && car.waitSeconds > 1.2) {
          desiredMaxSpeed = Math.max(desiredMaxSpeed, 30);
        }
        if (!blockedByHazard && car.waitSeconds > 7.5) {
          desiredMaxSpeed = Math.max(desiredMaxSpeed, 26);
        }

        // Accelerate or brake smoothly
        if (car.speed < desiredMaxSpeed) {
          car.speed = Math.min(desiredMaxSpeed, car.speed + 58 * stepDt);
          car.isBraking = false;
        } else if (car.speed > desiredMaxSpeed) {
          car.speed = Math.max(desiredMaxSpeed, car.speed - 130 * stepDt);
          car.isBraking = true;
        } else {
          car.isBraking = desiredMaxSpeed < 5;
        }

        if (car.speed < 4) {
          car.waitSeconds += stepDt;
          if (car.waitSeconds > 4.0 && blockedByVehicle) {
            if (!car.isJammed) {
              car.isJammed = true;
              if (Math.random() < 0.25) {
                car.hornFlash = 0.6;
                this.honkRipples.push({ wx: car.wx, wy: car.wy, age: 0, maxAge: 0.75 });
                if (playAudio) soundEngine.playSoftHorn();
              }
            }
          }
          // Hard deadlock recovery if a car remains frozen for >14s (unless waiting behind an active hazard)
          if (!blockedByHazard && car.waitSeconds > 14.0) {
            if (!this.handleEmergencyArrival(car)) {
              this.finishTrip(car);
              this.cars.splice(i, 1);
            }
            removedCar = true;
            break;
          }
        } else {
          car.waitSeconds = Math.max(0, car.waitSeconds - stepDt * 1.8);
          if (car.waitSeconds < 1.2) car.isJammed = false;
        }

        // Advance position (clamp final-waypoint step so cars never overshoot destination)
        const moveStep =
          car.pathIndex === car.path.length - 1
            ? Math.min(car.speed * stepDt, distToTarget + 4)
            : car.speed * stepDt;
        car.wx += Math.cos(car.angle) * moveStep;
        car.wy += Math.sin(car.angle) * moveStep;
      }

      if (removedCar) continue;

      // Occasional car-vs-pedestrian collision when a fast car fails to stop on a non-crossing road
      const fwdX = Math.cos(car.angle);
      const fwdY = Math.sin(car.angle);
      if (
        !car.targetCrashId &&
        car.type !== 'ambulance' &&
        car.type !== 'police' &&
        car.type !== 'firetruck' &&
        car.type !== 'hearse' &&
        car.speed > 38 &&
        this.carPedHitCooldown <= 0
      ) {
        const cTileX = Math.floor(car.wx / TILE_SIZE);
        const cTileY = Math.floor(car.wy / TILE_SIZE);
        const cTile = this.getTile(cTileX, cTileY);
        if (cTile && cTile.hasRoad && !cTile.hasZebraCrossing) {
          for (let pIdx = this.people.length - 1; pIdx >= 0; pIdx--) {
            const ped = this.people[pIdx];
            if (
              ped.role === 'mayor' ||
              ped.role === 'invader' ||
              ped.state === 'captured' ||
              ped.escortOfficerId
            ) {
              continue;
            }
            const prx = ped.wx - car.wx;
            const pry = ped.wy - car.wy;
            const pfwd = prx * fwdX + pry * fwdY;
            const pside = Math.abs(-prx * fwdY + pry * fwdX);
            if (pfwd > 2 && pfwd < 10 && pside < 6.5) {
              const pedTile = this.getTile(
                Math.floor(ped.wx / TILE_SIZE),
                Math.floor(ped.wy / TILE_SIZE)
              );
              if (pedTile && pedTile.hasRoad && !pedTile.hasZebraCrossing) {
                this.carPedHitCooldown = 90;
                if (Math.random() < 0.08) {
                  car.speed = 0;
                  car.isBraking = true;
                  car.waitSeconds = 3.2;
                  car.hornFlash = 0.9;
                  this.honkRipples.push({ wx: car.wx, wy: car.wy, age: 0, maxAge: 0.85 });
                  for (let s = 0; s < 6; s++) {
                    const ang = (s / 6) * Math.PI * 2;
                    this.woodChips.push({
                      wx: ped.wx,
                      wy: ped.wy,
                      vx: Math.cos(ang) * 24,
                      vy: Math.sin(ang) * 24 - 6,
                      age: 0,
                      maxAge: 0.45,
                      color: s % 2 === 0 ? '#FACC15' : '#EF4444',
                    });
                  }
                  this.floatingLabels.push({
                    wx: ped.wx,
                    wy: ped.wy - 10,
                    text: 'Car Hit Citizen!',
                    color: '#FEF2F2',
                    bgColor: '#DC2626',
                    age: 0,
                    maxAge: 1.9,
                  });
                  const originBld = this.buildingsList.find(
                    (b) => b.id === ped.homeBuildingId && b.category !== 'city_hall'
                  );
                  if (originBld) {
                    const hearseDispatched = this.dispatchHearseToCemetery(originBld);
                    this.deathEvents.push({
                      id: `death_${this.deathIdCounter++}`,
                      x: cTileX,
                      y: cTileY,
                      wx: ped.wx,
                      wy: ped.wy,
                      buildingName: this.describeArea(cTileX, cTileY),
                      age: 0,
                      maxAge: 8.5,
                      hearseDispatched,
                    });
                    this.totalDeaths += 1;
                  } else {
                    this.recordCoordinateDeath(
                      cTileX,
                      cTileY,
                      ped.wx,
                      ped.wy,
                      this.describeArea(cTileX, cTileY),
                      false
                    );
                  }
                  this.citizenHappiness = Math.max(5, this.citizenHappiness - 2.5);
                  this.people.splice(pIdx, 1);
                  if (playAudio) soundEngine.playCarCrash();
                }
                break;
              }
            }
          }
        }
      }

      // Update tile congestion heatmap
      const tile = this.getTile(Math.floor(car.wx / TILE_SIZE), Math.floor(car.wy / TILE_SIZE));
      if (tile && tile.hasRoad) {
        if (car.speed < 14) {
          tile.congestionScore = Math.min(1, tile.congestionScore + dt * (car.isJammed ? 0.55 : 0.22));
        }
        if (car.isJammed) {
          tile.jammedCarsCount += 1;
        }
      }
      void realDt;
    }
  }

  private handleEmergencyArrival(car: Car): boolean {
    if (car.isReturningToStation) {
      // If police just dropped prisoners at Jail and still need to drive back to Police Station, route leg 2!
      if (
        car.returnJailId &&
        car.destBuildingId === car.returnJailId &&
        car.returnStationId &&
        car.returnStationId !== car.returnJailId
      ) {
        const station = this.buildingsList.find((b) => b.id === car.returnStationId);
        if (station) {
          const currTileX = Math.max(0, Math.min(this.gridCols - 1, Math.floor(car.wx / TILE_SIZE)));
          const currTileY = Math.max(0, Math.min(this.gridRows - 1, Math.floor(car.wy / TILE_SIZE)));
          const startRoad =
            this.findAdjacentRoadTile(this.tiles, currTileX, currTileY) ||
            (this.getTile(currTileX, currTileY)?.hasRoad ? { x: currTileX, y: currTileY } : null);
          const stationRoad = this.findAdjacentRoadTile(this.tiles, station.x, station.y);
          if (startRoad && stationRoad) {
            const roadPath = this.findRoadPath(this.tiles, startRoad, stationRoad, 0.8);
            if (roadPath && roadPath.length >= 1) {
              car.path = [...roadPath, { x: station.x, y: station.y }];
              car.pathIndex = 0;
              car.destBuildingId = station.id;
              car.destLabel = station.name;
              car.destCategory = station.category;
              car.returnJailId = undefined;
              return true;
            }
          }
        }
      }
      return false;
    }

    if (
      this.handleProtestCarArrival(car) ||
      this.handleFireCarArrival(car) ||
      this.handleCrashCarArrival(car) ||
      this.handleRaidCarArrival(car)
    ) {
      return true;
    }

    // Police finishing robbery or escapee capture -> drive to Jail / Police Station (or deploy officer on foot if remote)
    if (
      car.type === 'police' &&
      (car.targetRobberyId || car.targetEscapeeId)
    ) {
      if (car.targetRobberyId) {
        const rob = this.robberies.find((r) => r.id === car.targetRobberyId);
        if (rob && rob.status === 'active') {
          const distToRob = Math.hypot(
            car.wx - (rob.x + 0.5) * TILE_SIZE,
            car.wy - (rob.y + 0.5) * TILE_SIZE
          );
          if (distToRob <= TILE_SIZE * 3.4) {
            rob.status = 'caught';
            rob.statusTimer = 4.0;
            this.stoppedRobberies += 1;
            this.sendToJail(1);
            this.logDailyNews(`HOT TAKE: That burglar in ${rob.neighbourhoodName} really thought nobody would spot a bright getaway sprint—Police bagged 'em in seconds!`);
            soundEngine.playPoliceResolved();
          } else {
            // Cruiser reached closest road across a river/gap — deploy officer on foot to finish the arrest!
            car.parkedAtRaid = true;
            car.speed = 0;
            car.isBraking = false;
            car.isJammed = false;
            car.waitSeconds = 0;
            const hasFoot = this.people.some(
              (p) => p.role === 'police' && p.targetRobberyId === rob.id
            );
            if (!hasFoot) {
              const cx = Math.max(0, Math.min(this.gridCols - 1, Math.floor(car.wx / TILE_SIZE)));
              const cy = Math.max(0, Math.min(this.gridRows - 1, Math.floor(car.wy / TILE_SIZE)));
              const path = this.findPoliceFootPath({ x: cx, y: cy }, { x: rob.x, y: rob.y });
              this.people.push({
                id: `ppl_${this.personIdCounter++}`,
                role: 'police',
                wx: car.wx,
                wy: car.wy,
                targetWx: (rob.x + 0.5) * TILE_SIZE,
                targetWy: (rob.y + 0.5) * TILE_SIZE,
                targetTileX: rob.x,
                targetTileY: rob.y,
                pedestrianPath: path ? [...path] : undefined,
                pedestrianPathIndex: path && path.length > 1 ? 1 : 0,
                speed: 58,
                shirtColor: '#1D4ED8',
                hatColor: '#1E3A8A',
                animPhase: 0,
                state: 'chasing',
                targetRobberyId: rob.id,
                holdTimer: 0,
              });
            }
            return true;
          }
        }
      }
      if (car.targetEscapeeId) {
        const escIdx = this.people.findIndex((p) => p.id === car.targetEscapeeId);
        if (escIdx !== -1) {
          const esc = this.people[escIdx];
          const distToEsc = Math.hypot(car.wx - esc.wx, car.wy - esc.wy);
          if (distToEsc <= TILE_SIZE * 4.5) {
            this.people.splice(escIdx, 1);
            this.sendToJail(1);
            this.floatingLabels.push({
              wx: esc.wx,
              wy: esc.wy - 10,
              text: 'Recaptured!',
              color: '#F8FAFC',
              bgColor: '#1D4ED8',
              age: 0,
              maxAge: 1.5,
            });
            soundEngine.playPoliceCapture();
          } else {
            // Escapee ran further away/off-road while cruiser drove in — deploy chasing officer on foot!
            const cx = Math.max(0, Math.min(this.gridCols - 1, Math.floor(car.wx / TILE_SIZE)));
            const cy = Math.max(0, Math.min(this.gridRows - 1, Math.floor(car.wy / TILE_SIZE)));
            const ex = Math.max(0, Math.min(this.gridCols - 1, Math.floor(esc.wx / TILE_SIZE)));
            const ey = Math.max(0, Math.min(this.gridRows - 1, Math.floor(esc.wy / TILE_SIZE)));
            const path = this.findPoliceFootPath({ x: cx, y: cy }, { x: ex, y: ey });
            this.people.push({
              id: `ppl_${this.personIdCounter++}`,
              role: 'police',
              wx: car.wx,
              wy: car.wy,
              targetWx: esc.wx,
              targetWy: esc.wy,
              targetTileX: ex,
              targetTileY: ey,
              pedestrianPath: path ? [...path] : undefined,
              pedestrianPathIndex: path && path.length > 1 ? 1 : 0,
              speed: 62,
              shirtColor: '#1D4ED8',
              hatColor: '#1E3A8A',
              animPhase: 0,
              state: 'chasing',
              homeBuildingId: car.returnStationId || car.originBuildingId,
              targetPersonId: esc.id,
              holdTimer: 0,
            });
            return this.sendVehicleBackToStation(car, undefined, false);
          }
        }
      }
      return this.sendVehicleBackToStation(car, undefined, true);
    }

    // Ambulances on patient pickup -> drive back to hospital instead of disappearing at house!
    if (car.type === 'ambulance' && car.returnStationId) {
      return this.sendVehicleBackToStation(car, car.returnStationId, false);
    }

    return false;
  }

  private sendVehicleBackToStation(
    car: Car,
    overrideStationId?: string,
    stopAtJailFirst = false
  ): boolean {
    car.parkedAtProtest = false;
    car.parkedAtFire = false;
    car.parkedAtCrash = false;
    car.parkedAtRaid = false;
    car.targetProtestId = undefined;
    car.targetFireId = undefined;
    car.targetCrashId = undefined;
    car.targetRaidStallId = undefined;
    car.targetRobberyId = undefined;
    car.targetEscapeeId = undefined;
    car.waitSeconds = 0;
    car.isJammed = false;

    const homeStationId = overrideStationId || car.returnStationId || car.originBuildingId;
    const station = this.buildingsList.find((b) => b.id === homeStationId);
    const jail = stopAtJailFirst
      ? this.buildingsList.find((b) => b.category === 'jail')
      : undefined;

    const firstTarget = jail || station;
    if (!firstTarget) return false;

    const currTileX = Math.max(0, Math.min(this.gridCols - 1, Math.floor(car.wx / TILE_SIZE)));
    const currTileY = Math.max(0, Math.min(this.gridRows - 1, Math.floor(car.wy / TILE_SIZE)));
    const currTile = this.getTile(currTileX, currTileY);
    const startRoad =
      currTile && currTile.hasRoad
        ? { x: currTileX, y: currTileY }
        : this.findNearestRoadTile(this.tiles, currTileX, currTileY, 4);
    const destRoad = this.findNearestRoadTile(this.tiles, firstTarget.x, firstTarget.y, 4);
    if (!startRoad || !destRoad) return false;

    const roadPath = this.findRoadPath(this.tiles, startRoad, destRoad, 0.9);
    if (!roadPath || roadPath.length === 0) return false;

    car.isReturningToStation = true;
    car.returnStationId = station?.id || homeStationId;
    car.returnJailId = jail?.id;
    car.destBuildingId = firstTarget.id;
    car.destLabel = firstTarget.name;
    car.destCategory = firstTarget.category;
    car.path = [...roadPath, { x: firstTarget.x, y: firstTarget.y }];
    car.pathIndex = 0;
    car.speed = Math.max(24, car.speed);
    return true;
  }

  private updatePeopleAndChop(simDt: number, realDt: number, playAudio: boolean) {
    // Decay wood chips, felled tree stumps, and capture popups
    for (let i = this.woodChips.length - 1; i >= 0; i--) {
      const chip = this.woodChips[i];
      chip.age += realDt;
      chip.wx += chip.vx * realDt;
      chip.wy += chip.vy * realDt;
      chip.vy += 45 * realDt;
      if (chip.age >= chip.maxAge) this.woodChips.splice(i, 1);
    }

    for (let i = this.choppedTreeEvents.length - 1; i >= 0; i--) {
      this.choppedTreeEvents[i].age += realDt;
      if (this.choppedTreeEvents[i].age >= this.choppedTreeEvents[i].maxAge) {
        this.choppedTreeEvents.splice(i, 1);
      }
    }

    for (let i = this.capturePopups.length - 1; i >= 0; i--) {
      this.capturePopups[i].age += realDt;
      if (this.capturePopups[i].age >= this.capturePopups[i].maxAge) {
        this.capturePopups.splice(i, 1);
      }
    }

    // 1. Ensure each City Hall has a Mayor & every Police / Fire / Hospital station has at least 2 stationed people
    const cityHalls = this.buildingsList.filter((b) => b.category === 'city_hall');
    const policeStations = this.buildingsList.filter((b) => b.category === 'police');
    const fireStations = this.buildingsList.filter((b) => b.category === 'fire_station');
    const hospitalStations = this.buildingsList.filter((b) => b.category === 'hospital');

    const hallIds = new Set(cityHalls.map((h) => h.id));
    const policeIds = new Set(policeStations.map((s) => s.id));
    const fireStationIds = new Set(fireStations.map((s) => s.id));
    const hospitalIds = new Set(hospitalStations.map((s) => s.id));

    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];
      if (p.role === 'mayor' && (!p.homeBuildingId || !hallIds.has(p.homeBuildingId))) {
        this.people.splice(i, 1);
      } else if (p.role === 'police' && p.homeBuildingId && !policeIds.has(p.homeBuildingId)) {
        this.people.splice(i, 1);
      } else if (p.role === 'firefighter' && p.homeBuildingId && !fireStationIds.has(p.homeBuildingId)) {
        this.people.splice(i, 1);
      } else if (p.role === 'medic' && p.homeBuildingId && !hospitalIds.has(p.homeBuildingId)) {
        this.people.splice(i, 1);
      }
    }

    if (!this.mayorAlive) {
      for (let i = this.people.length - 1; i >= 0; i--) {
        if (this.people[i].role === 'mayor') this.people.splice(i, 1);
      }
    } else {
      for (const hall of cityHalls) {
        const hasMayor = this.people.some((p) => p.role === 'mayor' && p.homeBuildingId === hall.id);
        if (!hasMayor) {
          const mx = (hall.x + 0.5) * TILE_SIZE;
          const my = (hall.y + 0.86) * TILE_SIZE;
          this.people.push({
            id: `ppl_${this.personIdCounter++}`,
            role: 'mayor',
            wx: mx,
            wy: my,
            targetWx: mx + 8,
            targetWy: my,
            speed: 14,
            shirtColor: '#312E81',
            hatColor: '#FACC15',
            animPhase: Math.random() * Math.PI * 2,
            state: 'idling',
            homeBuildingId: hall.id,
            holdTimer: 1.5,
          });
        }
      }
    }

    for (const st of policeStations) {
      const stationed = this.people.filter((p) => p.role === 'police' && p.homeBuildingId === st.id);
      for (let slot = stationed.length; slot < 2; slot++) {
        const px = (st.x + (slot === 0 ? 0.34 : 0.66)) * TILE_SIZE;
        const py = (st.y + 0.86) * TILE_SIZE;
        this.people.push({
          id: `ppl_${this.personIdCounter++}`,
          role: 'police',
          wx: px,
          wy: py,
          targetWx: px + (slot === 0 ? 4 : -4),
          targetWy: py,
          speed: 18,
          shirtColor: '#1D4ED8',
          hatColor: '#1E3A8A',
          animPhase: slot * Math.PI,
          state: 'idling',
          homeBuildingId: st.id,
          holdTimer: 1 + slot * 1.1,
        });
      }
    }

    for (const st of fireStations) {
      const stationed = this.people.filter((p) => p.role === 'firefighter' && p.homeBuildingId === st.id);
      for (let slot = stationed.length; slot < 2; slot++) {
        const fx = (st.x + (slot === 0 ? 0.34 : 0.66)) * TILE_SIZE;
        const fy = (st.y + 0.86) * TILE_SIZE;
        this.people.push({
          id: `ppl_${this.personIdCounter++}`,
          role: 'firefighter',
          wx: fx,
          wy: fy,
          targetWx: fx + (slot === 0 ? 4 : -4),
          targetWy: fy,
          speed: 98,
          shirtColor: '#DC2626',
          hatColor: '#FACC15',
          animPhase: slot * Math.PI,
          state: 'idling',
          homeBuildingId: st.id,
          holdTimer: 1 + slot * 1.1,
        });
      }
    }

    for (const st of hospitalStations) {
      const stationed = this.people.filter((p) => p.role === 'medic' && p.homeBuildingId === st.id);
      for (let slot = stationed.length; slot < 2; slot++) {
        const hx = (st.x + (slot === 0 ? 0.34 : 0.66)) * TILE_SIZE;
        const hy = (st.y + 0.86) * TILE_SIZE;
        this.people.push({
          id: `ppl_${this.personIdCounter++}`,
          role: 'medic',
          wx: hx,
          wy: hy,
          targetWx: hx + (slot === 0 ? 4 : -4),
          targetWy: hy,
          speed: 16,
          shirtColor: '#F8FAFC',
          hatColor: '#DC2626',
          animPhase: slot * Math.PI,
          state: 'idling',
          homeBuildingId: st.id,
          holdTimer: 1 + slot * 1.2,
        });
      }
    }

    const curfew = this.isOutdoorCurfew();
    const isWarPanic =
      this.crises.warActive || this.people.some((p) => p.role === 'invader');

    // 2. Spawn woodcutters if forest tiles & connected buildings exist (never spawn in middle of nowhere or during curfew/war)
    const forestTiles = this.tiles.filter((t) => t.terrain === 'forest');
    const activeWoodcutters = this.people.filter((p) => p.role === 'woodcutter');
    const desiredWoodcutters =
      !curfew && !isWarPanic && forestTiles.length > 0 && this.buildingsList.length > 0
        ? Math.min(3, Math.max(1, Math.ceil(forestTiles.length / 7)))
        : 0;

    if (activeWoodcutters.length < desiredWoodcutters) {
      this.woodcutterSpawnAccumulator += simDt;
      if (this.woodcutterSpawnAccumulator >= 3.5) {
        this.woodcutterSpawnAccumulator = 0;
        this.spawnWoodcutter(forestTiles);
      }
    }

    // 2.5 Spawn logical building-to-building walkers who naturally cross Zebra Crossings & Footbridges
    const activePeds = this.people.filter((p) => p.role === 'pedestrian');
    const walkerOrigins = this.buildingsList.filter((b) => b.category !== 'road_path');
    const desiredPeds =
      !curfew && !isWarPanic && walkerOrigins.length >= 2
        ? Math.min(8, Math.max(2, Math.floor(walkerOrigins.length / 3)))
        : 0;
    if (activePeds.length < desiredPeds) {
      this.pedestrianSpawnAccumulator += simDt;
      if (this.pedestrianSpawnAccumulator >= 2.8) {
        this.pedestrianSpawnAccumulator = 0;
        this.spawnBuildingPedestrian();
      }
    }

    // 3. Step Mayors, Woodcutters, and Building Pedestrians
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];

      if (p.role === 'pedestrian') {
        if (p.floodSheltering) {
          p.speed = Math.max(p.speed, 46);
          const res = this.stepPersonAlongPath(p, realDt, 11);
          if (res === 'arrived') {
            if (p.destBuildingId) {
              const shelter = this.buildingsList.find((b) => b.id === p.destBuildingId);
              if (shelter) {
                this.incrementBuildingOccupancy(shelter, 1);
                if (Math.random() < 0.45) {
                  this.floatingLabels.push({
                    wx: (shelter.x + 0.5) * TILE_SIZE,
                    wy: (shelter.y + 0.3) * TILE_SIZE,
                    text: 'Sheltered Up High!',
                    color: '#E0F2FE',
                    bgColor: '#0284C7',
                    age: 0,
                    maxAge: 1.7,
                  });
                }
              }
            }
            this.people.splice(i, 1);
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
          continue;
        }
        if ((curfew || isWarPanic) && p.state !== 'returning') {
          p.isPanicking = isWarPanic;
          p.speed = isWarPanic ? 48 : Math.max(p.speed, 38);
          if (!this.assignReturnRoute(p)) {
            this.people.splice(i, 1);
          }
          continue;
        }
        if (p.state === 'walking') {
          const res = this.stepPersonAlongPath(p, realDt, 7.6);
          if (res === 'arrived') {
            if (p.destBuildingId) {
              const dest = this.buildingsList.find((b) => b.id === p.destBuildingId);
              if (dest && dest.category !== 'cemetery') this.incrementBuildingOccupancy(dest, 1);
            }
            p.state = 'idling';
            p.holdTimer = 1.6 + Math.random() * 1.4;
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'idling') {
          p.holdTimer -= realDt;
          if (p.holdTimer <= 0) {
            if (p.destBuildingId) {
              const dest = this.buildingsList.find((b) => b.id === p.destBuildingId);
              if (dest && dest.category !== 'cemetery') {
                dest.totalVisits = Math.max(0, dest.totalVisits - 1);
              }
            }
            if (!this.assignReturnRoute(p)) {
              this.people.splice(i, 1);
            }
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 7.6);
          if (res === 'arrived') {
            if (p.homeBuildingId) {
              const home = this.buildingsList.find((b) => b.id === p.homeBuildingId);
              if (home && home.category !== 'cemetery') this.incrementBuildingOccupancy(home, 1);
            }
            this.people.splice(i, 1);
          } else if (res === 'blocked' || p.holdTimer <= 0) {
            this.people.splice(i, 1);
          }
        }
        continue;
      }

      if (p.role === 'mayor') {
        const hall = cityHalls.find((h) => h.id === p.homeBuildingId);
        if (!hall) {
          this.people.splice(i, 1);
          continue;
        }
        const activeProtest = this.protests.find(
          (pr) => pr.cityHallId === hall.id && pr.status === 'active'
        );
        const activeSpeech = this.mayorSpeeches.find((s) => s.cityHallId === hall.id);
        const homeCx = (hall.x + 0.5) * TILE_SIZE;
        const stepY = (hall.y + 0.84) * TILE_SIZE;

        if (activeProtest) {
          p.state = 'idling';
          p.speechTopic = undefined;
          p.targetWx = homeCx;
          p.targetWy = (hall.y + 0.72) * TILE_SIZE;
          p.animPhase += realDt * 6;
        } else if (activeSpeech) {
          p.state = 'speaking';
          p.speechTopic = activeSpeech.topic;
          p.targetWx = homeCx;
          p.targetWy = (hall.y + 0.86) * TILE_SIZE;
          p.animPhase += realDt * 7.5;
        } else {
          p.state = 'idling';
          p.speechTopic = undefined;
          p.holdTimer -= simDt;
          if (p.holdTimer <= 0) {
            p.holdTimer = 2 + Math.random() * 2.5;
            p.targetWx = homeCx + (Math.random() - 0.5) * 16;
            p.targetWy = stepY + (Math.random() - 0.5) * 4;
          }
        }
        const dx = p.targetWx - p.wx;
        const dy = p.targetWy - p.wy;
        const dist = Math.hypot(dx, dy);
        if (dist > 1.2) {
          const step = Math.min(dist, p.speed * realDt);
          p.wx += (dx / dist) * step;
          p.wy += (dy / dist) * step;
          p.animPhase += realDt * 6;
        }
        continue;
      }

      // Stationed personnel idling/patrolling at Police Stations, Firehouses, and Hospitals
      if (
        (p.role === 'police' &&
          p.homeBuildingId &&
          !p.protestId &&
          !p.raidStallId &&
          !p.targetRobberyId &&
          !p.targetPersonId &&
          !p.targetCrashId) ||
        (p.role === 'firefighter' && p.homeBuildingId && !p.fireId) ||
        (p.role === 'medic' && p.homeBuildingId)
      ) {
        const st = this.buildingsList.find((b) => b.id === p.homeBuildingId);
        if (!st) {
          this.people.splice(i, 1);
          continue;
        }
        if (p.state === 'returning') {
          const res = this.stepPersonAlongPath(p, realDt, 9);
          if (res === 'arrived') {
            p.state = 'idling';
            p.pedestrianPath = undefined;
            p.holdTimer = 1.5;
            p.speed = p.role === 'firefighter' ? 60 : 18;
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
          continue;
        }
        const homeCx = (st.x + 0.5) * TILE_SIZE;
        const homeCy = (st.y + 0.85) * TILE_SIZE;
        if (Math.hypot(p.wx - homeCx, p.wy - homeCy) > 30) {
          p.speed = 38;
          if (!this.assignReturnRoute(p)) {
            this.people.splice(i, 1);
          }
          continue;
        }
        p.state = 'idling';
        p.holdTimer -= simDt;
        if (p.holdTimer <= 0) {
          p.holdTimer = 2 + Math.random() * 2.5;
          p.targetWx = homeCx + (Math.random() - 0.5) * 18;
          p.targetWy = homeCy + (Math.random() - 0.5) * 4;
        }
        const dx = p.targetWx - p.wx;
        const dy = p.targetWy - p.wy;
        const dist = Math.hypot(dx, dy);
        if (dist > 1.2) {
          const walkSpeed = Math.min(24, p.speed);
          const step = Math.min(dist, walkSpeed * realDt);
          p.wx += (dx / dist) * step;
          p.wy += (dy / dist) * step;
          p.animPhase += realDt * 6;
        }
        continue;
      }

      if (p.role === 'planter') {
        if (p.state === 'walking') {
          const moveRes = this.stepPersonAlongPath(p, realDt, 8);
          if (moveRes === 'arrived') {
            const targetTile =
              p.targetTileX !== undefined && p.targetTileY !== undefined
                ? this.getTile(p.targetTileX, p.targetTileY)
                : null;
            if (targetTile && targetTile.terrain === 'grass' && !targetTile.hasRoad && !targetTile.building) {
              p.state = 'planting';
              p.holdTimer = 1.3;
            } else if (!this.assignPlanterTarget(p)) {
              this.people.splice(i, 1);
            }
          } else if (moveRes === 'blocked') {
            if (!this.assignPlanterTarget(p)) {
              this.people.splice(i, 1);
            }
          }
        } else if (p.state === 'planting') {
          p.animPhase += realDt * 8;
          p.holdTimer -= realDt;
          if (p.holdTimer <= 0) {
            const targetTile =
              p.targetTileX !== undefined && p.targetTileY !== undefined
                ? this.getTile(p.targetTileX, p.targetTileY)
                : null;
            if (targetTile && targetTile.terrain === 'grass' && !targetTile.hasRoad && !targetTile.building) {
              targetTile.terrain = 'forest';
              this.plantedTrees += 1;
              this.deforestationPressure = Math.max(0, this.deforestationPressure - 1);
              const sproutPalette = ['#22C55E', '#4ADE80', '#86EFAC', '#FACC15'];
              for (let c = 0; c < 8; c++) {
                this.confetti.push({
                  wx: (targetTile.x + 0.5) * TILE_SIZE + (Math.random() - 0.5) * 10,
                  wy: (targetTile.y + 0.5) * TILE_SIZE,
                  vx: (Math.random() - 0.5) * 32,
                  vy: -18 - Math.random() * 22,
                  age: 0,
                  maxAge: 0.75 + Math.random() * 0.4,
                  color: sproutPalette[c % sproutPalette.length],
                  size: 2.2,
                });
              }
              if (playAudio) soundEngine.playPlantTree();
            }
            if (!this.assignReturnRoute(p)) {
              this.people.splice(i, 1);
            }
          }
        } else {
          p.holdTimer -= realDt;
          const moveRes = this.stepPersonAlongPath(p, realDt, 8);
          if (moveRes !== 'moving' || p.holdTimer <= 0) {
            this.people.splice(i, 1);
          }
        }
        continue;
      }

      if (p.role === 'arsonist') {
        if (p.state === 'walking') {
          const moveRes = this.stepPersonAlongPath(p, realDt, 9);
          if (moveRes === 'arrived') {
            p.state = 'burning';
            p.holdTimer = 1.1;
          } else if (moveRes === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'burning') {
          p.animPhase += realDt * 12;
          p.holdTimer -= realDt;
          if (p.holdTimer <= 0) {
            if (p.targetTileX !== undefined && p.targetTileY !== undefined) {
              this.startFireAt(p.targetTileX, p.targetTileY, true, playAudio);
            }
            p.speed = 48;
            if (!this.assignReturnRoute(p)) {
              this.people.splice(i, 1);
            }
          }
        } else {
          p.holdTimer -= realDt;
          const moveRes = this.stepPersonAlongPath(p, realDt, 11);
          if (moveRes !== 'moving' || p.holdTimer <= 0) {
            this.people.splice(i, 1);
          }
        }
        continue;
      }

      if (p.role === 'woodcutter') {
        if ((curfew || isWarPanic) && p.state !== 'returning') {
          p.isPanicking = isWarPanic;
          p.speed = isWarPanic ? 48 : Math.max(p.speed, 38);
          if (!this.assignReturnRoute(p)) {
            this.people.splice(i, 1);
          }
          continue;
        }
        if (p.state === 'walking') {
          const moveRes = this.stepPersonAlongPath(p, realDt, 8);
          if (moveRes === 'arrived') {
            const targetTile =
              p.targetTileX !== undefined && p.targetTileY !== undefined
                ? this.getTile(p.targetTileX, p.targetTileY)
                : null;
            if (targetTile && targetTile.terrain === 'forest') {
              p.state = 'chopping';
            } else if (!this.assignWoodcutterTarget(p)) {
              this.people.splice(i, 1);
            }
          } else if (moveRes === 'blocked') {
            if (!this.assignWoodcutterTarget(p)) {
              this.people.splice(i, 1);
            }
          }
        } else if (p.state === 'chopping') {
          const targetTile =
            p.targetTileX !== undefined && p.targetTileY !== undefined
              ? this.getTile(p.targetTileX, p.targetTileY)
              : null;
          if (!targetTile || targetTile.terrain !== 'forest') {
            if (!this.assignWoodcutterTarget(p)) {
              this.people.splice(i, 1);
            }
            continue;
          }

          const prevSin = Math.sin(p.animPhase);
          p.animPhase += realDt * 9.5;
          const nextSin = Math.sin(p.animPhase);
          if (prevSin >= 0 && nextSin < 0) {
            // Axe strike! Emit wood chips
            const chipColors = ['#FDE68A', '#D97706', '#92400E'];
            for (let c = 0; c < 3; c++) {
              this.woodChips.push({
                wx: p.wx + 5,
                wy: p.wy - 4,
                vx: (Math.random() - 0.35) * 38,
                vy: -18 - Math.random() * 24,
                age: 0,
                maxAge: 0.45 + Math.random() * 0.25,
                color: chipColors[c % chipColors.length],
              });
            }
            if (playAudio) soundEngine.playChopWood();
          }

          const key = `${targetTile.x},${targetTile.y}`;
          const nextProg = (this.tileChopProgress.get(key) || 0) + simDt * 0.14;
          if (nextProg >= 1) {
            targetTile.terrain = 'grass';
            this.tileChopProgress.delete(key);
            this.choppedTrees += 1;
            this.deforestationPressure += 1;
            this.choppedTreeEvents.push({
              id: `chop_${this.chopIdCounter++}`,
              x: targetTile.x,
              y: targetTile.y,
              wx: (targetTile.x + 0.5) * TILE_SIZE,
              wy: (targetTile.y + 0.5) * TILE_SIZE,
              age: 0,
              maxAge: 6.5,
            });
            p.state = 'idling';
            p.holdTimer = 1.4;
          } else {
            this.tileChopProgress.set(key, nextProg);
          }
        } else if (p.state === 'idling') {
          p.holdTimer -= simDt;
          if (p.holdTimer <= 0) {
            if (!this.assignWoodcutterTarget(p)) {
              this.people.splice(i, 1);
            }
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 8);
          if (res !== 'moving' || p.holdTimer <= 0) {
            this.people.splice(i, 1);
          }
        }
      }
    }
  }

  private canPersonSkateOnFrozenWater(p?: Person): boolean {
    return Boolean(
      p &&
        p.role === 'hobbyist' &&
        p.hobbyKind === 'ice_skating' &&
        this.season === 'Winter'
    );
  }

  private getCurrentWalkableStart(
    wx: number,
    wy: number,
    allowFrozenWater = false,
    allowAllTerrain = false
  ): GridPoint | null {
    const tx = Math.max(0, Math.min(this.gridCols - 1, Math.floor(wx / TILE_SIZE)));
    const ty = Math.max(0, Math.min(this.gridRows - 1, Math.floor(wy / TILE_SIZE)));
    if (allowAllTerrain) return { x: tx, y: ty };
    const tile = this.getTile(tx, ty);
    if (tile && isPedestrianTileWalkable(tile, allowFrozenWater, allowAllTerrain)) {
      return { x: tx, y: ty };
    }
    return this.findNearestWalkableTile(this.tiles, tx, ty, 3, allowFrozenWater);
  }

  private assignPedestrianRoute(
    p: Person,
    destTileX: number,
    destTileY: number,
    finalWx?: number,
    finalWy?: number
  ): boolean {
    const allowFrozen = this.canPersonSkateOnFrozenWater(p);
    const allowAll =
      p.role === 'invader' ||
      (p.role === 'soldier' && this.crises.warActive) ||
      Boolean(p.floodSheltering);
    const startPt = this.getCurrentWalkableStart(p.wx, p.wy, allowFrozen, allowAll);
    if (!startPt) return false;
    const path = this.findPedestrianPath(
      this.tiles,
      startPt,
      { x: destTileX, y: destTileY },
      allowFrozen,
      allowAll
    );
    if (!path || path.length === 0) return false;

    p.targetTileX = destTileX;
    p.targetTileY = destTileY;
    p.targetWx = finalWx ?? (destTileX + 0.5) * TILE_SIZE;
    p.targetWy = finalWy ?? (destTileY + 0.5) * TILE_SIZE;
    p.pedestrianPath = path;
    p.pedestrianPathIndex = path.length > 1 ? 1 : 0;
    return true;
  }

  private canPersonStepOntoTile(
    tile: MapTile | null,
    targetTileX?: number,
    targetTileY?: number,
    allowFrozenWater = false,
    allowAllTerrain = false
  ): boolean {
    if (!tile || !isPedestrianTileWalkable(tile, allowFrozenWater, allowAllTerrain)) return false;
    if (allowAllTerrain) return true;
    if (
      tile.building &&
      tile.building.category !== 'park' &&
      tile.building.category !== 'road_path' &&
      !(tile.x === targetTileX && tile.y === targetTileY)
    ) {
      return false;
    }
    return true;
  }

  private stepPersonAlongPath(
    p: Person,
    realDt: number,
    animRate = 8
  ): 'moving' | 'arrived' | 'blocked' {
    if (p.rerouteCooldown && p.rerouteCooldown > 0) {
      p.rerouteCooldown = Math.max(0, p.rerouteCooldown - realDt);
    }
    const allowFrozen = this.canPersonSkateOnFrozenWater(p);
    const allowAll =
      p.role === 'invader' ||
      (p.role === 'soldier' && this.crises.warActive) ||
      Boolean(p.floodSheltering);
    // If person is stranded on a newly paved unmarked road or water tile, step back to adjacent walkable tile
    const curTx = Math.max(0, Math.min(this.gridCols - 1, Math.floor(p.wx / TILE_SIZE)));
    const curTy = Math.max(0, Math.min(this.gridRows - 1, Math.floor(p.wy / TILE_SIZE)));
    const curTile = this.getTile(curTx, curTy);
    if (!allowAll && curTile && !isPedestrianTileWalkable(curTile, allowFrozen)) {
      const prevIdx = Math.max(0, (p.pedestrianPathIndex ?? 1) - 1);
      const prevWp = p.pedestrianPath?.[prevIdx];
      const prevTile = prevWp ? this.getTile(prevWp.x, prevWp.y) : null;
      const safe =
        prevTile && isPedestrianTileWalkable(prevTile, allowFrozen)
          ? prevWp!
          : this.findNearestWalkableTile(this.tiles, curTx, curTy, 1, allowFrozen);
      if (!safe) return 'blocked';
      p.wx = (safe.x + 0.5) * TILE_SIZE;
      p.wy = (safe.y + 0.5) * TILE_SIZE;
      p.pedestrianPath = undefined;
    }

    if (!p.pedestrianPath || p.pedestrianPath.length === 0) {
      if (p.targetTileX === undefined || p.targetTileY === undefined) return 'blocked';
      if ((p.rerouteCooldown || 0) > 0) return 'moving';
      p.rerouteCooldown = 0.65;
      if (!this.assignPedestrianRoute(p, p.targetTileX, p.targetTileY, p.targetWx, p.targetWy)) {
        return 'blocked';
      }
    }

    const path = p.pedestrianPath!;
    const idx = p.pedestrianPathIndex ?? 0;

    if (idx < path.length) {
      const wp = path[idx];
      const wpTile = this.getTile(wp.x, wp.y);
      if (!this.canPersonStepOntoTile(wpTile, p.targetTileX, p.targetTileY, allowFrozen, allowAll)) {
        // Road, water, broken bridge, or building was placed ahead! Re-route around it via gaps/crossings/footbridges
        if (p.targetTileX === undefined || p.targetTileY === undefined) return 'blocked';
        if ((p.rerouteCooldown || 0) > 0) return 'blocked';
        p.rerouteCooldown = 0.65;
        if (!this.assignPedestrianRoute(p, p.targetTileX, p.targetTileY, p.targetWx, p.targetWy)) {
          return 'blocked';
        }
        return 'moving';
      }

      const isFinalWp = idx === path.length - 1;
      const goalX = isFinalWp ? p.targetWx : (wp.x + 0.5) * TILE_SIZE;
      const goalY = isFinalWp ? p.targetWy : (wp.y + 0.5) * TILE_SIZE;

      const dx = goalX - p.wx;
      const dy = goalY - p.wy;
      const dist = Math.hypot(dx, dy);

      if (dist <= 3.0) {
        p.pedestrianPathIndex = idx + 1;
        if (p.pedestrianPathIndex >= path.length) {
          return 'arrived';
        }
      } else {
        const effectiveSpeed = p.isInfected ? p.speed * 0.72 : p.speed;
        const step = Math.min(dist, effectiveSpeed * realDt);
        const nextWx = p.wx + (dx / dist) * step;
        const nextWy = p.wy + (dy / dist) * step;
        const nextTx = Math.max(0, Math.min(this.gridCols - 1, Math.floor(nextWx / TILE_SIZE)));
        const nextTy = Math.max(0, Math.min(this.gridRows - 1, Math.floor(nextWy / TILE_SIZE)));
        if (!allowAll && (nextTx !== curTx || nextTy !== curTy)) {
          const nextTile = this.getTile(nextTx, nextTy);
          if (!this.canPersonStepOntoTile(nextTile, p.targetTileX, p.targetTileY, allowFrozen)) {
            // Try sliding cleanly along X or Y inside walkable tiles before paying for an A* reroute
            const slideXTile = this.getTile(nextTx, curTy);
            const slideYTile = this.getTile(curTx, nextTy);
            if (nextTx !== curTx && this.canPersonStepOntoTile(slideXTile, p.targetTileX, p.targetTileY, allowFrozen)) {
              p.wx = nextWx;
              p.animPhase += realDt * animRate;
              return 'moving';
            }
            if (nextTy !== curTy && this.canPersonStepOntoTile(slideYTile, p.targetTileX, p.targetTileY, allowFrozen)) {
              p.wy = nextWy;
              p.animPhase += realDt * animRate;
              return 'moving';
            }
            // Pull gently toward current tile center so next frame never loops on diagonal corner clipping
            const centerX = (curTx + 0.5) * TILE_SIZE;
            const centerY = (curTy + 0.5) * TILE_SIZE;
            p.wx += (centerX - p.wx) * 0.45;
            p.wy += (centerY - p.wy) * 0.45;
            if ((p.rerouteCooldown || 0) <= 0) {
              p.rerouteCooldown = 0.75;
              if (
                p.targetTileX === undefined ||
                p.targetTileY === undefined ||
                !this.assignPedestrianRoute(p, p.targetTileX, p.targetTileY, p.targetWx, p.targetWy)
              ) {
                return 'blocked';
              }
            }
            return 'moving';
          }
        }
        p.wx = nextWx;
        p.wy = nextWy;
        p.animPhase += realDt * animRate;
      }
      return 'moving';
    }

    return 'arrived';
  }

  private assignReturnRoute(p: Person): boolean {
    const allowFrozen = this.canPersonSkateOnFrozenWater(p);
    const allowAll = p.role === 'invader' || (p.role === 'soldier' && this.crises.warActive);
    const startPt = this.getCurrentWalkableStart(p.wx, p.wy, allowFrozen, allowAll);
    if (!startPt) return false;

    if (p.homeBuildingId) {
      const home = this.buildingsList.find((b) => b.id === p.homeBuildingId);
      if (home) {
        const path = this.findPedestrianPath(this.tiles, startPt, { x: home.x, y: home.y }, allowFrozen, allowAll);
        if (path) {
          p.state = 'returning';
          p.holdTimer = 18;
          p.targetTileX = home.x;
          p.targetTileY = home.y;
          p.targetWx = (home.x + 0.5) * TILE_SIZE;
          p.targetWy = (home.y + 0.78) * TILE_SIZE;
          p.pedestrianPath = path;
          p.pedestrianPathIndex = path.length > 1 ? 1 : 0;
          return true;
        }
      }
    }

    // Fallback: walk to a nearby reachable walkable tile
    const candidates: MapTile[] = [];
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (Math.abs(dx) + Math.abs(dy) < 2) continue;
        const nt = this.getTile(startPt.x + dx, startPt.y + dy);
        if (nt && isPedestrianTileWalkable(nt, allowFrozen) && !nt.hasRoad) {
          candidates.push(nt);
        }
      }
    }
    candidates.sort(() => Math.random() - 0.5);
    for (const c of candidates.slice(0, 8)) {
      const path = this.findPedestrianPath(this.tiles, startPt, { x: c.x, y: c.y }, allowFrozen);
      if (path) {
        p.state = 'returning';
        p.holdTimer = 4.5;
        p.targetTileX = c.x;
        p.targetTileY = c.y;
        p.targetWx = (c.x + 0.5) * TILE_SIZE;
        p.targetWy = (c.y + 0.5) * TILE_SIZE;
        p.pedestrianPath = path;
        p.pedestrianPathIndex = path.length > 1 ? 1 : 0;
        return true;
      }
    }
    return false;
  }

  private spawnWoodcutter(forestTiles: MapTile[]) {
    const busyKeys = new Set(
      this.people
        .filter((p) => p.role === 'woodcutter' && p.targetTileX !== undefined && p.targetTileY !== undefined)
        .map((p) => `${p.targetTileX},${p.targetTileY}`)
    );
    const available = forestTiles.filter((t) => !busyKeys.has(`${t.x},${t.y}`));
    const pool = available.length > 0 ? available : forestTiles;
    if (pool.length === 0) return;

    const target = pool[Math.floor(Math.random() * pool.length)];

    // Spawn strictly from a real building connected via sidewalks/crosswalks/footbridges (never out of nowhere)
    let spawnBuilding: PlacedBuilding | null = null;
    let path: GridPoint[] | null = null;
    const homeCandidates = this.buildingsList
      .filter(
        (b) =>
          b.category === 'residential' ||
          b.category === 'workplace' ||
          b.category === 'park' ||
          b.category === 'city_hall'
      )
      .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y));

    for (const h of homeCandidates.slice(0, 8)) {
      const candidatePath = this.findPedestrianPath(this.tiles, { x: h.x, y: h.y }, { x: target.x, y: target.y });
      if (candidatePath) {
        spawnBuilding = h;
        path = candidatePath;
        break;
      }
    }

    if (!spawnBuilding || !path) return;

    const shirts = ['#DC2626', '#D97706', '#2563EB'];
    this.people.push({
      id: `ppl_${this.personIdCounter++}`,
      role: 'woodcutter',
      wx: (spawnBuilding.x + 0.5) * TILE_SIZE,
      wy: (spawnBuilding.y + 0.78) * TILE_SIZE,
      targetWx: target.x * TILE_SIZE + 17,
      targetWy: target.y * TILE_SIZE + 31,
      speed: 28,
      shirtColor: shirts[Math.floor(Math.random() * shirts.length)],
      hatColor: '#FDE68A',
      animPhase: Math.random() * Math.PI * 2,
      state: 'walking',
      homeBuildingId: spawnBuilding.id,
      targetTileX: target.x,
      targetTileY: target.y,
      pedestrianPath: path,
      pedestrianPathIndex: path.length > 1 ? 1 : 0,
      holdTimer: 0,
    });
  }

  private assignWoodcutterTarget(woodcutter: Person): boolean {
    const forestTiles = this.tiles.filter((t) => t.terrain === 'forest');
    if (forestTiles.length === 0) return false;
    const startPt = this.getCurrentWalkableStart(woodcutter.wx, woodcutter.wy);
    if (!startPt) return false;

    forestTiles.sort(
      (a, b) =>
        Math.hypot((a.x + 0.5) * TILE_SIZE - woodcutter.wx, (a.y + 0.5) * TILE_SIZE - woodcutter.wy) -
        Math.hypot((b.x + 0.5) * TILE_SIZE - woodcutter.wx, (b.y + 0.5) * TILE_SIZE - woodcutter.wy)
    );

    for (const candidate of forestTiles.slice(0, 12)) {
      const path = this.findPedestrianPath(this.tiles, startPt, { x: candidate.x, y: candidate.y });
      if (path) {
        woodcutter.targetTileX = candidate.x;
        woodcutter.targetTileY = candidate.y;
        woodcutter.targetWx = candidate.x * TILE_SIZE + 17;
        woodcutter.targetWy = candidate.y * TILE_SIZE + 31;
        woodcutter.pedestrianPath = path;
        woodcutter.pedestrianPathIndex = path.length > 1 ? 1 : 0;
        woodcutter.state = 'walking';
        return true;
      }
    }
    return false;
  }

  private updateCitizensAndHobbies(simDt: number, realDt: number, playAudio: boolean) {
    const curfew = this.isOutdoorCurfew();
    const isWarPanic =
      this.crises.warActive || this.people.some((p) => p.role === 'invader');

    // 1. Spawn Fishers along reachable riverbanks / water shorelines (only compute shore scan on timer tick!)
    if (!curfew && !isWarPanic && this.buildingsList.length > 0) {
      const activeFishersCount = this.people.filter((p) => p.role === 'fisher').length;
      const tackleShops = this.buildingsList.filter((b) => b.blueprintId === 'tackle_shop');
      const maxFishers = Math.min(5, Math.max(1, 2 + Math.min(2, tackleShops.length)));
      if (activeFishersCount < maxFishers) {
        this.fisherSpawnAccumulator += simDt;
        if (this.fisherSpawnAccumulator >= 5.5) {
          this.fisherSpawnAccumulator = 0;
          const shoreSpots = this.getWalkableShoreTiles();
          if (shoreSpots.length > 0) {
            this.spawnFisher(shoreSpots, tackleShops);
          }
        }
      }
    }

    // 2. Spawn Seasonal Hobbyists from real buildings (calmer outside school hours after 4pm; disabled at Night/Rain or War)
    const activeHobbyists = this.people.filter((p) => p.role === 'hobbyist');
    const currentHour = this.minutesOfDay / 60;
    const isAfterSchoolHours = currentHour >= 16 || currentHour < 8;
    const maxHobbyists = curfew || isWarPanic ? 0 : isAfterSchoolHours ? 4 : 6;
    if (activeHobbyists.length < maxHobbyists && this.buildingsList.length > 0) {
      this.hobbyistSpawnAccumulator += simDt;
      const hobbyInterval = isAfterSchoolHours ? 7.5 : 5.2;
      if (this.hobbyistSpawnAccumulator >= hobbyInterval) {
        this.hobbyistSpawnAccumulator = 0;
        this.spawnHobbyist();
      }
    }

    // 3. Spawn Small Business & Market Stall Shoppers walking from homes (disabled during curfew or War)
    const houses = this.buildingsList.filter((b) => b.category === 'residential');
    const storesOpen = this.isStoreOpen();
    const shops = this.buildingsList.filter(
      (b) => (storesOpen && b.category === 'commercial') || b.category === 'visit_spot'
    );
    const activeShoppers = this.people.filter((p) => p.role === 'shopper');
    const crowdLimited = this.people.length >= 115;
    const povertyFactor = this.crises.povertyActive ? 0.55 : 1.0;
    const maxShoppers =
      !curfew &&
      !isWarPanic &&
      !crowdLimited &&
      houses.length > 0 &&
      (shops.length > 0 || this.marketStalls.length > 0)
        ? Math.max(
            1,
            Math.round(
              Math.min(7, 3 + Math.floor((shops.length + this.marketStalls.length) / 2)) *
                povertyFactor
            )
          )
        : 0;

    if (activeShoppers.length < maxShoppers) {
      this.shopperSpawnAccumulator += simDt;
      if (this.shopperSpawnAccumulator >= 4.2) {
        this.shopperSpawnAccumulator = 0;
        this.spawnShopper(houses, shops);
      }
    }

    // 4. Step Fishers, Hobbyists, and Shoppers
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];

      if (p.role === 'fisher') {
        if ((curfew || isWarPanic) && p.state !== 'returning') {
          p.isPanicking = isWarPanic;
          p.speed = isWarPanic ? 48 : Math.max(p.speed, 38);
          if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          continue;
        }
        if (p.state === 'walking') {
          const res = this.stepPersonAlongPath(p, realDt, 7.5);
          if (res === 'arrived') {
            const tile =
              p.targetTileX !== undefined && p.targetTileY !== undefined
                ? this.getTile(p.targetTileX, p.targetTileY)
                : null;
            if (!tile || tile.hasRoad || tile.terrain === 'water') {
              this.people.splice(i, 1);
              continue;
            }
            p.state = 'fishing';
            p.holdTimer = 13 + Math.random() * 10;
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'fishing') {
          p.animPhase += realDt * 3.2;
          p.holdTimer -= realDt;

          // Occasional fish catch (drops sharply when water is polluted & creates contaminated fish)
          const produceFactor = Math.max(0.22, 1 - (this.crises.pollutionLevel / 100) * 0.78);
          if (Math.random() < realDt * 0.16 * produceFactor) {
            this.fishCaught += 1;
            p.caughtFishCount = (p.caughtFishCount || 0) + 1;
            const waterPolluted =
              this.crises.pollutionLevel >= 35 || this.crises.pollutionActive;
            const ang = p.facingAngle ?? 0;
            const splashX = p.wx + Math.cos(ang) * 18;
            const splashY = p.wy + Math.sin(ang) * 18;
            for (let k = 0; k < 5; k++) {
              this.woodChips.push({
                wx: splashX,
                wy: splashY,
                vx: (Math.random() - 0.5) * 28,
                vy: -16 - Math.random() * 18,
                age: 0,
                maxAge: 0.45,
                color: waterPolluted
                  ? k % 2 === 0
                    ? '#BEF264'
                    : '#65A30D'
                  : k % 2 === 0
                  ? '#E0F2FE'
                  : '#93C5FD',
              });
            }
            if (waterPolluted) {
              p.isContaminated = true;
              p.isInfected = true;
              p.infectedTimer = 0;
              if (!this.crises.virusActive) {
                this.crises.virusActive = true;
                this.crises.virusRemaining = Math.max(this.crises.virusRemaining, 75);
                if (playAudio) soundEngine.playCrisisAlert();
              } else {
                this.crises.virusRemaining = Math.max(this.crises.virusRemaining, 45);
              }
              // Spread contamination to nearby citizens on the riverbank
              let spread = 0;
              for (const other of this.people) {
                if (
                  other.id !== p.id &&
                  !other.isInfected &&
                  other.role !== 'medic' &&
                  other.role !== 'mayor' &&
                  Math.hypot(other.wx - p.wx, other.wy - p.wy) < 88
                ) {
                  other.isInfected = true;
                  other.infectedTimer = 0;
                  spread++;
                  if (spread >= 2) break;
                }
              }
              this.floatingLabels.push({
                wx: splashX,
                wy: splashY - 6,
                text: 'Toxic Fish! Virus!',
                color: '#ECFCCB',
                bgColor: '#3F6212',
                age: 0,
                maxAge: 1.9,
              });
            } else {
              this.floatingLabels.push({
                wx: splashX,
                wy: splashY - 6,
                text: '+1 Fish!',
                color: '#F8FAFC',
                bgColor: '#0284C7',
                age: 0,
                maxAge: 1.5,
              });
              if (playAudio) soundEngine.playFishCatch();
            }
          }

          if (p.holdTimer <= 0) {
            p.carryingItem = 'fish';
            const maxStalls = this.crises.povertyActive ? 7 : 5;
            if (
              (p.caughtFishCount || 0) > 0 &&
              this.marketStalls.length < maxStalls &&
              Math.random() < 0.65 &&
              this.redirectFisherToSetUpStall(p)
            ) {
              continue;
            }
            if (!this.assignReturnRoute(p)) {
              this.people.splice(i, 1);
            }
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 7.5);
          if (res !== 'moving' || p.holdTimer <= 0) {
            this.people.splice(i, 1);
          }
        }
        continue;
      }

      if (p.role === 'hobbyist') {
        const wrongIceSeason = p.hobbyKind === 'ice_skating' && this.season !== 'Winter';
        if ((curfew || wrongIceSeason || isWarPanic) && p.state !== 'returning') {
          p.isPanicking = isWarPanic;
          p.speed = isWarPanic ? 48 : Math.max(p.speed, 38);
          if (!this.assignReturnRoute(p)) {
            this.people.splice(i, 1);
          }
          continue;
        }
        if (p.state === 'walking') {
          const res = this.stepPersonAlongPath(p, realDt, 7.5);
          if (res === 'arrived') {
            p.state = 'doing_hobby';
            p.holdTimer = 14 + Math.random() * 10;
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'doing_hobby') {
          p.animPhase += realDt * (p.hobbyKind === 'music' ? 7 : p.hobbyKind === 'ice_skating' || p.hobbyKind === 'skateboarding' ? 5.6 : 4.2);
          p.holdTimer -= realDt;

          if (p.hobbyKind === 'music' && Math.random() < realDt * 0.45) {
            const notes = ['♪', '♫', '♩'];
            this.floatingLabels.push({
              wx: p.wx + (Math.random() - 0.5) * 8,
              wy: p.wy - 14,
              text: notes[Math.floor(Math.random() * notes.length)],
              color: '#FEF08A',
              bgColor: 'rgba(15, 23, 42, 0.78)',
              age: 0,
              maxAge: 1.2,
            });
          } else if (p.hobbyKind === 'ice_skating' && p.targetTileX !== undefined && p.targetTileY !== undefined) {
            const cx = (p.targetTileX + 0.5) * TILE_SIZE;
            const cy = (p.targetTileY + 0.5) * TILE_SIZE;
            p.wx = cx + Math.sin(p.animPhase * 0.5) * 11;
            p.wy = cy + Math.sin(p.animPhase) * 6.5;
          } else if (p.hobbyKind === 'skateboarding' && p.targetTileX !== undefined && p.targetTileY !== undefined) {
            const cx = (p.targetTileX + 0.5) * TILE_SIZE;
            const cy = (p.targetTileY + 0.52) * TILE_SIZE;
            p.wx = cx + Math.cos(p.animPhase * 0.6) * 12;
            p.wy = cy + Math.sin(p.animPhase * 1.2) * 5;
          } else if (p.hobbyKind === 'bird_feeding' && Math.random() < realDt * 1.1) {
            this.woodChips.push({
              wx: p.wx + 7 + (Math.random() - 0.5) * 8,
              wy: p.wy + 3,
              vx: (Math.random() - 0.3) * 14,
              vy: -9 - Math.random() * 8,
              age: 0,
              maxAge: 0.4,
              color: '#FDE68A',
            });
          } else if (p.hobbyKind === 'snowball_fight' && Math.random() < realDt * 0.65) {
            const partner = p.targetPersonId
              ? this.people.find((o) => o.id === p.targetPersonId)
              : undefined;
            const tx = partner ? partner.wx + (Math.random() - 0.5) * 6 : p.wx + (Math.random() - 0.5) * 32;
            const ty = partner ? partner.wy + (Math.random() - 0.5) * 4 : p.wy + (Math.random() - 0.5) * 18;
            this.snowballs.push({
              x1: p.wx,
              y1: p.wy - 8,
              x2: tx,
              y2: ty - 6,
              progress: 0,
              duration: 0.45,
            });
          } else if (p.hobbyKind === 'raking_leaves' && Math.random() < realDt * 1.4) {
            this.woodChips.push({
              wx: p.wx + (Math.random() - 0.5) * 10,
              wy: p.wy + 2,
              vx: (Math.random() - 0.5) * 20,
              vy: -12 - Math.random() * 12,
              age: 0,
              maxAge: 0.45,
              color: Math.random() < 0.5 ? '#F97316' : '#EAB308',
            });
          } else if (p.hobbyKind === 'gardening' && Math.random() < realDt * 1.4) {
            this.woodChips.push({
              wx: p.wx + (Math.random() - 0.5) * 8,
              wy: p.wy + 2,
              vx: (Math.random() - 0.5) * 16,
              vy: -10 - Math.random() * 10,
              age: 0,
              maxAge: 0.4,
              color: Math.random() < 0.5 ? '#38BDF8' : '#4ADE80',
            });
          }

          if (p.holdTimer <= 0) {
            if (
              p.hobbyKind === 'snowman' &&
              this.season === 'Winter' &&
              p.targetTileX !== undefined &&
              p.targetTileY !== undefined &&
              this.snowmen.length < 10 &&
              !this.snowmen.some((sm) => sm.x === p.targetTileX && sm.y === p.targetTileY)
            ) {
              this.snowmen.push({
                x: p.targetTileX,
                y: p.targetTileY,
                wx: p.wx + 6,
                wy: p.wy + 1,
                age: 0,
                maxAge: 180,
              });
              this.floatingLabels.push({
                wx: p.wx,
                wy: p.wy - 14,
                text: '+Snowman!',
                color: '#0F172A',
                bgColor: '#E0F2FE',
                age: 0,
                maxAge: 1.5,
              });
            } else if (p.hobbyKind === 'harvesting') {
              p.carryingItem = 'produce';
            }
            if (!this.assignReturnRoute(p)) {
              this.people.splice(i, 1);
            }
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 7.5);
          if (res !== 'moving' || p.holdTimer <= 0) {
            this.people.splice(i, 1);
          }
        }
        continue;
      }

      if (p.role === 'shopper') {
        if ((curfew || isWarPanic) && !p.isShadyBuyer && p.state !== 'returning') {
          p.isPanicking = isWarPanic;
          p.speed = isWarPanic ? 48 : Math.max(p.speed, 38);
          if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          continue;
        }
        if (p.state === 'walking') {
          const res = this.stepPersonAlongPath(p, realDt, 8.2);
          if (res === 'arrived') {
            if (p.destStallId) {
              const stall = this.marketStalls.find((s) => s.id === p.destStallId);
              if (!stall) {
                this.people.splice(i, 1);
                continue;
              }
              stall.salesCount += 1;
              stall.stock = Math.max(0, stall.stock - 1);
              if (stall.goods === 'contraband' || stall.isIllicit) {
                p.isShadyBuyer = true;
                p.carryingItem = 'bag';
                this.floatingLabels.push({
                  wx: stall.wx,
                  wy: stall.wy - 10,
                  text: 'Secret Deal',
                  color: '#E9D5FF',
                  bgColor: '#312E81',
                  age: 0,
                  maxAge: 1.5,
                });
                p.state = 'shopping';
                p.holdTimer = 7.5 + Math.random() * 5;
                continue;
              }
              p.carryingItem =
                stall.goods === 'fish'
                  ? 'fish'
                  : stall.goods === 'clothes'
                  ? 'clothes'
                  : stall.goods === 'produce'
                  ? 'produce'
                  : stall.goods === 'meat'
                  ? 'meat'
                  : 'bag';
              const taintedFish =
                stall.goods === 'fish' &&
                (Boolean(stall.isContaminated) ||
                  this.crises.pollutionLevel >= 35 ||
                  this.crises.pollutionActive);
              if (taintedFish) {
                p.isContaminated = true;
                p.isInfected = true;
                p.infectedTimer = 0;
                if (!this.crises.virusActive) {
                  this.crises.virusActive = true;
                  this.crises.virusRemaining = Math.max(this.crises.virusRemaining, 75);
                } else {
                  this.crises.virusRemaining = Math.max(this.crises.virusRemaining, 50);
                }
                this.totalLawsuits += 1;
                this.lawsuitShock = Math.min(36, this.lawsuitShock + 9);
                stall.stock = Math.max(0, stall.stock - 2);
                this.floatingLabels.push({
                  wx: stall.wx,
                  wy: stall.wy - 12,
                  text: 'SUED! Tainted Fish',
                  color: '#FEF2F2',
                  bgColor: '#B91C1C',
                  age: 0,
                  maxAge: 2.0,
                });
                this.floatingLabels.push({
                  wx: p.wx,
                  wy: p.wy - 22,
                  text: 'Infected!',
                  color: '#ECFCCB',
                  bgColor: '#3F6212',
                  age: 0,
                  maxAge: 1.5,
                });
                if (playAudio) soundEngine.playCrisisAlert();
                if (Math.random() < 0.28) {
                  const hall = this.buildingsList.find((b) => b.category === 'city_hall');
                  if (hall && !this.protests.some((pr) => pr.status === 'active')) {
                    this.triggerProtestAt(hall.x, hall.y, false);
                  }
                }
              } else {
                const saleText =
                  stall.goods === 'fish'
                    ? 'Bought Fish!'
                    : stall.goods === 'clothes'
                    ? 'Bought Clothes!'
                    : stall.goods === 'produce'
                    ? 'Bought Produce!'
                    : stall.goods === 'meat'
                    ? 'Bought Meat!'
                    : stall.goods === 'kayak'
                    ? 'Kayak Pass!'
                    : stall.goods === 'rowboat'
                    ? 'Rowboat Pass!'
                    : stall.goods === 'swim'
                    ? 'Swim Club Pass!'
                    : 'Bought Craft!';
                this.floatingLabels.push({
                  wx: stall.wx,
                  wy: stall.wy - 10,
                  text: saleText,
                  color: '#FEF9C3',
                  bgColor: '#0F766E',
                  age: 0,
                  maxAge: 1.5,
                });
                if (playAudio) soundEngine.playMarketSale();
              }
              p.state = 'shopping';
              p.holdTimer = 1.8 + Math.random() * 1.1;
              continue;
            }
            const shop = this.buildingsList.find((b) => b.id === p.destBuildingId);
            if (!shop) {
              this.people.splice(i, 1);
              continue;
            }
            this.incrementBuildingOccupancy(shop, 1);
            p.carryingItem = this.getItemForShop(shop);
            if (
              shop.blueprintId === 'tackle_shop' &&
              (this.crises.pollutionLevel >= 35 || this.crises.pollutionActive) &&
              Math.random() < 0.55
            ) {
              p.isContaminated = true;
              p.isInfected = true;
              p.infectedTimer = 0;
              if (!this.crises.virusActive) {
                this.crises.virusActive = true;
                this.crises.virusRemaining = Math.max(this.crises.virusRemaining, 70);
              }
              this.totalLawsuits += 1;
              this.lawsuitShock = Math.min(36, this.lawsuitShock + 7);
              this.floatingLabels.push({
                wx: (shop.x + 0.5) * TILE_SIZE,
                wy: (shop.y + 0.25) * TILE_SIZE,
                text: 'SUED! Polluted Fish',
                color: '#FEF2F2',
                bgColor: '#B91C1C',
                age: 0,
                maxAge: 1.9,
              });
              if (playAudio) soundEngine.playCrisisAlert();
            }
            p.state = 'shopping';
            p.holdTimer = 2.0 + Math.random() * 1.4;
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'shopping') {
          p.holdTimer -= realDt;
          if (p.holdTimer <= 0) {
            if (p.destBuildingId) {
              const shop = this.buildingsList.find((b) => b.id === p.destBuildingId);
              if (shop) shop.totalVisits = Math.max(0, shop.totalVisits - 1);
            }
            if (!this.assignReturnRoute(p)) {
              this.people.splice(i, 1);
            }
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 8.2);
          if (res === 'arrived') {
            if (p.homeBuildingId) {
              const home = this.buildingsList.find((b) => b.id === p.homeBuildingId);
              if (home && home.category !== 'cemetery') this.incrementBuildingOccupancy(home, 1);
            }
            this.people.splice(i, 1);
          } else if (res === 'blocked' || p.holdTimer <= 0) {
            this.people.splice(i, 1);
          }
        }
      }
    }
  }

  private getItemForShop(shop: PlacedBuilding): CarryingItem {
    if (shop.blueprintId === 'cafe') return 'coffee';
    if (shop.blueprintId === 'bookshop') return 'books';
    if (shop.blueprintId === 'flower_shop') return 'flowers';
    if (shop.blueprintId === 'tackle_shop') return 'fish';
    if (shop.blueprintId === 'electronics_shop') return 'electronics';
    return 'bag';
  }

  private getWalkableShoreTiles(): { tile: MapTile; waterDx: number; waterDy: number }[] {
    const busy = new Set(
      this.people
        .filter((p) => p.role === 'fisher' && p.targetTileX !== undefined && p.targetTileY !== undefined)
        .map((p) => `${p.targetTileX},${p.targetTileY}`)
    );
    const spots: { tile: MapTile; waterDx: number; waterDy: number }[] = [];
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];
    for (const tile of this.tiles) {
      if (tile.terrain === 'water' || tile.hasRoad) continue;
      if (tile.building && tile.building.category !== 'park') continue;
      if (busy.has(`${tile.x},${tile.y}`)) continue;
      for (const d of dirs) {
        const nt = this.getTile(tile.x + d.dx, tile.y + d.dy);
        if (nt && nt.terrain === 'water' && !nt.hasFootbridge) {
          spots.push({ tile, waterDx: d.dx, waterDy: d.dy });
          break;
        }
      }
    }
    return spots;
  }

  private spawnFisher(
    shoreSpots: { tile: MapTile; waterDx: number; waterDy: number }[],
    tackleShops: PlacedBuilding[]
  ) {
    if (shoreSpots.length === 0) return;
    const pick = shoreSpots[Math.floor(Math.random() * shoreSpots.length)];
    const origins = [
      ...tackleShops,
      ...this.buildingsList.filter(
        (b) => b.category === 'park' || b.category === 'residential' || b.category === 'commercial'
      ),
    ].sort(
      (a, b) =>
        Math.hypot(a.x - pick.tile.x, a.y - pick.tile.y) -
        Math.hypot(b.x - pick.tile.x, b.y - pick.tile.y)
    );

    let originBuilding: PlacedBuilding | null = null;
    let path: GridPoint[] | null = null;

    for (const orig of origins.slice(0, 10)) {
      const candidatePath = this.findPedestrianPath(
        this.tiles,
        { x: orig.x, y: orig.y },
        { x: pick.tile.x, y: pick.tile.y }
      );
      if (candidatePath) {
        originBuilding = orig;
        path = candidatePath;
        break;
      }
    }

    if (!originBuilding || !path) return;

    const facingAngle = Math.atan2(pick.waterDy, pick.waterDx);
    const standWx = (pick.tile.x + 0.5) * TILE_SIZE + pick.waterDx * 14;
    const standWy = (pick.tile.y + 0.5) * TILE_SIZE + pick.waterDy * 14;
    const shirts = ['#0284C7', '#15803D', '#B45309', '#475569'];

    this.people.push({
      id: `ppl_${this.personIdCounter++}`,
      role: 'fisher',
      hobbyKind: 'fishing',
      wx: (originBuilding.x + 0.5) * TILE_SIZE,
      wy: (originBuilding.y + 0.78) * TILE_SIZE,
      targetWx: standWx,
      targetWy: standWy,
      speed: 26,
      shirtColor: shirts[Math.floor(Math.random() * shirts.length)],
      hatColor: '#FDE68A',
      facingAngle,
      caughtFishCount: 0,
      animPhase: Math.random() * Math.PI * 2,
      state: 'walking',
      homeBuildingId: originBuilding.id,
      targetTileX: pick.tile.x,
      targetTileY: pick.tile.y,
      pedestrianPath: path,
      pedestrianPathIndex: path.length > 1 ? 1 : 0,
      holdTimer: 0,
    });
  }

  private redirectFisherToSetUpStall(fisher: Person): boolean {
    const startPt = this.getCurrentWalkableStart(fisher.wx, fisher.wy);
    if (!startPt) return false;
    const spot = this.findOpenStallTile(startPt);
    if (!spot) return false;

    fisher.role = 'vendor';
    fisher.stallGoods = 'fish';
    fisher.carryingItem = 'fish';
    fisher.state = 'walking';
    fisher.targetTileX = spot.tile.x;
    fisher.targetTileY = spot.tile.y;
    fisher.targetWx = (spot.tile.x + 0.5) * TILE_SIZE;
    fisher.targetWy = (spot.tile.y + 0.45) * TILE_SIZE;
    fisher.pedestrianPath = spot.path;
    fisher.pedestrianPathIndex = spot.path.length > 1 ? 1 : 0;
    return true;
  }

  private spawnHobbyist() {
    const hour = this.minutesOfDay / 60;
    const calmAfterSchool = hour >= 16 || hour < 8;
    const seasonalPools: Record<SeasonType, HobbyKind[]> = {
      Winter: calmAfterSchool
        ? ['ice_skating', 'snowman', 'bird_feeding', 'music']
        : ['ice_skating', 'snowball_fight', 'snowman', 'bird_feeding', 'music'],
      Autumn: calmAfterSchool
        ? ['raking_leaves', 'harvesting', 'bird_feeding', 'painting', 'birdwatching', 'music']
        : ['raking_leaves', 'harvesting', 'skateboarding', 'bird_feeding', 'painting', 'birdwatching', 'music'],
      Spring: calmAfterSchool
        ? ['gardening', 'bird_feeding', 'painting', 'birdwatching', 'music']
        : ['gardening', 'skateboarding', 'bird_feeding', 'kite', 'painting', 'birdwatching', 'music'],
      Summer: calmAfterSchool
        ? ['sunbathing', 'bird_feeding', 'painting', 'birdwatching', 'music']
        : ['sunbathing', 'skateboarding', 'bird_feeding', 'kite', 'painting', 'birdwatching', 'music'],
    };
    const pool = seasonalPools[this.season];
    const hobbyKind = pool[Math.floor(Math.random() * pool.length)];

    const busyKeys = new Set(
      this.people
        .filter((p) => p.role === 'hobbyist' && p.targetTileX !== undefined && p.targetTileY !== undefined)
        .map((p) => `${p.targetTileX},${p.targetTileY}`)
    );

    const candidateSpots: MapTile[] = [];
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    for (const t of this.tiles) {
      if (t.hasRoad || t.isBridgeBroken) continue;
      if (busyKeys.has(`${t.x},${t.y}`)) continue;
      if (this.marketStalls.some((s) => s.x === t.x && s.y === t.y)) continue;

      if (hobbyKind === 'ice_skating') {
        if (t.terrain === 'water' && !t.hasFootbridge && !t.building) {
          candidateSpots.push(t);
        }
        continue;
      }

      if (t.terrain === 'water') continue;
      if (
        t.building &&
        t.building.category !== 'park' &&
        !(t.building.category === 'crops' && (hobbyKind === 'harvesting' || hobbyKind === 'gardening'))
      ) {
        continue;
      }

      if (hobbyKind === 'painting') {
        const nearScenic = dirs.some((d) => {
          const nt = this.getTile(t.x + d.dx, t.y + d.dy);
          return nt && (nt.terrain === 'water' || nt.terrain === 'forest' || nt.building?.category === 'park');
        });
        if (nearScenic && t.terrain === 'grass') candidateSpots.push(t);
      } else if (
        hobbyKind === 'kite' ||
        hobbyKind === 'snowball_fight' ||
        hobbyKind === 'snowman' ||
        hobbyKind === 'sunbathing' ||
        hobbyKind === 'skateboarding' ||
        hobbyKind === 'bird_feeding'
      ) {
        if (t.building?.category === 'park' || (t.terrain === 'grass' && !t.building)) {
          const openNeighbors = dirs.filter((d) => {
            const nt = this.getTile(t.x + d.dx, t.y + d.dy);
            return nt && nt.terrain === 'grass' && !nt.hasRoad && !nt.building;
          }).length;
          if (openNeighbors >= 1 || t.building?.category === 'park') candidateSpots.push(t);
        }
      } else if (hobbyKind === 'birdwatching') {
        const nearNature =
          t.building?.category === 'park' ||
          dirs.some((d) => {
            const nt = this.getTile(t.x + d.dx, t.y + d.dy);
            return nt && (nt.terrain === 'forest' || nt.building?.category === 'park');
          });
        if (nearNature && t.terrain === 'grass') candidateSpots.push(t);
      } else if (hobbyKind === 'raking_leaves' || hobbyKind === 'harvesting' || hobbyKind === 'gardening') {
        const nearGreen =
          t.building?.category === 'park' ||
          t.building?.category === 'crops' ||
          dirs.some((d) => {
            const nt = this.getTile(t.x + d.dx, t.y + d.dy);
            return (
              nt &&
              (nt.terrain === 'forest' ||
                nt.building?.category === 'park' ||
                nt.building?.category === 'crops' ||
                nt.building?.category === 'residential')
            );
          });
        if (nearGreen && t.terrain === 'grass') candidateSpots.push(t);
      } else if (hobbyKind === 'music') {
        const nearVenue = dirs.some((d) => {
          const nt = this.getTile(t.x + d.dx, t.y + d.dy);
          return (
            nt?.building &&
            (nt.building.category === 'commercial' ||
              nt.building.category === 'visit_spot' ||
              nt.building.category === 'park' ||
              nt.building.category === 'city_hall')
          );
        });
        if (nearVenue) candidateSpots.push(t);
      }
    }

    if (candidateSpots.length === 0) return;
    const target = candidateSpots[Math.floor(Math.random() * candidateSpots.length)];

    const homes = this.buildingsList
      .filter(
        (b) =>
          b.category === 'residential' ||
          b.category === 'park' ||
          b.category === 'visit_spot' ||
          b.category === 'school'
      )
      .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y));

    let originBuilding: PlacedBuilding | null = null;
    let path: GridPoint[] | null = null;
    const allowFrozen = hobbyKind === 'ice_skating' && this.season === 'Winter';

    for (const h of homes.slice(0, 10)) {
      const p = this.findPedestrianPath(this.tiles, { x: h.x, y: h.y }, { x: target.x, y: target.y }, allowFrozen);
      if (p) {
        originBuilding = h;
        path = p;
        break;
      }
    }

    if (!originBuilding || !path) return;

    const shirtsByHobby: Record<HobbyKind, string[]> = {
      fishing: ['#0284C7', '#15803D'],
      painting: ['#E11D48', '#8B5CF6', '#0EA5E9'],
      kite: ['#F59E0B', '#EC4899', '#10B981'],
      birdwatching: ['#65A30D', '#0D9488', '#D97706'],
      bird_feeding: ['#65A30D', '#0EA5E9', '#D97706'],
      skateboarding: ['#F43F5E', '#6366F1', '#14B8A6'],
      music: ['#7C3AED', '#EA580C', '#0284C7'],
      ice_skating: ['#0EA5E9', '#EC4899', '#6366F1'],
      snowball_fight: ['#DC2626', '#2563EB', '#0D9488'],
      snowman: ['#2563EB', '#16A34A', '#EA580C'],
      raking_leaves: ['#D97706', '#B45309', '#DC2626'],
      harvesting: ['#B45309', '#65A30D', '#EA580C'],
      gardening: ['#16A34A', '#0D9488', '#EC4899'],
      sunbathing: ['#F59E0B', '#EC4899', '#06B6D4'],
    };
    const shirtPalette = shirtsByHobby[hobbyKind];
    const primaryId = `ppl_${this.personIdCounter++}`;

    let partnerTarget: MapTile | undefined;
    let partnerOrigin: PlacedBuilding | undefined;
    let partnerPath: GridPoint[] | null = null;
    if (hobbyKind === 'snowball_fight') {
      partnerTarget = dirs
        .map((d) => this.getTile(target.x + d.dx, target.y + d.dy))
        .find((nt): nt is MapTile => Boolean(nt && nt.terrain === 'grass' && !nt.hasRoad && !nt.building));
      if (partnerTarget) {
        for (const h of homes.slice(0, 6)) {
          const p2 = this.findPedestrianPath(this.tiles, { x: h.x, y: h.y }, { x: partnerTarget.x, y: partnerTarget.y });
          if (p2) {
            partnerOrigin = h;
            partnerPath = p2;
            break;
          }
        }
      }
    }

    const partnerId = partnerTarget && partnerOrigin && partnerPath ? `ppl_${this.personIdCounter++}` : undefined;
    const isKidHobby =
      hobbyKind === 'kite' ||
      hobbyKind === 'skateboarding' ||
      hobbyKind === 'snowball_fight' ||
      hobbyKind === 'snowman' ||
      hobbyKind === 'bird_feeding' ||
      hobbyKind === 'ice_skating';
    const primaryIsChild = isKidHobby && Math.random() < 0.6;
    const partnerIsChild = hobbyKind === 'snowball_fight' && (primaryIsChild || Math.random() < 0.6);

    this.people.push({
      id: primaryId,
      role: 'hobbyist',
      hobbyKind,
      isChild: primaryIsChild,
      wx: (originBuilding.x + 0.5) * TILE_SIZE,
      wy: (originBuilding.y + 0.78) * TILE_SIZE,
      targetWx: (target.x + 0.5) * TILE_SIZE + (Math.random() - 0.5) * 10,
      targetWy: (target.y + 0.5) * TILE_SIZE + (Math.random() - 0.5) * 8,
      speed: hobbyKind === 'ice_skating' ? 32 : primaryIsChild ? 28 : 26,
      shirtColor: shirtPalette[Math.floor(Math.random() * shirtPalette.length)],
      animPhase: Math.random() * Math.PI * 2,
      state: 'walking',
      homeBuildingId: originBuilding.id,
      targetPersonId: partnerId,
      targetTileX: target.x,
      targetTileY: target.y,
      pedestrianPath: path,
      pedestrianPathIndex: path.length > 1 ? 1 : 0,
      holdTimer: 0,
    });

    if (partnerId && partnerTarget && partnerOrigin && partnerPath) {
      this.people.push({
        id: partnerId,
        role: 'hobbyist',
        hobbyKind: 'snowball_fight',
        isChild: partnerIsChild,
        wx: (partnerOrigin.x + 0.5) * TILE_SIZE,
        wy: (partnerOrigin.y + 0.78) * TILE_SIZE,
        targetWx: (partnerTarget.x + 0.5) * TILE_SIZE,
        targetWy: (partnerTarget.y + 0.5) * TILE_SIZE,
        speed: partnerIsChild ? 28 : 26,
        shirtColor: shirtPalette[(Math.floor(Math.random() * shirtPalette.length) + 1) % shirtPalette.length],
        animPhase: Math.random() * Math.PI * 2,
        state: 'walking',
        homeBuildingId: partnerOrigin.id,
        targetPersonId: primaryId,
        targetTileX: partnerTarget.x,
        targetTileY: partnerTarget.y,
        pedestrianPath: partnerPath,
        pedestrianPathIndex: partnerPath.length > 1 ? 1 : 0,
        holdTimer: 0,
      });
    }
  }

  private spawnShopper(houses: PlacedBuilding[], shops: PlacedBuilding[]) {
    const publicStalls = this.marketStalls.filter((s) => !s.isIllicit && s.goods !== 'contraband');
    if (houses.length === 0 || (shops.length === 0 && publicStalls.length === 0)) return;
    const shuffledHouses = [...houses].sort(() => Math.random() - 0.5);

    for (const home of shuffledHouses.slice(0, 6)) {
      const preferStall = publicStalls.length > 0 && (shops.length === 0 || Math.random() < 0.42);
      if (preferStall) {
        const sortedStalls = [...publicStalls].sort(
          (a, b) => Math.hypot(a.x - home.x, a.y - home.y) - Math.hypot(b.x - home.x, b.y - home.y)
        );
        for (const stall of sortedStalls.slice(0, 4)) {
          const path = this.findPedestrianPath(this.tiles, { x: home.x, y: home.y }, { x: stall.x, y: stall.y });
          if (path) {
            const shirts = ['#EC4899', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#FB7185'];
            this.people.push({
              id: `ppl_${this.personIdCounter++}`,
              role: 'shopper',
              wx: (home.x + 0.5) * TILE_SIZE,
              wy: (home.y + 0.78) * TILE_SIZE,
              targetWx: stall.wx + (Math.random() - 0.5) * 8,
              targetWy: stall.wy + 10,
              speed: 30,
              shirtColor: shirts[Math.floor(Math.random() * shirts.length)],
              animPhase: Math.random() * Math.PI * 2,
              state: 'walking',
              homeBuildingId: home.id,
              destStallId: stall.id,
              targetTileX: stall.x,
              targetTileY: stall.y,
              pedestrianPath: path,
              pedestrianPathIndex: path.length > 1 ? 1 : 0,
              holdTimer: 0,
            });
            return;
          }
        }
      }

      const sortedShops = [...shops].sort(
        (a, b) =>
          Math.hypot(a.x - home.x, a.y - home.y) - Math.hypot(b.x - home.x, b.y - home.y)
      );
      const candidates = sortedShops.slice(0, Math.min(5, sortedShops.length)).sort(() => Math.random() - 0.5);
      for (const shop of candidates) {
        const path = this.findPedestrianPath(this.tiles, { x: home.x, y: home.y }, { x: shop.x, y: shop.y });
        if (path) {
          const shirts = ['#EC4899', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#FB7185'];
          home.totalVisits = Math.max(0, home.totalVisits - 1);
          const shopTargetX = (shop.x + 0.5) * TILE_SIZE + (Math.random() - 0.5) * 8;
          const shopTargetY = (shop.y + 0.8) * TILE_SIZE;
          this.people.push({
            id: `ppl_${this.personIdCounter++}`,
            role: 'shopper',
            wx: (home.x + 0.5) * TILE_SIZE,
            wy: (home.y + 0.78) * TILE_SIZE,
            targetWx: shopTargetX,
            targetWy: shopTargetY,
            speed: 30,
            shirtColor: shirts[Math.floor(Math.random() * shirts.length)],
            animPhase: Math.random() * Math.PI * 2,
            state: 'walking',
            homeBuildingId: home.id,
            destBuildingId: shop.id,
            targetTileX: shop.x,
            targetTileY: shop.y,
            pedestrianPath: [...path],
            pedestrianPathIndex: path.length > 1 ? 1 : 0,
            holdTimer: 0,
          });
          // Often a shorter child tags along beside an adult shopper
          if (Math.random() < 0.36) {
            const kidShirts = ['#FACC15', '#38BDF8', '#FB7185', '#4ADE80', '#A78BFA'];
            this.people.push({
              id: `ppl_${this.personIdCounter++}`,
              role: 'pedestrian',
              isChild: true,
              wx: (home.x + 0.5) * TILE_SIZE - 4,
              wy: (home.y + 0.82) * TILE_SIZE,
              targetWx: shopTargetX - 4,
              targetWy: shopTargetY + 1,
              speed: 30,
              shirtColor: kidShirts[Math.floor(Math.random() * kidShirts.length)],
              hatColor: Math.random() < 0.4 ? '#FDE047' : undefined,
              animPhase: Math.random() * Math.PI * 2,
              state: 'walking',
              homeBuildingId: home.id,
              destBuildingId: shop.id,
              targetTileX: shop.x,
              targetTileY: shop.y,
              pedestrianPath: [...path],
              pedestrianPathIndex: path.length > 1 ? 1 : 0,
              holdTimer: 0,
            });
          }
          return;
        }
      }
    }
  }

  private spawnBuildingPedestrian() {
    const buildings = this.buildingsList.filter((b) => b.category !== 'road_path');
    if (buildings.length < 2) return;

    const shuffled = [...buildings].sort(() => Math.random() - 0.5);
    const pedShirts = ['#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#F97316'];
    const kidShirts = ['#FACC15', '#38BDF8', '#FB7185', '#4ADE80', '#A78BFA', '#FB923C'];

    for (const origin of shuffled.slice(0, 6)) {
      const destPool = buildings
        .filter((b) => b.id !== origin.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 6);

      for (const dest of destPool) {
        const path = this.findPedestrianPath(this.tiles, { x: origin.x, y: origin.y }, { x: dest.x, y: dest.y });
        if (path && path.length >= 2) {
          origin.totalVisits = Math.max(0, origin.totalVisits - 1);
          const spawnAsChild = Math.random() < 0.32;
          this.people.push({
            id: `ppl_${this.personIdCounter++}`,
            role: 'pedestrian',
            isChild: spawnAsChild,
            wx: (origin.x + 0.5) * TILE_SIZE,
            wy: (origin.y + 0.78) * TILE_SIZE,
            targetWx: (dest.x + 0.5) * TILE_SIZE,
            targetWy: (dest.y + 0.78) * TILE_SIZE,
            speed: spawnAsChild ? 28 : 25,
            shirtColor: spawnAsChild
              ? kidShirts[Math.floor(Math.random() * kidShirts.length)]
              : pedShirts[Math.floor(Math.random() * pedShirts.length)],
            hatColor: spawnAsChild && Math.random() < 0.35 ? '#FACC15' : undefined,
            animPhase: Math.random() * Math.PI * 2,
            state: 'walking',
            homeBuildingId: origin.id,
            destBuildingId: dest.id,
            targetTileX: dest.x,
            targetTileY: dest.y,
            pedestrianPath: [...path],
            pedestrianPathIndex: 1,
            holdTimer: 0,
          });
          // Sometimes an adult leaving a house or park walks with a shorter kid beside them
          if (!spawnAsChild && (origin.category === 'residential' || dest.category === 'park') && Math.random() < 0.34) {
            this.people.push({
              id: `ppl_${this.personIdCounter++}`,
              role: 'pedestrian',
              isChild: true,
              wx: (origin.x + 0.5) * TILE_SIZE - 4,
              wy: (origin.y + 0.8) * TILE_SIZE,
              targetWx: (dest.x + 0.5) * TILE_SIZE - 4,
              targetWy: (dest.y + 0.8) * TILE_SIZE,
              speed: 25,
              shirtColor: kidShirts[Math.floor(Math.random() * kidShirts.length)],
              hatColor: Math.random() < 0.35 ? '#38BDF8' : undefined,
              animPhase: Math.random() * Math.PI * 2,
              state: 'walking',
              homeBuildingId: origin.id,
              destBuildingId: dest.id,
              targetTileX: dest.x,
              targetTileY: dest.y,
              pedestrianPath: [...path],
              pedestrianPathIndex: 1,
              holdTimer: 0,
            });
          }
          return;
        }
      }
    }
  }

  private findOpenStallTile(startPt: GridPoint): { tile: MapTile; path: GridPoint[] } | null {
    const candidates: MapTile[] = [];
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];
    for (const t of this.tiles) {
      if (t.terrain !== 'grass' || t.hasRoad || t.building) continue;
      if (this.marketStalls.some((s) => Math.abs(s.x - t.x) <= 1 && Math.abs(s.y - t.y) <= 1)) continue;
      if (this.fires.some((f) => f.status === 'active' && f.x === t.x && f.y === t.y)) continue;
      const nearActivity = dirs.some((d) => {
        const nt = this.getTile(t.x + d.dx, t.y + d.dy);
        return (
          nt &&
          (nt.hasRoad ||
            nt.building?.category === 'park' ||
            nt.building?.category === 'commercial' ||
            nt.building?.category === 'visit_spot' ||
            nt.building?.category === 'city_hall')
        );
      });
      if (nearActivity) candidates.push(t);
    }
    if (candidates.length === 0) return null;
    candidates.sort(
      (a, b) => Math.hypot(a.x - startPt.x, a.y - startPt.y) - Math.hypot(b.x - startPt.x, b.y - startPt.y)
    );
    const slice = candidates.slice(0, 12).sort(() => Math.random() - 0.5);
    for (const tile of slice) {
      const path = this.findPedestrianPath(this.tiles, startPt, { x: tile.x, y: tile.y });
      if (path) return { tile, path };
    }
    return null;
  }

  private sendToJail(count = 1) {
    if (count <= 0) return;
    this.prisonInmates += count;
    this.totalJailed += count;
    const jail = this.buildingsList.find((b) => b.category === 'jail');
    if (jail) {
      this.incrementBuildingOccupancy(jail, count);
      this.floatingLabels.push({
        wx: (jail.x + 0.5) * TILE_SIZE,
        wy: (jail.y + 0.25) * TILE_SIZE,
        text: `+${count} Jailed`,
        color: '#F8FAFC',
        bgColor: '#334155',
        age: 0,
        maxAge: 1.5,
      });
    }
  }

  private dispatchPoliceToEscapee(escapee: Person): boolean {
    const escX = Math.max(0, Math.min(this.gridCols - 1, Math.floor(escapee.wx / TILE_SIZE)));
    const escY = Math.max(0, Math.min(this.gridRows - 1, Math.floor(escapee.wy / TILE_SIZE)));
    const route = this.findBestPoliceDispatchRoute(escX, escY);
    if (!route) return false;

    const { station, roadPath } = route;
    if (roadPath && roadPath.length >= 1) {
      const fullPath: GridPoint[] = [{ x: station.x, y: station.y }, ...roadPath];
      const p0 = fullPath[0];
      const p1 = fullPath[1] || fullPath[0];
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

      const cruiser: Car = {
        id: `car_${this.carIdCounter++}`,
        type: 'police',
        color: '#1E293B',
        wx: (p0.x + 0.5) * TILE_SIZE,
        wy: (p0.y + 0.5) * TILE_SIZE,
        angle,
        speed: 70,
        maxSpeed: 136,
        path: fullPath,
        pathIndex: fullPath.length > 1 ? 1 : 0,
        originBuildingId: station.id,
        destBuildingId: station.id,
        destLabel: 'Escaped Inmate',
        returnStationId: station.id,
        originCategory: 'police',
        destCategory: 'police',
        waitSeconds: 0,
        isBraking: false,
        isJammed: false,
        hornFlash: 0,
        sirenPhase: 0,
        targetEscapeeId: escapee.id,
      };
      station.activeTripsOut += 1;
      this.cars.push(cruiser);
      return true;
    }

    // Fallback: dispatch chasing officer on foot directly from Police Station
    const path = this.findPoliceFootPath({ x: station.x, y: station.y }, { x: escX, y: escY });
    if (!path) return false;
    this.people.push({
      id: `ppl_${this.personIdCounter++}`,
      role: 'police',
      wx: (station.x + 0.5) * TILE_SIZE,
      wy: (station.y + 0.8) * TILE_SIZE,
      targetWx: escapee.wx,
      targetWy: escapee.wy,
      targetTileX: escX,
      targetTileY: escY,
      pedestrianPath: path,
      pedestrianPathIndex: path.length > 1 ? 1 : 0,
      speed: 62,
      shirtColor: '#1D4ED8',
      hatColor: '#1E3A8A',
      animPhase: 0,
      state: 'chasing',
      homeBuildingId: station.id,
      targetPersonId: escapee.id,
      holdTimer: 0,
    });
    return true;
  }

  private pickEscapeeTarget(esc: Person): boolean {
    const startPt = this.getCurrentWalkableStart(esc.wx, esc.wy);
    if (!startPt) return false;

    // 45% chance to target a market stall or park/school to vandalize, else rob a commercial/residential building
    if (this.marketStalls.length > 0 && Math.random() < 0.45) {
      const st = this.marketStalls[Math.floor(Math.random() * this.marketStalls.length)];
      const path = this.findPedestrianPath(this.tiles, startPt, { x: st.x, y: st.y });
      if (path) {
        esc.destStallId = st.id;
        esc.destBuildingId = undefined;
        esc.targetTileX = st.x;
        esc.targetTileY = st.y;
        esc.targetWx = st.wx;
        esc.targetWy = st.wy;
        esc.pedestrianPath = path;
        esc.pedestrianPathIndex = path.length > 1 ? 1 : 0;
        esc.state = 'escaping';
        return true;
      }
    }

    const targets = this.buildingsList
      .filter(
        (b) =>
          b.category !== 'road_path' &&
          b.category !== 'police' &&
          b.category !== 'jail'
      )
      .sort(() => Math.random() - 0.5);

    for (const dest of targets.slice(0, 6)) {
      const path = this.findPedestrianPath(this.tiles, startPt, { x: dest.x, y: dest.y });
      if (path) {
        esc.destBuildingId = dest.id;
        esc.destStallId = undefined;
        esc.targetTileX = dest.x;
        esc.targetTileY = dest.y;
        esc.targetWx = (dest.x + 0.5) * TILE_SIZE;
        esc.targetWy = (dest.y + 0.78) * TILE_SIZE;
        esc.pedestrianPath = path;
        esc.pedestrianPathIndex = path.length > 1 ? 1 : 0;
        esc.state = 'escaping';
        return true;
      }
    }
    return false;
  }

  private updateJailAndReleases(simDt: number, realDt: number, playAudio: boolean) {
    // 0. Step foot police officers chasing escaped inmates
    for (let oi = this.people.length - 1; oi >= 0; oi--) {
      const officer = this.people[oi];
      if (
        officer.role !== 'police' ||
        !officer.targetPersonId ||
        officer.protestId ||
        officer.raidStallId
      ) {
        continue;
      }
      const escIdx = this.people.findIndex(
        (p) => p.id === officer.targetPersonId && p.role === 'escapee'
      );
      if (escIdx === -1) {
        officer.targetPersonId = undefined;
        if (officer.homeBuildingId) {
          officer.speed = 24;
          if (!this.assignReturnRoute(officer)) this.people.splice(oi, 1);
        } else {
          this.people.splice(oi, 1);
        }
        continue;
      }
      const esc = this.people[escIdx];
      const dist = Math.hypot(esc.wx - officer.wx, esc.wy - officer.wy);
      if (dist < 11) {
        this.people.splice(escIdx, 1);
        if (escIdx < oi) oi -= 1;
        this.sendToJail(1);
        this.capturePopups.push({ wx: esc.wx, wy: esc.wy - 8, age: 0, maxAge: 1.4 });
        this.logDailyNews(
          'WILD CHASE: Police caught an escaped inmate hiding inside a bush—turned out they only wanted one last snack before going back to Jail!'
        );
        if (playAudio) soundEngine.playPoliceCapture();
        officer.targetPersonId = undefined;
        if (officer.homeBuildingId) {
          officer.speed = 24;
          if (!this.assignReturnRoute(officer)) this.people.splice(oi, 1);
        } else {
          this.people.splice(oi, 1);
        }
        continue;
      }
      const dx = esc.wx - officer.wx;
      const dy = esc.wy - officer.wy;
      const step = Math.min(dist, Math.max(58, officer.speed) * realDt);
      officer.wx += (dx / dist) * step;
      officer.wy += (dy / dist) * step;
      officer.animPhase += realDt * 12;
    }

    // 1. Step escaped prisoners robbing & vandalizing public properties
    for (let i = this.people.length - 1; i >= 0; i--) {
      const esc = this.people[i];
      if (esc.role !== 'escapee') continue;

      esc.holdTimer -= simDt;
      if (esc.holdTimer <= 0) {
        if (!this.assignReturnRoute(esc)) {
          this.people.splice(i, 1);
          continue;
        }
      }

      // Retry police dispatch if no cruiser or chasing officer is currently after this escapee
      const hasAssignedPolice =
        this.cars.some((c) => c.targetEscapeeId === esc.id) ||
        this.people.some(
          (p) => p.role === 'police' && p.targetPersonId === esc.id && !p.protestId
        );
      if (!hasAssignedPolice) {
        esc.rerouteCooldown = (esc.rerouteCooldown ?? 0) - simDt;
        if (esc.rerouteCooldown <= 0) {
          esc.rerouteCooldown = 2.5;
          this.dispatchPoliceToEscapee(esc);
        }
      }

      // Check if an idling/patrolling police officer or car catches escapee on foot
      const cruiserNear = this.cars.find(
        (c) =>
          c.type === 'police' &&
          !c.isReturningToStation &&
          Math.hypot(c.wx - esc.wx, c.wy - esc.wy) < 16
      );
      if (cruiserNear) {
        this.people.splice(i, 1);
        this.sendToJail(1);
        this.capturePopups.push({ wx: esc.wx, wy: esc.wy - 8, age: 0, maxAge: 1.4 });
        this.logDailyNews('WILD CHASE: Police caught an escaped inmate hiding inside a bush—turned out they only wanted one last snack before going back to Jail!');
        if (playAudio) soundEngine.playPoliceCapture();
        if (cruiserNear.targetEscapeeId === esc.id) {
          if (!this.sendVehicleBackToStation(cruiserNear, undefined, true)) {
            this.finishTrip(cruiserNear);
            const cIdx = this.cars.indexOf(cruiserNear);
            if (cIdx !== -1) this.cars.splice(cIdx, 1);
          }
        }
        continue;
      }

      const res = this.stepPersonAlongPath(esc, realDt, 11.5);
      if (res === 'arrived') {
        if (esc.state === 'returning') {
          this.people.splice(i, 1);
          continue;
        }
        // Vandalize stall or rob public property / building
        if (esc.destStallId) {
          const sIdx = this.marketStalls.findIndex((s) => s.id === esc.destStallId);
          if (sIdx !== -1) {
            const st = this.marketStalls[sIdx];
            this.removeStallOnTile(st.x, st.y);
            this.floatingLabels.push({
              wx: st.wx,
              wy: st.wy - 10,
              text: 'Vandalized!',
              color: '#FEF2F2',
              bgColor: '#B91C1C',
              age: 0,
              maxAge: 1.8,
            });
            for (let k = 0; k < 6; k++) {
              this.woodChips.push({
                wx: st.wx,
                wy: st.wy,
                vx: (Math.random() - 0.5) * 40,
                vy: -14 - Math.random() * 18,
                age: 0,
                maxAge: 0.55,
                color: k % 2 === 0 ? st.awningColor : '#B45309',
              });
            }
          }
        } else if (esc.destBuildingId) {
          const bld = this.buildingsList.find((b) => b.id === esc.destBuildingId);
          if (bld) {
            this.citizenHappiness = Math.max(5, this.citizenHappiness - 2.5);
            if (bld.category === 'park' || Math.random() < 0.35) {
              this.startFireAt(bld.x, bld.y, true, playAudio);
            }
            this.floatingLabels.push({
              wx: (bld.x + 0.5) * TILE_SIZE,
              wy: (bld.y + 0.3) * TILE_SIZE,
              text: 'Escapee Robbed!',
              color: '#FEF2F2',
              bgColor: '#EA580C',
              age: 0,
              maxAge: 1.8,
            });
          }
        }
        if (!this.pickEscapeeTarget(esc)) {
          this.people.splice(i, 1);
        }
      } else if (res === 'blocked') {
        if (!this.pickEscapeeTarget(esc)) {
          this.people.splice(i, 1);
        }
      }
    }

    if (this.prisonInmates <= 0) return;

    const jails = this.buildingsList.filter((b) => b.category === 'jail');

    // 2. Occasional prison breakout!
    const activeEscapees = this.people.filter((p) => p.role === 'escapee').length;
    if (jails.length > 0 && activeEscapees < 1) {
      this.prisonBreakAccumulator += simDt;
      if (this.prisonBreakAccumulator >= 78) {
        this.prisonBreakAccumulator = 0;
        if (Math.random() < 0.36) {
          const jail = jails[Math.floor(Math.random() * jails.length)];
          this.prisonInmates = Math.max(0, this.prisonInmates - 1);
          jail.totalVisits = Math.max(0, jail.totalVisits - 1);
          const esc: Person = {
            id: `ppl_${this.personIdCounter++}`,
            role: 'escapee',
            wx: (jail.x + 0.5) * TILE_SIZE,
            wy: (jail.y + 0.78) * TILE_SIZE,
            targetWx: (jail.x + 0.5) * TILE_SIZE,
            targetWy: (jail.y + 0.78) * TILE_SIZE,
            speed: 44,
            shirtColor: '#F97316',
            hatColor: '#EA580C',
            animPhase: 0,
            state: 'escaping',
            homeBuildingId: jail.id,
            holdTimer: 55,
          };
          if (this.pickEscapeeTarget(esc)) {
            this.people.push(esc);
            this.floatingLabels.push({
              wx: (jail.x + 0.5) * TILE_SIZE,
              wy: (jail.y + 0.22) * TILE_SIZE,
              text: 'PRISON BREAK!',
              color: '#FEF2F2',
              bgColor: '#C2410C',
              age: 0,
              maxAge: 2.4,
            });
            this.logDailyNews(`WILD BREAKOUT: An inmate hopped out of ${jail.name} and dashed across town shouting "Catch me if you can!"`);
            if (playAudio) soundEngine.playRobberyAlert();
            this.dispatchPoliceToEscapee(esc);
          }
        }
      }
    }

    // 3. Regular sentence releases
    this.prisonReleaseAccumulator += simDt;
    if (this.prisonReleaseAccumulator < 30) return;
    this.prisonReleaseAccumulator = 0;

    this.prisonInmates = Math.max(0, this.prisonInmates - 1);
    this.totalReleased += 1;

    if (jails.length === 0) return;
    const jail = jails[Math.floor(Math.random() * jails.length)];
    jail.totalVisits = Math.max(0, jail.totalVisits - 1);
    const destinations = this.buildingsList
      .filter((b) => b.id !== jail.id && b.category !== 'road_path')
      .sort(() => Math.random() - 0.5);

    this.floatingLabels.push({
      wx: (jail.x + 0.5) * TILE_SIZE,
      wy: (jail.y + 0.25) * TILE_SIZE,
      text: 'Inmate Released!',
      color: '#F8FAFC',
      bgColor: '#0284C7',
      age: 0,
      maxAge: 1.6,
    });

    for (const dest of destinations.slice(0, 6)) {
      const path = this.findPedestrianPath(this.tiles, { x: jail.x, y: jail.y }, { x: dest.x, y: dest.y });
      if (path && path.length >= 2) {
        this.people.push({
          id: `ppl_${this.personIdCounter++}`,
          role: 'pedestrian',
          wx: (jail.x + 0.5) * TILE_SIZE,
          wy: (jail.y + 0.78) * TILE_SIZE,
          targetWx: (dest.x + 0.5) * TILE_SIZE,
          targetWy: (dest.y + 0.78) * TILE_SIZE,
          speed: 25,
          shirtColor: '#64748B',
          animPhase: Math.random() * Math.PI * 2,
          state: 'walking',
          homeBuildingId: jail.id,
          destBuildingId: dest.id,
          targetTileX: dest.x,
          targetTileY: dest.y,
          pedestrianPath: path,
          pedestrianPathIndex: 1,
          holdTimer: 0,
        });
        return;
      }
    }
  }

  private updateMarketStallsAndBeggars(simDt: number, realDt: number, playAudio: boolean) {
    const curfew = this.isOutdoorCurfew();

    // 1. Update existing market stalls & illicit drug/contraband stalls
    for (let i = this.marketStalls.length - 1; i >= 0; i--) {
      const stall = this.marketStalls[i];
      stall.age += simDt;
      if (stall.goods === 'fish') {
        if (this.crises.pollutionLevel >= 35 || this.crises.pollutionActive) {
          stall.isContaminated = true;
        } else if (this.crises.pollutionLevel < 10 && !this.crises.pollutionActive) {
          stall.isContaminated = false;
        }
      }

      // Illicit stalls stay hidden from police for a few game minutes while buyers visit, then police find out & raid!
      if (stall.isIllicit || stall.goods === 'contraband') {
        stall.discoveredTimer = (stall.discoveredTimer || 0) + simDt;
        const limit = stall.discoverDuration ?? 36;
        if (!stall.raidDispatched && stall.discoveredTimer >= limit) {
          this.triggerPoliceRaidOnStall(stall, playAudio);
        }
      }

      const tile = this.getTile(stall.x, stall.y);
      const vendorAlive = this.people.some((p) => p.id === stall.vendorPersonId);
      if (
        (curfew && !stall.isIllicit && stall.goods !== 'contraband') ||
        !tile ||
        tile.hasRoad ||
        tile.terrain !== 'grass' ||
        tile.building ||
        !vendorAlive ||
        stall.stock <= 0 ||
        stall.age >= stall.maxAge
      ) {
        if (stall.raidCarId) this.releaseRaidCar(stall.raidCarId);
        this.cleanupRaidOfficers(stall.id);
        this.marketStalls.splice(i, 1);
        for (const p of this.people) {
          if (p.id === stall.vendorPersonId && p.state === 'vending') {
            p.stallId = undefined;
            if (!this.assignReturnRoute(p)) {
              p.state = 'returning';
              p.holdTimer = 0;
            }
          }
        }
      }
    }

    // 2. Spawn Vendors setting up pop-up stalls in empty grass areas (paused during curfew)
    const maxStalls = curfew ? 0 : this.crises.povertyActive ? 7 : 5;
    const hasMeatStall = this.marketStalls.some((s) => s.goods === 'meat');
    const hasMeatVendorEnRoute = this.people.some(
      (p) => p.role === 'vendor' && p.stallGoods === 'meat'
    );
    if (
      !curfew &&
      this.butcherMeatReserve > 0 &&
      !hasMeatStall &&
      !hasMeatVendorEnRoute &&
      this.marketStalls.length < maxStalls + 2 &&
      this.buildingsList.length > 0
    ) {
      if (this.spawnVendor('meat')) {
        this.butcherMeatReserve = Math.max(0, this.butcherMeatReserve - 1);
      }
    }
    if (this.marketStalls.length < maxStalls && this.buildingsList.length > 0) {
      this.vendorSpawnAccumulator += simDt;
      if (this.vendorSpawnAccumulator >= (this.crises.povertyActive ? 5.5 : 10)) {
        this.vendorSpawnAccumulator = 0;
        this.spawnVendor();
      }
    }

    // 2.5 Occasionally spawn an illicit contraband stall far away from the city
    const hasIllicitStall = this.marketStalls.some((s) => s.isIllicit || s.goods === 'contraband');
    const hasIllicitVendorWalking = this.people.some((p) => p.role === 'vendor' && p.isIllicitVendor);
    if (!hasIllicitStall && !hasIllicitVendorWalking && this.buildingsList.length >= 4) {
      this.illicitStallCheckAccumulator += simDt;
      if (this.illicitStallCheckAccumulator >= 52) {
        this.illicitStallCheckAccumulator = 0;
        if (Math.random() < 0.42) {
          this.spawnIllicitVendor();
        }
      }
    } else if (hasIllicitStall) {
      // Citizens who notice the remote illicit stall quietly sneak out to buy without reporting it
      const activeIllicit = this.marketStalls.find(
        (s) => (s.isIllicit || s.goods === 'contraband') && !s.raidDispatched
      );
      const currentShadyBuyers = this.people.filter((p) => p.isShadyBuyer).length;
      if (activeIllicit && currentShadyBuyers < 3 && Math.random() < simDt * 0.28) {
        this.spawnShadyBuyer(activeIllicit);
      }
    }

    // 2.8 Step Police Officers raiding illicit contraband stalls
    for (let i = this.people.length - 1; i >= 0; i--) {
      const officer = this.people[i];
      if (officer.role !== 'police' || !officer.raidStallId) continue;

      const stallIdx = this.marketStalls.findIndex((s) => s.id === officer.raidStallId);
      const stall = stallIdx !== -1 ? this.marketStalls[stallIdx] : undefined;
      if (!stall) {
        if (officer.homeBuildingId) {
          officer.raidStallId = undefined;
          officer.speed = 24;
          if (!this.assignReturnRoute(officer)) this.people.splice(i, 1);
        } else {
          this.people.splice(i, 1);
        }
        continue;
      }

      // Find nearest suspect (the illicit vendor or any shady buyer near the stall)
      const suspects = this.people
        .filter(
          (t) =>
            ((t.id === stall.vendorPersonId && t.role === 'vendor') ||
              (t.isShadyBuyer && t.destStallId === stall.id)) &&
            Math.hypot(t.wx - stall.wx, t.wy - stall.wy) < 88
        )
        .sort((a, b) => Math.hypot(a.wx - officer.wx, a.wy - officer.wy) - Math.hypot(b.wx - officer.wx, b.wy - officer.wy));

      if (suspects.length > 0) {
        const suspect = suspects[0];
        const dist = Math.hypot(suspect.wx - officer.wx, suspect.wy - officer.wy);
        if (dist < 10) {
          const sIdx = this.people.findIndex((t) => t.id === suspect.id);
          if (sIdx !== -1) {
            this.people.splice(sIdx, 1);
            if (sIdx < i) i -= 1;
          }
          this.capturePopups.push({
            wx: suspect.wx,
            wy: suspect.wy - 8,
            age: 0,
            maxAge: 1.5,
          });
          this.sendToJail(1);
          if (playAudio) soundEngine.playPoliceCapture();

          // If vendor was just caught and no shady buyers remain right by the stall, shut down the stall!
          const remainingSuspects = this.people.filter(
            (t) =>
              (t.id === stall.vendorPersonId || (t.isShadyBuyer && t.destStallId === stall.id)) &&
              Math.hypot(t.wx - stall.wx, t.wy - stall.wy) < 88
          );
          if (remainingSuspects.length === 0) {
            this.floatingLabels.push({
              wx: stall.wx,
              wy: stall.wy - 12,
              text: 'BUSTED! Jailed',
              color: '#F8FAFC',
              bgColor: '#1D4ED8',
              age: 0,
              maxAge: 2.0,
            });
            this.releaseRaidCar(stall.raidCarId);
            this.cleanupRaidOfficers(stall.id);
            this.marketStalls.splice(stallIdx, 1);
            if (playAudio) soundEngine.playPoliceResolved();
          }
        } else {
          // Follow walkable pedestrian route if still far from stall, or sprint directly in on-tile final approach
          if (
            Math.hypot(stall.wx - officer.wx, stall.wy - officer.wy) > TILE_SIZE * 1.4 &&
            officer.pedestrianPath &&
            officer.pedestrianPath.length > 0
          ) {
            this.stepPersonAlongPath(officer, realDt, 11);
          } else {
            const dx = suspect.wx - officer.wx;
            const dy = suspect.wy - officer.wy;
            const d = Math.hypot(dx, dy);
            const step = Math.min(d, officer.speed * realDt);
            officer.wx += (dx / d) * step;
            officer.wy += (dy / d) * step;
            officer.animPhase += realDt * 11;
          }
        }
      } else {
        // Walk toward stall until suspects come into range or bust empty stall
        if (Math.hypot(stall.wx - officer.wx, stall.wy - officer.wy) > 16) {
          if (officer.pedestrianPath && officer.pedestrianPath.length > 0) {
            const res = this.stepPersonAlongPath(officer, realDt, 10);
            if (res === 'blocked') {
              const dx = stall.wx - officer.wx;
              const dy = stall.wy - officer.wy;
              const d = Math.hypot(dx, dy);
              const step = Math.min(d, officer.speed * realDt);
              officer.wx += (dx / d) * step;
              officer.wy += (dy / d) * step;
              officer.animPhase += realDt * 10;
            }
          } else {
            const dx = stall.wx - officer.wx;
            const dy = stall.wy - officer.wy;
            const d = Math.hypot(dx, dy);
            const step = Math.min(d, officer.speed * realDt);
            officer.wx += (dx / d) * step;
            officer.wy += (dy / d) * step;
            officer.animPhase += realDt * 10;
          }
        } else {
          this.releaseRaidCar(stall.raidCarId);
          this.cleanupRaidOfficers(stall.id);
          this.marketStalls.splice(stallIdx, 1);
        }
      }
    }

    // 3. Spawn Beggars logically from homes (many more during Poverty crisis)
    const activeBeggars = this.people.filter((p) => p.role === 'beggar').length;
    const maxBeggars = this.crises.povertyActive
      ? Math.min(28, Math.max(16, Math.floor(this.buildingsList.length * 0.55)))
      : curfew
      ? 0
      : this.buildingsList.length >= 4
      ? 1
      : 0;
    if (activeBeggars < maxBeggars) {
      this.beggarSpawnAccumulator += simDt;
      const interval = this.crises.povertyActive ? 0.85 : 18.0;
      if (this.beggarSpawnAccumulator >= interval) {
        this.beggarSpawnAccumulator = 0;
        this.spawnBeggar();
        if (this.crises.povertyActive && activeBeggars + 1 < Math.floor(maxBeggars * 0.6)) {
          this.spawnBeggar();
        }
      }
    }

    // 4. Step Vendors & Beggars
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];

      if (p.role === 'vendor') {
        if (curfew && !p.isIllicitVendor && p.state !== 'returning') {
          p.stallId = undefined;
          p.speed = Math.max(p.speed, 38);
          if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          continue;
        }
        if (p.state === 'walking') {
          const res = this.stepPersonAlongPath(p, realDt, 7.5);
          if (res === 'arrived') {
            const tile =
              p.targetTileX !== undefined && p.targetTileY !== undefined
                ? this.getTile(p.targetTileX, p.targetTileY)
                : null;
            if (
              !tile ||
              tile.terrain !== 'grass' ||
              tile.hasRoad ||
              tile.building ||
              this.marketStalls.some((s) => s.x === tile.x && s.y === tile.y)
            ) {
              if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
              continue;
            }
            const goods: StallGoodsType = p.stallGoods || 'clothes';
            const isIllicit = Boolean(p.isIllicitVendor) || goods === 'contraband';
            const awningColors: Record<StallGoodsType, string> = {
              fish: '#0284C7',
              clothes: '#E11D48',
              produce: '#16A34A',
              meat: '#B91C1C',
              crafts: '#D97706',
              contraband: '#312E81',
              kayak: '#0891B2',
              rowboat: '#B45309',
              swim: '#0284C7',
            };
            const produceFactor = Math.max(0.25, 1 - (this.crises.pollutionLevel / 100) * 0.75);
            const initialStock = isIllicit
              ? 8
              : goods === 'produce' || goods === 'fish' || goods === 'meat'
              ? Math.max(1, Math.round(5 * produceFactor))
              : 5;
            const stallId = `stall_${this.stallIdCounter++}`;
            const isFishTainted =
              goods === 'fish' &&
              (Boolean(p.isContaminated) ||
                this.crises.pollutionLevel >= 35 ||
                this.crises.pollutionActive);
            this.marketStalls.push({
              id: stallId,
              x: tile.x,
              y: tile.y,
              wx: (tile.x + 0.5) * TILE_SIZE,
              wy: (tile.y + 0.54) * TILE_SIZE,
              goods: isIllicit ? 'contraband' : goods,
              awningColor: awningColors[isIllicit ? 'contraband' : goods],
              vendorPersonId: p.id,
              stock: initialStock,
              salesCount: 0,
              isContaminated: isFishTainted,
              isIllicit,
              discoveredTimer: 0,
              discoverDuration: isIllicit ? 28 + Math.random() * 14 : undefined,
              age: 0,
              maxAge: isIllicit ? 150 : 55 + Math.random() * 20,
            });
            p.stallId = stallId;
            p.state = 'vending';
            p.carryingItem = undefined;
            this.floatingLabels.push({
              wx: (tile.x + 0.5) * TILE_SIZE,
              wy: (tile.y + 0.35) * TILE_SIZE,
              text: isIllicit
                ? 'Shady Stall...'
                : isFishTainted
                ? '!Tainted Fish Stall'
                : goods === 'fish'
                ? '+Fish Stall!'
                : goods === 'clothes'
                ? '+Clothes Stall!'
                : goods === 'produce'
                ? '+Produce Stall!'
                : goods === 'meat'
                ? '+Meat Stall!'
                : goods === 'kayak'
                ? '+Kayak Rental!'
                : '+Craft Stall!',
              color: isIllicit ? '#E9D5FF' : isFishTainted ? '#ECFCCB' : '#F8FAFC',
              bgColor: isIllicit ? '#312E81' : isFishTainted ? '#3F6212' : awningColors[goods],
              age: 0,
              maxAge: 1.6,
            });
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'vending') {
          p.animPhase += realDt * 3;
          const stall = this.marketStalls.find((s) => s.id === p.stallId);
          if (!stall) {
            if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 7.5);
          if (res !== 'moving' || p.holdTimer <= 0) {
            this.people.splice(i, 1);
          }
        }
        continue;
      }

      if (p.role === 'beggar') {
        const isWarPanic = this.crises.warActive || this.people.some((o) => o.role === 'invader');
        if (((curfew && !this.crises.povertyActive) || isWarPanic) && p.state !== 'returning') {
          p.isPanicking = isWarPanic;
          p.speed = isWarPanic ? 48 : Math.max(p.speed, 38);
          if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          continue;
        }
        if (p.state === 'walking') {
          const res = this.stepPersonAlongPath(p, realDt, 6.2);
          if (res === 'arrived') {
            p.state = 'begging';
            p.holdTimer = 26 + Math.random() * 14;
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'begging') {
          p.animPhase += realDt * 2.5;
          p.holdTimer -= realDt;
          // Nearby shoppers or walkers occasionally drop spare coins!
          if (Math.random() < realDt * 0.45) {
            const passer = this.people.find(
              (other) =>
                other.id !== p.id &&
                (other.role === 'shopper' || other.role === 'pedestrian' || other.role === 'hobbyist') &&
                Math.hypot(other.wx - p.wx, other.wy - p.wy) < 20
            );
            if (passer && Math.random() < 0.28) {
              this.floatingLabels.push({
                wx: p.wx,
                wy: p.wy - 10,
                text: '+Coin',
                color: '#0F172A',
                bgColor: '#FACC15',
                age: 0,
                maxAge: 1.3,
              });
              if (playAudio) soundEngine.playMarketSale();
            }
          }
          if (p.holdTimer <= 0) {
            if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 6.5);
          if (res !== 'moving' || p.holdTimer <= 0) {
            this.people.splice(i, 1);
          }
        }
      }
    }
  }

  private findOpenRemoteStallTile(startPt: GridPoint): { tile: MapTile; path: GridPoint[] } | null {
    const cityBuildings = this.buildingsList.filter((b) => b.category !== 'road_path');
    const scored: { tile: MapTile; minDist: number }[] = [];

    for (const t of this.tiles) {
      if (t.terrain !== 'grass' || t.hasRoad || t.building) continue;
      if (this.marketStalls.some((s) => Math.abs(s.x - t.x) <= 2 && Math.abs(s.y - t.y) <= 2)) continue;
      if (this.fires.some((f) => f.status === 'active' && f.x === t.x && f.y === t.y)) continue;
      if (this.blastCraters.some((c) => c.x === t.x && c.y === t.y)) continue;

      let minDist = Infinity;
      for (const b of cityBuildings) {
        const d = Math.hypot(b.x - t.x, b.y - t.y);
        if (d < minDist) minDist = d;
      }
      if (minDist >= 2.8) {
        scored.push({ tile: t, minDist });
      }
    }

    if (scored.length === 0) return null;
    scored.sort((a, b) => b.minDist - a.minDist);
    const farPool = scored.slice(0, Math.min(20, scored.length)).sort(() => Math.random() - 0.5);
    for (const item of farPool) {
      const path = this.findPedestrianPath(this.tiles, startPt, { x: item.tile.x, y: item.tile.y });
      if (path) return { tile: item.tile, path };
    }
    return null;
  }

  private spawnIllicitVendor() {
    const origins = this.buildingsList.filter(
      (b) => b.category === 'residential' || b.category === 'workplace' || b.category === 'park'
    );
    if (origins.length === 0) return;

    const shuffled = [...origins].sort(() => Math.random() - 0.5);
    for (const orig of shuffled.slice(0, 6)) {
      const spot = this.findOpenRemoteStallTile({ x: orig.x, y: orig.y });
      if (!spot) continue;
      this.people.push({
        id: `ppl_${this.personIdCounter++}`,
        role: 'vendor',
        stallGoods: 'contraband',
        isIllicitVendor: true,
        carryingItem: 'bag',
        wx: (orig.x + 0.5) * TILE_SIZE,
        wy: (orig.y + 0.78) * TILE_SIZE,
        targetWx: (spot.tile.x + 0.5) * TILE_SIZE,
        targetWy: (spot.tile.y + 0.45) * TILE_SIZE,
        speed: 27,
        shirtColor: '#312E81',
        hatColor: '#1E1B4B',
        animPhase: Math.random() * Math.PI * 2,
        state: 'walking',
        homeBuildingId: orig.id,
        targetTileX: spot.tile.x,
        targetTileY: spot.tile.y,
        pedestrianPath: spot.path,
        pedestrianPathIndex: spot.path.length > 1 ? 1 : 0,
        holdTimer: 0,
      });
      return;
    }
  }

  private spawnShadyBuyer(stall: MarketStall) {
    const houses = this.buildingsList
      .filter((b) => b.category === 'residential' || b.category === 'workplace')
      .sort(() => Math.random() - 0.5);
    for (const home of houses.slice(0, 6)) {
      const path = this.findPedestrianPath(this.tiles, { x: home.x, y: home.y }, { x: stall.x, y: stall.y });
      if (!path) continue;
      this.people.push({
        id: `ppl_${this.personIdCounter++}`,
        role: 'shopper',
        isShadyBuyer: true,
        wx: (home.x + 0.5) * TILE_SIZE,
        wy: (home.y + 0.78) * TILE_SIZE,
        targetWx: stall.wx + (Math.random() - 0.5) * 10,
        targetWy: stall.wy + 10,
        speed: 29,
        shirtColor: '#475569',
        animPhase: Math.random() * Math.PI * 2,
        state: 'walking',
        homeBuildingId: home.id,
        destStallId: stall.id,
        targetTileX: stall.x,
        targetTileY: stall.y,
        pedestrianPath: path,
        pedestrianPathIndex: path.length > 1 ? 1 : 0,
        holdTimer: 0,
      });
      return;
    }
  }

  private triggerPoliceRaidOnStall(stall: MarketStall, playAudio: boolean): boolean {
    const route = this.findBestPoliceDispatchRoute(stall.x, stall.y);
    if (!route) return false;
    stall.raidDispatched = true;

    this.floatingLabels.push({
      wx: stall.wx,
      wy: stall.wy - 14,
      text: 'Police Tip-Off! Raid!',
      color: '#F8FAFC',
      bgColor: '#1D4ED8',
      age: 0,
      maxAge: 2.0,
    });
    if (playAudio) soundEngine.playRobberyAlert();

    const { station, roadPath } = route;
    if (roadPath && roadPath.length >= 1) {
      const fullPath: GridPoint[] = [{ x: station.x, y: station.y }, ...roadPath];
      const p0 = fullPath[0];
      const p1 = fullPath[1] || fullPath[0];
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const carId = `car_${this.carIdCounter++}`;
      const cruiser: Car = {
        id: carId,
        type: 'police',
        color: '#1E293B',
        wx: (p0.x + 0.5) * TILE_SIZE,
        wy: (p0.y + 0.5) * TILE_SIZE,
        angle,
        speed: 66,
        maxSpeed: 130,
        path: fullPath,
        pathIndex: fullPath.length > 1 ? 1 : 0,
        originBuildingId: station.id,
        destBuildingId: station.id,
        destLabel: 'Illicit Stall Raid',
        returnStationId: station.id,
        originCategory: 'police',
        destCategory: 'police',
        waitSeconds: 0,
        isBraking: false,
        isJammed: false,
        hornFlash: 0,
        sirenPhase: 0,
        targetRaidStallId: stall.id,
      };
      station.activeTripsOut += 1;
      this.cars.push(cruiser);
      stall.raidCarId = carId;
      this.logDailyNews(`SCANDAL: Police busted a secret outskirts stall selling "definitely normal mystery juice"—half the customers claim they were "just looking!"`);
      return true;
    }

    // Fallback: send raid officers directly on foot from nearest Police Station
    const path = this.findPoliceFootPath({ x: station.x, y: station.y }, { x: stall.x, y: stall.y });
    if (!path) return false;
    for (let k = 0; k < 2; k++) {
      this.people.push({
        id: `ppl_${this.personIdCounter++}`,
        role: 'police',
        wx: (station.x + 0.5) * TILE_SIZE + (k === 0 ? -4 : 4),
        wy: (station.y + 0.78) * TILE_SIZE,
        targetWx: stall.wx,
        targetWy: stall.wy,
        targetTileX: stall.x,
        targetTileY: stall.y,
        pedestrianPath: [...path],
        pedestrianPathIndex: path.length > 1 ? 1 : 0,
        speed: 54,
        shirtColor: '#1D4ED8',
        hatColor: '#1E3A8A',
        animPhase: k * Math.PI,
        state: 'chasing',
        homeBuildingId: station.id,
        raidStallId: stall.id,
        holdTimer: 0,
      });
    }
    return true;
  }

  private handleRaidCarArrival(car: Car): boolean {
    if (!car.targetRaidStallId) return false;
    const stall = this.marketStalls.find((s) => s.id === car.targetRaidStallId);
    if (!stall) return false;

    car.parkedAtRaid = true;
    car.speed = 0;
    car.isBraking = false;
    car.isJammed = false;
    car.waitSeconds = 0;

    const existingOfficers = this.people.filter(
      (p) => p.role === 'police' && p.raidStallId === stall.id
    ).length;
    if (existingOfficers === 0) {
      const tx = Math.max(0, Math.min(this.gridCols - 1, Math.floor(car.wx / TILE_SIZE)));
      const ty = Math.max(0, Math.min(this.gridRows - 1, Math.floor(car.wy / TILE_SIZE)));
      const walkStart = this.findNearestWalkableTile(this.tiles, tx, ty, 1) || { x: tx, y: ty };
      const path = this.findPoliceFootPath(walkStart, { x: stall.x, y: stall.y });
      for (let k = 0; k < 2; k++) {
        this.people.push({
          id: `ppl_${this.personIdCounter++}`,
          role: 'police',
          wx: car.wx + (k === 0 ? -5 : 5),
          wy: car.wy + (k === 0 ? -4 : 4),
          targetWx: stall.wx,
          targetWy: stall.wy,
          targetTileX: stall.x,
          targetTileY: stall.y,
          pedestrianPath: path ? [...path] : undefined,
          pedestrianPathIndex: path && path.length > 1 ? 1 : 0,
          speed: 54,
          shirtColor: '#1D4ED8',
          hatColor: '#1E3A8A',
          animPhase: k * Math.PI,
          state: 'chasing',
          raidStallId: stall.id,
          holdTimer: 0,
        });
      }
    }
    return true;
  }

  private cleanupRaidOfficers(stallId: string) {
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];
      if (p.role === 'police' && p.raidStallId === stallId) {
        if (p.homeBuildingId) {
          p.raidStallId = undefined;
          p.speed = 24;
          if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
        } else {
          this.people.splice(i, 1);
        }
      }
    }
  }

  private releaseRaidCar(carId?: string) {
    if (!carId) return;
    const idx = this.cars.findIndex((c) => c.id === carId);
    if (idx !== -1) {
      const car = this.cars[idx];
      if (!this.sendVehicleBackToStation(car, undefined, true)) {
        car.parkedAtRaid = false;
        this.finishTrip(car);
        this.cars.splice(idx, 1);
      }
    }
  }

  private spawnVendor(forcedGoods?: StallGoodsType): boolean {
    const origins = this.buildingsList.filter(
      (b) => b.category === 'residential' || b.category === 'commercial' || b.category === 'park'
    );
    if (origins.length === 0) return false;

    const hasLivestock = this.animals.some((a) => a.kind === 'cow' || a.kind === 'pig');
    const shuffled = [...origins].sort(() => Math.random() - 0.5);
    for (const orig of shuffled.slice(0, 6)) {
      const spot = this.findOpenStallTile({ x: orig.x, y: orig.y });
      if (!spot) continue;
      if (this.activeConstructions.some((c) => c.x === spot.tile.x && c.y === spot.tile.y)) {
        continue;
      }
      const goodsPool: StallGoodsType[] = ['clothes', 'produce', 'crafts', 'fish'];
      if (this.butcherMeatReserve > 0 || hasLivestock) {
        goodsPool.push('meat');
      }
      const goods =
        forcedGoods ||
        (orig.blueprintId === 'tackle_shop'
          ? 'fish'
          : orig.blueprintId === 'bakery' || orig.blueprintId === 'flower_shop'
          ? 'produce'
          : goodsPool[Math.floor(Math.random() * goodsPool.length)]);
      const shirts = ['#D97706', '#0284C7', '#E11D48', '#16A34A'];
      this.people.push({
        id: `ppl_${this.personIdCounter++}`,
        role: 'vendor',
        stallGoods: goods,
        carryingItem:
          goods === 'fish'
            ? 'fish'
            : goods === 'clothes'
            ? 'clothes'
            : goods === 'meat'
            ? 'meat'
            : 'produce',
        wx: (orig.x + 0.5) * TILE_SIZE,
        wy: (orig.y + 0.78) * TILE_SIZE,
        targetWx: (spot.tile.x + 0.5) * TILE_SIZE,
        targetWy: (spot.tile.y + 0.45) * TILE_SIZE,
        speed: 25,
        shirtColor:
          goods === 'meat' ? '#B91C1C' : shirts[Math.floor(Math.random() * shirts.length)],
        hatColor: goods === 'meat' ? '#F8FAFC' : undefined,
        animPhase: Math.random() * Math.PI * 2,
        state: 'walking',
        homeBuildingId: orig.id,
        targetTileX: spot.tile.x,
        targetTileY: spot.tile.y,
        pedestrianPath: spot.path,
        pedestrianPathIndex: spot.path.length > 1 ? 1 : 0,
        holdTimer: 0,
      });
      return true;
    }
    return false;
  }

  private spawnBeggar(): boolean {
    const primaryHomes = this.buildingsList.filter(
      (b) => b.category === 'residential' || b.category === 'park' || b.category === 'cemetery'
    );
    const homes =
      primaryHomes.length > 0
        ? primaryHomes
        : this.buildingsList.filter((b) => b.category !== 'road_path');

    const primaryHubs = this.buildingsList.filter(
      (b) => b.category === 'commercial' || b.category === 'visit_spot' || b.category === 'city_hall'
    );
    const secondaryHubs = this.buildingsList.filter(
      (b) =>
        b.category === 'workplace' ||
        b.category === 'school' ||
        b.category === 'hospital' ||
        b.category === 'park' ||
        b.category === 'residential'
    );
    const hubs = this.crises.povertyActive
      ? [...primaryHubs, ...secondaryHubs]
      : primaryHubs.length > 0
      ? primaryHubs
      : secondaryHubs;
    if (homes.length === 0 || hubs.length === 0) return false;

    const dirs = [
      { dx: 0, dy: 1 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: -1 },
    ];
    const shuffledHomes = [...homes].sort(() => Math.random() - 0.5);
    const shuffledHubs = [...hubs].sort(() => Math.random() - 0.5);

    for (const home of shuffledHomes.slice(0, 8)) {
      for (const hub of shuffledHubs.slice(0, 8)) {
        const shuffledDirs = [...dirs].sort(() => Math.random() - 0.5);
        for (const d of shuffledDirs) {
          const spot = this.getTile(hub.x + d.dx, hub.y + d.dy);
          if (
            !spot ||
            spot.hasRoad ||
            (spot.terrain !== 'grass' && spot.terrain !== 'sand') ||
            spot.building
          ) {
            continue;
          }
          const path = this.findPedestrianPath(this.tiles, { x: home.x, y: home.y }, { x: spot.x, y: spot.y });
          if (path) {
            const coats = ['#57534E', '#64748B', '#78350F', '#4D7C0F', '#71717A'];
            this.people.push({
              id: `ppl_${this.personIdCounter++}`,
              role: 'beggar',
              wx: (home.x + 0.5) * TILE_SIZE,
              wy: (home.y + 0.78) * TILE_SIZE,
              targetWx: (spot.x + 0.5) * TILE_SIZE + (Math.random() - 0.5) * 16,
              targetWy: (spot.y + 0.62) * TILE_SIZE + (Math.random() - 0.5) * 8,
              speed: 19 + Math.random() * 4,
              shirtColor: coats[Math.floor(Math.random() * coats.length)],
              animPhase: Math.random() * Math.PI * 2,
              state: 'walking',
              homeBuildingId: home.id,
              targetTileX: spot.x,
              targetTileY: spot.y,
              pedestrianPath: path,
              pedestrianPathIndex: path.length > 1 ? 1 : 0,
              holdTimer: 0,
            });
            return true;
          }
        }
      }
    }
    return false;
  }

  public triggerCrisis(type: CrisisType, active?: boolean, playAudio = true) {
    if (type === 'tornado' || type === 'earthquake' || type === 'flood') {
      if (active === false) {
        if (type === 'tornado') {
          this.crises.tornadoActive = false;
          this.crises.tornadoRemaining = 0;
        } else if (type === 'earthquake') {
          this.crises.earthquakeActive = false;
          this.crises.earthquakeRemaining = 0;
          this.earthquakeShakeIntensity = 0;
        } else {
          this.crises.floodActive = false;
          this.crises.floodRemaining = 0;
          for (const t of this.tiles) t.isFlooded = false;
        }
        return;
      }
      this.triggerDisaster(type, playAudio);
      return;
    }

    const nextState =
      active !== undefined
        ? active
        : type === 'virus'
        ? !this.crises.virusActive
        : type === 'war'
        ? !this.crises.warActive
        : type === 'poverty'
        ? !this.crises.povertyActive
        : !this.crises.pollutionActive;

    // Enforce 5-minute cooldown when triggering any chaos option
    if (active === undefined && nextState && this.chaosCooldowns[type] > 0) {
      return;
    }
    if (active === undefined && nextState) {
      this.chaosCooldowns[type] = this.CHAOS_COOLDOWN_SECONDS;
    }

    if (type === 'virus') {
      this.crises.virusActive = nextState;
      this.crises.virusRemaining = nextState ? 90 : 0;
      if (!nextState) {
        for (const p of this.people) {
          p.isInfected = false;
          p.infectedTimer = 0;
        }
      } else {
        let count = 0;
        for (const p of this.people) {
          if (p.role !== 'medic' && p.role !== 'mayor' && count < 4) {
            p.isInfected = true;
            p.infectedTimer = 0;
            count++;
          }
        }
      }
    } else if (type === 'war') {
      this.crises.warActive = nextState;
      this.crises.warRemaining = nextState ? 85 : 0;
      if (!nextState) {
        this.people = this.people.filter((p) => p.role !== 'soldier' && p.role !== 'invader');
      } else {
        this.spawnSoldierPatrol(3);
        this.spawnInvadingArmy(3);
      }
    } else if (type === 'poverty') {
      this.crises.povertyActive = nextState;
      this.crises.povertyRemaining = nextState ? 85 : 0;
      if (nextState) {
        this.beggarSpawnAccumulator = 0;
        const burstCount = Math.min(12, Math.max(6, Math.floor(this.buildingsList.length * 0.25)));
        for (let b = 0; b < burstCount; b++) {
          this.spawnBeggar();
        }
      } else {
        for (const p of this.people) {
          if (p.role === 'beggar' && p.state === 'begging') {
            p.holdTimer = Math.min(p.holdTimer, 6);
          }
        }
      }
    } else if (type === 'pollution') {
      this.crises.pollutionActive = nextState;
      this.crises.pollutionRemaining = nextState ? 110 : 0;
      if (nextState) {
        this.crises.pollutionLevel = Math.max(this.crises.pollutionLevel, 80);
        this.reduceMarketProduceForPollution();
        this.dispatchMayorCleaners(2);
      } else {
        this.crises.pollutionLevel = 0;
      }
    }

    if (nextState && playAudio) {
      soundEngine.playCrisisAlert();
    }
  }

  public isTallShelterBuilding(b: PlacedBuilding): boolean {
    return (
      b.category === 'workplace' ||
      b.category === 'hospital' ||
      b.category === 'school' ||
      b.category === 'city_hall' ||
      b.category === 'factory' ||
      (b.category === 'landmark' && b.capacity >= 20)
    );
  }

  private findNearestTallShelter(wx: number, wy: number): PlacedBuilding | null {
    const shelters = this.buildingsList.filter((b) => this.isTallShelterBuilding(b));
    if (shelters.length === 0) return null;
    let best = shelters[0];
    let bestDist = Infinity;
    for (const s of shelters) {
      const d = Math.hypot((s.x + 0.5) * TILE_SIZE - wx, (s.y + 0.5) * TILE_SIZE - wy);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best;
  }

  private splitTileIntoEarthquakeWater(tile: MapTile): boolean {
    if (tile.terrain === 'void' || tile.terrain === 'water') return false;
    if (tile.building?.category === 'city_hall') return false;
    if (tile.building?.hasBasement) {
      this.floatingLabels.push({
        wx: (tile.x + 0.5) * TILE_SIZE,
        wy: (tile.y + 0.35) * TILE_SIZE,
        text: 'Saved in Basement!',
        color: '#ECFDF5',
        bgColor: '#047857',
        age: 0,
        maxAge: 2.2,
      });
      return false;
    }

    if (tile.building) {
      const bld = tile.building;
      this.floatingLabels.push({
        wx: (tile.x + 0.5) * TILE_SIZE,
        wy: (tile.y + 0.35) * TILE_SIZE,
        text: 'Split in Rift!',
        color: '#FEF2F2',
        bgColor: '#92400E',
        age: 0,
        maxAge: 2.2,
      });
      if (bld.category === 'residential' || bld.totalVisits > 0) {
        this.spawnDeathEvent(bld, false);
      }
      for (let d = 0; d < 6; d++) {
        this.woodChips.push({
          wx: (tile.x + 0.5) * TILE_SIZE,
          wy: (tile.y + 0.5) * TILE_SIZE,
          vx: (Math.random() - 0.5) * 44,
          vy: -18 - Math.random() * 18,
          age: 0,
          maxAge: 0.65,
          color: d % 2 === 0 ? '#78350F' : '#64748B',
        });
      }
      tile.building = null;
    }

    tile.hasRoad = false;
    tile.hasZebraCrossing = false;
    tile.hasFootbridge = false;
    tile.isBridgeBroken = false;
    tile.isFlooded = false;
    this.removeStallOnTile(tile.x, tile.y);
    this.clearPermitsAtTile(tile.x, tile.y);
    this.resolveBrokenBridgeAt(tile.x, tile.y);

    this.cars = this.cars.filter((c) => {
      const cx = Math.floor(c.wx / TILE_SIZE);
      const cy = Math.floor(c.wy / TILE_SIZE);
      return !(cx === tile.x && cy === tile.y);
    });
    for (let i = this.crashes.length - 1; i >= 0; i--) {
      if (this.crashes[i].x === tile.x && this.crashes[i].y === tile.y) {
        this.releaseCrashCars(this.crashes[i].id);
        this.crashes.splice(i, 1);
      }
    }

    tile.terrain = 'water';

    // Relocate any land animals on the newly split water tile to nearest dry land
    for (const ani of this.animals) {
      if (ani.kind === 'bird') continue;
      if (Math.floor(ani.wx / TILE_SIZE) === tile.x && Math.floor(ani.wy / TILE_SIZE) === tile.y) {
        this.rescueLandAnimalFromWater(ani);
      }
    }
    return true;
  }

  public triggerDisaster(
    type: 'tornado' | 'earthquake' | 'flood',
    playAudio = true,
    isNatural = false
  ): boolean {
    if (this.chaosCooldowns[type] > 0) return false;
    this.chaosCooldowns[type] = this.CHAOS_COOLDOWN_SECONDS;

    if (type === 'tornado') {
      const rx = 3 + Math.floor(Math.random() * Math.max(1, this.gridCols - 6));
      const ry = 3 + Math.floor(Math.random() * Math.max(1, this.gridRows - 6));
      this.crises.tornadoActive = true;
      this.crises.tornadoRemaining = 26;
      this.crises.tornadoWx = (rx + 0.5) * TILE_SIZE;
      this.crises.tornadoWy = (ry + 0.5) * TILE_SIZE;
      this.tornadoVx = (Math.random() < 0.5 ? -1 : 1) * (28 + Math.random() * 16);
      this.tornadoVy = (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 14);
      this.tornadoCasualtyCount = 0;
      this.tornadoBasementLabelCooldown = 0;
      this.floatingLabels.push({
        wx: this.crises.tornadoWx,
        wy: this.crises.tornadoWy - 14,
        text: isNatural ? 'NATURAL TORNADO!' : 'TORNADO WARNING!',
        color: '#FEF2F2',
        bgColor: '#475569',
        age: 0,
        maxAge: 2.5,
      });
      this.logDailyNews(
        isNatural
          ? `NATURE ALERT: A sudden natural tornado touched down during ${this.weather.toLowerCase()} ${this.season.toLowerCase()} weather, tearing across town!`
          : 'TWISTER ALERT: A destructive tornado touched down, tearing through buildings, trees, and roads in its path!'
      );
    } else if (type === 'earthquake') {
      this.crises.earthquakeActive = true;
      this.crises.earthquakeRemaining = 14;
      this.earthquakeShakeIntensity = 1.0;

      // Split land apart with a continuous jagged water fault rift across town!
      const landCandidates = this.tiles.filter(
        (t) =>
          t.terrain !== 'water' &&
          t.terrain !== 'void' &&
          t.building?.category !== 'city_hall' &&
          !t.building?.hasBasement &&
          t.x >= 2 &&
          t.x <= this.gridCols - 3 &&
          t.y >= 2 &&
          t.y <= this.gridRows - 3
      );
      let splitCount = 0;
      let riftOrigin =
        landCandidates.length > 0
          ? landCandidates[Math.floor(Math.random() * landCandidates.length)]
          : null;

      if (riftOrigin) {
        const horiz = Math.random() < 0.55;
        const primaryDx = horiz ? (riftOrigin.x < this.gridCols / 2 ? 1 : -1) : 0;
        const primaryDy = horiz ? 0 : riftOrigin.y < this.gridRows / 2 ? 1 : -1;
        let cx = riftOrigin.x;
        let cy = riftOrigin.y;
        const riftSteps = 9 + Math.floor(Math.random() * 4);

        for (let step = 0; step < riftSteps; step++) {
          const cur = this.getTile(cx, cy);
          if (cur && cur.terrain !== 'void') {
            if (cur.terrain !== 'water') {
              if (this.splitTileIntoEarthquakeWater(cur)) {
                splitCount++;
              }
            }
          }
          // Step primarily along the fault axis with natural jagged lateral zig-zags
          const zig = Math.random() < 0.42 ? (Math.random() < 0.5 ? -1 : 1) : 0;
          let nx = cx + primaryDx + (horiz ? 0 : zig);
          let ny = cy + primaryDy + (horiz ? zig : 0);
          nx = Math.max(1, Math.min(this.gridCols - 2, nx));
          ny = Math.max(1, Math.min(this.gridRows - 2, ny));

          // Route around City Hall / basement-protected tile so fault shifts cleanly
          const probe = this.getTile(nx, ny);
          if (probe && (probe.building?.category === 'city_hall' || probe.building?.hasBasement)) {
            if (probe.building?.hasBasement) {
              this.splitTileIntoEarthquakeWater(probe);
            }
            nx = Math.max(1, Math.min(this.gridCols - 2, cx + (horiz ? primaryDx : 1)));
            ny = Math.max(1, Math.min(this.gridRows - 2, cy + (horiz ? 1 : primaryDy)));
          }
          cx = nx;
          cy = ny;
        }
        this.rebuildCaches();
      }

      // Crack 1-2 bridges & drop up to 3 road craters along tremors
      const waterRoads = this.tiles.filter(
        (t) => t.terrain === 'water' && (t.hasRoad || t.hasFootbridge) && !t.isBridgeBroken
      );
      for (const pick of waterRoads.sort(() => Math.random() - 0.5).slice(0, 2)) {
        pick.isBridgeBroken = true;
        this.brokenBridges.push({
          id: `br_${this.brokenBridgeIdCounter++}`,
          x: pick.x,
          y: pick.y,
          wx: (pick.x + 0.5) * TILE_SIZE,
          wy: (pick.y + 0.5) * TILE_SIZE,
          kind: pick.hasRoad ? 'road' : 'footbridge',
          elapsedSeconds: 0,
          maxRepairSeconds: 32,
          repairerDispatched: false,
          repairerArrived: false,
          status: 'broken',
          statusTimer: 0,
        });
      }
      const roadTiles = this.tiles
        .filter((t) => t.hasRoad && t.terrain !== 'water')
        .sort(() => Math.random() - 0.5);
      for (const spot of roadTiles.slice(0, 3)) {
        if (this.blastCraters.length >= 64) break;
        if (!this.blastCraters.some((c) => c.x === spot.x && c.y === spot.y)) {
          this.blastCraters.push({
            id: `crater_${this.craterIdCounter++}`,
            x: spot.x,
            y: spot.y,
            wx: (spot.x + 0.5) * TILE_SIZE,
            wy: (spot.y + 0.5) * TILE_SIZE,
            radius: 10,
            age: 0,
          });
        }
      }

      this.floatingLabels.push({
        wx: ((riftOrigin?.x ?? this.gridCols / 2) + 0.5) * TILE_SIZE,
        wy: ((riftOrigin?.y ?? this.gridRows / 2) + 0.4) * TILE_SIZE,
        text: splitCount > 0
          ? isNatural
            ? 'NATURAL QUAKE RIFT!'
            : 'EARTHQUAKE RIFT!'
          : isNatural
          ? 'NATURAL EARTHQUAKE!'
          : 'EARTHQUAKE!',
        color: '#FEF2F2',
        bgColor: '#92400E',
        age: 0,
        maxAge: 2.8,
      });
      this.logDailyNews(
        splitCount > 0
          ? `${isNatural ? 'NATURAL EARTHQUAKE' : 'EARTHQUAKE RIFT'}: The ground split apart across ${splitCount} tiles, opening a water chasm through town!`
          : `${isNatural ? 'NATURAL EARTHQUAKE' : 'EARTHQUAKE'}! Tremors cracked bridges and buckled streets across town.`
      );
    } else if (type === 'flood') {
      this.crises.floodActive = true;
      this.crises.floodRemaining = 36;
      this.floodDrownAccumulator = 0;
      this.floodDrownCount = 0;
      this.floodNewsLogged = false;

      // Submerge the ENTIRE city (all non-void, non-water tiles)
      for (const t of this.tiles) {
        if (t.terrain !== 'void' && t.terrain !== 'water') {
          t.isFlooded = true;
        }
      }

      // Send outdoor citizens rushing to the nearest tall shelter building
      const tallShelters = this.buildingsList.filter((b) => this.isTallShelterBuilding(b));
      if (tallShelters.length > 0) {
        const shelteredRoles = new Set<Person['role']>([
          'pedestrian',
          'shopper',
          'hobbyist',
          'fisher',
          'woodcutter',
          'planter',
          'farmer',
          'butcher',
          'beggar',
          'vendor',
          'student',
          'parent',
          'builder',
        ]);
        for (const p of this.people) {
          if (!shelteredRoles.has(p.role) || p.floodSheltering) continue;
          const shelter = this.findNearestTallShelter(p.wx, p.wy);
          if (!shelter) continue;
          p.role = 'pedestrian';
          p.floodSheltering = true;
          p.state = 'walking';
          p.speed = 46 + Math.random() * 10;
          p.destBuildingId = shelter.id;
          p.pedestrianPath = undefined;
          this.assignPedestrianRoute(
            p,
            shelter.x,
            shelter.y,
            (shelter.x + 0.5) * TILE_SIZE,
            (shelter.y + 0.72) * TILE_SIZE
          );
        }

        // Also spawn several fleeing residents from flooded low buildings heading to tall buildings
        const lowHouses = this.buildingsList
          .filter((b) => !this.isTallShelterBuilding(b) && b.category !== 'park' && b.category !== 'crops')
          .sort(() => Math.random() - 0.5)
          .slice(0, 6);
        for (const low of lowHouses) {
          const shelter = this.findNearestTallShelter(
            (low.x + 0.5) * TILE_SIZE,
            (low.y + 0.5) * TILE_SIZE
          );
          if (!shelter) continue;
          const fleePerson: Person = {
            id: `ppl_${this.personIdCounter++}`,
            role: 'pedestrian',
            wx: (low.x + 0.5) * TILE_SIZE,
            wy: (low.y + 0.76) * TILE_SIZE,
            targetWx: (shelter.x + 0.5) * TILE_SIZE,
            targetWy: (shelter.y + 0.72) * TILE_SIZE,
            speed: 48 + Math.random() * 10,
            shirtColor: '#38BDF8',
            animPhase: Math.random() * Math.PI * 2,
            state: 'walking',
            homeBuildingId: low.id,
            destBuildingId: shelter.id,
            targetTileX: shelter.x,
            targetTileY: shelter.y,
            holdTimer: 18,
            floodSheltering: true,
          };
          if (
            this.assignPedestrianRoute(
              fleePerson,
              shelter.x,
              shelter.y,
              fleePerson.targetWx,
              fleePerson.targetWy
            )
          ) {
            this.people.push(fleePerson);
          }
        }
      }

      this.floatingLabels.push({
        wx: (this.gridCols * TILE_SIZE) * 0.5,
        wy: (this.gridRows * TILE_SIZE) * 0.42,
        text: isNatural ? 'NATURAL FLASH FLOOD!' : 'CITYWIDE FLOOD!',
        color: '#E0F2FE',
        bgColor: '#0369A1',
        age: 0,
        maxAge: 2.8,
      });
      this.logDailyNews(
        isNatural
          ? `NATURAL FLOOD: Heavy ${this.weather.toLowerCase()} floodwaters submerged the city—citizens are climbing tall buildings to stay above water!`
          : 'CITYWIDE FLOOD: Deep floodwaters submerged the entire city—citizens are climbing tall buildings to stay above water!'
      );
    }

    if (playAudio) soundEngine.playDisasterRumble();
    return true;
  }

  private reduceMarketProduceForPollution() {
    if (this.crises.pollutionLevel < 35) return;
    const factor = Math.max(0.25, 1 - (this.crises.pollutionLevel / 100) * 0.75);
    for (const stall of this.marketStalls) {
      if (stall.goods === 'produce' || stall.goods === 'fish') {
        stall.stock = Math.max(1, Math.min(stall.stock, Math.ceil(5 * factor)));
      }
    }
  }

  public dispatchMayorCleaners(count = 2) {
    const bases = this.buildingsList.filter(
      (b) => b.category === 'city_hall' || b.category === 'park' || b.category === 'residential'
    );
    if (bases.length === 0) return;

    const cityHalls = bases.filter((b) => b.category === 'city_hall');
    const originPool = cityHalls.length > 0 ? cityHalls : bases;

    const dirtyTargets: MapTile[] = [];
    // Prioritize actual littered tiles or shorelines next to ocean trash!
    for (const tr of this.trashItems) {
      if (!tr.inWater) {
        const t = this.getTile(tr.x, tr.y);
        if (t && isPedestrianTileWalkable(t)) dirtyTargets.push(t);
      } else {
        const dirs = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 },
        ];
        for (const d of dirs) {
          const nt = this.getTile(tr.x + d.dx, tr.y + d.dy);
          if (nt && isPedestrianTileWalkable(nt)) {
            dirtyTargets.push(nt);
            break;
          }
        }
      }
    }

    if (dirtyTargets.length === 0) {
      for (const t of this.tiles) {
        if (!isPedestrianTileWalkable(t)) continue;
        const nearWater =
          this.getTile(t.x + 1, t.y)?.terrain === 'water' ||
          this.getTile(t.x - 1, t.y)?.terrain === 'water' ||
          this.getTile(t.x, t.y + 1)?.terrain === 'water' ||
          this.getTile(t.x, t.y - 1)?.terrain === 'water';
        if (nearWater || t.hasRoad) dirtyTargets.push(t);
      }
    }
    if (dirtyTargets.length === 0) return;

    for (let k = 0; k < count; k++) {
      const origin = originPool[k % originPool.length];
      const shuffled = [...dirtyTargets].sort(() => Math.random() - 0.5);
      for (const spot of shuffled.slice(0, 8)) {
        const path = this.findPedestrianPath(this.tiles, { x: origin.x, y: origin.y }, { x: spot.x, y: spot.y });
        if (!path) continue;
        this.people.push({
          id: `ppl_${this.personIdCounter++}`,
          role: 'cleaner',
          wx: (origin.x + 0.5) * TILE_SIZE,
          wy: (origin.y + 0.78) * TILE_SIZE,
          targetWx: (spot.x + 0.5) * TILE_SIZE,
          targetWy: (spot.y + 0.55) * TILE_SIZE,
          speed: 31,
          shirtColor: '#0EA5E9',
          hatColor: '#FACC15',
          animPhase: Math.random() * Math.PI * 2,
          state: 'walking',
          homeBuildingId: origin.id,
          targetTileX: spot.x,
          targetTileY: spot.y,
          pedestrianPath: path,
          pedestrianPathIndex: path.length > 1 ? 1 : 0,
          holdTimer: 0,
        });
        break;
      }
    }
  }

  public dispatchMayorRepairCrew(count = 2) {
    if (this.blastCraters.length === 0) return;
    const bases = this.buildingsList.filter(
      (b) => b.category === 'city_hall' || b.category === 'workplace' || b.category === 'fire_station'
    );
    const originPool = bases.length > 0 ? bases : this.buildingsList.filter((b) => b.category !== 'road_path');
    if (originPool.length === 0) return;

    const cityHalls = originPool.filter((b) => b.category === 'city_hall');
    const preferred = cityHalls.length > 0 ? cityHalls : originPool;

    for (let k = 0; k < count; k++) {
      const crater = this.blastCraters[k % this.blastCraters.length];
      const origin = preferred[k % preferred.length];
      const path = this.findPedestrianPath(this.tiles, { x: origin.x, y: origin.y }, { x: crater.x, y: crater.y });
      if (!path) continue;
      this.people.push({
        id: `ppl_${this.personIdCounter++}`,
        role: 'repairer',
        wx: (origin.x + 0.5) * TILE_SIZE,
        wy: (origin.y + 0.78) * TILE_SIZE,
        targetWx: crater.wx,
        targetWy: crater.wy,
        speed: 32,
        shirtColor: '#EA580C',
        hatColor: '#FDE047',
        animPhase: Math.random() * Math.PI * 2,
        state: 'walking',
        homeBuildingId: origin.id,
        targetTileX: crater.x,
        targetTileY: crater.y,
        pedestrianPath: path,
        pedestrianPathIndex: path.length > 1 ? 1 : 0,
        holdTimer: 0,
      });
    }
  }

  public spawnInvadingArmy(count = 4) {
    const targets = this.buildingsList.filter((b) => b.category !== 'road_path');
    if (targets.length === 0) return;
    const cityHalls = targets.filter((b) => b.category === 'city_hall');

    // Invading foreign nation forces & armored tanks enter from the 4 corners and playable perimeter edges
    const cornerEntries: MapTile[] = [];
    const edgeEntries: MapTile[] = [];
    const dirs4 = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    for (const t of this.tiles) {
      if (t.terrain === 'void') continue;
      const onOuter = t.x === 0 || t.y === 0 || t.x === this.gridCols - 1 || t.y === this.gridRows - 1;
      const touchesVoid = dirs4.some((d) => this.getTile(t.x + d.dx, t.y + d.dy)?.terrain === 'void');
      const inCorner =
        (t.x <= 4 || t.x >= this.gridCols - 5) && (t.y <= 4 || t.y >= this.gridRows - 5) && (onOuter || touchesVoid);
      if (inCorner) cornerEntries.push(t);
      else if (onOuter || touchesVoid) edgeEntries.push(t);
    }
    const entryPool = cornerEntries.length > 0 || edgeEntries.length > 0 ? [...cornerEntries, ...edgeEntries] : [];
    if (entryPool.length === 0) return;

    let spawnedCount = 0;
    let announcedWx: number | undefined;
    let announcedWy: number | undefined;

    for (let k = 0; k < count; k++) {
      const preferCorner = cornerEntries.length > 0 && Math.random() < 0.6;
      const sourcePool = preferCorner ? cornerEntries : entryPool;
      const entry = sourcePool[Math.floor(Math.random() * sourcePool.length)];
      const aimAtHall = cityHalls.length > 0 && (k === 0 || (this.mayorAlive && Math.random() < 0.55));
      const dest = aimAtHall
        ? cityHalls[0]
        : targets[Math.floor(Math.random() * targets.length)];
      const path = this.findPedestrianPath(this.tiles, { x: entry.x, y: entry.y }, { x: dest.x, y: dest.y }, false, true);
      if (!path) continue;
      const hasTank = k === 0 || Math.random() < 0.48;
      const wx = (entry.x + 0.5) * TILE_SIZE;
      const wy = (entry.y + 0.5) * TILE_SIZE;
      if (announcedWx === undefined) {
        announcedWx = wx;
        announcedWy = wy;
      }
      this.people.push({
        id: `ppl_${this.personIdCounter++}`,
        role: 'invader',
        hasTank,
        health: hasTank ? 4 : 2,
        wx,
        wy,
        targetWx: (dest.x + 0.5) * TILE_SIZE,
        targetWy: (dest.y + 0.78) * TILE_SIZE,
        speed: hasTank ? 28 : 34,
        shirtColor: '#991B1B',
        hatColor: '#450A0A',
        animPhase: Math.random() * Math.PI * 2,
        state: 'invading',
        shootCooldown: 0.9 + Math.random() * 1.4,
        destBuildingId: dest.id,
        targetTileX: dest.x,
        targetTileY: dest.y,
        pedestrianPath: path,
        pedestrianPathIndex: path.length > 1 ? 1 : 0,
        holdTimer: 0,
      });
      spawnedCount++;
    }

    if (spawnedCount > 0 && announcedWx !== undefined && announcedWy !== undefined) {
      this.floatingLabels.push({
        wx: announcedWx,
        wy: announcedWy - 12,
        text: 'FOREIGN INVASION!',
        color: '#FEF2F2',
        bgColor: '#991B1B',
        age: 0,
        maxAge: 2.2,
      });
      this.logDailyNews(`FOREIGN INVASION! Armies and tanks crossed the border of ${this.mapName} firing at buildings and marching on City Hall!`);
    }
  }

  public triggerInvasionWave(playAudio = true): boolean {
    if (this.chaosCooldowns.invade > 0) return false;
    this.chaosCooldowns.invade = this.CHAOS_COOLDOWN_SECONDS;

    if (!this.crises.warActive) {
      this.crises.warActive = true;
      this.crises.warRemaining = 85;
      this.spawnSoldierPatrol(3);
    } else if (this.people.filter((p) => p.role === 'soldier').length < 2) {
      this.spawnSoldierPatrol(2);
    }
    this.spawnInvadingArmy(4);
    if (playAudio) soundEngine.playCrisisAlert();
    return true;
  }

  public triggerNukeStrike(targetX?: number, targetY?: number, playAudio = true): boolean {
    if (this.chaosCooldowns.nuke > 0) return false;
    this.chaosCooldowns.nuke = this.CHAOS_COOLDOWN_SECONDS;

    let tx = targetX;
    let ty = targetY;

    if (tx === undefined || ty === undefined) {
      // Truly random coordinates across the map (avoid extreme corners)
      tx = 1 + Math.floor(Math.random() * (this.gridCols - 2));
      ty = 1 + Math.floor(Math.random() * (this.gridRows - 2));
    }

    const wx = (tx + 0.5) * TILE_SIZE;
    const wy = (ty + 0.5) * TILE_SIZE;

    this.nukeBlasts.push({
      id: `nuke_${this.nukeIdCounter++}`,
      x: tx,
      y: ty,
      wx,
      wy,
      age: 0,
      maxAge: 5.5,
    });

    // Fallout & pollution spike
    this.crises.pollutionLevel = Math.min(100, this.crises.pollutionLevel + 48);
    if (!this.crises.pollutionActive) {
      this.crises.pollutionActive = true;
      this.crises.pollutionRemaining = 95;
    }

    // Destroy market stalls in/near blast zone and shrink stock on surviving stalls
    for (let i = this.marketStalls.length - 1; i >= 0; i--) {
      const st = this.marketStalls[i];
      const dist = Math.hypot(st.x - tx, st.y - ty);
      if (dist <= 3.5) {
        this.floatingLabels.push({
          wx: st.wx,
          wy: st.wy - 10,
          text: 'STALL WRECKED!',
          color: '#FEF2F2',
          bgColor: '#B91C1C',
          age: 0,
          maxAge: 2.0,
        });
        for (let k = 0; k < 6; k++) {
          this.woodChips.push({
            wx: st.wx,
            wy: st.wy,
            vx: (Math.random() - 0.5) * 44,
            vy: -16 - Math.random() * 20,
            age: 0,
            maxAge: 0.6,
            color: k % 2 === 0 ? st.awningColor : '#B45309',
          });
        }
        this.removeStallOnTile(st.x, st.y);
      } else {
        st.stock = Math.max(1, Math.floor(st.stock * 0.45));
        st.age += 15;
      }
    }
    this.reduceMarketProduceForPollution();

    // Destroy un-sheltered buildings, permits & leave deep blast craters; buildings with underground basements survive!
    const destroyedBuildingIds = new Set<string>();
    const casualtyBuildings: PlacedBuilding[] = [];

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const distSq = dx * dx + dy * dy;
        if (distSq > 6) continue;
        const t = this.getTile(tx + dx, ty + dy);
        if (!t || t.terrain === 'void') continue;
        this.clearPermitsAtTile(t.x, t.y);

        if (t.terrain === 'water') {
          if ((t.hasRoad || t.hasFootbridge) && !t.isBridgeBroken) {
            t.isBridgeBroken = true;
            this.brokenBridges.push({
              id: `br_${this.brokenBridgeIdCounter++}`,
              x: t.x,
              y: t.y,
              wx: (t.x + 0.5) * TILE_SIZE,
              wy: (t.y + 0.5) * TILE_SIZE,
              kind: t.hasRoad ? 'road' : 'footbridge',
              elapsedSeconds: 0,
              maxRepairSeconds: 34,
              repairerDispatched: false,
              repairerArrived: false,
              status: 'broken',
              statusTimer: 0,
            });
          }
          continue;
        }
        if (t.building?.category === 'city_hall') continue;

        if (t.terrain === 'forest') {
          t.terrain = 'grass';
        }

        const inCoreBlast = distSq <= 4;
        if (
          t.building &&
          (inCoreBlast ||
            t.building.category === 'residential' ||
            t.building.category === 'commercial' ||
            t.building.category === 'park' ||
            t.building.category === 'crops')
        ) {
          if (t.building.hasBasement) {
            this.floatingLabels.push({
              wx: (t.x + 0.5) * TILE_SIZE,
              wy: (t.y + 0.35) * TILE_SIZE,
              text: 'Saved in Basement!',
              color: '#ECFDF5',
              bgColor: '#047857',
              age: 0,
              maxAge: 2.4,
            });
            continue;
          }
          const destroyed = t.building;
          destroyedBuildingIds.add(destroyed.id);
          casualtyBuildings.push(destroyed);
          this.floatingLabels.push({
            wx: (t.x + 0.5) * TILE_SIZE,
            wy: (t.y + 0.4) * TILE_SIZE,
            text: destroyed.category === 'residential' ? 'HOUSE DESTROYED!' : 'DESTROYED!',
            color: '#FEF2F2',
            bgColor: '#991B1B',
            age: 0,
            maxAge: 2.4,
          });
          for (let d = 0; d < 7; d++) {
            this.woodChips.push({
              wx: (t.x + 0.5) * TILE_SIZE,
              wy: (t.y + 0.5) * TILE_SIZE,
              vx: (Math.random() - 0.5) * 48,
              vy: -18 - Math.random() * 22,
              age: 0,
              maxAge: 0.7,
              color: d % 2 === 0 ? '#78350F' : '#64748B',
            });
          }
          t.building = null;
        }

        // Tear up epicenter road tile into a deep ground-zero crater
        if (distSq === 0 && t.hasRoad) {
          t.hasRoad = false;
          t.hasZebraCrossing = false;
          this.cars = this.cars.filter(
            (c) => Math.floor(c.wx / TILE_SIZE) !== t.x || Math.floor(c.wy / TILE_SIZE) !== t.y
          );
        }

        // Place deep scorched nuke craters across core impact zone (including roads so traffic jams around craters)
        if (
          distSq <= 4 &&
          !this.blastCraters.some((c) => c.x === t.x && c.y === t.y) &&
          this.blastCraters.length < 64
        ) {
          this.blastCraters.push({
            id: `crater_${this.craterIdCounter++}`,
            x: t.x,
            y: t.y,
            wx: (t.x + 0.5) * TILE_SIZE,
            wy: (t.y + 0.5) * TILE_SIZE,
            radius: distSq === 0 ? 17 : 10 + Math.random() * 4.5,
            age: 0,
          });
        }
      }
    }

    if (destroyedBuildingIds.size > 0) {
      this.people = this.people.filter(
        (p) =>
          p.role === 'mayor' ||
          p.role === 'police' ||
          p.role === 'firefighter' ||
          p.role === 'medic' ||
          (!destroyedBuildingIds.has(p.homeBuildingId || '') &&
            !destroyedBuildingIds.has(p.destBuildingId || ''))
      );
    }
    this.rebuildCaches();

    // Start 2 contained fires inside blast zone
    let firesStarted = 0;
    for (let dy = -1; dy <= 1 && firesStarted < 2; dy++) {
      for (let dx = -1; dx <= 1 && firesStarted < 2; dx++) {
        const t = this.getTile(tx + dx, ty + dy);
        if (t && t.terrain !== 'water' && !t.hasRoad && t.building?.category !== 'city_hall') {
          if (this.startFireAt(t.x, t.y, false, false)) {
            firesStarted++;
          }
        }
      }
    }

    // Casualties only for unsheltered destroyed buildings (never fall back to City Hall)
    for (const victimBld of casualtyBuildings.slice(0, 3)) {
      this.spawnDeathEvent(victimBld, false);
    }

    // After first nuke, Mayor urges citizens to build underground basements!
    this.hasNukeOccurred = true;
    const hall = this.buildingsList.find((b) => b.category === 'city_hall');
    if (hall && this.mayorAlive) {
      this.mayorSpeeches.push({
        id: `sp_${this.speechIdCounter++}`,
        cityHallId: hall.id,
        x: hall.x,
        y: hall.y,
        topic: 'Build underground basements to survive strikes!',
        kind: 'civic',
        elapsedSeconds: 0,
        durationSeconds: 18,
      });
      this.floatingLabels.push({
        wx: (hall.x + 0.5) * TILE_SIZE,
        wy: (hall.y + 0.25) * TILE_SIZE,
        text: 'Mayor: Build Basements!',
        color: '#FEF9C3',
        bgColor: '#0F766E',
        age: 0,
        maxAge: 2.8,
      });
    }

    // Heavy smoke plume particles
    for (let k = 0; k < 20; k++) {
      const ang = (k / 20) * Math.PI * 2;
      this.smokeParticles.push({
        wx: wx + Math.cos(ang) * (8 + Math.random() * 14),
        wy: wy + Math.sin(ang) * (6 + Math.random() * 10),
        vx: Math.cos(ang) * 14,
        vy: -24 - Math.random() * 24,
        age: 0,
        maxAge: 2.2 + Math.random() * 1.1,
        size: 6 + Math.random() * 5,
        color: k % 2 === 0 ? 'rgba(249, 115, 22, 0.85)' : 'rgba(30, 41, 59, 0.82)',
      });
    }

    // Mayor automatically dispatches repair crews & cleaners immediately
    this.dispatchMayorRepairCrew(3);
    this.dispatchMayorCleaners(2);
    this.logDailyNews(`NUKE BLAST: A massive strike cratered ${this.describeArea(tx, ty)}—the Mayor is urging citizens to build underground basements!`);
    if (playAudio) soundEngine.playNukeExplosion();
    return true;
  }

  public cycleSeason(playAudio = true) {
    const seasons: SeasonType[] = ['Spring', 'Summer', 'Autumn', 'Winter'];
    this.seasonIndex = (this.seasonIndex + 1) % seasons.length;
    this.season = seasons[this.seasonIndex];
    if (this.season === 'Winter' && (this.weather === 'Rain' || this.weather === 'Storm')) {
      this.weather = 'Snow';
    } else if (this.season !== 'Winter' && this.weather === 'Snow') {
      this.weather = 'Sunny';
    }
    if (this.season !== 'Winter') {
      this.snowmen = [];
      this.snowballs = [];
    }
    this.weatherParticles = [];
    if (playAudio) soundEngine.playUiTick();
  }

  public cycleWeather(playAudio = true) {
    const options: WeatherType[] =
      this.season === 'Winter'
        ? ['Sunny', 'Cloudy', 'Foggy', 'Windy', 'Snow', 'Storm']
        : ['Sunny', 'Cloudy', 'Foggy', 'Windy', 'Rain', 'Storm'];
    const idx = options.indexOf(this.weather);
    this.weather = options[(idx + 1) % options.length];
    this.weatherTimer = 85;
    this.weatherParticles = [];
    if (playAudio) soundEngine.playUiTick();
  }

  private rollWeatherForSeason(): WeatherType {
    const r = Math.random();
    let next: WeatherType;
    if (this.season === 'Winter') {
      if (r < 0.28) next = 'Sunny';
      else if (r < 0.52) next = 'Cloudy';
      else if (r < 0.66) next = 'Windy';
      else if (r < 0.74) next = 'Foggy';
      else if (r < 0.95) next = 'Snow';
      else next = 'Storm';
    } else if (this.season === 'Spring') {
      if (r < 0.42) next = 'Sunny';
      else if (r < 0.68) next = 'Cloudy';
      else if (r < 0.82) next = 'Windy';
      else if (r < 0.89) next = 'Foggy';
      else if (r < 0.96) next = 'Rain';
      else next = 'Storm';
    } else if (this.season === 'Summer') {
      if (r < 0.54) next = 'Sunny';
      else if (r < 0.74) next = 'Cloudy';
      else if (r < 0.85) next = 'Windy';
      else if (r < 0.91) next = 'Foggy';
      else if (r < 0.96) next = 'Rain';
      else next = 'Storm';
    } else {
      // Autumn
      if (r < 0.32) next = 'Sunny';
      else if (r < 0.60) next = 'Cloudy';
      else if (r < 0.78) next = 'Windy';
      else if (r < 0.87) next = 'Foggy';
      else if (r < 0.95) next = 'Rain';
      else next = 'Storm';
    }
    // Never roll Foggy twice in a row so fog stays occasional rather than constant
    if (next === 'Foggy' && this.weather === 'Foggy') {
      return 'Cloudy';
    }
    return next;
  }

  private updateWeather(simDt: number, realDt: number) {
    this.weatherTimer -= simDt;
    if (this.weatherTimer <= 0) {
      this.weatherTimer = 65 + Math.random() * 65;
      this.weather = this.rollWeatherForSeason();
      this.weatherParticles = [];
    }

    this.lightningFlash = Math.max(0, this.lightningFlash - realDt * 3.8);
    if (this.weather === 'Storm' && this.lightningFlash <= 0.01 && Math.random() < realDt * 0.16) {
      this.lightningFlash = 0.85;
    }

    const mapW = this.gridCols * TILE_SIZE;
    const mapH = this.gridRows * TILE_SIZE;
    // Windy weather sways trees, grass, and crops visibly without blowing flying particles across the screen
    const targetCount =
      this.weather === 'Storm'
        ? 145
        : this.weather === 'Rain'
        ? 95
        : this.weather === 'Snow'
        ? 95
        : this.weather === 'Windy'
        ? 0
        : this.season === 'Autumn'
        ? 28
        : this.season === 'Spring'
        ? 22
        : 0;

    while (this.weatherParticles.length > targetCount) {
      this.weatherParticles.pop();
    }

    const leafColors = ['#F97316', '#F59E0B', '#DC2626', '#EAB308'];
    const blossomColors = ['#FBCFE8', '#F9A8D4', '#FDF2F8'];

    while (this.weatherParticles.length < targetCount) {
      if (this.weather === 'Rain' || this.weather === 'Storm') {
        const heavy = this.weather === 'Storm';
        this.weatherParticles.push({
          x: Math.random() * mapW,
          y: Math.random() * mapH,
          vx: heavy ? -115 - Math.random() * 35 : -70 - Math.random() * 25,
          vy: heavy ? 340 + Math.random() * 90 : 260 + Math.random() * 70,
          size: heavy ? 11 + Math.random() * 5 : 8 + Math.random() * 4,
          alpha: heavy ? 0.55 + Math.random() * 0.25 : 0.42 + Math.random() * 0.25,
        });
      } else if (this.weather === 'Snow') {
        this.weatherParticles.push({
          x: Math.random() * mapW,
          y: Math.random() * mapH,
          vx: -14 + Math.random() * 28,
          vy: 26 + Math.random() * 24,
          size: 1.6 + Math.random() * 1.8,
          alpha: 0.55 + Math.random() * 0.35,
        });
      } else if (this.season === 'Autumn') {
        this.weatherParticles.push({
          x: Math.random() * mapW,
          y: Math.random() * mapH,
          vx: 14 + Math.random() * 18,
          vy: 18 + Math.random() * 14,
          size: 2.4 + Math.random() * 1.4,
          alpha: 0.78,
          color: leafColors[Math.floor(Math.random() * leafColors.length)],
        });
      } else {
        this.weatherParticles.push({
          x: Math.random() * mapW,
          y: Math.random() * mapH,
          vx: 10 + Math.random() * 14,
          vy: 14 + Math.random() * 12,
          size: 2.0 + Math.random() * 1.2,
          alpha: 0.72,
          color: blossomColors[Math.floor(Math.random() * blossomColors.length)],
        });
      }
    }

    for (const pt of this.weatherParticles) {
      pt.x += pt.vx * realDt;
      pt.y += pt.vy * realDt;
      if (this.weather === 'Snow' || this.weather === 'Sunny') {
        pt.x += Math.sin(pt.y * 0.03) * 10 * realDt;
      }
      if (pt.y > mapH) pt.y -= mapH;
      if (pt.y < 0) pt.y += mapH;
      if (pt.x > mapW) pt.x -= mapW;
      if (pt.x < 0) pt.x += mapW;
    }
  }

  private getHappinessMood(score: number): HappinessMood {
    if (score >= 75) return 'Thriving';
    if (score >= 52) return 'Content';
    if (score >= 30) return 'Strained';
    return 'Miserable';
  }

  private updateCitizenHappiness(simDt: number, realDt: number) {
    this.lawsuitShock = Math.max(0, this.lawsuitShock - simDt * 0.25);
    let parks = 0;
    let shops = 0;
    let schools = 0;
    let hospitals = 0;
    let safetyBlds = 0;

    for (const b of this.buildingsList) {
      if (b.category === 'park') parks++;
      else if (b.category === 'commercial' || b.category === 'visit_spot' || b.category === 'landmark') shops++;
      else if (b.category === 'school') schools++;
      else if (b.category === 'hospital') hospitals++;
      else if (b.category === 'police' || b.category === 'fire_station') safetyBlds++;
    }

    const forestCount = this.tiles.filter((t) => t.terrain === 'forest').length;
    const parkBoost = Math.min(16, parks * 4.5);
    const shopBoost = Math.min(12, shops * 2.5);
    const schoolBoost = Math.min(8, schools * 4);
    const hospitalBoost = Math.min(8, hospitals * 4);
    const safetyBoost = Math.min(10, safetyBlds * 3);
    const stallBoost = Math.min(6, this.marketStalls.length * 1.5);
    const eventBoost = Math.min(14, this.cityEvents.length * 7);
    const treeDelta = forestCount >= 10 ? 4 : forestCount === 0 ? -5 : 0;

    let jammedCars = 0;
    let totalSpeedRatio = 0;
    for (const c of this.cars) {
      if (c.isJammed) jammedCars++;
      totalSpeedRatio += c.speed / c.maxSpeed;
    }
    const flowPct = this.cars.length === 0 ? 100 : (totalSpeedRatio / this.cars.length) * 100;
    const trafficBoost = flowPct >= 80 ? 6 : flowPct >= 65 ? 2 : 0;
    const trafficPenalty =
      (flowPct < 55 ? Math.min(16, (55 - flowPct) * 0.35) : 0) +
      Math.min(10, jammedCars * 1.1) +
      Math.min(12, this.crashes.filter((c) => c.status === 'active').length * 5);

    const activeFires = this.fires.filter((f) => f.status === 'active').length;
    const activeRobberies = this.robberies.filter((r) => r.status === 'active').length;
    const activeProtests = this.protests.filter((p) => p.status === 'active').length;
    const infected = this.people.filter((p) => p.isInfected).length;
    const invaders = this.people.filter((p) => p.role === 'invader').length;

    const virusPenalty = this.crises.virusActive ? 16 + Math.min(8, infected * 0.8) : 0;
    const warPenalty = this.crises.warActive ? 18 + Math.min(10, invaders * 2.5) : 0;
    const povertyPenalty = this.crises.povertyActive ? 15 : 0;
    const pollutionPenalty = this.crises.pollutionLevel * 0.24;
    const craterPenalty = Math.min(12, this.blastCraters.length * 1.5);
    const lawsuitPenalty = Math.min(10, this.lawsuitShock * 0.35);
    const incidentPenalty =
      Math.min(12, activeFires * 6) +
      Math.min(10, activeRobberies * 5) +
      Math.min(8, activeProtests * 4);

    const weatherDelta =
      this.weather === 'Storm'
        ? -4
        : this.weather === 'Sunny' && (this.season === 'Spring' || this.season === 'Summer')
        ? 3
        : 0;
    const coopedUpPenalty = this.isOutdoorCurfew() ? (this.isRainingOrStorming() ? 4 : 2) : 0;
    const bridgePenalty = Math.min(8, this.brokenBridges.filter((b) => b.status === 'broken').length * 4);

    const amenitiesTotal = parkBoost + shopBoost + schoolBoost + hospitalBoost + safetyBoost + stallBoost + eventBoost;
    const rawTarget =
      56 +
      amenitiesTotal +
      treeDelta +
      trafficBoost +
      weatherDelta -
      trafficPenalty -
      virusPenalty -
      warPenalty -
      povertyPenalty -
      pollutionPenalty -
      craterPenalty -
      lawsuitPenalty -
      incidentPenalty -
      coopedUpPenalty -
      bridgePenalty;

    const target = Math.max(5, Math.min(100, rawTarget));
    this.citizenHappiness += (target - this.citizenHappiness) * Math.min(1, realDt * 0.9);

    const notes: string[] = [];
    if (amenitiesTotal >= 14) notes.push(`Amenities +${Math.round(amenitiesTotal)}`);
    if (eventBoost > 0) notes.push(`Events +${Math.round(eventBoost)}`);
    if (trafficBoost >= 4) notes.push('Smooth traffic +6');
    if (trafficPenalty >= 4) notes.push(`Traffic -${Math.round(trafficPenalty)}`);
    if (pollutionPenalty >= 4) notes.push(`Pollution -${Math.round(pollutionPenalty)}`);
    if (virusPenalty > 0) notes.push(`Virus -${Math.round(virusPenalty)}`);
    if (warPenalty > 0) notes.push(`War -${Math.round(warPenalty)}`);
    if (povertyPenalty > 0) notes.push(`Poverty -${Math.round(povertyPenalty)}`);
    if (lawsuitPenalty >= 2) notes.push(`Lawsuits -${Math.round(lawsuitPenalty)}`);
    if (craterPenalty > 0) notes.push(`Craters -${Math.round(craterPenalty)}`);
    if (incidentPenalty > 0) notes.push(`Incidents -${Math.round(incidentPenalty)}`);
    if (bridgePenalty > 0) notes.push(`Broken bridge -${bridgePenalty}`);
    if (coopedUpPenalty > 0) notes.push(`Stuck indoors -${coopedUpPenalty}`);
    if (weatherDelta > 0) notes.push(`${this.season} sun +3`);
    else if (weatherDelta < 0) notes.push('Storm -4');
    this.happinessSummary = notes.length > 0 ? notes.slice(0, 4).join(' · ') : 'Balanced city conditions';
  }

  private spawnSoldierPatrol(count = 1) {
    const bases = this.buildingsList.filter(
      (b) => b.category === 'city_hall' || b.category === 'police'
    );
    if (bases.length === 0) return;

    for (let k = 0; k < count; k++) {
      const base = bases[Math.floor(Math.random() * bases.length)];
      const invaders = this.people.filter((p) => p.role === 'invader');
      const targets = this.buildingsList.filter((b) => b.id !== base.id && b.category !== 'road_path');
      const destPt =
        invaders.length > 0
          ? { x: Math.floor(invaders[k % invaders.length].wx / TILE_SIZE), y: Math.floor(invaders[k % invaders.length].wy / TILE_SIZE) }
          : targets.length > 0
          ? { x: targets[Math.floor(Math.random() * targets.length)].x, y: targets[Math.floor(Math.random() * targets.length)].y }
          : null;
      if (!destPt) return;
      const path = this.findPedestrianPath(this.tiles, { x: base.x, y: base.y }, destPt, false, this.crises.warActive);
      if (!path) continue;
      this.people.push({
        id: `ppl_${this.personIdCounter++}`,
        role: 'soldier',
        wx: (base.x + 0.5) * TILE_SIZE,
        wy: (base.y + 0.78) * TILE_SIZE,
        targetWx: (destPt.x + 0.5) * TILE_SIZE,
        targetWy: (destPt.y + 0.78) * TILE_SIZE,
        speed: 35,
        shirtColor: '#3F6212',
        hatColor: '#365314',
        animPhase: Math.random() * Math.PI * 2,
        state: 'patrolling',
        homeBuildingId: base.id,
        targetTileX: destPt.x,
        targetTileY: destPt.y,
        pedestrianPath: path,
        pedestrianPathIndex: path.length > 1 ? 1 : 0,
        holdTimer: 0,
      });
    }
  }

  private updateCrises(simDt: number, realDt: number, playAudio: boolean) {
    // 0. Step 5-minute City Chaos Cooldowns, Blast animations & Craters (auto-fixed in 1 minute)
    this.chaosCooldowns.virus = Math.max(0, this.chaosCooldowns.virus - simDt);
    this.chaosCooldowns.war = Math.max(0, this.chaosCooldowns.war - simDt);
    this.chaosCooldowns.poverty = Math.max(0, this.chaosCooldowns.poverty - simDt);
    this.chaosCooldowns.pollution = Math.max(0, this.chaosCooldowns.pollution - simDt);
    this.chaosCooldowns.invade = Math.max(0, this.chaosCooldowns.invade - simDt);
    this.chaosCooldowns.nuke = Math.max(0, this.chaosCooldowns.nuke - simDt);
    this.chaosCooldowns.tornado = Math.max(0, this.chaosCooldowns.tornado - simDt);
    this.chaosCooldowns.earthquake = Math.max(0, this.chaosCooldowns.earthquake - simDt);
    this.chaosCooldowns.flood = Math.max(0, this.chaosCooldowns.flood - simDt);

    // Citizens gradually build underground basements after the first nuke strike
    if (this.hasNukeOccurred) {
      this.basementSpreadAccumulator += simDt;
      if (this.basementSpreadAccumulator >= 9.0) {
        this.basementSpreadAccumulator = 0;
        const unprotected = this.buildingsList.filter(
          (b) =>
            !b.hasBasement &&
            (b.category === 'residential' ||
              b.category === 'school' ||
              b.category === 'workplace' ||
              b.category === 'hospital' ||
              b.category === 'commercial')
        );
        if (unprotected.length > 0) {
          const bld = unprotected[Math.floor(Math.random() * unprotected.length)];
          bld.hasBasement = true;
          this.floatingLabels.push({
            wx: (bld.x + 0.5) * TILE_SIZE,
            wy: (bld.y + 0.28) * TILE_SIZE,
            text: '+Basement Built!',
            color: '#ECFDF5',
            bgColor: '#0F766E',
            age: 0,
            maxAge: 1.7,
          });
        }
      }
    }

    for (let i = this.nukeBlasts.length - 1; i >= 0; i--) {
      this.nukeBlasts[i].age += realDt;
      if (this.nukeBlasts[i].age >= this.nukeBlasts[i].maxAge) {
        this.nukeBlasts.splice(i, 1);
      }
    }
    for (let i = this.blastCraters.length - 1; i >= 0; i--) {
      const c = this.blastCraters[i];
      c.age += simDt;
      const roadTile = this.getTile(c.x, c.y);
      if (roadTile && roadTile.hasRoad) {
        roadTile.congestionScore = Math.min(1, roadTile.congestionScore + simDt * 0.35);
      }
      // Guarantee every crater is repaired within 1 minute (60s)
      if (c.age >= 60) {
        this.blastCraters.splice(i, 1);
        this.floatingLabels.push({
          wx: c.wx,
          wy: c.wy - 8,
          text: '+Repaired!',
          color: '#0F172A',
          bgColor: '#FACC15',
          age: 0,
          maxAge: 1.4,
        });
        if (playAudio) soundEngine.playCleanSparkle();
      }
    }

    // 1. Ocean Trash & Pollution + Mayor Cleanup Crews (water turns polluted when ocean trash piles up!)
    const workplaces = this.buildingsList.filter((b) => b.category === 'workplace').length;
    const factories = this.buildingsList.filter((b) => b.category === 'factory').length;
    const oceanTrash = this.trashItems.filter((t) => t.inWater).length;
    const landTrash = this.trashItems.filter((t) => !t.inWater).length;

    this.pollutionTickAccumulator += simDt;
    if (this.pollutionTickAccumulator >= 2.0) {
      this.pollutionTickAccumulator = 0;
      const trashEmission = oceanTrash * 0.32 + landTrash * 0.05;
      const emission =
        (this.crises.pollutionActive ? 1.1 : 0) +
        (oceanTrash >= 10 ? 2.4 : 0) +
        workplaces * 0.03 +
        factories * 0.14 +
        trashEmission;

      if (oceanTrash >= 10 && !this.crises.pollutionActive && this.crises.pollutionLevel < 42) {
        this.crises.pollutionLevel = 42;
        this.logDailyNews('HOT TAKE: Someone dumped way too much trash into the ocean and now the fish look grumpy—Mayor yelled "Grab a mop, everyone!"');
        const hall = this.buildingsList.find((b) => b.category === 'city_hall');
        if (hall && this.mayorAlive && this.mayorSpeeches.length === 0) {
          this.mayorSpeeches.push({
            id: `sp_${this.speechIdCounter++}`,
            cityHallId: hall.id,
            x: hall.x,
            y: hall.y,
            topic: 'Ocean trash is polluting our waters! Clean it up!',
            kind: 'civic',
            elapsedSeconds: 0,
            durationSeconds: 18,
          });
        }
        this.dispatchMayorCleaners(2);
      }

      if (emission > 0.25) {
        const cap = this.crises.pollutionActive || oceanTrash >= 10 ? 100 : factories > 0 ? 22 : 12;
        if (this.crises.pollutionLevel < cap) {
          this.crises.pollutionLevel = Math.min(cap, this.crises.pollutionLevel + emission);
        } else if (!this.crises.pollutionActive && oceanTrash < 10) {
          this.crises.pollutionLevel = Math.max(cap, this.crises.pollutionLevel - 0.35);
        }
      } else if (!this.crises.pollutionActive && oceanTrash < 5 && this.crises.pollutionLevel > 0) {
        this.crises.pollutionLevel = Math.max(0, this.crises.pollutionLevel - 0.45);
      }
    }

    if (this.crises.pollutionActive) {
      this.crises.pollutionRemaining = Math.max(0, this.crises.pollutionRemaining - simDt);
      if (this.crises.pollutionRemaining <= 0 && oceanTrash < 10) {
        this.crises.pollutionActive = false;
      }
    }

    // Mayor dispatches cleaners when pollution >= 18 or trash accumulates
    const activeCleaners = this.people.filter((p) => p.role === 'cleaner').length;
    if (
      (this.crises.pollutionActive || this.crises.pollutionLevel >= 18 || this.trashItems.length >= 4) &&
      activeCleaners < 3
    ) {
      if (Math.random() < realDt * 0.5) {
        this.dispatchMayorCleaners(1);
      }
    }

    // Mayor dispatches repair crews automatically whenever nuke/war craters exist
    const activeRepairers = this.people.filter((p) => p.role === 'repairer').length;
    if (this.blastCraters.length > 0 && activeRepairers < Math.min(4, Math.ceil(this.blastCraters.length / 2))) {
      if (Math.random() < realDt * 0.5) {
        this.dispatchMayorRepairCrew(1);
      }
    }

    // Step Cleaners & Repairers
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];

      if (p.role === 'cleaner') {
        if (p.state === 'walking') {
          const res = this.stepPersonAlongPath(p, realDt, 8);
          if (res === 'arrived') {
            p.state = 'cleaning';
            p.holdTimer = 2.4;
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'cleaning') {
          p.animPhase += realDt * 8;
          p.holdTimer -= realDt;
          if (p.holdTimer <= 0) {
            // Remove up to 2 nearby trash items (including coastal ocean trash!)
            let picked = 0;
            for (let tIdx = this.trashItems.length - 1; tIdx >= 0 && picked < 2; tIdx--) {
              const tr = this.trashItems[tIdx];
              if (Math.hypot(tr.wx - p.wx, tr.wy - p.wy) <= TILE_SIZE * 2.1) {
                this.trashItems.splice(tIdx, 1);
                picked++;
              }
            }
            this.crises.pollutionLevel = Math.max(0, this.crises.pollutionLevel - (picked > 0 ? 11 : 8));
            if (this.crises.pollutionLevel <= 6 && this.trashItems.filter((t) => t.inWater).length < 6) {
              this.crises.pollutionActive = false;
              this.crises.pollutionRemaining = 0;
            }
            this.floatingLabels.push({
              wx: p.wx,
              wy: p.wy - 10,
              text: picked > 0 ? '+Trash Cleared!' : '+Cleaned!',
              color: '#F8FAFC',
              bgColor: '#0284C7',
              age: 0,
              maxAge: 1.4,
            });
            for (let s = 0; s < 5; s++) {
              this.confetti.push({
                wx: p.wx + (Math.random() - 0.5) * 10,
                wy: p.wy,
                vx: (Math.random() - 0.5) * 26,
                vy: -16 - Math.random() * 14,
                age: 0,
                maxAge: 0.65,
                color: s % 2 === 0 ? '#38BDF8' : '#4ADE80',
                size: 2.1,
              });
            }
            if (playAudio) soundEngine.playCleanSparkle();
            if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 8);
          if (res !== 'moving' || p.holdTimer <= 0) this.people.splice(i, 1);
        }
        continue;
      }

      if (p.role === 'repairer') {
        if (p.state === 'walking') {
          const res = this.stepPersonAlongPath(p, realDt, 8);
          if (res === 'arrived') {
            const nearBrokenBridge = this.brokenBridges.some(
              (b) =>
                b.status === 'broken' &&
                p.targetTileX !== undefined &&
                p.targetTileY !== undefined &&
                Math.abs(b.x - p.targetTileX) + Math.abs(b.y - p.targetTileY) <= 1
            );
            if (nearBrokenBridge) {
              p.state = 'fixing_bridge';
              p.holdTimer = 4.2;
              const inc = this.brokenBridges.find(
                (b) =>
                  b.status === 'broken' &&
                  p.targetTileX !== undefined &&
                  p.targetTileY !== undefined &&
                  Math.abs(b.x - p.targetTileX) + Math.abs(b.y - p.targetTileY) <= 1
              );
              if (inc) inc.repairerArrived = true;
            } else {
              p.state = 'repairing';
              p.holdTimer = 2.8;
            }
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'fixing_bridge') {
          p.animPhase += realDt * 10;
          p.holdTimer -= realDt;
          if (Math.random() < realDt * 3.5) {
            this.woodChips.push({
              wx: p.wx + (Math.random() - 0.5) * 8,
              wy: p.wy - 2,
              vx: (Math.random() - 0.5) * 28,
              vy: -14 - Math.random() * 14,
              age: 0,
              maxAge: 0.38,
              color: Math.random() < 0.5 ? '#FACC15' : '#94A3B8',
            });
          }
          if (p.holdTimer <= 0) {
            const bIdx = this.brokenBridges.findIndex(
              (b) =>
                b.status === 'broken' &&
                p.targetTileX !== undefined &&
                p.targetTileY !== undefined &&
                Math.abs(b.x - p.targetTileX) + Math.abs(b.y - p.targetTileY) <= 1
            );
            if (bIdx !== -1) {
              const inc = this.brokenBridges[bIdx];
              const tile = this.getTile(inc.x, inc.y);
              if (tile) tile.isBridgeBroken = false;
              inc.status = 'repaired';
              inc.statusTimer = 2.0;
              this.floatingLabels.push({
                wx: inc.wx,
                wy: inc.wy - 10,
                text: '+Bridge Fixed!',
                color: '#0F172A',
                bgColor: '#4ADE80',
                age: 0,
                maxAge: 1.7,
              });
              if (playAudio) soundEngine.playCleanSparkle();
            }
            if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          }
        } else if (p.state === 'repairing') {
          p.animPhase += realDt * 10;
          p.holdTimer -= realDt;
          if (Math.random() < realDt * 3) {
            this.woodChips.push({
              wx: p.wx + (Math.random() - 0.5) * 6,
              wy: p.wy - 2,
              vx: (Math.random() - 0.5) * 26,
              vy: -14 - Math.random() * 14,
              age: 0,
              maxAge: 0.35,
              color: '#FACC15',
            });
          }
          if (p.holdTimer <= 0) {
            const cIdx = this.blastCraters.findIndex(
              (c) => c.x === p.targetTileX && c.y === p.targetTileY
            );
            if (cIdx !== -1) {
              this.blastCraters.splice(cIdx, 1);
            }
            this.crises.pollutionLevel = Math.max(0, this.crises.pollutionLevel - 5);
            this.floatingLabels.push({
              wx: p.wx,
              wy: p.wy - 10,
              text: '+Repaired!',
              color: '#0F172A',
              bgColor: '#FACC15',
              age: 0,
              maxAge: 1.4,
            });
            if (playAudio) soundEngine.playCleanSparkle();
            // Move to another crater if any remain, else return home
            if (this.blastCraters.length > 0) {
              const nextCrater = this.blastCraters[0];
              if (this.assignPedestrianRoute(p, nextCrater.x, nextCrater.y, nextCrater.wx, nextCrater.wy)) {
                p.state = 'walking';
                continue;
              }
            }
            if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 8);
          if (res !== 'moving' || p.holdTimer <= 0) this.people.splice(i, 1);
        }
        continue;
      }
    }

    // 2. Virus Outbreak
    if (this.crises.virusActive) {
      this.crises.virusRemaining = Math.max(0, this.crises.virusRemaining - simDt);
      if (this.crises.virusRemaining <= 0) {
        this.triggerCrisis('virus', false, false);
      } else {
        this.virusTickAccumulator += simDt;
        const hospitals = this.buildingsList.filter((b) => b.category === 'hospital');

        if (this.virusTickAccumulator >= 3.2) {
          this.virusTickAccumulator = 0;
          const healthy = this.people.filter(
            (p) => !p.isInfected && p.role !== 'medic' && p.role !== 'mayor'
          );
          if (healthy.length > 0 && Math.random() < 0.65) {
            const victim = healthy[Math.floor(Math.random() * healthy.length)];
            victim.isInfected = true;
            victim.infectedTimer = 0;
          }
        }

        // Cure infected citizens near hospitals or medics, or handle severe cases
        for (let i = this.people.length - 1; i >= 0; i--) {
          const p = this.people[i];
          if (!p.isInfected) continue;
          p.infectedTimer = (p.infectedTimer || 0) + realDt;

          if (Math.random() < realDt * 1.4) {
            this.smokeParticles.push({
              wx: p.wx,
              wy: p.wy - 8,
              vx: (Math.random() - 0.5) * 10,
              vy: -12 - Math.random() * 8,
              age: 0,
              maxAge: 0.65,
              size: 2.2,
              color: 'rgba(132, 204, 22, 0.72)',
            });
          }

          const nearHospitalOrMedic =
            hospitals.some(
              (h) => Math.hypot((h.x + 0.5) * TILE_SIZE - p.wx, (h.y + 0.5) * TILE_SIZE - p.wy) < 52
            ) ||
            this.people.some(
              (m) => m.role === 'medic' && Math.hypot(m.wx - p.wx, m.wy - p.wy) < 26
            );

          if (nearHospitalOrMedic) {
            p.isInfected = false;
            p.infectedTimer = 0;
            this.floatingLabels.push({
              wx: p.wx,
              wy: p.wy - 10,
              text: '+Cured!',
              color: '#F8FAFC',
              bgColor: '#059669',
              age: 0,
              maxAge: 1.3,
            });
          } else if (p.infectedTimer > 22) {
            // Untreated citizens may succumb if no hospital/medic reaches them in time (never default to City Hall)
            if (Math.random() < 0.25) {
              const nearestHome = this.buildingsList.find(
                (b) => b.id === p.homeBuildingId && b.category !== 'city_hall'
              );
              if (nearestHome) {
                this.spawnDeathEvent(nearestHome, playAudio);
              } else {
                const tx = Math.max(0, Math.min(this.gridCols - 1, Math.floor(p.wx / TILE_SIZE)));
                const ty = Math.max(0, Math.min(this.gridRows - 1, Math.floor(p.wy / TILE_SIZE)));
                this.recordCoordinateDeath(tx, ty, p.wx, p.wy, this.describeArea(tx, ty), playAudio);
              }
              this.people.splice(i, 1);
            } else {
              p.isInfected = false;
              p.infectedTimer = 0;
            }
          }
        }
      }
    }

    // 3. War / Army Invasion / Nuke Escalation (combat, shootings, Mayor death & post-invasion election)
    const activeDefenders = this.people.filter((p) => p.role === 'soldier');
    const activeInvaders = this.people.filter((p) => p.role === 'invader');

    if (this.crises.warActive) {
      this.crises.warRemaining = Math.max(0, this.crises.warRemaining - simDt);
      if (this.crises.warRemaining <= 0) {
        this.triggerCrisis('war', false, false);
      } else {
        if (
          activeDefenders.length < Math.max(2, activeInvaders.length) &&
          Math.random() < realDt * 0.45
        ) {
          this.spawnSoldierPatrol(1);
        }

        // Periodic invading army waves from city perimeter
        this.invasionTickAccumulator += simDt;
        if (this.invasionTickAccumulator >= 12) {
          this.invasionTickAccumulator = 0;
          if (activeInvaders.length < 8) {
            this.spawnInvadingArmy(3);
          }
        }

        // Periodic explosions / fires during conflict
        this.warTickAccumulator += simDt;
        if (this.warTickAccumulator >= 11) {
          this.warTickAccumulator = 0;
          const targets = this.tiles.filter(
            (t) =>
              t.terrain !== 'water' &&
              !t.hasRoad &&
              (!t.building || t.building.category !== 'city_hall')
          );
          if (targets.length > 0 && this.fires.filter((f) => f.status === 'active').length < 3) {
            const spot = targets[Math.floor(Math.random() * targets.length)];
            const wx = (spot.x + 0.5) * TILE_SIZE;
            const wy = (spot.y + 0.5) * TILE_SIZE;
            for (let k = 0; k < 8; k++) {
              this.smokeParticles.push({
                wx: wx + (Math.random() - 0.5) * 14,
                wy: wy + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 26,
                vy: -22 - Math.random() * 18,
                age: 0,
                maxAge: 1.2,
                size: 4.5,
                color: k % 2 === 0 ? 'rgba(249, 115, 22, 0.85)' : 'rgba(51, 65, 85, 0.75)',
              });
            }
            if (Math.random() < 0.55) {
              this.startFireAt(spot.x, spot.y, false, playAudio);
            }
          }
        }
      }
    }

    // Step defenders & invaders + skirmish combat, shootings & building destruction
    if (this.crises.warActive || activeInvaders.length > 0 || activeDefenders.length > 0) {
      for (let i = this.people.length - 1; i >= 0; i--) {
        const p = this.people[i];
        if (p.role === 'soldier') {
          p.shootCooldown = Math.max(0, (p.shootCooldown || 0) - simDt);
          const foeIdx = this.people.findIndex(
            (f) => f.role === 'invader' && Math.hypot(f.wx - p.wx, f.wy - p.wy) < 78
          );
          if (foeIdx !== -1 && p.shootCooldown <= 0) {
            const foe = this.people[foeIdx];
            p.shootCooldown = 1.9;
            this.gunfireTracers.push({
              x1: p.wx,
              y1: p.wy - 4,
              x2: foe.wx,
              y2: foe.wy - 4,
              age: 0,
              maxAge: 0.24,
              color: '#38BDF8',
            });
            if (playAudio) soundEngine.playGunshot();
            for (let s = 0; s < 5; s++) {
              this.smokeParticles.push({
                wx: foe.wx,
                wy: foe.wy - 4,
                vx: (Math.random() - 0.5) * 20,
                vy: -14 - Math.random() * 10,
                age: 0,
                maxAge: 0.7,
                size: 3.2,
                color: 'rgba(250, 204, 21, 0.8)',
              });
            }
            if ((foe.health ?? 2) > 1) {
              foe.health = (foe.health ?? 2) - 1;
              this.floatingLabels.push({
                wx: foe.wx,
                wy: foe.wy - 12,
                text: foe.hasTank ? 'Tank Hit!' : 'Hit!',
                color: '#FEF9C3',
                bgColor: '#0284C7',
                age: 0,
                maxAge: 1.0,
              });
            } else {
              this.floatingLabels.push({
                wx: foe.wx,
                wy: foe.wy - 10,
                text: foe.hasTank ? 'Tank Destroyed!' : 'Repelled!',
                color: '#F8FAFC',
                bgColor: '#1D4ED8',
                age: 0,
                maxAge: 1.3,
              });
              this.people.splice(foeIdx, 1);
              if (foeIdx < i) i -= 1;
            }
            continue;
          }
          const res = this.stepPersonAlongPath(p, realDt, 9.5);
          if (res !== 'moving') {
            const liveFoe = this.people.find((f) => f.role === 'invader');
            if (liveFoe) {
              const fx = Math.max(0, Math.min(this.gridCols - 1, Math.floor(liveFoe.wx / TILE_SIZE)));
              const fy = Math.max(0, Math.min(this.gridRows - 1, Math.floor(liveFoe.wy / TILE_SIZE)));
              if (!this.assignPedestrianRoute(p, fx, fy, liveFoe.wx, liveFoe.wy)) {
                if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
              }
            } else if (!this.assignReturnRoute(p)) {
              this.people.splice(i, 1);
            }
          }
        } else if (p.role === 'invader') {
          p.shootCooldown = Math.max(0, (p.shootCooldown || 0) - simDt);

          if (p.shootCooldown <= 0) {
            // 1. Shoot Mayor first if within long line of sight
            const mayorIdx = this.mayorAlive
              ? this.people.findIndex(
                  (m) => m.role === 'mayor' && Math.hypot(m.wx - p.wx, m.wy - p.wy) < 115
                )
              : -1;
            if (mayorIdx !== -1) {
              const mayor = this.people[mayorIdx];
              const hall = this.buildingsList.find((b) => b.id === mayor.homeBuildingId);
              this.gunfireTracers.push({
                x1: p.wx,
                y1: p.wy - 4,
                x2: mayor.wx,
                y2: mayor.wy - 4,
                age: 0,
                maxAge: 0.3,
                color: '#EF4444',
              });
              if (playAudio) soundEngine.playGunshot();
              for (let s = 0; s < 6; s++) {
                this.smokeParticles.push({
                  wx: mayor.wx + (Math.random() - 0.5) * 6,
                  wy: mayor.wy - 4,
                  vx: (Math.random() - 0.5) * 14,
                  vy: -12 - Math.random() * 8,
                  age: 0,
                  maxAge: 0.75,
                  size: 3.2,
                  color: 'rgba(239, 68, 68, 0.8)',
                });
              }
              this.mayorAlive = false;
              this.logDailyNews('HEARTBREAK & CHAOS: The Mayor fell defending City Hall from foreign invaders! Citizens are demanding an emergency election.');
              if (hall) {
                this.spawnDeathEvent(hall, playAudio);
              }
              this.floatingLabels.push({
                wx: mayor.wx,
                wy: mayor.wy - 14,
                text: 'MAYOR KILLED!',
                color: '#FEF2F2',
                bgColor: '#991B1B',
                age: 0,
                maxAge: 2.6,
              });
              this.people.splice(mayorIdx, 1);
              if (mayorIdx < i) i -= 1;
              p.shootCooldown = 2.0 + Math.random() * 1.4;
              if (playAudio) soundEngine.playDeathChime();
            } else {
              // 2. Shoot nearby defenders or citizens in range
              const victimIdx = this.people.findIndex(
                (v) =>
                  v.role !== 'invader' &&
                  v.role !== 'mayor' &&
                  Math.hypot(v.wx - p.wx, v.wy - p.wy) < 82
              );
              if (victimIdx !== -1) {
                const victim = this.people[victimIdx];
                this.gunfireTracers.push({
                  x1: p.wx,
                  y1: p.wy - 4,
                  x2: victim.wx,
                  y2: victim.wy - 4,
                  age: 0,
                  maxAge: 0.25,
                  color: '#EF4444',
                });
                if (playAudio) soundEngine.playGunshot();
                for (let s = 0; s < 4; s++) {
                  this.smokeParticles.push({
                    wx: victim.wx,
                    wy: victim.wy - 4,
                    vx: (Math.random() - 0.5) * 14,
                    vy: -10 - Math.random() * 8,
                    age: 0,
                    maxAge: 0.65,
                    size: 2.6,
                    color: 'rgba(239, 68, 68, 0.7)',
                  });
                }
                this.floatingLabels.push({
                  wx: victim.wx,
                  wy: victim.wy - 10,
                  text: 'Shot!',
                  color: '#FEF2F2',
                  bgColor: '#B91C1C',
                  age: 0,
                  maxAge: 1.6,
                });
                const bldOrigin = this.buildingsList.find(
                  (b) => b.id === victim.homeBuildingId && b.category !== 'city_hall'
                );
                if (bldOrigin) {
                  this.spawnDeathEvent(bldOrigin, playAudio);
                } else {
                  const vtx = Math.max(0, Math.min(this.gridCols - 1, Math.floor(victim.wx / TILE_SIZE)));
                  const vty = Math.max(0, Math.min(this.gridRows - 1, Math.floor(victim.wy / TILE_SIZE)));
                  this.recordCoordinateDeath(vtx, vty, victim.wx, victim.wy, this.describeArea(vtx, vty), playAudio);
                }
                this.people.splice(victimIdx, 1);
                if (victimIdx < i) i -= 1;
                p.shootCooldown = 1.8 + Math.random() * 1.5;
              } else {
                // 3. Fire warning/bombardment tracers at nearby buildings while advancing
                const nearBld = this.buildingsList.find(
                  (b) =>
                    b.category !== 'road_path' &&
                    Math.hypot((b.x + 0.5) * TILE_SIZE - p.wx, (b.y + 0.5) * TILE_SIZE - p.wy) < 96
                );
                if (nearBld) {
                  const bx = (nearBld.x + 0.5) * TILE_SIZE;
                  const by = (nearBld.y + 0.45) * TILE_SIZE;
                  this.gunfireTracers.push({
                    x1: p.wx,
                    y1: p.wy - 4,
                    x2: bx,
                    y2: by,
                    age: 0,
                    maxAge: 0.24,
                    color: p.hasTank ? '#F97316' : '#EF4444',
                  });
                  if (playAudio) soundEngine.playGunshot();
                  for (let s = 0; s < 4; s++) {
                    this.smokeParticles.push({
                      wx: bx + (Math.random() - 0.5) * 8,
                      wy: by,
                      vx: (Math.random() - 0.5) * 18,
                      vy: -12 - Math.random() * 10,
                      age: 0,
                      maxAge: 0.6,
                      size: 3.0,
                      color: 'rgba(249, 115, 22, 0.78)',
                    });
                  }
                  p.shootCooldown = 2.0 + Math.random() * 1.4;
                }
              }
            }
          }

          const res = this.stepPersonAlongPath(p, realDt, 8.5);
          if (res === 'arrived') {
            const targetTile =
              p.targetTileX !== undefined && p.targetTileY !== undefined
                ? this.getTile(p.targetTileX, p.targetTileY)
                : null;
            if (targetTile?.building) {
              const hitBld = targetTile.building;
              if (hitBld.category === 'city_hall') {
                // Assaulting City Hall kills Mayor even if standing inside City Hall
                if (this.mayorAlive) {
                  this.mayorAlive = false;
                  const mIdx = this.people.findIndex((m) => m.role === 'mayor');
                  if (mIdx !== -1) {
                    this.people.splice(mIdx, 1);
                    if (mIdx < i) i -= 1;
                  }
                  this.spawnDeathEvent(hitBld, playAudio);
                  this.floatingLabels.push({
                    wx: (hitBld.x + 0.5) * TILE_SIZE,
                    wy: (hitBld.y + 0.35) * TILE_SIZE,
                    text: 'MAYOR KILLED!',
                    color: '#FEF2F2',
                    bgColor: '#991B1B',
                    age: 0,
                    maxAge: 2.6,
                  });
                  this.logDailyNews('HEARTBREAK & CHAOS: Foreign troops stormed City Hall and killed the Mayor! Emergency elections will follow once troops withdraw.');
                  if (playAudio) soundEngine.playDeathChime();
                }
              } else if (hitBld.category !== 'road_path') {
                // Foreign invaders destroy non-City-Hall buildings!
                const bx = (targetTile.x + 0.5) * TILE_SIZE;
                const by = (targetTile.y + 0.5) * TILE_SIZE;
                this.floatingLabels.push({
                  wx: bx,
                  wy: by - 10,
                  text: p.hasTank ? 'TANK DESTROYED BLDG!' : 'BUILDING DESTROYED!',
                  color: '#FEF2F2',
                  bgColor: '#991B1B',
                  age: 0,
                  maxAge: 2.3,
                });
                for (let d = 0; d < 8; d++) {
                  this.woodChips.push({
                    wx: bx,
                    wy: by,
                    vx: (Math.random() - 0.5) * 44,
                    vy: -16 - Math.random() * 20,
                    age: 0,
                    maxAge: 0.7,
                    color: d % 2 === 0 ? '#78350F' : '#64748B',
                  });
                  this.smokeParticles.push({
                    wx: bx + (Math.random() - 0.5) * 10,
                    wy: by,
                    vx: (Math.random() - 0.5) * 20,
                    vy: -16 - Math.random() * 14,
                    age: 0,
                    maxAge: 1.0,
                    size: 4.0,
                    color: 'rgba(51, 65, 85, 0.8)',
                  });
                }
                if (
                  !this.blastCraters.some((c) => c.x === targetTile.x && c.y === targetTile.y) &&
                  this.blastCraters.length < 64
                ) {
                  this.blastCraters.push({
                    id: `crater_${this.craterIdCounter++}`,
                    x: targetTile.x,
                    y: targetTile.y,
                    wx: bx,
                    wy: by,
                    radius: p.hasTank ? 12 : 9,
                    age: 0,
                  });
                }
                this.spawnDeathEvent(hitBld, false);
                this.logDailyNews(`WAR WRECKAGE: Invading forces shelled and destroyed ${hitBld.name} in ${this.describeArea(targetTile.x, targetTile.y)}!`);
                targetTile.building = null;
                this.rebuildCaches();
                if (this.fires.filter((f) => f.status === 'active').length < 4 && Math.random() < 0.7) {
                  this.startFireAt(targetTile.x, targetTile.y, false, playAudio);
                }
              }
            }

            // Pick another building/City Hall to raid while war is active; withdraw only once war ends
            const raidPool = this.buildingsList.filter((b) => b.category !== 'road_path');
            let retargeted = false;
            if (this.crises.warActive && raidPool.length > 0) {
              const cityHall = raidPool.find((b) => b.category === 'city_hall');
              const nextTarget =
                this.mayorAlive && cityHall && Math.random() < 0.55
                  ? cityHall
                  : raidPool[Math.floor(Math.random() * raidPool.length)];
              retargeted = this.assignPedestrianRoute(
                p,
                nextTarget.x,
                nextTarget.y,
                (nextTarget.x + 0.5) * TILE_SIZE,
                (nextTarget.y + 0.78) * TILE_SIZE
              );
              if (retargeted) p.destBuildingId = nextTarget.id;
            }
            if (!retargeted) {
              this.people.splice(i, 1);
            }
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        }
      }
    }

    // 3.5 Post-Invasion Mayoral Election when Mayor died & invasion ends
    const remainingInvaders = this.people.filter((p) => p.role === 'invader').length;
    const cityHalls = this.buildingsList.filter((b) => b.category === 'city_hall');
    if (
      !this.crises.warActive &&
      remainingInvaders === 0 &&
      !this.mayorAlive &&
      !this.electionActive &&
      cityHalls.length > 0
    ) {
      this.startMayoralElection(cityHalls[0], playAudio);
    }

    if (this.electionActive) {
      if (cityHalls.length === 0) {
        this.electionActive = false;
        this.electionRemaining = 0;
        this.people = this.people.filter((p) => p.role !== 'voter');
      } else {
        const hall = cityHalls[0];
        this.electionRemaining = Math.max(0, this.electionRemaining - simDt);

        const activeVoters = this.people.filter((p) => p.role === 'voter').length;
        if (activeVoters < 5 && this.electionRemaining > 5) {
          this.electionVoterAccumulator += simDt;
          if (this.electionVoterAccumulator >= 3.2) {
            this.electionVoterAccumulator = 0;
            this.spawnElectionVoter(hall);
          }
        }

        for (let i = this.people.length - 1; i >= 0; i--) {
          const p = this.people[i];
          if (p.role !== 'voter') continue;
          if (p.state === 'walking') {
            const res = this.stepPersonAlongPath(p, realDt, 8);
            if (res === 'arrived') {
              p.state = 'voting';
              p.holdTimer = 3.2;
              this.floatingLabels.push({
                wx: p.wx,
                wy: p.wy - 10,
                text: 'Voted!',
                color: '#FEF9C3',
                bgColor: '#4338CA',
                age: 0,
                maxAge: 1.4,
              });
            } else if (res === 'blocked') {
              this.people.splice(i, 1);
            }
          } else if (p.state === 'voting') {
            p.animPhase += realDt * 4;
            p.holdTimer -= realDt;
            if (p.holdTimer <= 0) {
              if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
            }
          } else {
            p.holdTimer -= realDt;
            const res = this.stepPersonAlongPath(p, realDt, 8);
            if (res !== 'moving' || p.holdTimer <= 0) {
              this.people.splice(i, 1);
            }
          }
        }

        if (this.electionRemaining <= 0) {
          this.electionActive = false;
          this.mayorAlive = true;
          this.people = this.people.filter((p) => p.role !== 'voter');
          this.emitConfettiBurst(
            (hall.x + 0.5) * TILE_SIZE,
            (hall.y + 0.3) * TILE_SIZE,
            28,
            'election'
          );
          this.floatingLabels.push({
            wx: (hall.x + 0.5) * TILE_SIZE,
            wy: (hall.y + 0.2) * TILE_SIZE,
            text: 'New Mayor Elected!',
            color: '#FEF9C3',
            bgColor: '#4338CA',
            age: 0,
            maxAge: 2.6,
          });
          this.logDailyNews(`ELECTION DRAMA: Voters picked a brand-new Mayor at ${hall.name}! Half the town cheered, and Uncle Leo already wants free Pizza Fridays.`);
          this.citizenHappiness = Math.min(100, this.citizenHappiness + 8);
          if (playAudio) soundEngine.playCelebrationFanfare();
        }
      }
    }

    // 4. Poverty / Recession Crisis
    if (this.crises.povertyActive) {
      this.crises.povertyRemaining = Math.max(0, this.crises.povertyRemaining - simDt);
      if (this.crises.povertyRemaining <= 0) {
        this.triggerCrisis('poverty', false, false);
      }
    }
  }

  private startMayoralElection(hall: PlacedBuilding, playAudio: boolean) {
    this.electionActive = true;
    this.electionRemaining = 30;
    this.electionVoterAccumulator = 0;
    this.hostCityEvent(hall.x, hall.y, 'election', 'Mayoral Election', playAudio);
    const ev = this.cityEvents.find((e) => e.x === hall.x && e.y === hall.y && e.type === 'election');
    if (ev) {
      ev.durationSeconds = 30;
    }
    this.floatingLabels.push({
      wx: (hall.x + 0.5) * TILE_SIZE,
      wy: (hall.y + 0.25) * TILE_SIZE,
      text: 'Mayoral Election!',
      color: '#FEF9C3',
      bgColor: '#4338CA',
      age: 0,
      maxAge: 2.4,
    });
    for (let k = 0; k < 3; k++) {
      this.spawnElectionVoter(hall);
    }
  }

  private spawnElectionVoter(hall: PlacedBuilding) {
    const homes = this.buildingsList
      .filter((b) => b.id !== hall.id && b.category !== 'road_path')
      .sort(() => Math.random() - 0.5);
    const shirtColors = ['#38BDF8', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];
    for (const orig of homes.slice(0, 6)) {
      const path = this.findPedestrianPath(this.tiles, { x: orig.x, y: orig.y }, { x: hall.x, y: hall.y });
      if (!path) continue;
      this.people.push({
        id: `ppl_${this.personIdCounter++}`,
        role: 'voter',
        wx: (orig.x + 0.5) * TILE_SIZE,
        wy: (orig.y + 0.78) * TILE_SIZE,
        targetWx: (hall.x + 0.5) * TILE_SIZE + (Math.random() - 0.5) * 16,
        targetWy: (hall.y + 0.82) * TILE_SIZE,
        speed: 29,
        shirtColor: shirtColors[Math.floor(Math.random() * shirtColors.length)],
        animPhase: Math.random() * Math.PI * 2,
        state: 'walking',
        homeBuildingId: orig.id,
        destBuildingId: hall.id,
        targetTileX: hall.x,
        targetTileY: hall.y,
        pedestrianPath: path,
        pedestrianPathIndex: path.length > 1 ? 1 : 0,
        holdTimer: 0,
      });
      return;
    }
  }

  private updateProtests(simDt: number, realDt: number, playAudio: boolean) {
    const cityHalls = this.buildingsList.filter((b) => b.category === 'city_hall');
    const hallIds = new Set(cityHalls.map((h) => h.id));

    // Update protests & clean up missing City Halls
    for (let i = this.protests.length - 1; i >= 0; i--) {
      const prot = this.protests[i];
      if (!hallIds.has(prot.cityHallId)) {
        this.cleanupProtestPeople(prot.id);
        this.releaseProtestCar(prot.policeCarId);
        this.protests.splice(i, 1);
        continue;
      }

      // Prune protesterIds that were removed
      prot.protesterIds = prot.protesterIds.filter((pid) =>
        this.people.some((p) => p.id === pid)
      );

      if (prot.status === 'active') {
        const anyAtHall = this.people.some(
          (p) =>
            p.role === 'protester' &&
            p.protestId === prot.id &&
            (p.state === 'protesting' || p.state === 'captured')
        );

        // Do not start protest countdown or dispatch police until protesters actually reach City Hall!
        if (!prot.started) {
          prot.gatherTimer += simDt;
          if (anyAtHall) {
            prot.started = true;
            if (playAudio) soundEngine.playProtestChant();
            if (!prot.policeDispatched) {
              this.dispatchPoliceToProtest(prot);
            }
          } else if (prot.protesterIds.length === 0 || prot.gatherTimer >= 45) {
            this.cleanupProtestPeople(prot.id);
            this.protests.splice(i, 1);
            continue;
          }
        } else {
          prot.elapsedSeconds += simDt;

          if (prot.policeDispatched && !prot.policeArrived) {
            const hasCar = prot.policeCarId && this.cars.some((c) => c.id === prot.policeCarId);
            const hasFoot = this.people.some(
              (p) => p.role === 'police' && p.protestId === prot.id
            );
            if (!hasCar && !hasFoot) {
              prot.policeDispatched = false;
              prot.policeCarId = undefined;
            }
          }

          if (!prot.policeDispatched) {
            this.dispatchPoliceToProtest(prot);
          }

          if (prot.policeArrived && prot.protesterIds.length === 0) {
            prot.status = 'captured';
            prot.statusTimer = 4.5;
            this.cleanupProtestPeople(prot.id);
            this.releaseProtestCar(prot.policeCarId);
            if (playAudio) soundEngine.playPoliceResolved();
          } else if (prot.elapsedSeconds >= prot.durationLimitSeconds) {
            prot.status = 'dispersed';
            prot.statusTimer = 3.5;
            this.cleanupProtestPeople(prot.id);
            this.releaseProtestCar(prot.policeCarId);
          }
        }
      } else {
        prot.statusTimer -= simDt;
        if (prot.statusTimer <= 0) {
          this.protests.splice(i, 1);
        }
      }
    }

    // Step protesters & police officers
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];

      if (p.role === 'protester') {
        if (p.state === 'walking') {
          if (p.pedestrianPath && p.pedestrianPath.length > 0) {
            const res = this.stepPersonAlongPath(p, realDt, 8);
            if (res === 'arrived') {
              p.pedestrianPath = undefined;
              p.state = 'protesting';
            } else if (res === 'blocked') {
              this.people.splice(i, 1);
            }
          } else {
            const sameTile =
              Math.floor(p.wx / TILE_SIZE) === Math.floor(p.targetWx / TILE_SIZE) &&
              Math.floor(p.wy / TILE_SIZE) === Math.floor(p.targetWy / TILE_SIZE);
            if (!sameTile) {
              this.people.splice(i, 1);
              continue;
            }
            const dx = p.targetWx - p.wx;
            const dy = p.targetWy - p.wy;
            const dist = Math.hypot(dx, dy);
            if (dist < 3) {
              p.state = 'protesting';
            } else {
              const step = Math.min(dist, p.speed * realDt);
              p.wx += (dx / dist) * step;
              p.wy += (dy / dist) * step;
              p.animPhase += realDt * 8;
            }
          }
        } else if (p.state === 'protesting') {
          p.animPhase += realDt * 7.5;
        } else if (p.state === 'captured') {
          const officer = this.people.find((o) => o.id === p.escortOfficerId);
          if (!officer) {
            p.state = 'protesting';
            p.escortOfficerId = undefined;
          } else {
            p.wx = officer.wx + 5;
            p.wy = officer.wy + 2;
            p.animPhase += realDt * 7;
          }
        }
        continue;
      }

      if (p.role === 'police' && p.protestId) {
        const protest = this.protests.find((pr) => pr.id === p.protestId && pr.status === 'active');
        if (!protest) {
          this.people.splice(i, 1);
          continue;
        }

        const cruiser = this.cars.find((c) => c.id === protest.policeCarId);
        const dropWx = cruiser ? cruiser.wx : (protest.x + 0.5) * TILE_SIZE;
        const dropWy = cruiser ? cruiser.wy : (protest.y + 0.5) * TILE_SIZE;

        if (p.state === 'chasing') {
          let target = p.targetPersonId
            ? this.people.find(
                (t) => t.id === p.targetPersonId && t.state === 'protesting'
              )
            : undefined;

          if (!target) {
            const candidates = this.people.filter(
              (t) =>
                t.role === 'protester' &&
                t.protestId === protest.id &&
                t.state === 'protesting'
            );
            if (candidates.length > 0) {
              candidates.sort(
                (a, b) => Math.hypot(a.wx - p.wx, a.wy - p.wy) - Math.hypot(b.wx - p.wx, b.wy - p.wy)
              );
              target = candidates[0];
              p.targetPersonId = target.id;
            }
          }

          if (target) {
            const dx = target.wx - p.wx;
            const dy = target.wy - p.wy;
            const dist = Math.hypot(dx, dy);
            if (dist < 8.5) {
              target.state = 'captured';
              target.escortOfficerId = p.id;
              p.state = 'returning';
            } else {
              const step = Math.min(dist, p.speed * realDt);
              p.wx += (dx / dist) * step;
              p.wy += (dy / dist) * step;
              p.animPhase += realDt * 11;
            }
          } else if (protest.protesterIds.length > 0) {
            // Wait outside by City Hall steps while remaining protesters finish walking up!
            const hallStepX = (protest.x + 0.5) * TILE_SIZE;
            const hallStepY = (protest.y + 0.85) * TILE_SIZE;
            const dx = hallStepX - p.wx;
            const dy = hallStepY - p.wy;
            const dist = Math.hypot(dx, dy);
            if (dist > 14) {
              const step = Math.min(dist, p.speed * 0.65 * realDt);
              p.wx += (dx / dist) * step;
              p.wy += (dy / dist) * step;
              p.animPhase += realDt * 7;
            }
          } else {
            // Walk back to cruiser only once zero protesters remain
            const dx = dropWx - p.wx;
            const dy = dropWy - p.wy;
            const dist = Math.hypot(dx, dy);
            if (dist < 8) {
              this.people.splice(i, 1);
            } else {
              const step = Math.min(dist, p.speed * realDt);
              p.wx += (dx / dist) * step;
              p.wy += (dy / dist) * step;
              p.animPhase += realDt * 9;
            }
          }
        } else if (p.state === 'returning') {
          const dx = dropWx - p.wx;
          const dy = dropWy - p.wy;
          const dist = Math.hypot(dx, dy);
          if (dist < 9.5) {
            // Book captured protester into cruiser & send to Jail
            const capIdx = this.people.findIndex((t) => t.id === p.targetPersonId);
            if (capIdx !== -1) {
              this.people.splice(capIdx, 1);
              if (capIdx < i) i -= 1;
            }
            protest.protesterIds = protest.protesterIds.filter((pid) => pid !== p.targetPersonId);
            protest.capturedCount += 1;
            this.capturedProtesters += 1;
            this.sendToJail(1);
            this.capturePopups.push({
              wx: dropWx,
              wy: dropWy - 14,
              age: 0,
              maxAge: 1.5,
            });
            if (playAudio) soundEngine.playPoliceCapture();
            p.targetPersonId = undefined;
            p.state = 'chasing';
          } else {
            const step = Math.min(dist, (p.speed * 0.78) * realDt);
            p.wx += (dx / dist) * step;
            p.wy += (dy / dist) * step;
            p.animPhase += realDt * 9;
          }
        }
      }
    }

    // Trigger rare, occasional protests at City Hall (more likely during Poverty/War)
    if (cityHalls.length === 0) return;
    const activeProtests = this.protests.filter((pr) => pr.status === 'active').length;
    if (activeProtests >= 1) return;

    this.protestCheckAccumulator += simDt * (this.crises.povertyActive || this.crises.warActive ? 1.8 : 1.0);
    if (this.protestCheckAccumulator >= 115) {
      this.protestCheckAccumulator = 0;
      const chance = this.crises.povertyActive || this.crises.warActive ? 0.55 : 0.28;
      if (Math.random() < chance) {
        this.triggerProtestAt(undefined, undefined, playAudio);
      }
    }
  }

  public triggerProtestAt(x?: number, y?: number, playAudio = true): ProtestIncident | null {
    const cityHalls = this.buildingsList.filter((b) => b.category === 'city_hall');
    if (cityHalls.length === 0) return null;

    let hall: PlacedBuilding | undefined;
    if (x !== undefined && y !== undefined) {
      hall = cityHalls.find((h) => h.x === x && h.y === y);
    } else {
      const idleHalls = cityHalls.filter(
        (h) => !this.protests.some((p) => p.cityHallId === h.id && p.status === 'active')
      );
      if (idleHalls.length > 0) {
        hall = idleHalls[Math.floor(Math.random() * idleHalls.length)];
      }
    }

    if (!hall) return null;
    if (this.protests.some((p) => p.cityHallId === hall.id && p.status === 'active')) {
      return null;
    }

    const forestCount = this.tiles.filter((t) => t.terrain === 'forest').length;
    const civicReasons = [
      'LOWER CITY TAXES!',
      'FIX TRAFFIC JAMS!',
      'BETTER PUBLIC ROADS!',
      'FAIR HOUSING PRICES!',
      'MORE SCHOOLS & CLINICS!',
      'CLEANER STREETS NOW!',
    ];
    if (this.crises.povertyActive) civicReasons.push('JOBS & AID NOW!');
    if (this.crises.warActive) civicReasons.push('PEACE NOT WAR!');
    if (this.fires.some((f) => f.status === 'active')) {
      civicReasons.push('STOP FIRES & ARSON!', 'MORE FIRE TRUCKS!');
    }
    if (forestCount <= 3) {
      civicReasons.push('PLANT MORE TREES!');
    }

    let reason = civicReasons[Math.floor(Math.random() * civicReasons.length)];
    if (this.deforestationPressure >= 2 && Math.random() < 0.25) {
      reason = 'SAVE THE TREES!';
      this.deforestationPressure = Math.max(0, this.deforestationPressure - 2);
    } else if (this.deforestationPressure > 0) {
      this.deforestationPressure = Math.max(0, this.deforestationPressure - 1);
    }

    const protestId = `prot_${this.protestIdCounter++}`;
    const count = 4 + Math.floor(Math.random() * 3); // 4..6 protesters
    const protesterIds: string[] = [];
    const signColors = ['#FDE047', '#FB7185', '#38BDF8', '#A78BFA', '#4ADE80'];
    const shirtColors = ['#F43F5E', '#FB923C', '#0EA5E9', '#8B5CF6', '#10B981'];

    const hallCx = (hall.x + 0.5) * TILE_SIZE;
    const hallCy = (hall.y + 0.5) * TILE_SIZE;
    // Sort closest connected origins first so protesters arrive together promptly
    const connectedOrigins = this.buildingsList
      .filter((b) => b.id !== hall!.id && b.category !== 'road_path')
      .sort((a, b) => Math.hypot(a.x - hall!.x, a.y - hall!.y) - Math.hypot(b.x - hall!.x, b.y - hall!.y))
      .slice(0, 12)
      .map((b) => ({
        b,
        path: this.findPedestrianPath(this.tiles, { x: b.x, y: b.y }, { x: hall!.x, y: hall!.y }),
      }))
      .filter((item): item is { b: PlacedBuilding; path: GridPoint[] } => Boolean(item.path));

    for (let k = 0; k < count; k++) {
      const angle = ((k / count) * Math.PI * 1.3) - Math.PI * 0.15;
      const radius = 12 + (k % 2) * 5;
      const pid = `ppl_${this.personIdCounter++}`;
      protesterIds.push(pid);
      const origin =
        connectedOrigins.length > 0 ? connectedOrigins[k % connectedOrigins.length] : null;
      const spawnX = origin ? (origin.b.x + 0.5) * TILE_SIZE : hallCx + (k - 2) * 4;
      const spawnY = origin ? (origin.b.y + 0.78) * TILE_SIZE : hallCy + 14;
      this.people.push({
        id: pid,
        role: 'protester',
        wx: spawnX,
        wy: spawnY,
        targetWx: hallCx + Math.cos(angle) * radius,
        targetWy: hallCy + 6 + Math.sin(angle) * (radius * 0.6),
        speed: 36,
        shirtColor: shirtColors[k % shirtColors.length],
        signColor: signColors[k % signColors.length],
        animPhase: Math.random() * Math.PI * 2,
        state: origin ? 'walking' : 'protesting',
        homeBuildingId: origin?.b.id || hall.id,
        targetTileX: hall.x,
        targetTileY: hall.y,
        pedestrianPath: origin?.path,
        pedestrianPathIndex: origin && origin.path.length > 1 ? 1 : undefined,
        protestId,
        holdTimer: 0,
      });
    }

    const immediateStart = connectedOrigins.length === 0;
    const incident: ProtestIncident = {
      id: protestId,
      cityHallId: hall.id,
      cityHallName: hall.name,
      x: hall.x,
      y: hall.y,
      reason,
      protesterIds,
      totalProtesters: count,
      capturedCount: 0,
      started: immediateStart,
      gatherTimer: 0,
      elapsedSeconds: 0,
      durationLimitSeconds: 65,
      policeDispatched: false,
      policeArrived: false,
      status: 'active',
      statusTimer: 0,
    };

    this.protests.push(incident);
    if (immediateStart) {
      if (playAudio) soundEngine.playProtestChant();
      this.dispatchPoliceToProtest(incident);
    } else {
      this.floatingLabels.push({
        wx: hallCx,
        wy: hallCy - 12,
        text: 'Protesters Marching...',
        color: '#F5F3FF',
        bgColor: '#6D28D9',
        age: 0,
        maxAge: 1.8,
      });
    }
    return incident;
  }

  private dispatchPoliceToProtest(incident: ProtestIncident): boolean {
    const route = this.findBestPoliceDispatchRoute(incident.x, incident.y);
    if (!route) return false;

    const { station, roadPath } = route;
    if (roadPath && roadPath.length >= 1) {
      const fullPath: GridPoint[] = [{ x: station.x, y: station.y }, ...roadPath];
      const p0 = fullPath[0];
      const p1 = fullPath[1] || fullPath[0];
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

      const carId = `car_${this.carIdCounter++}`;
      const cruiser: Car = {
        id: carId,
        type: 'police',
        color: '#1E293B',
        wx: (p0.x + 0.5) * TILE_SIZE,
        wy: (p0.y + 0.5) * TILE_SIZE,
        angle,
        speed: 66,
        maxSpeed: 128,
        path: fullPath,
        pathIndex: fullPath.length > 1 ? 1 : 0,
        originBuildingId: station.id,
        destBuildingId: incident.cityHallId,
        destLabel: incident.cityHallName,
        returnStationId: station.id,
        originCategory: 'police',
        destCategory: 'city_hall',
        waitSeconds: 0,
        isBraking: false,
        isJammed: false,
        hornFlash: 0,
        sirenPhase: 0,
        targetProtestId: incident.id,
      };

      station.activeTripsOut += 1;
      this.cars.push(cruiser);
      incident.policeDispatched = true;
      incident.policeCarId = carId;
      incident.durationLimitSeconds = Math.max(incident.durationLimitSeconds, 95);
      return true;
    }

    // No road near Police Station — deploy foot officers straight to City Hall protest
    incident.policeDispatched = true;
    incident.policeArrived = true;
    incident.durationLimitSeconds = Math.max(incident.durationLimitSeconds, 110);
    for (let k = 0; k < 2; k++) {
      this.people.push({
        id: `ppl_${this.personIdCounter++}`,
        role: 'police',
        wx: (station.x + 0.5) * TILE_SIZE + (k === 0 ? -5 : 5),
        wy: (station.y + 0.8) * TILE_SIZE,
        targetWx: (incident.x + 0.5) * TILE_SIZE,
        targetWy: (incident.y + 0.5) * TILE_SIZE,
        speed: 56,
        shirtColor: '#1D4ED8',
        hatColor: '#1E3A8A',
        animPhase: k * Math.PI,
        state: 'chasing',
        protestId: incident.id,
        holdTimer: 0,
      });
    }
    return true;
  }

  private handleProtestCarArrival(car: Car): boolean {
    if (!car.targetProtestId) return false;
    const protest = this.protests.find(
      (p) => p.id === car.targetProtestId && p.status === 'active'
    );
    if (!protest) return false;

    car.parkedAtProtest = true;
    car.speed = 0;
    car.isBraking = false;
    car.isJammed = false;
    car.waitSeconds = 0;

    if (!protest.policeArrived) {
      protest.policeArrived = true;
      for (let k = 0; k < 2; k++) {
        this.people.push({
          id: `ppl_${this.personIdCounter++}`,
          role: 'police',
          wx: car.wx + (k === 0 ? -6 : 6),
          wy: car.wy + (k === 0 ? -4 : 4),
          targetWx: car.wx,
          targetWy: car.wy,
          speed: 48,
          shirtColor: '#1D4ED8',
          hatColor: '#1E3A8A',
          animPhase: k * Math.PI,
          state: 'chasing',
          protestId: protest.id,
          holdTimer: 0,
        });
      }
    }
    return true;
  }

  private cleanupProtestPeople(protestId: string) {
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];
      if (p.protestId === protestId && (p.role === 'protester' || p.role === 'police')) {
        this.people.splice(i, 1);
      }
    }
  }

  private releaseProtestCar(carId?: string) {
    if (!carId) return;
    const idx = this.cars.findIndex((c) => c.id === carId);
    if (idx !== -1) {
      const car = this.cars[idx];
      if (!this.sendVehicleBackToStation(car, undefined, true)) {
        car.parkedAtProtest = false;
        this.finishTrip(car);
        this.cars.splice(idx, 1);
      }
    }
  }

  public hostCityEvent(
    x?: number,
    y?: number,
    type: CityEventType = 'celebration',
    customTitle?: string,
    playAudio = true
  ): CityEvent | null {
    if (this.buildingsList.length === 0) return null;

    let venue: PlacedBuilding | undefined;
    if (x !== undefined && y !== undefined) {
      venue = this.buildingsList.find((b) => b.x === x && b.y === y);
    } else {
      const preferred = this.buildingsList.filter((b) =>
        type === 'wedding'
          ? b.category === 'park' || b.category === 'city_hall' || b.category === 'landmark'
          : type === 'ceremony'
          ? b.category === 'city_hall' || b.category === 'park' || b.category === 'school'
          : b.category === 'city_hall' ||
            b.category === 'park' ||
            b.category === 'commercial' ||
            b.category === 'school'
      );
      const pool = preferred.length > 0 ? preferred : this.buildingsList;
      venue = pool[Math.floor(Math.random() * pool.length)];
    }

    if (!venue) return null;

    // Replace existing event on the same tile if re-hosted
    const existingIdx = this.cityEvents.findIndex((ev) => ev.x === venue!.x && ev.y === venue!.y);
    if (existingIdx !== -1) {
      const old = this.cityEvents[existingIdx];
      this.people = this.people.filter((p) => !(p.role === 'celebrant' && p.eventId === old.id));
      this.cityEvents.splice(existingIdx, 1);
    }

    const defaultTitles: Record<CityEventType, string[]> = {
      celebration: ['Town Jubilee', 'Street Celebration', 'Happy Valley Party', 'Lantern Festival'],
      campaign: ['Green Trees Campaign', 'Road Safety Drive', 'Clean Streets Campaign', 'Civic Pride Campaign'],
      event: ['Community Fair', 'Park Music Event', 'Town Block Event', 'Farmers Showcase'],
      wedding: ['Valley Wedding', 'Garden Wedding', 'Town Chapel Wedding', 'Riverside Wedding'],
      ceremony: ['Town Honors Ceremony', 'Founders Day Ceremony', 'Civic Medal Ceremony', 'Ribbon Cutting Ceremony'],
      election: ['Mayoral Election', 'Special Civic Vote', 'New Mayor Ballot'],
    };
    const titleList = defaultTitles[type];
    const title = (customTitle && customTitle.trim()) || titleList[Math.floor(Math.random() * titleList.length)];

    const eventId = `evt_${this.eventIdCounter++}`;
    const guestCount = type === 'wedding' ? 6 : 5 + Math.floor(Math.random() * 2);
    const guestIds: string[] = [];
    const shirtColors = ['#EC4899', '#F59E0B', '#38BDF8', '#10B981', '#8B5CF6', '#FB7185'];
    const balloonColors = ['#F43F5E', '#FACC15', '#38BDF8', '#4ADE80', '#C084FC'];
    const cx = (venue.x + 0.5) * TILE_SIZE;
    const cy = (venue.y + 0.5) * TILE_SIZE;

    const connectedGuestHomes = this.buildingsList
      .filter((b) => b.id !== venue!.id && b.category !== 'road_path')
      .map((b) => ({
        b,
        path: this.findPedestrianPath(this.tiles, { x: b.x, y: b.y }, { x: venue!.x, y: venue!.y }),
      }))
      .filter((item): item is { b: PlacedBuilding; path: GridPoint[] } => Boolean(item.path));

    for (let k = 0; k < guestCount; k++) {
      const angle = (k / guestCount) * Math.PI * 2;
      const radius = 14 + (k % 2) * 5;
      const pid = `ppl_${this.personIdCounter++}`;
      guestIds.push(pid);
      const isBride = type === 'wedding' && k === 0;
      const isGroom = type === 'wedding' && k === 1;
      const origin =
        !isBride && !isGroom && connectedGuestHomes.length > 0
          ? connectedGuestHomes[k % connectedGuestHomes.length]
          : null;

      this.people.push({
        id: pid,
        role: 'celebrant',
        weddingRole: isBride ? 'bride' : isGroom ? 'groom' : type === 'wedding' ? 'guest' : undefined,
        wx: origin ? (origin.b.x + 0.5) * TILE_SIZE : cx + (isBride ? -4 : isGroom ? 4 : 0),
        wy: origin ? (origin.b.y + 0.78) * TILE_SIZE : cy + 12,
        targetWx: isBride ? cx - 4.5 : isGroom ? cx + 4.5 : cx + Math.cos(angle) * radius,
        targetWy: isBride || isGroom ? cy + 10 : cy + 6 + Math.sin(angle) * (radius * 0.65),
        speed: 30,
        shirtColor: isBride
          ? '#F8FAFC'
          : isGroom
          ? '#0F172A'
          : shirtColors[k % shirtColors.length],
        balloonColor: type === 'celebration' ? balloonColors[k % balloonColors.length] : undefined,
        signColor: type === 'campaign' ? '#4ADE80' : type === 'event' ? '#FACC15' : undefined,
        animPhase: k * 0.9,
        state: 'walking',
        homeBuildingId: origin?.b.id || venue.id,
        targetTileX: venue.x,
        targetTileY: venue.y,
        pedestrianPath: origin?.path,
        pedestrianPathIndex: origin && origin.path.length > 1 ? 1 : undefined,
        eventId,
        holdTimer: 0.5 + Math.random() * 1.5,
      });
    }

    const cityEvent: CityEvent = {
      id: eventId,
      type,
      title,
      buildingId: venue.id,
      buildingName: venue.name,
      x: venue.x,
      y: venue.y,
      guestIds,
      elapsedSeconds: 0,
      durationSeconds: type === 'wedding' || type === 'ceremony' ? 50 : 45,
    };

    this.cityEvents.push(cityEvent);
    this.emitConfettiBurst(
      cx,
      cy - 8,
      type === 'celebration' || type === 'wedding' ? 24 : 12,
      type
    );

    // Campaigns have a tangible positive civic impact!
    if (type === 'campaign') {
      this.deforestationPressure = Math.max(0, this.deforestationPressure - 2);
      const candidates: MapTile[] = [];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nt = this.getTile(venue.x + dx, venue.y + dy);
          if (nt && nt.terrain === 'grass' && !nt.hasRoad && !nt.building) {
            candidates.push(nt);
          }
        }
      }
      if (candidates.length > 0) {
        const spot = candidates[Math.floor(Math.random() * candidates.length)];
        spot.terrain = 'forest';
      }
    }

    if (playAudio) soundEngine.playCelebrationFanfare();
    return cityEvent;
  }

  public cancelCityEvent(eventId: string) {
    const idx = this.cityEvents.findIndex((ev) => ev.id === eventId);
    if (idx === -1) return;
    this.cityEvents.splice(idx, 1);
    this.people = this.people.filter((p) => !(p.role === 'celebrant' && p.eventId === eventId));
  }

  private emitConfettiBurst(
    wx: number,
    wy: number,
    count: number,
    type: CityEventType
  ) {
    const palette =
      type === 'wedding'
        ? ['#F8FAFC', '#F9A8D4', '#FDE047', '#FBCFE8']
        : type === 'ceremony'
        ? ['#C084FC', '#FACC15', '#38BDF8', '#F8FAFC']
        : type === 'celebration'
        ? ['#FACC15', '#FB7185', '#38BDF8', '#4ADE80', '#A78BFA']
        : type === 'campaign'
        ? ['#4ADE80', '#38BDF8', '#FEF08A', '#10B981']
        : ['#FACC15', '#FB923C', '#38BDF8', '#F472B6'];

    for (let i = 0; i < count; i++) {
      this.confetti.push({
        wx: wx + (Math.random() - 0.5) * 20,
        wy: wy + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 46,
        vy: -24 - Math.random() * 34,
        age: 0,
        maxAge: 1.1 + Math.random() * 0.8,
        color: palette[i % palette.length],
        size: 2.2 + Math.random() * 1.6,
      });
    }
  }

  private updateCityEvents(simDt: number, realDt: number, playAudio: boolean) {
    // Step confetti particles
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.age += realDt;
      c.wx += c.vx * realDt;
      c.wy += c.vy * realDt;
      c.vy += 38 * realDt;
      c.vx *= 0.985;
      if (c.age >= c.maxAge) {
        this.confetti.splice(i, 1);
      }
    }

    const buildingIds = new Set(this.buildingsList.map((b) => b.id));

    for (let i = this.cityEvents.length - 1; i >= 0; i--) {
      const ev = this.cityEvents[i];
      if (!buildingIds.has(ev.buildingId)) {
        this.cancelCityEvent(ev.id);
        continue;
      }

      ev.elapsedSeconds += simDt;
      if (ev.elapsedSeconds >= ev.durationSeconds) {
        this.cancelCityEvent(ev.id);
        continue;
      }

      // Periodic festive confetti pops
      if (Math.random() < realDt * (ev.type === 'celebration' || ev.type === 'wedding' ? 2.4 : 1.1)) {
        this.emitConfettiBurst(
          (ev.x + 0.5) * TILE_SIZE,
          (ev.y + 0.35) * TILE_SIZE,
          ev.type === 'celebration' || ev.type === 'wedding' ? 4 : 2,
          ev.type
        );
      }
    }

    // Step celebrant guests walking to & mingling at event venues
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];
      if (p.role !== 'celebrant') continue;

      const ev = this.cityEvents.find((e) => e.id === p.eventId);
      if (!ev) {
        this.people.splice(i, 1);
        continue;
      }

      if (p.state === 'walking') {
        if (p.pedestrianPath && p.pedestrianPath.length > 0) {
          const res = this.stepPersonAlongPath(p, realDt, 8);
          if (res === 'arrived') {
            p.pedestrianPath = undefined;
            p.state = 'protesting';
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else {
          const sameTile =
            Math.floor(p.wx / TILE_SIZE) === Math.floor(p.targetWx / TILE_SIZE) &&
            Math.floor(p.wy / TILE_SIZE) === Math.floor(p.targetWy / TILE_SIZE);
          if (!sameTile) {
            this.people.splice(i, 1);
            continue;
          }
          const dx = p.targetWx - p.wx;
          const dy = p.targetWy - p.wy;
          const dist = Math.hypot(dx, dy);
          if (dist < 2.5) {
            p.state = 'protesting';
          } else {
            const step = Math.min(dist, p.speed * realDt);
            p.wx += (dx / dist) * step;
            p.wy += (dy / dist) * step;
            p.animPhase += realDt * 8;
          }
        }
      } else {
        p.animPhase += realDt * 8.5;
        if (p.weddingRole === 'bride' || p.weddingRole === 'groom') {
          continue;
        }
        p.holdTimer -= realDt;
        if (p.holdTimer <= 0) {
          p.holdTimer = 1.6 + Math.random() * 2;
          const cx = (ev.x + 0.5) * TILE_SIZE;
          const cy = (ev.y + 0.5) * TILE_SIZE + 3;
          const angle = Math.random() * Math.PI * 2;
          const r = 8 + Math.random() * 8;
          p.targetWx = cx + Math.cos(angle) * r;
          p.targetWy = cy + Math.sin(angle) * (r * 0.65);
          p.state = 'walking';
        }
      }
    }

    // Natural, rare ceremonies, weddings & community celebrations
    if (this.cityEvents.length === 0 && this.buildingsList.length >= 4 && !this.crises.warActive) {
      this.eventCheckAccumulator += simDt;
      if (this.eventCheckAccumulator >= 420) {
        this.eventCheckAccumulator = 0;
        const roll = Math.random();
        if (roll < 0.34) {
          const canCeremony = this.dayCount - this.lastCeremonyDay >= 3;
          const canFestival = this.dayCount - this.lastFestivalDay >= 2;
          let pick: CityEventType = 'event';
          if (canCeremony && roll < 0.11) {
            pick = Math.random() < 0.5 ? 'wedding' : 'ceremony';
            this.lastCeremonyDay = this.dayCount;
          } else if (canFestival && roll < 0.21) {
            pick = 'celebration';
            this.lastFestivalDay = this.dayCount;
          } else if (roll < 0.28) {
            pick = 'campaign';
          }
          this.hostCityEvent(undefined, undefined, pick, undefined, playAudio);
        }
      }
    }
  }

  private assignPlanterTarget(planter: Person, nearX?: number, nearY?: number): boolean {
    const openGrass = this.tiles.filter(
      (t) => t.terrain === 'grass' && !t.hasRoad && !t.building
    );
    if (openGrass.length === 0) return false;
    const startPt = this.getCurrentWalkableStart(planter.wx, planter.wy);
    if (!startPt) return false;

    const refX = nearX !== undefined ? (nearX + 0.5) * TILE_SIZE : planter.wx;
    const refY = nearY !== undefined ? (nearY + 0.5) * TILE_SIZE : planter.wy;
    openGrass.sort(
      (a, b) =>
        Math.hypot((a.x + 0.5) * TILE_SIZE - refX, (a.y + 0.5) * TILE_SIZE - refY) -
        Math.hypot((b.x + 0.5) * TILE_SIZE - refX, (b.y + 0.5) * TILE_SIZE - refY)
    );

    const slice = openGrass.slice(0, Math.min(20, openGrass.length)).sort(() => Math.random() - 0.5);
    for (const pick of slice) {
      const path = this.findPedestrianPath(this.tiles, startPt, { x: pick.x, y: pick.y });
      if (path) {
        planter.targetTileX = pick.x;
        planter.targetTileY = pick.y;
        planter.targetWx = (pick.x + 0.5) * TILE_SIZE;
        planter.targetWy = (pick.y + 0.5) * TILE_SIZE + 4;
        planter.pedestrianPath = path;
        planter.pedestrianPathIndex = path.length > 1 ? 1 : 0;
        planter.state = 'walking';
        return true;
      }
    }
    return false;
  }

  private spawnTreePlanter(originX?: number, originY?: number) {
    if (this.people.filter((p) => p.role === 'planter').length >= 4) return;
    const housesAndHalls = this.buildingsList.filter(
      (b) => b.category === 'city_hall' || b.category === 'residential' || b.category === 'park'
    );
    const anchor =
      originX !== undefined && originY !== undefined
        ? { x: originX, y: originY, id: this.getTile(originX, originY)?.building?.id }
        : housesAndHalls.length > 0
        ? housesAndHalls[Math.floor(Math.random() * housesAndHalls.length)]
        : null;

    if (!anchor) return;
    const startTile = this.getTile(anchor.x, anchor.y);
    if (!startTile || !isPedestrianTileWalkable(startTile)) return;

    const startWx = (anchor.x + 0.5) * TILE_SIZE;
    const startWy = (anchor.y + 0.78) * TILE_SIZE;

    const shirts = ['#10B981', '#0EA5E9', '#84CC16', '#F59E0B'];
    const planter: Person = {
      id: `ppl_${this.personIdCounter++}`,
      role: 'planter',
      wx: startWx,
      wy: startWy,
      targetWx: startWx,
      targetWy: startWy,
      speed: 32,
      shirtColor: shirts[Math.floor(Math.random() * shirts.length)],
      hatColor: '#4ADE80',
      animPhase: Math.random() * Math.PI * 2,
      state: 'walking',
      homeBuildingId: anchor.id,
      holdTimer: 0,
    };
    if (this.assignPlanterTarget(planter, anchor.x, anchor.y)) {
      this.people.push(planter);
    }
  }

  private updateMayorSpeeches(simDt: number) {
    const cityHalls = this.buildingsList.filter((b) => b.category === 'city_hall');
    const hallIds = new Set(cityHalls.map((h) => h.id));

    for (let i = this.mayorSpeeches.length - 1; i >= 0; i--) {
      const sp = this.mayorSpeeches[i];
      if (!hallIds.has(sp.cityHallId)) {
        this.mayorSpeeches.splice(i, 1);
        continue;
      }
      sp.elapsedSeconds += simDt;
      if (sp.elapsedSeconds >= sp.durationSeconds) {
        this.mayorSpeeches.splice(i, 1);
      }
    }

    const forestCount = this.tiles.filter((t) => t.terrain === 'forest').length;

    // Even if there is no City Hall, citizens naturally replant trees when trees run very low
    if (forestCount <= 5 && this.buildingsList.length > 0) {
      this.planterCheckAccumulator += simDt;
      if (this.planterCheckAccumulator >= 22) {
        this.planterCheckAccumulator = 0;
        this.spawnTreePlanter();
      }
    }

    if (cityHalls.length === 0 || this.mayorSpeeches.length > 0) return;

    const speechInterval = forestCount <= 6 ? 20 : 38;
    this.speechCheckAccumulator += simDt;
    if (this.speechCheckAccumulator < speechInterval) return;
    this.speechCheckAccumulator = 0;

    if (Math.random() > 0.72) return;

    const idleHalls = cityHalls.filter(
      (h) => !this.protests.some((p) => p.cityHallId === h.id && p.status === 'active')
    );
    if (idleHalls.length === 0) return;
    const hall = idleHalls[Math.floor(Math.random() * idleHalls.length)];

    let kind: MayorSpeech['kind'] = 'civic';
    let topic = 'Keep our city clean & bright!';

    if (forestCount <= 8) {
      kind = 'reforest';
      topic =
        forestCount === 0
          ? 'No trees left! Plant saplings!'
          : 'Trees are low — let us plant!';
    } else if (this.fires.some((f) => f.status === 'active')) {
      kind = 'fire_safety';
      topic = 'Stay safe! Stop arson fires!';
    } else if (Math.random() < 0.45) {
      kind = 'reforest';
      topic = 'Plant a tree for tomorrow!';
    } else {
      const civicTopics = [
        'Yield at zebra crossings!',
        'Build safe neighbourhoods!',
        'Thank you, proud citizens!',
      ];
      topic = civicTopics[Math.floor(Math.random() * civicTopics.length)];
    }

    this.mayorSpeeches.push({
      id: `sp_${this.speechIdCounter++}`,
      cityHallId: hall.id,
      x: hall.x,
      y: hall.y,
      topic,
      kind,
      elapsedSeconds: 0,
      durationSeconds: 18,
    });

    if (kind === 'reforest') {
      const planters = forestCount <= 4 ? 3 : 2;
      for (let k = 0; k < planters; k++) {
        this.spawnTreePlanter(hall.x, hall.y);
      }
    }
  }

  private updateFiresAndArson(simDt: number, realDt: number, playAudio: boolean) {
    // Update rising smoke & water spray particles
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const s = this.smokeParticles[i];
      s.age += realDt;
      s.wx += s.vx * realDt;
      s.wy += s.vy * realDt;
      s.size += realDt * 4;
      if (s.age >= s.maxAge) {
        this.smokeParticles.splice(i, 1);
      }
    }

    // Update active fires
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const fire = this.fires[i];
      if (fire.status === 'active') {
        fire.elapsedSeconds += simDt;

        // Emit dark/gray smoke puffs above burning house or lot
        if (Math.random() < realDt * (4.5 * fire.intensity + 1)) {
          this.smokeParticles.push({
            wx: fire.wx + (Math.random() - 0.5) * 14,
            wy: fire.wy - 8,
            vx: (Math.random() - 0.3) * 10,
            vy: -16 - Math.random() * 14,
            age: 0,
            maxAge: 1.4 + Math.random() * 0.7,
            size: 3.5 + Math.random() * 2.5,
            color: fire.intensity > 0.5 ? 'rgba(51, 65, 85, 0.72)' : 'rgba(148, 163, 184, 0.58)',
          });
        }

        if (!fire.fireTruckDispatched) {
          this.dispatchFireTruckToFire(fire);
        }

        if (fire.elapsedSeconds >= fire.maxBurnSeconds) {
          fire.status = 'extinguished';
          fire.statusTimer = 4.0;
          this.cleanupFirefighters(fire.id);
          this.releaseFireTruck(fire.fireTruckCarId);
        }
      } else {
        fire.statusTimer -= simDt;
        if (fire.statusTimer <= 0) {
          this.fires.splice(i, 1);
        }
      }
    }

    // Step firefighters spraying water at fires
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];
      if (p.role !== 'firefighter' || !p.fireId) continue;

      const fire = this.fires.find((f) => f.id === p.fireId && f.status === 'active');
      if (!fire) {
        if (p.homeBuildingId) {
          p.fireId = undefined;
          p.speed = 38;
          if (!this.assignReturnRoute(p)) {
            this.people.splice(i, 1);
          }
        } else {
          this.people.splice(i, 1);
        }
        continue;
      }

      if (p.state === 'walking') {
        if (p.pedestrianPath && p.pedestrianPath.length > 0) {
          const res = this.stepPersonAlongPath(p, realDt, 11);
          if (res === 'arrived') {
            p.pedestrianPath = undefined;
            p.state = 'spraying';
          } else if (res === 'blocked') {
            if (p.homeBuildingId) {
              p.fireId = undefined;
              p.speed = 38;
              if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
            } else {
              this.people.splice(i, 1);
            }
          }
        } else {
          // Truck-deployed firefighter stepping directly from adjacent road curb onto the fire lot
          const curTx = Math.floor(p.wx / TILE_SIZE);
          const curTy = Math.floor(p.wy / TILE_SIZE);
          const adjacentToFire =
            Math.abs(curTx - fire.x) <= 1 &&
            Math.abs(curTy - fire.y) <= 1 &&
            this.getTile(fire.x, fire.y)?.terrain !== 'water';
          if (!adjacentToFire) {
            if (!this.assignPedestrianRoute(p, fire.x, fire.y, p.targetWx, p.targetWy)) {
              this.people.splice(i, 1);
            }
            continue;
          }
          const dx = p.targetWx - p.wx;
          const dy = p.targetWy - p.wy;
          const dist = Math.hypot(dx, dy);
          if (dist < 4) {
            p.state = 'spraying';
          } else {
            const step = Math.min(dist, p.speed * realDt);
            p.wx += (dx / dist) * step;
            p.wy += (dy / dist) * step;
            p.animPhase += realDt * 11;
          }
        }
      } else {
        p.animPhase += realDt * 12;
        // Water spray droplets toward fire
        if (Math.random() < realDt * 18) {
          const angle = Math.atan2(fire.wy - p.wy, fire.wx - p.wx);
          this.smokeParticles.push({
            wx: p.wx,
            wy: p.wy - 4,
            vx: Math.cos(angle) * 52 + (Math.random() - 0.5) * 10,
            vy: Math.sin(angle) * 52 + (Math.random() - 0.5) * 10,
            age: 0,
            maxAge: 0.4,
            size: 2.3,
            color: 'rgba(56, 189, 248, 0.92)',
          });
        }
        fire.intensity = Math.max(0, fire.intensity - realDt * 0.42);
        if (fire.intensity <= 0) {
          fire.status = 'extinguished';
          fire.statusTimer = 4.0;
          this.cleanupFirefighters(fire.id);
          this.releaseFireTruck(fire.fireTruckCarId);
          if (playAudio) soundEngine.playPoliceResolved();
        }
      }
    }

    // Naturally trigger occasional arsonist or house fire (rare unless War is active)
    const activeFiresCount = this.fires.filter((f) => f.status === 'active').length;
    const activeArsonists = this.people.filter((p) => p.role === 'arsonist').length;
    const maxFires = this.crises.warActive ? 3 : 1;
    if (activeFiresCount >= maxFires || activeArsonists >= 1) return;

    const houses = this.buildingsList.filter((b) => b.category === 'residential');
    if (houses.length === 0) return;

    this.fireCheckAccumulator += simDt;
    if (this.fireCheckAccumulator >= 96) {
      this.fireCheckAccumulator = 0;
      if (Math.random() < 0.34) {
        if (Math.random() < 0.72) {
          this.spawnArsonist(houses);
        } else {
          const h = houses[Math.floor(Math.random() * houses.length)];
          this.startFireAt(h.x, h.y, false, playAudio);
        }
      }
    }
  }

  private spawnArsonist(houses: PlacedBuilding[]) {
    let targetX = 0;
    let targetY = 0;

    if (houses.length > 0 && Math.random() < 0.72) {
      const h = houses[Math.floor(Math.random() * houses.length)];
      targetX = h.x;
      targetY = h.y;
    } else {
      const spots = this.tiles.filter(
        (t) => !t.hasRoad && !t.building && (t.terrain === 'grass' || t.terrain === 'forest')
      );
      if (spots.length === 0) return;
      const s = spots[Math.floor(Math.random() * spots.length)];
      targetX = s.x;
      targetY = s.y;
    }

    if (this.fires.some((f) => f.x === targetX && f.y === targetY)) return;

    // Arsonist must logically walk out of a reachable building (never appear in thin air)
    const hideouts = this.buildingsList
      .filter(
        (b) =>
          (b.x !== targetX || b.y !== targetY) &&
          (b.category === 'residential' ||
            b.category === 'workplace' ||
            b.category === 'commercial' ||
            b.category === 'park')
      )
      .sort((a, b) => Math.hypot(a.x - targetX, a.y - targetY) - Math.hypot(b.x - targetX, b.y - targetY));

    let originBuilding: PlacedBuilding | null = null;
    let path: GridPoint[] | null = null;
    for (const h of hideouts.slice(0, 8)) {
      const candidate = this.findPedestrianPath(this.tiles, { x: h.x, y: h.y }, { x: targetX, y: targetY });
      if (candidate) {
        originBuilding = h;
        path = candidate;
        break;
      }
    }
    if (!originBuilding || !path) return;

    this.people.push({
      id: `ppl_${this.personIdCounter++}`,
      role: 'arsonist',
      wx: (originBuilding.x + 0.5) * TILE_SIZE,
      wy: (originBuilding.y + 0.78) * TILE_SIZE,
      targetWx: (targetX + 0.5) * TILE_SIZE,
      targetWy: (targetY + 0.5) * TILE_SIZE + 6,
      speed: 34,
      shirtColor: '#334155',
      hatColor: '#EF4444',
      animPhase: Math.random() * Math.PI * 2,
      state: 'walking',
      homeBuildingId: originBuilding.id,
      targetTileX: targetX,
      targetTileY: targetY,
      pedestrianPath: path,
      pedestrianPathIndex: path.length > 1 ? 1 : 0,
      holdTimer: 0,
    });
  }

  public triggerFireAt(x: number, y: number, playAudio = true): FireIncident | null {
    const tile = this.getTile(x, y);
    if (!tile || !tile.building || tile.building.category === 'road_path') return null;
    return this.startFireAt(x, y, false, playAudio);
  }

  private startFireAt(x: number, y: number, byArsonist: boolean, playAudio: boolean): FireIncident | null {
    const tile = this.getTile(x, y);
    if (!tile || tile.terrain === 'water' || tile.hasRoad) return null;
    if (this.fires.some((f) => f.x === x && f.y === y && f.status === 'active')) return null;

    // Remove any fading resolved fire on this tile so the new active fire appears immediately
    for (let i = this.fires.length - 1; i >= 0; i--) {
      if (this.fires[i].x === x && this.fires[i].y === y && this.fires[i].status !== 'active') {
        this.fires.splice(i, 1);
      }
    }

    const isHouse = tile.building?.category === 'residential';
    const targetType: FireIncident['targetType'] = isHouse
      ? 'house'
      : tile.terrain === 'forest'
      ? 'forest'
      : 'grass';

    if (tile.terrain === 'forest') {
      tile.terrain = 'grass';
    }

    const incident: FireIncident = {
      id: `fire_${this.fireIdCounter++}`,
      targetType,
      buildingId: tile.building?.id,
      buildingName: tile.building ? tile.building.name : targetType === 'forest' ? 'Trees' : 'Brush Lot',
      x,
      y,
      wx: (x + 0.5) * TILE_SIZE,
      wy: (y + 0.5) * TILE_SIZE,
      intensity: 1,
      elapsedSeconds: 0,
      maxBurnSeconds: 38,
      fireTruckDispatched: false,
      fireTruckArrived: false,
      byArsonist,
      status: 'active',
      statusTimer: 0,
    };

    this.fires.push(incident);
    if (playAudio) soundEngine.playFireAlarm();
    this.dispatchFireTruckToFire(incident);
    this.dispatchStationedFirefighters(incident);
    return incident;
  }

  private dispatchStationedFirefighters(fire: FireIncident) {
    const idleStationed = this.people
      .filter((p) => p.role === 'firefighter' && p.homeBuildingId && !p.fireId)
      .sort(
        (a, b) => Math.hypot(a.wx - fire.wx, a.wy - fire.wy) - Math.hypot(b.wx - fire.wx, b.wy - fire.wy)
      );
    let dispatched = 0;
    for (const ff of idleStationed) {
      if (dispatched >= 2) break;
      const startPt = this.getCurrentWalkableStart(ff.wx, ff.wy);
      if (!startPt) continue;
      const path = this.findPedestrianPath(this.tiles, startPt, { x: fire.x, y: fire.y });
      if (!path) continue;
      ff.fireId = fire.id;
      ff.state = 'walking';
      ff.speed = 68;
      ff.targetTileX = fire.x;
      ff.targetTileY = fire.y;
      ff.targetWx = fire.wx + (dispatched === 0 ? -13 : 13);
      ff.targetWy = fire.wy + 12;
      ff.pedestrianPath = path;
      ff.pedestrianPathIndex = path.length > 1 ? 1 : 0;
      dispatched++;
    }
  }

  private dispatchFireTruckToFire(fire: FireIncident): boolean {
    const stations = this.buildingsList.filter((b) => b.category === 'fire_station');
    if (stations.length === 0) return false;

    const destRoad = this.findAdjacentRoadTile(this.tiles, fire.x, fire.y);
    if (!destRoad) return false;

    let bestStation: PlacedBuilding | null = null;
    let bestPath: { x: number; y: number }[] | null = null;

    const sorted = [...stations].sort(
      (a, b) => Math.hypot(a.x - fire.x, a.y - fire.y) - Math.hypot(b.x - fire.x, b.y - fire.y)
    );

    for (const st of sorted) {
      const startRoad = this.findAdjacentRoadTile(this.tiles, st.x, st.y);
      if (!startRoad) continue;
      const path = this.findRoadPath(this.tiles, startRoad, destRoad, 0.8);
      if (path && path.length >= 2) {
        bestStation = st;
        bestPath = path;
        break;
      }
    }

    if (!bestStation || !bestPath) return false;

    const fullPath: GridPoint[] = [{ x: bestStation.x, y: bestStation.y }, ...bestPath];
    const p0 = fullPath[0];
    const p1 = fullPath[1];
    const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

    const carId = `car_${this.carIdCounter++}`;
    const truck: Car = {
      id: carId,
      type: 'firetruck',
      color: '#DC2626',
      wx: (p0.x + 0.5) * TILE_SIZE,
      wy: (p0.y + 0.5) * TILE_SIZE,
      angle,
      speed: 78,
      maxSpeed: 145,
      path: fullPath,
      pathIndex: 1,
      originBuildingId: bestStation.id,
      destBuildingId: fire.buildingId || bestStation.id,
      destLabel: fire.buildingName,
      returnStationId: bestStation.id,
      originCategory: 'fire_station',
      destCategory: this.getTile(fire.x, fire.y)?.building?.category || 'residential',
      waitSeconds: 0,
      isBraking: false,
      isJammed: false,
      hornFlash: 0,
      sirenPhase: 0,
      targetFireId: fire.id,
    };

    bestStation.activeTripsOut += 1;
    this.cars.push(truck);
    fire.fireTruckDispatched = true;
    fire.fireTruckCarId = carId;
    return true;
  }

  private handleFireCarArrival(car: Car): boolean {
    if (!car.targetFireId) return false;
    const fire = this.fires.find((f) => f.id === car.targetFireId && f.status === 'active');
    if (!fire) return false;

    car.parkedAtFire = true;
    car.speed = 0;
    car.isBraking = false;
    car.isJammed = false;
    car.waitSeconds = 0;

    if (!fire.fireTruckArrived) {
      fire.fireTruckArrived = true;
      const truckTx = Math.floor(car.wx / TILE_SIZE);
      const truckTy = Math.floor(car.wy / TILE_SIZE);
      const isAdjacent = Math.abs(truckTx - fire.x) + Math.abs(truckTy - fire.y) <= 1;
      const walkPath = isAdjacent
        ? null
        : this.findPedestrianPath(
            this.tiles,
            this.findNearestWalkableTile(this.tiles, truckTx, truckTy, 1) || { x: truckTx, y: truckTy },
            { x: fire.x, y: fire.y }
          );
      if (isAdjacent || walkPath) {
        for (let k = 0; k < 2; k++) {
          this.people.push({
            id: `ppl_${this.personIdCounter++}`,
            role: 'firefighter',
            wx: car.wx + (k === 0 ? -5 : 5),
            wy: car.wy + (k === 0 ? -4 : 4),
            targetWx: fire.wx + (k === 0 ? -13 : 13),
            targetWy: fire.wy + 12,
            targetTileX: fire.x,
            targetTileY: fire.y,
            pedestrianPath: walkPath || undefined,
            pedestrianPathIndex: walkPath && walkPath.length > 1 ? 1 : undefined,
            speed: 78,
            shirtColor: '#DC2626',
            hatColor: '#FACC15',
            animPhase: k * Math.PI,
            state: 'walking',
            fireId: fire.id,
            holdTimer: 0,
          });
        }
      }
    }
    return true;
  }

  private cleanupFirefighters(fireId: string) {
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];
      if (p.role === 'firefighter' && p.fireId === fireId) {
        if (p.homeBuildingId) {
          p.fireId = undefined;
          p.speed = 38;
          if (!this.assignReturnRoute(p)) {
            this.people.splice(i, 1);
          }
        } else {
          this.people.splice(i, 1);
        }
      }
    }
  }

  private releaseFireTruck(carId?: string) {
    if (!carId) return;
    const idx = this.cars.findIndex((c) => c.id === carId);
    if (idx !== -1) {
      const car = this.cars[idx];
      if (!this.sendVehicleBackToStation(car, car.returnStationId, false)) {
        car.parkedAtFire = false;
        this.finishTrip(car);
        this.cars.splice(idx, 1);
      }
    }
  }

  private updateCarCrashes(simDt: number, realDt: number, playAudio: boolean) {
    // Step any foot police officers responding to a remote/disconnected crash
    for (let pi = this.people.length - 1; pi >= 0; pi--) {
      const officer = this.people[pi];
      if (officer.role !== 'police' || !officer.targetCrashId) continue;
      const crash = this.crashes.find(
        (c) => c.id === officer.targetCrashId && c.status === 'active'
      );
      if (!crash) {
        officer.targetCrashId = undefined;
        if (officer.homeBuildingId) {
          officer.speed = 24;
          if (!this.assignReturnRoute(officer)) this.people.splice(pi, 1);
        } else {
          this.people.splice(pi, 1);
        }
        continue;
      }
      const res = this.stepPersonAlongPath(officer, realDt, 9);
      if (res === 'arrived' || Math.hypot(officer.wx - crash.wx, officer.wy - crash.wy) < 16) {
        crash.policeArrived = true;
        officer.targetCrashId = undefined;
        if (officer.homeBuildingId) {
          officer.speed = 24;
          if (!this.assignReturnRoute(officer)) this.people.splice(pi, 1);
        } else {
          this.people.splice(pi, 1);
        }
      } else if (res === 'blocked') {
        const dx = crash.wx - officer.wx;
        const dy = crash.wy - officer.wy;
        const d = Math.hypot(dx, dy);
        if (d > 1) {
          officer.wx += (dx / d) * officer.speed * realDt;
          officer.wy += (dy / d) * officer.speed * realDt;
          officer.animPhase += realDt * 10;
        }
      }
    }

    for (let i = this.crashes.length - 1; i >= 0; i--) {
      const crash = this.crashes[i];
      if (crash.status === 'active') {
        const clearSpeed = crash.ambulanceArrived || crash.policeArrived ? 2.5 : 1.0;
        crash.elapsedSeconds += simDt * clearSpeed;

        if (!crash.ambulanceDispatched) {
          this.dispatchVehicleToCrash(crash, 'ambulance');
        }
        if (!crash.policeDispatched) {
          this.dispatchVehicleToCrash(crash, 'police');
        }

        // Light hood smoke puffs while wreck sits on the road
        if (Math.random() < realDt * 4.5 && this.smokeParticles.length < 180) {
          this.smokeParticles.push({
            wx: crash.wx + (Math.random() - 0.5) * 10,
            wy: crash.wy - 4 + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 8,
            vy: -13 - Math.random() * 10,
            age: 0,
            maxAge: 1.0 + Math.random() * 0.7,
            size: 3 + Math.random() * 2.5,
            color: Math.random() < 0.5 ? '#64748B' : '#94A3B8',
          });
        }

        const tile = this.getTile(crash.x, crash.y);
        if (tile && tile.hasRoad) {
          tile.congestionScore = Math.min(1, tile.congestionScore + simDt * 0.28);
        }

        if (crash.elapsedSeconds >= crash.maxClearSeconds) {
          crash.status = 'cleared';
          crash.statusTimer = 3.2;
          this.releaseCrashCars(crash.id);
          if (playAudio) soundEngine.playPoliceResolved();
        }
      } else {
        crash.statusTimer -= realDt;
        if (crash.statusTimer <= 0) {
          this.crashes.splice(i, 1);
        }
      }
    }

    const isFoggy = this.weather === 'Foggy';
    const activeCount = this.crashes.filter((c) => c.status === 'active').length;
    if (activeCount >= (isFoggy ? 2 : 1) || this.cars.length < 4) return;

    this.crashCheckAccumulator += simDt;
    const crashCheckInterval = isFoggy ? 42 : 120;
    if (this.crashCheckAccumulator < crashCheckInterval) return;

    // 1. Occasional collision when a speeding responder overtakes close civilian traffic
    for (let i = 0; i < this.cars.length; i++) {
      const em = this.cars[i];
      const isEmerg = em.type === 'ambulance' || em.type === 'police' || em.type === 'firetruck';
      if (
        !isEmerg ||
        em.isReturningToStation ||
        em.pathIndex <= 1 ||
        em.speed < 64 ||
        em.parkedAtProtest ||
        em.parkedAtFire ||
        em.parkedAtCrash ||
        em.parkedAtRaid
      ) {
        continue;
      }
      for (let j = 0; j < this.cars.length; j++) {
        if (i === j) continue;
        const civ = this.cars[j];
        if (
          civ.type === 'ambulance' ||
          civ.type === 'police' ||
          civ.type === 'firetruck' ||
          civ.parkedAtCrash ||
          civ.pathIndex < 1
        ) {
          continue;
        }
        const d = Math.hypot(em.wx - civ.wx, em.wy - civ.wy);
        if (d > (isFoggy ? 13 : 10.5)) continue;
        const tx = Math.floor(((em.wx + civ.wx) * 0.5) / TILE_SIZE);
        const ty = Math.floor(((em.wy + civ.wy) * 0.5) / TILE_SIZE);
        const tile = this.getTile(tx, ty);
        if (!tile || !tile.hasRoad) continue;
        if (this.crashes.some((c) => Math.abs(c.x - tx) <= 1 && Math.abs(c.y - ty) <= 1)) continue;
        this.crashCheckAccumulator = 0;
        if (Math.random() < (isFoggy ? 0.34 : 0.14)) {
          this.triggerCarCrash(i, j, playAudio, true);
        }
        return;
      }
    }

    // 2. Look for two civilian cars in a tight near-collision (unsignaled intersection, high speed, or thick Foggy visibility)
    let bestPair: [number, number] | null = null;
    let bestDist = Infinity;
    const maxCrashDist = isFoggy ? 16.5 : 13.5;

    for (let i = 0; i < this.cars.length; i++) {
      const a = this.cars[i];
      if (
        a.type === 'ambulance' ||
        a.type === 'police' ||
        a.type === 'firetruck' ||
        a.type === 'hearse' ||
        a.parkedAtProtest ||
        a.parkedAtFire ||
        a.parkedAtCrash
      ) {
        continue;
      }
      if (a.speed < (isFoggy ? 14 : 20)) continue;

      for (let j = i + 1; j < this.cars.length; j++) {
        const b = this.cars[j];
        if (
          b.type === 'ambulance' ||
          b.type === 'police' ||
          b.type === 'firetruck' ||
          b.type === 'hearse' ||
          b.parkedAtProtest ||
          b.parkedAtFire ||
          b.parkedAtCrash
        ) {
          continue;
        }
        if (b.speed < (isFoggy ? 12 : 16)) continue;

        const d = Math.hypot(a.wx - b.wx, a.wy - b.wy);
        if (d > maxCrashDist) continue;

        const midWx = (a.wx + b.wx) * 0.5;
        const midWy = (a.wy + b.wy) * 0.5;
        const tx = Math.floor(midWx / TILE_SIZE);
        const ty = Math.floor(midWy / TILE_SIZE);
        const tile = this.getTile(tx, ty);
        if (!tile || !tile.hasRoad) continue;
        if (this.crashes.some((c) => Math.abs(c.x - tx) <= 1 && Math.abs(c.y - ty) <= 1)) continue;

        const headingDot = Math.cos(a.angle - b.angle);
        const atIntersection = this.isIntersectionTile(this.tiles, tx, ty);
        const unsignaled = atIntersection && tile.intersection.controlType !== 'signal';
        const isCrossing = headingDot < 0.45;
        const isFastClose = d < 12 && (a.speed > 34 || b.speed > 34);

        if ((isCrossing || unsignaled || isFastClose || isFoggy) && d < bestDist) {
          bestDist = d;
          bestPair = [i, j];
        }
      }
    }

    if (bestPair) {
      this.crashCheckAccumulator = 0;
      const [idxA, idxB] = bestPair;
      const carA = this.cars[idxA];
      const carB = this.cars[idxB];
      const tx = Math.floor(((carA.wx + carB.wx) * 0.5) / TILE_SIZE);
      const ty = Math.floor(((carA.wy + carB.wy) * 0.5) / TILE_SIZE);
      const tile = this.getTile(tx, ty);
      const unsignaled =
        tile && this.isIntersectionTile(this.tiles, tx, ty) && tile.intersection.controlType !== 'signal';
      const chance = (unsignaled ? 0.16 : 0.06) * (isFoggy ? 2.8 : 1.0);
      if (Math.random() < chance) {
        this.triggerCarCrash(idxA, idxB, playAudio);
      }
    }
  }

  private triggerCarCrash(
    idxA: number,
    idxB: number,
    playAudio: boolean,
    isEmergencyCollision = false
  ): CrashIncident | null {
    const firstIdx = Math.max(idxA, idxB);
    const secondIdx = Math.min(idxA, idxB);
    const carA = this.cars[firstIdx];
    const carB = this.cars[secondIdx];
    if (!carA || !carB) return null;

    const wx = (carA.wx + carB.wx) * 0.5;
    const wy = (carA.wy + carB.wy) * 0.5;
    const tx = Math.max(0, Math.min(this.gridCols - 1, Math.floor(wx / TILE_SIZE)));
    const ty = Math.max(0, Math.min(this.gridRows - 1, Math.floor(wy / TILE_SIZE)));

    // Reset mission dispatch flags & decrement active trip counters cleanly for the two crashed cars
    for (const crashedCar of [carA, carB]) {
      if (crashedCar.targetFireId) {
        const fire = this.fires.find((f) => f.id === crashedCar.targetFireId && f.status === 'active');
        if (fire && fire.fireTruckCarId === crashedCar.id) {
          fire.fireTruckDispatched = false;
          fire.fireTruckCarId = undefined;
        }
      }
      if (crashedCar.targetRobberyId) {
        const rob = this.robberies.find((r) => r.id === crashedCar.targetRobberyId && r.status === 'active');
        if (rob) rob.policeDispatched = false;
      }
      if (crashedCar.targetProtestId) {
        const prot = this.protests.find((p) => p.id === crashedCar.targetProtestId && p.status === 'active');
        if (prot && prot.policeCarId === crashedCar.id) {
          prot.policeDispatched = false;
          prot.policeCarId = undefined;
        }
      }
      if (crashedCar.targetRaidStallId) {
        const st = this.marketStalls.find((s) => s.id === crashedCar.targetRaidStallId);
        if (st && st.raidCarId === crashedCar.id) {
          st.raidDispatched = false;
          st.raidCarId = undefined;
        }
      }
      for (const b of this.buildingsList) {
        if (b.id === crashedCar.originBuildingId) {
          b.activeTripsOut = Math.max(0, b.activeTripsOut - 1);
        }
        if (b.id === crashedCar.destBuildingId) {
          b.activeTripsIn = Math.max(0, b.activeTripsIn - 1);
        }
      }
    }

    this.cars.splice(firstIdx, 1);
    this.cars.splice(secondIdx, 1);

    const serious = isEmergencyCollision ? Math.random() < 0.35 : Math.random() < 0.25;
    const incident: CrashIncident = {
      id: `crash_${this.crashIdCounter++}`,
      x: tx,
      y: ty,
      wx,
      wy,
      carAColor: carA.color,
      carBColor: carB.color,
      carAAngle: carA.angle + (Math.random() - 0.5) * 0.45,
      carBAngle: carB.angle + (Math.random() - 0.5) * 0.55,
      elapsedSeconds: 0,
      maxClearSeconds: serious ? 34 : 26,
      ambulanceDispatched: false,
      policeDispatched: false,
      ambulanceArrived: false,
      policeArrived: false,
      responderCarIds: [],
      severity: serious ? 'serious' : 'fender_bender',
      status: 'active',
      statusTimer: 0,
    };

    this.crashes.push(incident);
    this.totalCrashes += 1;
    if (isEmergencyCollision) {
      this.floatingLabels.push({
        wx,
        wy: wy - 12,
        text: 'EMERGENCY CRASH!',
        color: '#FEF2F2',
        bgColor: '#B91C1C',
        age: 0,
        maxAge: 2.0,
      });
      if (serious) {
        this.logDailyNews(`WHOOPS! Two drivers in ${this.describeArea(tx, ty)} tried squeezing into the exact same spot—miraculously nobody spilled their coffee!`);
      }
    }
    if (playAudio) soundEngine.playCarCrash();

    // Impact sparks & smoke burst
    for (let s = 0; s < 8; s++) {
      const ang = (s / 8) * Math.PI * 2 + Math.random() * 0.5;
      const spd = 20 + Math.random() * 28;
      this.woodChips.push({
        wx,
        wy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 8,
        age: 0,
        maxAge: 0.45 + Math.random() * 0.25,
        color: s % 2 === 0 ? '#FACC15' : '#FB923C',
      });
    }
    for (let k = 0; k < 4; k++) {
      this.smokeParticles.push({
        wx: wx + (Math.random() - 0.5) * 8,
        wy: wy + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 14,
        vy: -14 - Math.random() * 12,
        age: 0,
        maxAge: 1.1,
        size: 4 + Math.random() * 3,
        color: '#94A3B8',
      });
    }

    if (serious) {
      const deathEv: DeathEvent = {
        id: `death_${this.deathIdCounter++}`,
        x: tx,
        y: ty,
        wx,
        wy,
        buildingName: `Road (${tx}, ${ty})`,
        age: 0,
        maxAge: 8.5,
        hearseDispatched: false,
      };
      this.deathEvents.push(deathEv);
      this.totalDeaths += 1;
    }

    this.dispatchVehicleToCrash(incident, 'ambulance');
    this.dispatchVehicleToCrash(incident, 'police');
    return incident;
  }

  private dispatchVehicleToCrash(
    crash: CrashIncident,
    vehicleType: 'ambulance' | 'police'
  ): boolean {
    if (vehicleType === 'police') {
      const route = this.findBestPoliceDispatchRoute(crash.x, crash.y);
      if (!route) return false;
      const { station, roadPath } = route;
      if (roadPath && roadPath.length >= 1) {
        const fullPath: GridPoint[] = [{ x: station.x, y: station.y }, ...roadPath];
        const p0 = fullPath[0];
        const p1 = fullPath[1] || fullPath[0];
        const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

        const carId = `car_${this.carIdCounter++}`;
        const responder: Car = {
          id: carId,
          type: 'police',
          color: '#1E3A8A',
          wx: (p0.x + 0.5) * TILE_SIZE,
          wy: (p0.y + 0.5) * TILE_SIZE,
          angle,
          speed: 68,
          maxSpeed: 132,
          path: fullPath,
          pathIndex: fullPath.length > 1 ? 1 : 0,
          originBuildingId: station.id,
          destBuildingId: station.id,
          destLabel: 'Traffic Crash',
          returnStationId: station.id,
          originCategory: 'police',
          destCategory: 'police',
          waitSeconds: 0,
          isBraking: false,
          isJammed: false,
          hornFlash: 0,
          sirenPhase: 0,
          targetCrashId: crash.id,
        };

        station.activeTripsOut += 1;
        this.cars.push(responder);
        crash.responderCarIds.push(carId);
        crash.policeDispatched = true;
        return true;
      }

      const footPath = this.findPoliceFootPath(
        { x: station.x, y: station.y },
        { x: crash.x, y: crash.y }
      );
      if (!footPath) return false;
      this.people.push({
        id: `ppl_${this.personIdCounter++}`,
        role: 'police',
        wx: (station.x + 0.5) * TILE_SIZE,
        wy: (station.y + 0.8) * TILE_SIZE,
        targetWx: crash.wx,
        targetWy: crash.wy,
        targetTileX: crash.x,
        targetTileY: crash.y,
        pedestrianPath: footPath,
        pedestrianPathIndex: footPath.length > 1 ? 1 : 0,
        speed: 56,
        shirtColor: '#1D4ED8',
        hatColor: '#1E3A8A',
        animPhase: 0,
        state: 'chasing',
        homeBuildingId: station.id,
        targetCrashId: crash.id,
        holdTimer: 0,
      });
      crash.policeDispatched = true;
      return true;
    }

    const stations = this.buildingsList.filter((b) => b.category === 'hospital');
    if (stations.length === 0) return false;

    const destRoad = { x: crash.x, y: crash.y };
    if (!this.getTile(destRoad.x, destRoad.y)?.hasRoad) return false;

    const sorted = [...stations].sort(
      (a, b) => Math.hypot(a.x - crash.x, a.y - crash.y) - Math.hypot(b.x - crash.x, b.y - crash.y)
    );

    for (const st of sorted) {
      const startRoad = this.findNearestRoadTile(this.tiles, st.x, st.y, 4);
      if (!startRoad) continue;
      const path = this.findRoadPath(this.tiles, startRoad, destRoad, 0.8);
      if (!path || path.length < 1) continue;

      const fullPath: GridPoint[] = [{ x: st.x, y: st.y }, ...path];
      const p0 = fullPath[0];
      const p1 = fullPath[1] || fullPath[0];
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

      const carId = `car_${this.carIdCounter++}`;
      const responder: Car = {
        id: carId,
        type: 'ambulance',
        color: '#F8FAFC',
        wx: (p0.x + 0.5) * TILE_SIZE,
        wy: (p0.y + 0.5) * TILE_SIZE,
        angle,
        speed: 58,
        maxSpeed: 118,
        path: fullPath,
        pathIndex: fullPath.length > 1 ? 1 : 0,
        originBuildingId: st.id,
        destBuildingId: st.id,
        destLabel: 'Traffic Crash',
        returnStationId: st.id,
        originCategory: 'hospital',
        destCategory: 'hospital',
        waitSeconds: 0,
        isBraking: false,
        isJammed: false,
        hornFlash: 0,
        sirenPhase: 0,
        targetCrashId: crash.id,
      };

      st.activeTripsOut += 1;
      this.cars.push(responder);
      crash.responderCarIds.push(carId);
      crash.ambulanceDispatched = true;
      return true;
    }

    return false;
  }

  private handleCrashCarArrival(car: Car): boolean {
    if (!car.targetCrashId) return false;
    const crash = this.crashes.find((c) => c.id === car.targetCrashId && c.status === 'active');
    if (!crash) return false;

    car.parkedAtCrash = true;
    car.speed = 0;
    car.isBraking = false;
    car.isJammed = false;
    car.waitSeconds = 0;

    if (car.type === 'ambulance') crash.ambulanceArrived = true;
    if (car.type === 'police') crash.policeArrived = true;
    return true;
  }

  private releaseCrashCars(crashId: string) {
    const crash = this.crashes.find((c) => c.id === crashId);
    if (!crash) return;
    for (const carId of crash.responderCarIds) {
      const idx = this.cars.findIndex((c) => c.id === carId);
      if (idx !== -1) {
        const car = this.cars[idx];
        if (!this.sendVehicleBackToStation(car, car.returnStationId, false)) {
          car.parkedAtCrash = false;
          this.finishTrip(car);
          this.cars.splice(idx, 1);
        }
      }
    }
    crash.responderCarIds = [];
  }

  private finishTrip(car: Car) {
    this.completedTrips += 1;
    if (car.type === 'police' && car.targetRobberyId) {
      const rob = this.robberies.find((r) => r.id === car.targetRobberyId);
      if (rob && rob.status === 'active') {
        rob.status = 'caught';
        rob.statusTimer = 4.0;
        this.stoppedRobberies += 1;
        this.sendToJail(1);
        soundEngine.playPoliceResolved();
      }
    }

    for (const b of this.buildingsList) {
      if (b.id === car.originBuildingId) {
        b.activeTripsOut = Math.max(0, b.activeTripsOut - 1);
      }
      if (b.id === car.destBuildingId) {
        b.activeTripsIn = Math.max(0, b.activeTripsIn - 1);
        if (!car.isReturningToStation) {
          this.incrementBuildingOccupancy(b, 1);
        }
      }
    }
  }

  private updateSeasonalParticlesAndIndoorMood(simDt: number, realDt: number) {
    // 1. Step Zzz particles
    for (let i = this.sleepZzzParticles.length - 1; i >= 0; i--) {
      const z = this.sleepZzzParticles[i];
      z.age += realDt;
      z.wx += z.vx * realDt;
      z.wy += z.vy * realDt;
      z.scale = 0.8 + (z.age / z.maxAge) * 0.45;
      if (z.age >= z.maxAge) {
        this.sleepZzzParticles.splice(i, 1);
      }
    }

    // 2. Step Snowballs in flight
    for (let i = this.snowballs.length - 1; i >= 0; i--) {
      const sb = this.snowballs[i];
      sb.progress += realDt / sb.duration;
      if (sb.progress >= 1) {
        for (let k = 0; k < 5; k++) {
          this.woodChips.push({
            wx: sb.x2,
            wy: sb.y2,
            vx: (Math.random() - 0.5) * 32,
            vy: -10 - Math.random() * 18,
            age: 0,
            maxAge: 0.35,
            color: '#F8FAFC',
          });
        }
        this.snowballs.splice(i, 1);
      }
    }

    // 3. Step built Snowmen in Winter (melt away outside Winter)
    if (this.season !== 'Winter') {
      this.snowmen = [];
    } else {
      for (let i = this.snowmen.length - 1; i >= 0; i--) {
        this.snowmen[i].age += simDt;
        if (this.snowmen[i].age >= this.snowmen[i].maxAge) {
          this.snowmen.splice(i, 1);
        }
      }
    }

    // 4. Nighttime Zzz sleeping bubbles from residential houses
    const houses = this.buildingsList.filter((b) => b.category === 'residential');
    if (this.getTimePhase() === 'Night' && houses.length > 0) {
      this.zzzAccumulator += realDt;
      if (this.zzzAccumulator >= 0.65) {
        this.zzzAccumulator = 0;
        const house = houses[Math.floor(Math.random() * houses.length)];
        this.sleepZzzParticles.push({
          wx: (house.x + 0.52) * TILE_SIZE + (Math.random() - 0.5) * 8,
          wy: (house.y + 0.22) * TILE_SIZE,
          vx: 4 + Math.random() * 5,
          vy: -14 - Math.random() * 6,
          age: 0,
          maxAge: 2.1,
          scale: 0.85,
        });
      }
    }

    // 5. Sad indoor citizen bubbles during Night or Rain/Storm curfew
    if (this.isOutdoorCurfew() && houses.length > 0) {
      this.sadIndoorAccumulator += realDt;
      if (this.sadIndoorAccumulator >= 7.2) {
        this.sadIndoorAccumulator = 0;
        if (Math.random() < 0.72) {
          const house = houses[Math.floor(Math.random() * houses.length)];
          const isRain = this.isRainingOrStorming();
          this.floatingLabels.push({
            wx: (house.x + 0.5) * TILE_SIZE,
            wy: (house.y + 0.14) * TILE_SIZE,
            text: isRain ? 'Rainy! Stuck inside :(' : 'Curfew! Want out :(',
            color: '#E2E8F0',
            bgColor: '#334155',
            age: 0,
            maxAge: 2.1,
          });
        }
      }
    }

    // 6. Factory smokestack chimney emissions
    const factories = this.buildingsList.filter((b) => b.category === 'factory');
    if (factories.length > 0) {
      this.factorySmokeAccumulator += realDt;
      if (this.factorySmokeAccumulator >= 0.42) {
        this.factorySmokeAccumulator = 0;
        for (const fac of factories.slice(0, 6)) {
          if (this.smokeParticles.length < 180) {
            this.smokeParticles.push({
              wx: (fac.x + 0.72) * TILE_SIZE,
              wy: (fac.y + 0.16) * TILE_SIZE,
              vx: 5 + (Math.random() - 0.3) * 8,
              vy: -16 - Math.random() * 10,
              age: 0,
              maxAge: 1.5,
              size: 4 + Math.random() * 2.5,
              color: 'rgba(100, 116, 139, 0.62)',
            });
          }
        }
      }
    }
  }

  private updateBrokenBridges(simDt: number, realDt: number, playAudio: boolean) {
    // 1. Step existing broken bridge incidents
    for (let i = this.brokenBridges.length - 1; i >= 0; i--) {
      const inc = this.brokenBridges[i];
      if (inc.status === 'broken') {
        inc.elapsedSeconds += simDt;
        const tile = this.getTile(inc.x, inc.y);
        if (!tile || tile.terrain !== 'water' || (!tile.hasRoad && !tile.hasFootbridge)) {
          if (tile) tile.isBridgeBroken = false;
          this.brokenBridges.splice(i, 1);
          continue;
        }
        // Dispatch repair crew if none assigned yet
        const hasRepairer = this.people.some(
          (p) =>
            p.role === 'repairer' &&
            p.targetTileX !== undefined &&
            p.targetTileY !== undefined &&
            Math.abs(p.targetTileX - inc.x) + Math.abs(p.targetTileY - inc.y) <= 1
        );
        if (!hasRepairer && !inc.repairerDispatched) {
          this.dispatchBridgeRepairer(inc);
        }
        // Fallback auto-repair guarantee within maxRepairSeconds
        if (inc.elapsedSeconds >= inc.maxRepairSeconds) {
          tile.isBridgeBroken = false;
          inc.status = 'repaired';
          inc.statusTimer = 2.0;
          this.floatingLabels.push({
            wx: inc.wx,
            wy: inc.wy - 10,
            text: '+Bridge Fixed!',
            color: '#0F172A',
            bgColor: '#4ADE80',
            age: 0,
            maxAge: 1.7,
          });
          if (playAudio) soundEngine.playCleanSparkle();
        }
      } else {
        inc.statusTimer -= realDt;
        if (inc.statusTimer <= 0) {
          this.brokenBridges.splice(i, 1);
        }
      }
    }

    // 2. Occasionally collapse one river bridge/footbridge
    const hasActive = this.brokenBridges.some((b) => b.status === 'broken');
    if (hasActive) return;

    const bridgeTiles = this.tiles.filter(
      (t) => t.terrain === 'water' && (t.hasRoad || t.hasFootbridge) && !t.isBridgeBroken
    );
    if (bridgeTiles.length === 0) return;

    this.bridgeBreakAccumulator += simDt;
    if (this.bridgeBreakAccumulator >= 78) {
      this.bridgeBreakAccumulator = 0;
      const chance = this.weather === 'Storm' ? 0.55 : 0.34;
      if (Math.random() < chance) {
        const pick = bridgeTiles[Math.floor(Math.random() * bridgeTiles.length)];
        pick.isBridgeBroken = true;

        // Safely clear any car sitting directly on the collapsed bridge span
        this.cars = this.cars.filter((c) => {
          const cx = Math.floor(c.wx / TILE_SIZE);
          const cy = Math.floor(c.wy / TILE_SIZE);
          return !(cx === pick.x && cy === pick.y);
        });

        const inc: BrokenBridgeIncident = {
          id: `br_${this.brokenBridgeIdCounter++}`,
          x: pick.x,
          y: pick.y,
          wx: (pick.x + 0.5) * TILE_SIZE,
          wy: (pick.y + 0.5) * TILE_SIZE,
          kind: pick.hasRoad ? 'road' : 'footbridge',
          elapsedSeconds: 0,
          maxRepairSeconds: 36,
          repairerDispatched: false,
          repairerArrived: false,
          status: 'broken',
          statusTimer: 0,
        };
        this.brokenBridges.push(inc);

        for (let k = 0; k < 8; k++) {
          this.woodChips.push({
            wx: inc.wx + (Math.random() - 0.5) * 14,
            wy: inc.wy + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 42,
            vy: -18 - Math.random() * 24,
            age: 0,
            maxAge: 0.55,
            color: k % 2 === 0 ? '#94A3B8' : '#78350F',
          });
        }
        this.floatingLabels.push({
          wx: inc.wx,
          wy: inc.wy - 12,
          text: 'BRIDGE COLLAPSED!',
          color: '#FEF2F2',
          bgColor: '#B91C1C',
          age: 0,
          maxAge: 2.2,
        });
        if (playAudio) soundEngine.playCarCrash();
        this.dispatchBridgeRepairer(inc);
      }
    }
  }

  private dispatchBridgeRepairer(inc: BrokenBridgeIncident): boolean {
    const bases = this.buildingsList.filter(
      (b) => b.category === 'city_hall' || b.category === 'workplace' || b.category === 'fire_station'
    );
    const originPool = bases.length > 0 ? bases : this.buildingsList.filter((b) => b.category !== 'road_path');
    if (originPool.length === 0) return false;

    const sortedBases = [...originPool].sort(
      (a, b) => Math.hypot(a.x - inc.x, a.y - inc.y) - Math.hypot(b.x - inc.x, b.y - inc.y)
    );
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];
    const bankSpot = dirs
      .map((d) => this.getTile(inc.x + d.dx, inc.y + d.dy))
      .find((t): t is MapTile => Boolean(t && isPedestrianTileWalkable(t)));

    const dest = bankSpot || this.getTile(inc.x, inc.y);
    if (!dest) return false;

    for (const orig of sortedBases.slice(0, 6)) {
      const path = this.findPedestrianPath(this.tiles, { x: orig.x, y: orig.y }, { x: dest.x, y: dest.y });
      if (!path) continue;
      this.people.push({
        id: `ppl_${this.personIdCounter++}`,
        role: 'repairer',
        wx: (orig.x + 0.5) * TILE_SIZE,
        wy: (orig.y + 0.78) * TILE_SIZE,
        targetWx: (dest.x + 0.5) * TILE_SIZE,
        targetWy: (dest.y + 0.5) * TILE_SIZE,
        speed: 35,
        shirtColor: '#EA580C',
        hatColor: '#FDE047',
        animPhase: Math.random() * Math.PI * 2,
        state: 'walking',
        homeBuildingId: orig.id,
        targetTileX: dest.x,
        targetTileY: dest.y,
        pedestrianPath: path,
        pedestrianPathIndex: path.length > 1 ? 1 : 0,
        holdTimer: 0,
      });
      inc.repairerDispatched = true;
      return true;
    }
    return false;
  }

  public getStats(): SimulationStats {
    const mins = Math.floor(this.minutesOfDay) % 1440;
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    const formattedTime = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;

    let population = 0;
    for (const b of this.buildingsList) {
      if (b.category === 'residential') {
        population += b.residents ?? Math.min(5, Math.max(1, b.capacity || 3));
      }
    }

    let jammedCars = 0;
    let totalSpeedRatio = 0;
    for (const c of this.cars) {
      if (c.isJammed) jammedCars++;
      totalSpeedRatio += c.speed / c.maxSpeed;
    }

    const trafficFlowPercent =
      this.cars.length === 0 ? 100 : Math.round((totalSpeedRatio / this.cars.length) * 100);

    const activeRobberies = this.robberies.filter((r) => r.status === 'active').length;
    const activeProtests = this.protests.filter((p) => p.status === 'active' && p.started).length;
    const activeFires = this.fires.filter((f) => f.status === 'active').length;
    const activeCrashes = this.crashes.filter((c) => c.status === 'active').length;

    return {
      dayCount: this.dayCount,
      dayOfWeek: this.getDayOfWeek(),
      isWeekend: this.isWeekend(),
      hasTodayPhotoNews: !this.canPublishTodayPhotoNews(),
      basementCount: this.buildingsList.filter((b) => b.hasBasement).length,
      animalsCount: this.animals.length,
      gridCols: this.gridCols,
      gridRows: this.gridRows,
      expansionCredits: this.expansionCredits,
      lastExpansionMilestone: this.lastExpansionMilestone,
      pendingProposalsCount: this.pendingProposals.length,
      activeConstructionsCount: this.activeConstructions.length,
      tornadoActive: this.crises.tornadoActive,
      earthquakeActive: this.crises.earthquakeActive,
      floodActive: this.crises.floodActive,
      minutesOfDay: this.minutesOfDay,
      formattedTime,
      timePhase: this.getTimePhase(),
      population,
      buildingsCount: this.buildingsList.length,
      roadTilesCount: this.roadTilesCount,
      activeCars: this.cars.length,
      jammedCars,
      trafficFlowPercent,
      completedTrips: this.completedTrips,
      neighbourhoodsCount: this.neighbourhoods.length,
      activeRobberies,
      stoppedRobberies: this.stoppedRobberies,
      totalDeaths: this.totalDeaths,
      activeProtests,
      capturedProtesters: this.capturedProtesters,
      choppedTrees: this.choppedTrees,
      plantedTrees: this.plantedTrees,
      activeFires,
      activeCrashes,
      totalCrashes: this.totalCrashes,
      activeEvents: this.cityEvents.length,
      fishCaught: this.fishCaught,
      activeStalls: this.marketStalls.length,
      infectedCitizens: this.people.filter((p) => p.isInfected).length,
      virusActive: this.crises.virusActive,
      warActive: this.crises.warActive,
      povertyActive: this.crises.povertyActive,
      pollutionActive: this.crises.pollutionActive,
      pollutionLevel: Math.round(this.crises.pollutionLevel),
      cratersCount: this.blastCraters.length,
      invadersCount: this.people.filter((p) => p.role === 'invader').length,
      citizenHappiness: Math.round(this.citizenHappiness),
      happinessMood: this.getHappinessMood(this.citizenHappiness),
      happinessSummary: this.happinessSummary,
      totalLawsuits: this.totalLawsuits,
      hasCityHall: this.hasCityHall(),
      prisonInmates: this.prisonInmates,
      totalJailed: this.totalJailed,
      totalReleased: this.totalReleased,
      mayorAlive: this.mayorAlive,
      electionActive: this.electionActive,
      electionRemaining: Math.ceil(this.electionRemaining),
      brokenBridgesCount: this.brokenBridges.filter((b) => b.status === 'broken').length,
      oceanTrashCount: this.trashItems.filter((t) => t.inWater).length,
      unreadNewsCount: this.unreadNewsCount,
      dailyNewsHeadline: this.newspapers[0]?.headline || `${this.getDayOfWeek()} Edition: Ready for Today's Photo!`,
      activeEscapees: this.people.filter((p) => p.role === 'escapee').length,
      season: this.season,
      weather: this.weather,
      chaosCooldowns: {
        virus: Math.ceil(this.chaosCooldowns.virus),
        war: Math.ceil(this.chaosCooldowns.war),
        poverty: Math.ceil(this.chaosCooldowns.poverty),
        pollution: Math.ceil(this.chaosCooldowns.pollution),
        invade: Math.ceil(this.chaosCooldowns.invade),
        nuke: Math.ceil(this.chaosCooldowns.nuke),
        tornado: Math.ceil(this.chaosCooldowns.tornado),
        earthquake: Math.ceil(this.chaosCooldowns.earthquake),
        flood: Math.ceil(this.chaosCooldowns.flood),
      },
    };
  }

  private describeArea(tx: number, ty: number): string {
    let bestNeighbourhood: Neighbourhood | null = null;
    let bestDist = Infinity;
    for (const n of this.neighbourhoods) {
      const d = Math.hypot(n.centerX - tx, n.centerY - ty);
      if (d < bestDist) {
        bestDist = d;
        bestNeighbourhood = n;
      }
    }
    if (bestNeighbourhood && bestDist <= 8) {
      return bestNeighbourhood.name;
    }
    if (Math.abs(tx - this.gridCols / 2) <= 6 && Math.abs(ty - this.gridRows / 2) <= 5) {
      return 'Downtown';
    }
    const ns = ty < this.gridRows * 0.36 ? 'North' : ty > this.gridRows * 0.64 ? 'South' : '';
    const ew = tx < this.gridCols * 0.36 ? 'West' : tx > this.gridCols * 0.64 ? 'East' : '';
    if (ns && ew) return `${ns}-${ew} District`;
    if (ns) return `${ns}side`;
    if (ew) return `${ew}side`;
    return 'Midtown';
  }

  public markNewsRead() {
    this.unreadNewsCount = 0;
  }

  private logDailyNews(line: string) {
    if (!this.dailyHighlights.includes(line)) {
      this.dailyHighlights.push(line);
      if (this.dailyHighlights.length > 6) this.dailyHighlights.shift();
    }
  }

  public canPublishTodayPhotoNews(): boolean {
    return !this.newspapers.some((n) => n.day === this.dayCount && n.isUserAuthored);
  }

  public getDailyNewsHints(): string[] {
    return [...this.dailyHighlights];
  }

  private generateReaderComments(headline: string, summary: string, weather: WeatherType): NewspaperComment[] {
    const authors = [
      'Gertie Pickle',
      'Barnaby Honk',
      'Captain Waffle',
      'Nora Noodleman',
      'Socks McGee',
      'Uncle Crumb',
      'Midge Sprocket',
      'Zeke Ferret',
      'Betsy Bongo',
      'Prof. Turnip',
    ];
    const colors = ['#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#14B8A6'];
    const lower = `${headline} ${summary}`.toLowerCase();
    const quips: string[] = [
      `I read "${headline.slice(0, 32)}${headline.length > 32 ? '...' : ''}" twice while eating soup and dropped my spoon.`,
      'My cat knocked over three flowerpots right as the paperboy hit my porch. 5 stars.',
      'Not to be dramatic, but this is the greatest piece of journalism since Mayor ate cereal with a fork.',
      'I framed page one next to my toaster. Even my sourdough starter looks impressed.',
      'Finally! Someone had the guts to photograph our chaos instead of blaming pigeons.',
      'Why was I NOT interviewed?! I was literally standing near a shrub doing backflips!',
      '10/10 photo! Though my cousin swears that blur in the back is a sneaky raccoon.',
      `Wild day! Also ${weather.toLowerCase()} weather made my umbrella turn inside out three times.`,
      'Paperboy nailed a trick shot straight onto my doormat from a moving bicycle. Legend.',
      'I showed this edition to a cow near the woods and it nodded respectfully.',
    ];
    if (lower.includes('fire') || lower.includes('crash') || lower.includes('war') || lower.includes('tornado')) {
      quips.unshift('I was just trying to buy croissants and suddenly there is front-page mayhem?! Love this town.');
    }
    if (lower.includes('school') || lower.includes('park') || lower.includes('kid')) {
      quips.unshift('My nephew says he is famous now and refuses to do math homework.');
    }
    const moods = ['Baffled', 'Amazed', 'Dramatic', 'Hyped', 'Suspicious', 'Delighted', 'Hungry'];
    const pickedAuthors = [...authors].sort(() => Math.random() - 0.5).slice(0, 5);
    const pickedQuips = [...quips].sort(() => Math.random() - 0.5).slice(0, 5);
    return pickedAuthors.map((author, idx) => {
      const mood = moods[(idx + Math.floor(Math.random() * moods.length)) % moods.length];
      return {
        id: `cmt_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        author,
        avatarColor: colors[idx % colors.length],
        mood,
        reaction: mood,
        text: pickedQuips[idx],
        likes: 2 + Math.floor(Math.random() * 44),
      };
    });
  }

  public publishUserNewspaper(
    headline: string,
    summary: string,
    photoDataUrl?: string
  ): NewspaperEdition | null {
    if (!this.canPublishTodayPhotoNews()) return null;
    const stats = this.getStats();
    const cleanHeadline = headline.trim() || `${this.getDayOfWeek()} Dispatch from ${this.mapName}`;
    const cleanSummary = summary.trim() || 'Another lively day across town captured on camera.';
    const edition: NewspaperEdition = {
      id: `news_${this.newsIdCounter++}`,
      day: this.dayCount,
      dayOfWeek: this.getDayOfWeek(),
      season: this.season,
      weather: this.weather,
      headline: cleanHeadline,
      summary: cleanSummary,
      highlights: this.dailyHighlights.slice(0, 3),
      publishedAtTime: stats.formattedTime,
      photoDataUrl,
      isUserAuthored: true,
      readerComments: this.generateReaderComments(cleanHeadline, cleanSummary, this.weather),
    };
    this.newspapers.unshift(edition);
    if (this.newspapers.length > 14) this.newspapers.pop();
    this.dailyHighlights = [];
    this.unreadNewsCount = 0;
    this.citizenHappiness = Math.min(100, this.citizenHappiness + 2);
    this.spawnPaperboyDelivery();
    soundEngine.playMarketSale();
    return edition;
  }

  public spawnPaperboyDelivery() {
    const houses = this.buildingsList.filter((b) => b.category === 'residential');
    if (houses.length === 0) return;

    const origins = this.buildingsList.filter(
      (b) => b.category === 'city_hall' || b.category === 'commercial' || b.category === 'visit_spot'
    );
    const startBld = origins[0] || houses[0];

    // Order reachable houses using greedy nearest-neighbor so the paperboy rides smoothly across neighbourhoods
    const remaining = [...houses];
    const routeHouses: PlacedBuilding[] = [];
    let curX = startBld.x;
    let curY = startBld.y;
    while (remaining.length > 0 && routeHouses.length < 10) {
      remaining.sort(
        (a, b) => Math.hypot(a.x - curX, a.y - curY) - Math.hypot(b.x - curX, b.y - curY)
      );
      const next = remaining.shift()!;
      routeHouses.push(next);
      curX = next.x;
      curY = next.y;
    }
    const first = routeHouses.shift();
    if (!first) return;

    const path = this.findPedestrianPath(this.tiles, { x: startBld.x, y: startBld.y }, { x: first.x, y: first.y });
    if (!path) return;

    this.people.push({
      id: `ppl_${this.personIdCounter++}`,
      role: 'paperboy',
      hasBicycle: true,
      wx: (startBld.x + 0.5) * TILE_SIZE,
      wy: (startBld.y + 0.8) * TILE_SIZE,
      targetWx: (first.x + 0.5) * TILE_SIZE,
      targetWy: (first.y + 0.82) * TILE_SIZE,
      speed: 58,
      shirtColor: '#EA580C',
      hatColor: '#1E293B',
      carryingItem: 'books',
      animPhase: 0,
      state: 'delivering_paper',
      homeBuildingId: startBld.id,
      destBuildingId: first.id,
      targetTileX: first.x,
      targetTileY: first.y,
      pedestrianPath: path,
      pedestrianPathIndex: path.length > 1 ? 1 : 0,
      deliveryQueueIds: routeHouses.map((h) => h.id),
      holdTimer: 0,
    });
  }

  private updateNewspaperDelivery(simDt: number, realDt: number, playAudio: boolean) {
    // 1. Decay old porch papers if nobody picks them up
    for (let i = this.porchPapers.length - 1; i >= 0; i--) {
      this.porchPapers[i].age += simDt;
      if (this.porchPapers[i].age >= 95) {
        this.porchPapers.splice(i, 1);
      }
    }

    // 2. Step bicycling paperboys & doorstep pickups
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];
      if (p.role === 'paperboy') {
        if (p.state === 'returning') {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 11);
          if (res !== 'moving' || p.holdTimer <= 0) {
            this.people.splice(i, 1);
          }
          continue;
        }
        const res = this.stepPersonAlongPath(p, realDt, 12);
        if (res === 'arrived') {
          const house = this.buildingsList.find((b) => b.id === p.destBuildingId);
          if (house) {
            const px = (house.x + 0.34 + Math.random() * 0.32) * TILE_SIZE;
            const py = (house.y + 0.86) * TILE_SIZE;
            this.porchPapers.push({
              id: `pp_${this.porchPaperIdCounter++}`,
              buildingId: house.id,
              x: house.x,
              y: house.y,
              wx: px,
              wy: py,
              age: 0,
              pickedUp: false,
            });
            if (Math.random() < 0.45) {
              this.floatingLabels.push({
                wx: (house.x + 0.5) * TILE_SIZE,
                wy: (house.y + 0.25) * TILE_SIZE,
                text: '📰 Fresh Paper!',
                color: '#0F172A',
                bgColor: '#FEF08A',
                age: 0,
                maxAge: 1.5,
              });
            }
            if (playAudio && Math.random() < 0.35) soundEngine.playUiTick();
            // Resident steps out onto porch to grab today's newspaper!
            this.people.push({
              id: `ppl_${this.personIdCounter++}`,
              role: 'pedestrian',
              speechTopic: 'pickup_paper',
              wx: (house.x + 0.5) * TILE_SIZE,
              wy: (house.y + 0.72) * TILE_SIZE,
              targetWx: px,
              targetWy: py,
              speed: 19,
              shirtColor: ['#38BDF8', '#10B981', '#F59E0B', '#EC4899'][Math.floor(Math.random() * 4)],
              animPhase: 0,
              state: 'idling',
              homeBuildingId: house.id,
              holdTimer: 1.8,
            });
          }

          // Advance to next house on route or pedal home
          let routedNext = false;
          while (p.deliveryQueueIds && p.deliveryQueueIds.length > 0) {
            const nextId = p.deliveryQueueIds.shift()!;
            const nextHouse = this.buildingsList.find((b) => b.id === nextId);
            if (!nextHouse) continue;
            if (this.assignPedestrianRoute(p, nextHouse.x, nextHouse.y, (nextHouse.x + 0.5) * TILE_SIZE, (nextHouse.y + 0.82) * TILE_SIZE)) {
              p.destBuildingId = nextHouse.id;
              routedNext = true;
              break;
            }
          }
          if (!routedNext) {
            if (!this.assignReturnRoute(p)) {
              this.people.splice(i, 1);
            }
          }
        } else if (res === 'blocked') {
          if (!this.assignReturnRoute(p)) {
            this.people.splice(i, 1);
          }
        }
        continue;
      }

      if (p.role === 'pedestrian' && p.speechTopic === 'pickup_paper') {
        const dx = p.targetWx - p.wx;
        const dy = p.targetWy - p.wy;
        const dist = Math.hypot(dx, dy);
        if (dist > 1.8) {
          const step = Math.min(dist, p.speed * realDt);
          p.wx += (dx / dist) * step;
          p.wy += (dy / dist) * step;
          p.animPhase += realDt * 7;
        } else if (p.holdTimer > 0) {
          p.holdTimer -= realDt;
          // Grab the paper from the porch!
          const paperIdx = this.porchPapers.findIndex((pp) => pp.buildingId === p.homeBuildingId);
          if (paperIdx !== -1 && p.holdTimer < 1.1) {
            this.porchPapers.splice(paperIdx, 1);
            p.carryingItem = 'books';
            const home = this.buildingsList.find((b) => b.id === p.homeBuildingId);
            if (home) {
              p.targetWx = (home.x + 0.5) * TILE_SIZE;
              p.targetWy = (home.y + 0.72) * TILE_SIZE;
            }
          }
        } else {
          this.people.splice(i, 1);
        }
      }
    }
  }

  private updateDisasters(simDt: number, realDt: number, playAudio: boolean) {
    // 1. Tornado — destroys everything in its path (except City Hall & Basement buildings)
    if (this.crises.tornadoActive) {
      this.crises.tornadoRemaining = Math.max(0, this.crises.tornadoRemaining - simDt);
      this.tornadoBasementLabelCooldown = Math.max(0, this.tornadoBasementLabelCooldown - realDt);
      this.crises.tornadoWx += this.tornadoVx * realDt;
      this.crises.tornadoWy += this.tornadoVy * realDt;
      if (this.crises.tornadoWx < TILE_SIZE * 2 || this.crises.tornadoWx > (this.gridCols - 2) * TILE_SIZE) {
        this.tornadoVx *= -1;
      }
      if (this.crises.tornadoWy < TILE_SIZE * 2 || this.crises.tornadoWy > (this.gridRows - 2) * TILE_SIZE) {
        this.tornadoVy *= -1;
      }
      if (Math.random() < realDt * 14 && this.smokeParticles.length < 180) {
        this.smokeParticles.push({
          wx: this.crises.tornadoWx + (Math.random() - 0.5) * 22,
          wy: this.crises.tornadoWy - 4 + (Math.random() - 0.5) * 14,
          vx: (Math.random() - 0.5) * 38,
          vy: -32 - Math.random() * 26,
          age: 0,
          maxAge: 0.75,
          size: 4.5 + Math.random() * 4,
          color: 'rgba(148, 163, 184, 0.78)',
        });
      }

      const tx = Math.max(0, Math.min(this.gridCols - 1, Math.floor(this.crises.tornadoWx / TILE_SIZE)));
      const ty = Math.max(0, Math.min(this.gridRows - 1, Math.floor(this.crises.tornadoWy / TILE_SIZE)));
      let worldChanged = false;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tile = this.getTile(tx + dx, ty + dy);
          if (!tile || tile.terrain === 'void') continue;
          const tileCx = (tile.x + 0.5) * TILE_SIZE;
          const tileCy = (tile.y + 0.5) * TILE_SIZE;
          const dist = Math.hypot(tileCx - this.crises.tornadoWx, tileCy - this.crises.tornadoWy);
          if (dist > TILE_SIZE * 0.72) continue;

          if (tile.terrain === 'forest') {
            tile.terrain = 'grass';
            for (let k = 0; k < 4; k++) {
              this.woodChips.push({
                wx: tileCx + (Math.random() - 0.5) * 14,
                wy: tileCy,
                vx: (Math.random() - 0.5) * 52,
                vy: -22 - Math.random() * 20,
                age: 0,
                maxAge: 0.65,
                color: k % 2 === 0 ? '#16A34A' : '#78350F',
              });
            }
          }

          if (this.removeStallOnTile(tile.x, tile.y)) {
            this.floatingLabels.push({
              wx: tileCx,
              wy: tileCy - 8,
              text: 'Stall Swept Away!',
              color: '#FEF2F2',
              bgColor: '#475569',
              age: 0,
              maxAge: 1.6,
            });
          }
          if (
            this.pendingProposals.some((pr) => pr.x === tile.x && pr.y === tile.y) ||
            this.activeConstructions.some((ac) => ac.x === tile.x && ac.y === tile.y)
          ) {
            this.clearPermitsAtTile(tile.x, tile.y);
          }

          if (tile.building && tile.building.category !== 'city_hall') {
            if (tile.building.hasBasement) {
              if (this.tornadoBasementLabelCooldown <= 0) {
                this.tornadoBasementLabelCooldown = 1.6;
                this.floatingLabels.push({
                  wx: tileCx,
                  wy: tileCy - 10,
                  text: 'Sheltered in Basement!',
                  color: '#ECFDF5',
                  bgColor: '#047857',
                  age: 0,
                  maxAge: 1.6,
                });
              }
            } else {
              const ruined = tile.building;
              this.floatingLabels.push({
                wx: tileCx,
                wy: tileCy - 10,
                text: 'Tornado Wrecked!',
                color: '#FEF2F2',
                bgColor: '#475569',
                age: 0,
                maxAge: 2.0,
              });
              for (let k = 0; k < 6; k++) {
                this.woodChips.push({
                  wx: tileCx,
                  wy: tileCy,
                  vx: (Math.random() - 0.5) * 55,
                  vy: -24 - Math.random() * 24,
                  age: 0,
                  maxAge: 0.7,
                  color: k % 2 === 0 ? '#94A3B8' : '#78350F',
                });
              }
              if (this.tornadoCasualtyCount < 4 && (ruined.category === 'residential' || ruined.totalVisits > 0)) {
                this.spawnDeathEvent(ruined, false);
                this.tornadoCasualtyCount++;
              }
              tile.building = null;
              worldChanged = true;
            }
          }

          // Destroy roads/bridges in direct vortex path
          if (tile.terrain === 'water' && (tile.hasRoad || tile.hasFootbridge) && !tile.isBridgeBroken) {
            tile.isBridgeBroken = true;
            this.brokenBridges.push({
              id: `br_${this.brokenBridgeIdCounter++}`,
              x: tile.x,
              y: tile.y,
              wx: tileCx,
              wy: tileCy,
              kind: tile.hasRoad ? 'road' : 'footbridge',
              elapsedSeconds: 0,
              maxRepairSeconds: 32,
              repairerDispatched: false,
              repairerArrived: false,
              status: 'broken',
              statusTimer: 0,
            });
          } else if (dist < TILE_SIZE * 0.44 && tile.hasRoad && tile.terrain !== 'water') {
            tile.hasRoad = false;
            tile.hasZebraCrossing = false;
            this.cars = this.cars.filter(
              (c) => Math.floor(c.wx / TILE_SIZE) !== tile.x || Math.floor(c.wy / TILE_SIZE) !== tile.y
            );
            for (let ci = this.crashes.length - 1; ci >= 0; ci--) {
              if (this.crashes[ci].x === tile.x && this.crashes[ci].y === tile.y) {
                this.releaseCrashCars(this.crashes[ci].id);
                this.crashes.splice(ci, 1);
              }
            }
            worldChanged = true;
          }
        }
      }

      // Toss non-emergency cars caught right inside the tornado vortex
      for (let ci = this.cars.length - 1; ci >= 0; ci--) {
        const car = this.cars[ci];
        if (car.type === 'ambulance' || car.type === 'police' || car.type === 'firetruck') continue;
        if (Math.hypot(car.wx - this.crises.tornadoWx, car.wy - this.crises.tornadoWy) < 20) {
          for (let k = 0; k < 5; k++) {
            this.woodChips.push({
              wx: car.wx,
              wy: car.wy,
              vx: (Math.random() - 0.5) * 55,
              vy: -24 - Math.random() * 20,
              age: 0,
              maxAge: 0.6,
              color: car.color,
            });
          }
          this.floatingLabels.push({
            wx: car.wx,
            wy: car.wy - 8,
            text: 'Car Tossed!',
            color: '#FEF2F2',
            bgColor: '#475569',
            age: 0,
            maxAge: 1.5,
          });
          this.finishTrip(car);
          this.cars.splice(ci, 1);
        }
      }

      // Sweep away unsheltered outdoor pedestrians caught right inside the funnel
      if (this.tornadoCasualtyCount < 5) {
        for (let pi = this.people.length - 1; pi >= 0; pi--) {
          const ped = this.people[pi];
          if (ped.role === 'mayor' || ped.role === 'police' || ped.role === 'firefighter' || ped.role === 'medic') {
            continue;
          }
          if (Math.hypot(ped.wx - this.crises.tornadoWx, ped.wy - this.crises.tornadoWy) < 16) {
            const ptx = Math.max(0, Math.min(this.gridCols - 1, Math.floor(ped.wx / TILE_SIZE)));
            const pty = Math.max(0, Math.min(this.gridRows - 1, Math.floor(ped.wy / TILE_SIZE)));
            this.recordCoordinateDeath(ptx, pty, ped.wx, ped.wy, this.describeArea(ptx, pty), playAudio);
            this.floatingLabels.push({
              wx: ped.wx,
              wy: ped.wy - 10,
              text: 'Swept Away!',
              color: '#FEF2F2',
              bgColor: '#991B1B',
              age: 0,
              maxAge: 1.8,
            });
            this.people.splice(pi, 1);
            this.tornadoCasualtyCount++;
            break;
          }
        }
      }

      if (worldChanged) {
        this.rebuildCaches();
      }

      if (this.crises.tornadoRemaining <= 0) {
        this.crises.tornadoActive = false;
      }
    }

    // 2. Earthquake
    if (this.crises.earthquakeActive) {
      this.crises.earthquakeRemaining = Math.max(0, this.crises.earthquakeRemaining - simDt);
      this.earthquakeShakeIntensity = Math.max(0.25, this.crises.earthquakeRemaining / 14);
      if (this.crises.earthquakeRemaining <= 0) {
        this.crises.earthquakeActive = false;
        this.earthquakeShakeIntensity = 0;
      }
    } else {
      this.earthquakeShakeIntensity = Math.max(0, this.earthquakeShakeIntensity - realDt * 2);
    }

    // 3. Citywide Flood — entire city flooded, citizens climb tall buildings, some drown
    if (this.crises.floodActive) {
      this.crises.floodRemaining = Math.max(0, this.crises.floodRemaining - simDt);
      for (const t of this.tiles) {
        if (t.terrain !== 'void' && t.terrain !== 'water' && !t.isFlooded) {
          t.isFlooded = true;
        }
      }

      const tallShelters = this.buildingsList.filter((b) => this.isTallShelterBuilding(b));
      if (tallShelters.length > 0 && Math.random() < simDt * 0.55) {
        const currentSheltering = this.people.filter((p) => p.floodSheltering).length;
        if (currentSheltering < 10) {
          const lowPool = this.buildingsList.filter(
            (b) => !this.isTallShelterBuilding(b) && b.category !== 'park' && b.category !== 'crops'
          );
          if (lowPool.length > 0) {
            const orig = lowPool[Math.floor(Math.random() * lowPool.length)];
            const shelter = this.findNearestTallShelter(
              (orig.x + 0.5) * TILE_SIZE,
              (orig.y + 0.5) * TILE_SIZE
            );
            if (shelter) {
              const p: Person = {
                id: `ppl_${this.personIdCounter++}`,
                role: 'pedestrian',
                wx: (orig.x + 0.5) * TILE_SIZE,
                wy: (orig.y + 0.76) * TILE_SIZE,
                targetWx: (shelter.x + 0.5) * TILE_SIZE,
                targetWy: (shelter.y + 0.72) * TILE_SIZE,
                speed: 48 + Math.random() * 8,
                shirtColor: '#38BDF8',
                animPhase: Math.random() * Math.PI * 2,
                state: 'walking',
                homeBuildingId: orig.id,
                destBuildingId: shelter.id,
                targetTileX: shelter.x,
                targetTileY: shelter.y,
                holdTimer: 18,
                floodSheltering: true,
              };
              if (this.assignPedestrianRoute(p, shelter.x, shelter.y, p.targetWx, p.targetWy)) {
                this.people.push(p);
              }
            }
          }
        }
      }

      // Some citizens caught outdoors / in flooded low areas drown
      const totalPop = this.buildingsList
        .filter((b) => b.category === 'residential')
        .reduce((sum, b) => sum + (b.residents ?? Math.min(5, Math.max(1, b.capacity || 3))), 0);
      const maxFloodDrownings = Math.min(6, Math.max(2, Math.floor(totalPop / 14)));
      this.floodDrownAccumulator += simDt;
      if (
        this.floodDrownAccumulator >= 5.2 &&
        this.floodDrownCount < maxFloodDrownings &&
        totalPop > 0
      ) {
        this.floodDrownAccumulator = 0;
        const outdoorVictims = this.people.filter(
          (p) =>
            p.role !== 'mayor' &&
            p.role !== 'police' &&
            p.role !== 'firefighter' &&
            p.role !== 'medic' &&
            p.role !== 'invader' &&
            p.role !== 'kayaker'
        );
        if (outdoorVictims.length > 0 && Math.random() < 0.65) {
          const victimIdx = Math.floor(Math.random() * outdoorVictims.length);
          const victim = outdoorVictims[victimIdx];
          const vtx = Math.max(0, Math.min(this.gridCols - 1, Math.floor(victim.wx / TILE_SIZE)));
          const vty = Math.max(0, Math.min(this.gridRows - 1, Math.floor(victim.wy / TILE_SIZE)));
          this.recordCoordinateDeath(vtx, vty, victim.wx, victim.wy, this.describeArea(vtx, vty), playAudio);
          this.floatingLabels.push({
            wx: victim.wx,
            wy: victim.wy - 10,
            text: 'Drowned!',
            color: '#E0F2FE',
            bgColor: '#1E40AF',
            age: 0,
            maxAge: 2.1,
          });
          for (let s = 0; s < 6; s++) {
            this.woodChips.push({
              wx: victim.wx,
              wy: victim.wy,
              vx: (Math.random() - 0.5) * 34,
              vy: -12 - Math.random() * 14,
              age: 0,
              maxAge: 0.55,
              color: s % 2 === 0 ? '#38BDF8' : '#BAE6FD',
            });
          }
          const idxInPeople = this.people.findIndex((x) => x.id === victim.id);
          if (idxInPeople !== -1) this.people.splice(idxInPeople, 1);
          this.floodDrownCount++;
        } else {
          const floodedHouses = this.buildingsList.filter(
            (b) => !this.isTallShelterBuilding(b) && b.category === 'residential'
          );
          if (floodedHouses.length > 0) {
            const house = floodedHouses[Math.floor(Math.random() * floodedHouses.length)];
            const wx = (house.x + 0.5) * TILE_SIZE;
            const wy = (house.y + 0.6) * TILE_SIZE;
            this.recordCoordinateDeath(house.x, house.y, wx, wy, house.name, playAudio);
            this.floatingLabels.push({
              wx,
              wy: wy - 10,
              text: 'Drowned!',
              color: '#E0F2FE',
              bgColor: '#1E40AF',
              age: 0,
              maxAge: 2.1,
            });
            this.floodDrownCount++;
          }
        }
        if (this.floodDrownCount > 0 && !this.floodNewsLogged) {
          this.floodNewsLogged = true;
          this.logDailyNews('FLOOD CASUALTIES: Rising citywide waters swept low streets—some citizens drowned while others sheltered inside tall buildings.');
        }
      }

      if (this.crises.floodRemaining <= 0) {
        this.crises.floodActive = false;
        for (const t of this.tiles) t.isFlooded = false;
        for (const p of this.people) {
          if (p.floodSheltering) p.floodSheltering = false;
        }
      }
    }

    // 4. Natural Disasters — occur organically over time (weather/season-weighted) without needing City Hall command
    this.naturalDisasterCooldown = Math.max(0, this.naturalDisasterCooldown - simDt);
    const anyDisasterActive =
      this.crises.tornadoActive || this.crises.earthquakeActive || this.crises.floodActive;
    if (
      this.mapId !== 'tutorial_town' &&
      this.buildingsList.length >= 4 &&
      !anyDisasterActive &&
      this.naturalDisasterCooldown <= 0
    ) {
      this.naturalDisasterAccumulator += simDt;
      if (this.naturalDisasterAccumulator >= 16) {
        this.naturalDisasterAccumulator -= 16;

        const tornadoChance =
          this.weather === 'Storm'
            ? 0.14
            : this.weather === 'Windy'
            ? 0.08
            : this.season === 'Spring' || this.season === 'Summer'
            ? 0.025
            : 0.01;
        const floodChance =
          this.weather === 'Storm' ? 0.16 : this.weather === 'Rain' ? 0.095 : 0.012;
        const earthquakeChance = 0.038;

        const rawCandidates: { type: 'tornado' | 'earthquake' | 'flood'; chance: number }[] = [
          { type: 'tornado', chance: tornadoChance },
          { type: 'flood', chance: floodChance },
          { type: 'earthquake', chance: earthquakeChance },
        ];
        const candidates = rawCandidates.sort(() => Math.random() - 0.5);

        for (const candidate of candidates) {
          if (this.chaosCooldowns[candidate.type] <= 0 && Math.random() < candidate.chance) {
            if (this.triggerDisaster(candidate.type, playAudio, true)) {
              this.naturalDisasterCooldown = 210;
            }
            break;
          }
        }
      }
    }
  }

  private updateSchoolAndBuildingStatuses(simDt: number, realDt: number, playAudio: boolean) {
    const isWeekend = this.isWeekend();
    const hour = this.minutesOfDay / 60;
    const isWarPanic = this.crises.warActive || this.people.some((p) => p.role === 'invader');
    const schools = this.buildingsList.filter((b) => b.category === 'school');

    // Update live status texts on School, Office/Workplace, Factory & City Hall
    for (const b of this.buildingsList) {
      if (b.category === 'school') {
        if (isWeekend) b.statusText = 'Closed (Weekend)';
        else if (isWarPanic) b.statusText = 'Emergency Lockdown';
        else if (hour >= 7.2 && hour < 8.0) b.statusText = 'Morning Drop-off';
        else if (hour >= 8.0 && hour < 16.0) b.statusText = 'Class in Session';
        else if (hour >= 16.0 && hour < 16.85) b.statusText = 'Dismissal & Pickup';
        else b.statusText = 'Closed (After Hours)';
      } else if (b.category === 'workplace' || b.category === 'factory') {
        if (isWarPanic) b.statusText = 'Emergency Shelter';
        else if (isWeekend) b.statusText = 'Weekend Off';
        else if (hour >= 8.0 && hour < 17.5) b.statusText = 'Active Shift';
        else if (hour >= 6.5 && hour < 8.0) b.statusText = 'Opening Soon';
        else b.statusText = 'Closed (Night)';
      } else if (b.category === 'commercial') {
        if (isWarPanic) b.statusText = 'Closed (Emergency)';
        else if (this.isStoreOpen()) b.statusText = 'Open (6AM–10PM)';
        else b.statusText = 'Closed (10PM–6AM)';
      } else if (b.category === 'city_hall') {
        if (this.electionActive) b.statusText = 'Mayoral Election Open';
        else if (!this.mayorAlive) b.statusText = 'Mayor Seat Vacant';
        else if (isWarPanic) b.statusText = 'Wartime Command';
        else b.statusText = 'Civic Office Open';
      }
    }

    // Ring school bell at 08:00 and 16:00 on weekdays (Mon-Fri)
    if (!isWeekend && schools.length > 0) {
      const m = Math.floor(this.minutesOfDay);
      if ((m >= 480 && m < 490) || (m >= 960 && m < 970)) {
        const bellPhase = m < 600 ? 'start' : 'end';
        const key = `${this.dayCount}_${bellPhase}`;
        if (this.lastSchoolBellKey !== key) {
          this.lastSchoolBellKey = key;
          if (playAudio) soundEngine.playSchoolBell();
          for (const sch of schools) {
            this.floatingLabels.push({
              wx: (sch.x + 0.5) * TILE_SIZE,
              wy: (sch.y + 0.25) * TILE_SIZE,
              text: bellPhase === 'start' ? '🔔 School Starts!' : '🔔 School Ends!',
              color: '#0F172A',
              bgColor: '#FDE047',
              age: 0,
              maxAge: 2.6,
            });
          }
        }
      }
    }

    // Weekday parent dropoff (07:15-08:25) & pickup (15:40-16:50)
    const isDropoffWindow = !isWeekend && !isWarPanic && hour >= 7.25 && hour < 8.4;
    const isPickupWindow = !isWeekend && !isWarPanic && hour >= 15.65 && hour < 16.85;
    const houses = this.buildingsList.filter((b) => b.category === 'residential');

    if ((isDropoffWindow || isPickupWindow) && schools.length > 0 && houses.length > 0) {
      this.schoolCommuteAccumulator += simDt;
      const activeParents = this.people.filter((p) => p.role === 'parent').length;
      if (this.schoolCommuteAccumulator >= 4.2 && activeParents < 5) {
        this.schoolCommuteAccumulator = 0;
        const home = houses[Math.floor(Math.random() * houses.length)];
        const sch = schools[Math.floor(Math.random() * schools.length)];
        const path = this.findPedestrianPath(this.tiles, { x: home.x, y: home.y }, { x: sch.x, y: sch.y });
        if (path && path.length >= 2) {
          home.totalVisits = Math.max(0, home.totalVisits - 1);
          const modeTag = isDropoffWindow ? 'dropoff' : 'pickup';
          this.people.push({
            id: `ppl_${this.personIdCounter++}`,
            role: 'parent',
            speechTopic: modeTag,
            wx: (home.x + 0.5) * TILE_SIZE,
            wy: (home.y + 0.78) * TILE_SIZE,
            targetWx: (sch.x + 0.5) * TILE_SIZE,
            targetWy: (sch.y + 0.8) * TILE_SIZE,
            speed: 31,
            shirtColor: '#2563EB',
            hatColor: '#F59E0B',
            animPhase: Math.random() * Math.PI * 2,
            state: 'walking',
            homeBuildingId: home.id,
            destBuildingId: sch.id,
            targetTileX: sch.x,
            targetTileY: sch.y,
            pedestrianPath: [...path],
            pedestrianPathIndex: 1,
            holdTimer: 0,
          });
          if (isDropoffWindow) {
            // Visible student walking alongside parent into school!
            this.people.push({
              id: `ppl_${this.personIdCounter++}`,
              role: 'student',
              isChild: true,
              speechTopic: 'commute_in',
              wx: (home.x + 0.5) * TILE_SIZE - 4,
              wy: (home.y + 0.8) * TILE_SIZE,
              targetWx: (sch.x + 0.5) * TILE_SIZE,
              targetWy: (sch.y + 0.82) * TILE_SIZE,
              speed: 31,
              shirtColor: '#FACC15',
              hatColor: '#0284C7',
              animPhase: 0.6,
              state: 'walking',
              homeBuildingId: home.id,
              destBuildingId: sch.id,
              targetTileX: sch.x,
              targetTileY: sch.y,
              pedestrianPath: [...path],
              pedestrianPathIndex: 1,
              holdTimer: 0,
            });
          }
        }
        // Also dispatch a visible school bus / parent car during dropoff & pickup windows!
        if (Math.random() < 0.65) {
          if (isDropoffWindow) {
            this.spawnCarBetweenBuildings(home, sch, Math.random() < 0.55 ? 'bus' : 'sedan');
          } else {
            this.spawnCarBetweenBuildings(sch, home, Math.random() < 0.55 ? 'bus' : 'sedan');
          }
        }
      }
    }

    // Step parent & commuting student walkers
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];
      if (p.role === 'parent') {
        if (p.state === 'walking') {
          const res = this.stepPersonAlongPath(p, realDt, 8.5);
          if (res === 'arrived') {
            const sch = this.buildingsList.find((b) => b.id === p.destBuildingId);
            if (p.speechTopic === 'pickup' && sch) {
              sch.totalVisits = Math.max(0, sch.totalVisits - 1);
              this.floatingLabels.push({
                wx: (sch.x + 0.5) * TILE_SIZE,
                wy: (sch.y + 0.25) * TILE_SIZE,
                text: 'Fetch Kids!',
                color: '#FEF9C3',
                bgColor: '#0284C7',
                age: 0,
                maxAge: 1.5,
              });
              // Student leaves school with parent back home!
              const home = this.buildingsList.find((b) => b.id === p.homeBuildingId);
              if (home) {
                const backPath = this.findPedestrianPath(this.tiles, { x: sch.x, y: sch.y }, { x: home.x, y: home.y });
                if (backPath) {
                  this.people.push({
                    id: `ppl_${this.personIdCounter++}`,
                    role: 'student',
                    isChild: true,
                    speechTopic: 'commute_out',
                    wx: (sch.x + 0.5) * TILE_SIZE - 4,
                    wy: (sch.y + 0.8) * TILE_SIZE,
                    targetWx: (home.x + 0.5) * TILE_SIZE,
                    targetWy: (home.y + 0.8) * TILE_SIZE,
                    speed: 31,
                    shirtColor: '#FACC15',
                    hatColor: '#0284C7',
                    animPhase: 0.4,
                    state: 'returning',
                    homeBuildingId: home.id,
                    destBuildingId: sch.id,
                    targetTileX: home.x,
                    targetTileY: home.y,
                    pedestrianPath: backPath,
                    pedestrianPathIndex: backPath.length > 1 ? 1 : 0,
                    holdTimer: 18,
                  });
                }
              }
            } else if (sch) {
              this.floatingLabels.push({
                wx: (sch.x + 0.5) * TILE_SIZE,
                wy: (sch.y + 0.25) * TILE_SIZE,
                text: 'Drop-off!',
                color: '#ECFDF5',
                bgColor: '#059669',
                age: 0,
                maxAge: 1.4,
              });
            }
            if (!this.assignReturnRoute(p)) {
              this.people.splice(i, 1);
            }
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 8.5);
          if (res === 'arrived') {
            const home = this.buildingsList.find((b) => b.id === p.homeBuildingId);
            if (home) home.totalVisits += 1;
            this.people.splice(i, 1);
          } else if (res === 'blocked' || p.holdTimer <= 0) {
            this.people.splice(i, 1);
          }
        }
        continue;
      }

      if (p.role === 'student' && (p.speechTopic === 'commute_in' || p.speechTopic === 'commute_out')) {
        if (p.state === 'walking') {
          const res = this.stepPersonAlongPath(p, realDt, 8.5);
          if (res === 'arrived') {
            const sch = this.buildingsList.find((b) => b.id === p.destBuildingId);
            if (sch) this.incrementBuildingOccupancy(sch, 1);
            this.people.splice(i, 1);
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 8.5);
          if (res === 'arrived') {
            const home = this.buildingsList.find((b) => b.id === p.homeBuildingId);
            if (home) this.incrementBuildingOccupancy(home, 1);
            this.people.splice(i, 1);
          } else if (res === 'blocked' || p.holdTimer <= 0) {
            this.people.splice(i, 1);
          }
        }
      } else if (p.role === 'student' && p.speechTopic === 'playground') {
        if ((isWarPanic || this.isOutdoorCurfew()) && p.state !== 'returning') {
          if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          continue;
        }
        if (p.state === 'walking') {
          const res = this.stepPersonAlongPath(p, realDt, 8.5);
          if (res === 'arrived') {
            p.state = 'playing_park';
            p.holdTimer = 14 + Math.random() * 10;
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'playing_park') {
          p.animPhase += realDt * 9;
          p.holdTimer -= realDt;
          if (p.targetTileX !== undefined && p.targetTileY !== undefined) {
            const cx = (p.targetTileX + 0.5) * TILE_SIZE;
            const cy = (p.targetTileY + 0.56) * TILE_SIZE;
            const slot = (p.id.charCodeAt(p.id.length - 1) || 0) % 3;
            if (slot === 0) {
              // Swinging back & forth on the swing set
              p.wx = cx - 9 + Math.sin(p.animPhase * 0.45) * 4;
              p.wy = cy - 4 + Math.cos(p.animPhase * 0.9) * 2.5;
            } else if (slot === 1) {
              // Spinning on merry-go-round carousel
              p.wx = cx + 9 + Math.cos(p.animPhase * 0.7) * 5;
              p.wy = cy + 2 + Math.sin(p.animPhase * 0.7) * 3.5;
            } else {
              // Sliding & running around climbing zone
              p.wx = cx + Math.sin(p.animPhase * 0.55) * 7;
              p.wy = cy - 2 + Math.abs(Math.sin(p.animPhase * 0.8)) * 5;
            }
          }
          if (p.holdTimer <= 0) {
            const park = this.buildingsList.find((b) => b.id === p.destBuildingId);
            if (park) park.totalVisits = Math.max(0, park.totalVisits - 1);
            if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 8);
          if (res === 'arrived') {
            const home = this.buildingsList.find((b) => b.id === p.homeBuildingId);
            if (home) this.incrementBuildingOccupancy(home, 1);
            this.people.splice(i, 1);
          } else if (res === 'blocked' || p.holdTimer <= 0) {
            this.people.splice(i, 1);
          }
        }
      }
    }

    // Spawn visible kids playing inside Playground parks (outside school class hours or on weekends)
    const playgrounds = this.buildingsList.filter(
      (b) => b.category === 'park' && b.parkVariant === 'playground'
    );
    const activePlayKids = this.people.filter(
      (p) => p.role === 'student' && p.speechTopic === 'playground'
    ).length;
    if (
      !this.isOutdoorCurfew() &&
      !isWarPanic &&
      playgrounds.length > 0 &&
      houses.length > 0 &&
      (isWeekend || hour < 8.0 || hour >= 15.7) &&
      activePlayKids < Math.min(6, playgrounds.length * 2)
    ) {
      this.playgroundCheckAccumulator += simDt;
      if (this.playgroundCheckAccumulator >= 4.5) {
        this.playgroundCheckAccumulator = 0;
        const pg = playgrounds[Math.floor(Math.random() * playgrounds.length)];
        const home = houses[Math.floor(Math.random() * houses.length)];
        const path = this.findPedestrianPath(this.tiles, { x: home.x, y: home.y }, { x: pg.x, y: pg.y });
        if (path && path.length >= 1) {
          this.incrementBuildingOccupancy(pg, 1);
          this.people.push({
            id: `ppl_${this.personIdCounter++}`,
            role: 'student',
            isChild: true,
            speechTopic: 'playground',
            wx: (home.x + 0.5) * TILE_SIZE,
            wy: (home.y + 0.78) * TILE_SIZE,
            targetWx: (pg.x + 0.5) * TILE_SIZE,
            targetWy: (pg.y + 0.56) * TILE_SIZE,
            speed: 33,
            shirtColor: ['#F43F5E', '#0EA5E9', '#10B981', '#F59E0B', '#A855F7'][Math.floor(Math.random() * 5)],
            hatColor: Math.random() < 0.5 ? '#FDE047' : '#38BDF8',
            animPhase: Math.random() * Math.PI * 2,
            state: 'walking',
            homeBuildingId: home.id,
            destBuildingId: pg.id,
            targetTileX: pg.x,
            targetTileY: pg.y,
            pedestrianPath: path,
            pedestrianPathIndex: path.length > 1 ? 1 : 0,
            holdTimer: 16,
          });
        }
      }
    }
  }

  private pickWeightedAnimalTile(): MapTile | null {
    const candidates = this.tiles.filter(
      (t) =>
        (t.terrain === 'grass' || t.terrain === 'sand') &&
        !t.hasRoad &&
        (!t.building || t.building.category === 'park' || t.building.category === 'crops')
    );
    if (candidates.length === 0) return null;

    let totalWeight = 0;
    const weights = candidates.map((t) => {
      let forestNeighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (this.getTile(t.x + dx, t.y + dy)?.terrain === 'forest') {
            forestNeighbors++;
          }
        }
      }
      const w =
        forestNeighbors >= 3
          ? 12
          : forestNeighbors >= 1
          ? 4
          : t.building?.category === 'crops' || t.building?.category === 'park'
          ? 3
          : 1;
      totalWeight += w;
      return w;
    });

    let roll = Math.random() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  private isSafeLandAnimalTile(tile: MapTile | null): boolean {
    if (!tile) return false;
    if (tile.terrain === 'water' || tile.terrain === 'void') return false;
    if (
      tile.building &&
      tile.building.category !== 'park' &&
      tile.building.category !== 'crops' &&
      tile.building.category !== 'road_path'
    ) {
      return false;
    }
    return true;
  }

  private rescueLandAnimalFromWater(ani: Animal) {
    const curX = Math.max(0, Math.min(this.gridCols - 1, Math.floor(ani.wx / TILE_SIZE)));
    const curY = Math.max(0, Math.min(this.gridRows - 1, Math.floor(ani.wy / TILE_SIZE)));
    for (let r = 1; r <= 6; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const candidate = this.getTile(curX + dx, curY + dy);
          if (this.isSafeLandAnimalTile(candidate)) {
            ani.wx = (candidate!.x + 0.5) * TILE_SIZE;
            ani.wy = (candidate!.y + 0.5) * TILE_SIZE;
            ani.targetWx = ani.wx;
            ani.targetWy = ani.wy;
            ani.vx = 0;
            ani.vy = 0;
            return;
          }
        }
      }
    }
    const fallback = this.pickWeightedAnimalTile();
    if (fallback) {
      ani.wx = (fallback.x + 0.5) * TILE_SIZE;
      ani.wy = (fallback.y + 0.5) * TILE_SIZE;
      ani.targetWx = ani.wx;
      ani.targetWy = ani.wy;
      ani.vx = 0;
      ani.vy = 0;
    }
  }

  private seedInitialAnimals() {
    const kinds: AnimalKind[] = ['bird', 'bird', 'bird', 'cow', 'cow', 'pig', 'pig', 'chicken', 'chicken'];
    const crops = this.buildingsList.filter((b) => b.category === 'crops');
    for (const kind of kinds) {
      const nearCrop = crops.length > 0 && kind !== 'bird' && Math.random() < 0.45;
      const spot = nearCrop
        ? this.getTile(
            crops[Math.floor(Math.random() * crops.length)].x,
            crops[Math.floor(Math.random() * crops.length)].y
          ) || this.pickWeightedAnimalTile()
        : this.pickWeightedAnimalTile();
      if (!spot) continue;
      const wx = (spot.x + 0.5) * TILE_SIZE + (Math.random() - 0.5) * 14;
      const wy = (spot.y + 0.5) * TILE_SIZE + (Math.random() - 0.5) * 14;
      this.animals.push({
        id: `ani_${this.animalIdCounter++}`,
        kind,
        wx,
        wy,
        vx: 0,
        vy: 0,
        targetWx: wx,
        targetWy: wy,
        state: kind === 'bird' && Math.random() < 0.4 ? 'flying' : 'grazing',
        animPhase: Math.random() * Math.PI * 2,
        holdTimer: 1 + Math.random() * 3,
      });
    }
  }

  private updateAnimalsAndFarms(simDt: number, realDt: number, playAudio: boolean) {
    // 1. Advance crop stages on crops plots
    for (const b of this.buildingsList) {
      if (b.category === 'crops') {
        const cur = b.cropStage ?? 1;
        if (cur < 3) {
          b.cropTimer = (b.cropTimer ?? 0) + simDt;
          if (b.cropTimer >= 22) {
            b.cropTimer = 0;
            b.cropStage = cur + 1;
          }
        }
      }
    }

    // 2. Replenish animals up to 14 naturally (heavily clustered near tree clumps & crops)
    this.animalSpawnAccumulator += simDt;
    if (this.animalSpawnAccumulator >= 7 && this.animals.length < 14) {
      this.animalSpawnAccumulator = 0;
      const spot = this.pickWeightedAnimalTile();
      if (spot) {
        const birdsCount = this.animals.filter((a) => a.kind === 'bird').length;
        const kind: AnimalKind =
          birdsCount < 4
            ? 'bird'
            : (['cow', 'pig', 'chicken', 'bird'][Math.floor(Math.random() * 4)] as AnimalKind);
        const wx = (spot.x + 0.5) * TILE_SIZE;
        const wy = (spot.y + 0.5) * TILE_SIZE;
        this.animals.push({
          id: `ani_${this.animalIdCounter++}`,
          kind,
          wx,
          wy,
          vx: 0,
          vy: 0,
          targetWx: wx,
          targetWy: wy,
          state: kind === 'bird' ? 'flying' : 'grazing',
          animPhase: Math.random() * Math.PI * 2,
          holdTimer: 1 + Math.random() * 2.5,
        });
      }
    }

    // 3. Step Animal movement & grazing (land animals NEVER enter water/void tiles)
    for (const ani of this.animals) {
      ani.animPhase += realDt * (ani.state === 'flying' ? 12 : 4.5);
      ani.holdTimer -= realDt;

      if (ani.kind !== 'bird') {
        const curTile = this.getTile(
          Math.floor(ani.wx / TILE_SIZE),
          Math.floor(ani.wy / TILE_SIZE)
        );
        if (!this.isSafeLandAnimalTile(curTile)) {
          this.rescueLandAnimalFromWater(ani);
        }
      }

      if (ani.state === 'grazing') {
        if (ani.holdTimer <= 0) {
          if (ani.kind === 'bird') {
            ani.state = Math.random() < 0.65 ? 'flying' : 'roaming';
            ani.targetWx = Math.max(24, Math.min(this.gridCols * TILE_SIZE - 24, ani.wx + (Math.random() - 0.5) * 110));
            ani.targetWy = Math.max(24, Math.min(this.gridRows * TILE_SIZE - 24, ani.wy + (Math.random() - 0.5) * 110));
            ani.holdTimer = 3 + Math.random() * 3;
          } else {
            let foundTarget = false;
            for (let attempt = 0; attempt < 8; attempt++) {
              const candWx = Math.max(
                24,
                Math.min(this.gridCols * TILE_SIZE - 24, ani.wx + (Math.random() - 0.5) * 58)
              );
              const candWy = Math.max(
                24,
                Math.min(this.gridRows * TILE_SIZE - 24, ani.wy + (Math.random() - 0.5) * 58)
              );
              const tEnd = this.getTile(Math.floor(candWx / TILE_SIZE), Math.floor(candWy / TILE_SIZE));
              const tMid = this.getTile(
                Math.floor(((ani.wx + candWx) * 0.5) / TILE_SIZE),
                Math.floor(((ani.wy + candWy) * 0.5) / TILE_SIZE)
              );
              if (this.isSafeLandAnimalTile(tEnd) && this.isSafeLandAnimalTile(tMid)) {
                ani.state = 'roaming';
                ani.targetWx = candWx;
                ani.targetWy = candWy;
                ani.holdTimer = 3 + Math.random() * 3;
                foundTarget = true;
                break;
              }
            }
            if (!foundTarget) {
              ani.holdTimer = 1.5 + Math.random() * 2;
            }
          }
        }
      } else {
        const dx = ani.targetWx - ani.wx;
        const dy = ani.targetWy - ani.wy;
        const dist = Math.hypot(dx, dy);
        const speed = ani.state === 'flying' ? 42 : ani.kind === 'cow' ? 12 : 16;
        if (dist <= 3 || ani.holdTimer <= 0) {
          ani.state = 'grazing';
          ani.vx = 0;
          ani.vy = 0;
          ani.holdTimer = 2.5 + Math.random() * 4;
        } else {
          const nvx = (dx / dist) * speed;
          const nvy = (dy / dist) * speed;
          const nextWx = ani.wx + nvx * realDt;
          const nextWy = ani.wy + nvy * realDt;
          if (ani.kind !== 'bird') {
            const probeX = nextWx + (dx / dist) * 5;
            const probeY = nextWy + (dy / dist) * 5;
            const nextTile = this.getTile(Math.floor(nextWx / TILE_SIZE), Math.floor(nextWy / TILE_SIZE));
            const probeTile = this.getTile(Math.floor(probeX / TILE_SIZE), Math.floor(probeY / TILE_SIZE));
            if (!this.isSafeLandAnimalTile(nextTile) || !this.isSafeLandAnimalTile(probeTile)) {
              ani.state = 'grazing';
              ani.vx = 0;
              ani.vy = 0;
              ani.holdTimer = 1.2 + Math.random() * 1.5;
              continue;
            }
          }
          ani.vx = nvx;
          ani.vy = nvy;
          ani.wx = nextWx;
          ani.wy = nextWy;
        }
      }
    }

    // 4. Spawn & step Farmers (tending & harvesting ripe crops) and Butchers (harvesting livestock)
    const curfew = this.isOutdoorCurfew();
    const isWarPanic = this.crises.warActive || this.people.some((p) => p.role === 'invader');
    this.farmerButcherAccumulator += simDt;

    if (!curfew && !isWarPanic && this.farmerButcherAccumulator >= 11) {
      this.farmerButcherAccumulator = 0;
      const crops = this.buildingsList.filter((b) => b.category === 'crops');
      const ripeCrops = crops.filter((b) => (b.cropStage ?? 1) >= 2);
      const activeFarmers = this.people.filter((p) => p.role === 'farmer').length;
      if (ripeCrops.length > 0 && activeFarmers < 2) {
        const targetCrop = ripeCrops[Math.floor(Math.random() * ripeCrops.length)];
        const homes = this.buildingsList.filter((b) => b.category === 'residential' || b.category === 'crops');
        const orig = homes.length > 0 ? homes[Math.floor(Math.random() * homes.length)] : targetCrop;
        const path = this.findPedestrianPath(this.tiles, { x: orig.x, y: orig.y }, { x: targetCrop.x, y: targetCrop.y });
        if (path) {
          this.people.push({
            id: `ppl_${this.personIdCounter++}`,
            role: 'farmer',
            wx: (orig.x + 0.5) * TILE_SIZE,
            wy: (orig.y + 0.78) * TILE_SIZE,
            targetWx: (targetCrop.x + 0.5) * TILE_SIZE,
            targetWy: (targetCrop.y + 0.65) * TILE_SIZE,
            speed: 25,
            shirtColor: '#65A30D',
            hatColor: '#FDE047',
            animPhase: 0,
            state: 'walking',
            homeBuildingId: orig.id,
            destBuildingId: targetCrop.id,
            targetTileX: targetCrop.x,
            targetTileY: targetCrop.y,
            pedestrianPath: path,
            pedestrianPathIndex: path.length > 1 ? 1 : 0,
            holdTimer: 0,
          });
        }
      }

      const activeButchers = this.people.filter((p) => p.role === 'butcher').length;
      const livestock = this.animals.filter((a) => a.kind === 'cow' || a.kind === 'pig');
      const shops = this.buildingsList.filter((b) => b.category === 'commercial' || b.category === 'residential');
      if (livestock.length > 2 && shops.length > 0 && activeButchers < 1) {
        const prey = livestock[Math.floor(Math.random() * livestock.length)];
        const orig = shops[Math.floor(Math.random() * shops.length)];
        const ptx = Math.max(0, Math.min(this.gridCols - 1, Math.floor(prey.wx / TILE_SIZE)));
        const pty = Math.max(0, Math.min(this.gridRows - 1, Math.floor(prey.wy / TILE_SIZE)));
        const path = this.findPedestrianPath(this.tiles, { x: orig.x, y: orig.y }, { x: ptx, y: pty });
        if (path) {
          this.people.push({
            id: `ppl_${this.personIdCounter++}`,
            role: 'butcher',
            wx: (orig.x + 0.5) * TILE_SIZE,
            wy: (orig.y + 0.78) * TILE_SIZE,
            targetWx: prey.wx,
            targetWy: prey.wy,
            targetAnimalId: prey.id,
            speed: 27,
            shirtColor: '#FFFFFF',
            hatColor: '#991B1B',
            animPhase: 0,
            state: 'walking',
            homeBuildingId: orig.id,
            targetTileX: ptx,
            targetTileY: pty,
            pedestrianPath: path,
            pedestrianPathIndex: path.length > 1 ? 1 : 0,
            holdTimer: 0,
          });
        }
      }
    }

    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];
      if (p.role === 'farmer') {
        if (p.state === 'walking') {
          const res = this.stepPersonAlongPath(p, realDt, 7.5);
          if (res === 'arrived') {
            p.state = 'farming';
            p.holdTimer = 3.0;
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'farming') {
          p.animPhase += realDt * 8;
          p.holdTimer -= realDt;
          if (p.holdTimer <= 0) {
            const crop = this.buildingsList.find((b) => b.id === p.destBuildingId && b.category === 'crops');
            if (crop) {
              crop.cropStage = 0;
              crop.cropTimer = 0;
              p.carryingItem = 'produce';
              this.floatingLabels.push({
                wx: (crop.x + 0.5) * TILE_SIZE,
                wy: (crop.y + 0.3) * TILE_SIZE,
                text: '+Harvest!',
                color: '#FEF9C3',
                bgColor: '#65A30D',
                age: 0,
                maxAge: 1.5,
              });
            }
            if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 7.5);
          if (res !== 'moving' || p.holdTimer <= 0) this.people.splice(i, 1);
        }
        continue;
      }

      if (p.role === 'butcher') {
        if (p.state === 'walking') {
          const res = this.stepPersonAlongPath(p, realDt, 8);
          if (res === 'arrived') {
            p.state = 'butchering';
            p.holdTimer = 1.8;
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'butchering') {
          p.animPhase += realDt * 10;
          p.holdTimer -= realDt;
          if (p.holdTimer <= 0) {
            const aIdx = this.animals.findIndex((a) => a.id === p.targetAnimalId);
            if (aIdx !== -1) {
              this.animals.splice(aIdx, 1);
              p.carryingItem = 'meat';
              this.butcherMeatReserve = Math.min(12, this.butcherMeatReserve + 2);
              this.floatingLabels.push({
                wx: p.wx,
                wy: p.wy - 10,
                text: 'Fresh Meat!',
                color: '#FEF2F2',
                bgColor: '#991B1B',
                age: 0,
                maxAge: 1.5,
              });
            }
            if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 8);
          if (res !== 'moving' || p.holdTimer <= 0) this.people.splice(i, 1);
        }
      }
    }
    void playAudio;
  }

  private updateTrashAndLittering(simDt: number, realDt: number, playAudio: boolean) {
    // 1. Decay old land trash slowly (ocean trash persists until cleaners pick it up or max age)
    for (let i = this.trashItems.length - 1; i >= 0; i--) {
      this.trashItems[i].age += simDt;
      if (this.trashItems[i].age >= 260) {
        this.trashItems.splice(i, 1);
      }
    }

    if (this.trashItems.length >= 24) return;
    this.litterCheckAccumulator += simDt;
    if (this.litterCheckAccumulator < 12) return;
    this.litterCheckAccumulator = 0;

    // Pick an outdoor civilian walker near grass or shoreline water and drop visible trash
    const candidates = this.people.filter(
      (p) =>
        (p.role === 'pedestrian' || p.role === 'shopper' || p.role === 'hobbyist' || p.role === 'fisher') &&
        p.state !== 'returning'
    );
    if (candidates.length === 0 || Math.random() > 0.62) return;

    const litterer = candidates[Math.floor(Math.random() * candidates.length)];
    const tx = Math.max(0, Math.min(this.gridCols - 1, Math.floor(litterer.wx / TILE_SIZE)));
    const ty = Math.max(0, Math.min(this.gridRows - 1, Math.floor(litterer.wy / TILE_SIZE)));

    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    let waterTile: MapTile | null = null;
    for (const d of dirs) {
      const nt = this.getTile(tx + d.dx, ty + d.dy);
      if (nt && nt.terrain === 'water' && !nt.hasRoad && !nt.hasFootbridge) {
        waterTile = nt;
        break;
      }
    }

    const kinds: TrashItem['kind'][] = ['bottle', 'can', 'bag', 'wrapper'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];

    if (waterTile) {
      this.trashItems.push({
        id: `tr_${this.trashIdCounter++}`,
        x: waterTile.x,
        y: waterTile.y,
        wx: (waterTile.x + 0.35 + Math.random() * 0.3) * TILE_SIZE,
        wy: (waterTile.y + 0.35 + Math.random() * 0.3) * TILE_SIZE,
        inWater: true,
        kind,
        age: 0,
      });
      this.floatingLabels.push({
        wx: litterer.wx,
        wy: litterer.wy - 10,
        text: 'Trash in Ocean!',
        color: '#FEF2F2',
        bgColor: '#0369A1',
        age: 0,
        maxAge: 1.5,
      });
    } else {
      const curTile = this.getTile(tx, ty);
      if (curTile && curTile.terrain === 'grass' && !curTile.building) {
        this.trashItems.push({
          id: `tr_${this.trashIdCounter++}`,
          x: curTile.x,
          y: curTile.y,
          wx: litterer.wx + (Math.random() - 0.5) * 6,
          wy: litterer.wy + 2,
          inWater: false,
          kind,
          age: 0,
        });
        this.floatingLabels.push({
          wx: litterer.wx,
          wy: litterer.wy - 10,
          text: 'Littered!',
          color: '#FEF3C7',
          bgColor: '#78350F',
          age: 0,
          maxAge: 1.3,
        });
      }
    }
    void realDt;
    void playAudio;
  }

  private getWaterBodyInfo(startX: number, startY: number): {
    tileCount: number;
    spanX: number;
    spanY: number;
    tiles: GridPoint[];
    isLargeForBoats: boolean;
  } {
    const startTile = this.getTile(startX, startY);
    if (!startTile || startTile.terrain !== 'water') {
      return { tileCount: 0, spanX: 0, spanY: 0, tiles: [], isLargeForBoats: false };
    }
    const visited = new Set<string>([`${startX},${startY}`]);
    const queue: GridPoint[] = [{ x: startX, y: startY }];
    const tiles: GridPoint[] = [];
    let minX = startX;
    let maxX = startX;
    let minY = startY;
    let maxY = startY;
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    let head = 0;
    while (head < queue.length && tiles.length < 360) {
      const cur = queue[head++];
      tiles.push(cur);
      if (cur.x < minX) minX = cur.x;
      if (cur.x > maxX) maxX = cur.x;
      if (cur.y < minY) minY = cur.y;
      if (cur.y > maxY) maxY = cur.y;

      for (const d of dirs) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        const nt = this.getTile(nx, ny);
        if (nt && nt.terrain === 'water' && !nt.hasRoad && !nt.hasFootbridge) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }

    const spanX = maxX - minX + 1;
    const spanY = maxY - minY + 1;
    const isLargeForBoats = tiles.length >= 16 && Math.max(spanX, spanY) >= 6;
    return {
      tileCount: tiles.length,
      spanX,
      spanY,
      tiles,
      isLargeForBoats,
    };
  }

  private buildWaterCruisePath(
    startWaterX: number,
    startWaterY: number,
    waterTiles: GridPoint[]
  ): GridPoint[] {
    if (waterTiles.length <= 1) return [{ x: startWaterX, y: startWaterY }];
    const waterSet = new Set(waterTiles.map((t) => `${t.x},${t.y}`));
    const parent = new Map<string, string | null>();
    const dist = new Map<string, number>();
    const startKey = `${startWaterX},${startWaterY}`;
    const queue: GridPoint[] = [{ x: startWaterX, y: startWaterY }];
    parent.set(startKey, null);
    dist.set(startKey, 0);
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    let head = 0;
    const candidates: { pt: GridPoint; d: number }[] = [];
    while (head < queue.length) {
      const cur = queue[head++];
      const curKey = `${cur.x},${cur.y}`;
      const curD = dist.get(curKey) ?? 0;
      if (curD >= 3 && curD <= 9) {
        candidates.push({ pt: cur, d: curD });
      }
      if (curD >= 9) continue;
      for (const d of dirs) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        const nKey = `${nx},${ny}`;
        if (!waterSet.has(nKey) || dist.has(nKey)) continue;
        dist.set(nKey, curD + 1);
        parent.set(nKey, curKey);
        queue.push({ x: nx, y: ny });
      }
    }

    if (candidates.length === 0) return [{ x: startWaterX, y: startWaterY }];
    const farPick = candidates[Math.floor(Math.random() * candidates.length)].pt;
    const outbound: GridPoint[] = [];
    let traceKey: string | null = `${farPick.x},${farPick.y}`;
    while (traceKey) {
      const [kx, ky] = traceKey.split(',').map(Number);
      outbound.push({ x: kx, y: ky });
      traceKey = parent.get(traceKey) ?? null;
    }
    outbound.reverse();
    const inbound = outbound.slice(0, -1).reverse();
    return [...outbound, ...inbound];
  }

  private updateCommunityActivities(simDt: number, realDt: number, playAudio: boolean) {
    const curfew = this.isOutdoorCurfew();
    const isWarPanic = this.crises.warActive || this.people.some((o) => o.role === 'invader');
    const hour = this.minutesOfDay / 60;
    const isSchoolHours = hour >= 8 && hour < 16;

    // Remove boat/canoe racks if the adjacent water body shrunk below long & large requirements
    for (let sIdx = this.marketStalls.length - 1; sIdx >= 0; sIdx--) {
      const st = this.marketStalls[sIdx];
      if (st.goods !== 'kayak' && st.goods !== 'rowboat') continue;
      const dirs = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];
      let hasLargeAdjacentWater = false;
      for (const d of dirs) {
        const nt = this.getTile(st.x + d.dx, st.y + d.dy);
        if (nt && nt.terrain === 'water' && !nt.hasFootbridge) {
          if (this.getWaterBodyInfo(nt.x, nt.y).isLargeForBoats) {
            hasLargeAdjacentWater = true;
            break;
          }
        }
      }
      if (!hasLargeAdjacentWater) {
        this.marketStalls.splice(sIdx, 1);
      }
    }

    // 1. Step & Spawn Coastal Water Activities:
    //    - Swimming can occur on any walkable shore tile.
    //    - Boats & Canoes ONLY appear on long & large water bodies, and humans visibly build them on shore first!
    const activeWaterUsers = this.people.filter((p) => p.role === 'kayaker').length;
    if (!curfew && !isWarPanic && this.season !== 'Winter' && activeWaterUsers < 5) {
      this.kayakerAccumulator += simDt;
      if (this.kayakerAccumulator >= 9) {
        this.kayakerAccumulator = 0;
        const shore = this.getWalkableShoreTiles();
        const origins = this.buildingsList.filter(
          (b) =>
            b.category === 'park' ||
            b.category === 'residential' ||
            b.category === 'commercial' ||
            b.category === 'workplace'
        );
        if (shore.length > 0 && origins.length > 0) {
          const waterCache = new Map<string, ReturnType<CitySimulation['getWaterBodyInfo']>>();
          const getCachedWaterInfo = (wx: number, wy: number) => {
            const key = `${wx},${wy}`;
            let info = waterCache.get(key);
            if (!info) {
              info = this.getWaterBodyInfo(wx, wy);
              for (const wt of info.tiles) {
                waterCache.set(`${wt.x},${wt.y}`, info);
              }
            }
            return info;
          };

          const largeWaterShore = shore.filter((spot) => {
            const wx = spot.tile.x + spot.waterDx;
            const wy = spot.tile.y + spot.waterDy;
            return getCachedWaterInfo(wx, wy).isLargeForBoats;
          });

          const existingActivities = new Set(
            this.people.filter((p) => p.role === 'kayaker').map((p) => p.waterActivity || 'kayak')
          );

          const eligibleActivities: Array<'kayak' | 'rowing' | 'swim'> =
            largeWaterShore.length > 0 ? ['kayak', 'rowing', 'swim'] : ['swim'];
          const activity =
            eligibleActivities.find((a) => !existingActivities.has(a)) ||
            eligibleActivities[Math.floor(Math.random() * eligibleActivities.length)];

          const candidatePool = activity === 'swim' ? shore : largeWaterShore;
          const stallGoods: StallGoodsType =
            activity === 'rowing' ? 'rowboat' : activity === 'swim' ? 'swim' : 'kayak';

          // Prefer an already-built boat/canoe dock on large water if one exists, otherwise pick a clear shore to build on
          const existingBuiltDock =
            activity !== 'swim'
              ? candidatePool.find((sp) =>
                  this.marketStalls.some(
                    (st) => st.x === sp.tile.x && st.y === sp.tile.y && st.goods === stallGoods
                  )
                )
              : undefined;

          const spot =
            existingBuiltDock && Math.random() < 0.55
              ? existingBuiltDock
              : candidatePool[Math.floor(Math.random() * candidatePool.length)];

          if (spot) {
            const waterX = spot.tile.x + spot.waterDx;
            const waterY = spot.tile.y + spot.waterDy;
            const waterInfo = getCachedWaterInfo(waterX, waterY);
            const orig = origins[Math.floor(Math.random() * origins.length)];
            const path = this.findPedestrianPath(
              this.tiles,
              { x: orig.x, y: orig.y },
              { x: spot.tile.x, y: spot.tile.y }
            );
            if (path) {
              const hasBuiltDockAtSpot =
                activity === 'swim' ||
                this.marketStalls.some(
                  (st) =>
                    st.goods === stallGoods &&
                    Math.abs(st.x - spot.tile.x) <= 2 &&
                    Math.abs(st.y - spot.tile.y) <= 2
                );

              const waterWaypoints =
                activity !== 'swim'
                  ? this.buildWaterCruisePath(waterX, waterY, waterInfo.tiles)
                  : undefined;

              this.people.push({
                id: `ppl_${this.personIdCounter++}`,
                role: 'kayaker',
                waterActivity: activity,
                waterTileX: waterX,
                waterTileY: waterY,
                boatBuilt: hasBuiltDockAtSpot,
                waterWaypoints,
                waterWaypointIndex: 0,
                wx: (orig.x + 0.5) * TILE_SIZE,
                wy: (orig.y + 0.78) * TILE_SIZE,
                targetWx: (spot.tile.x + 0.5) * TILE_SIZE,
                targetWy: (spot.tile.y + 0.5) * TILE_SIZE,
                speed: 28,
                shirtColor:
                  activity === 'swim'
                    ? ['#F43F5E', '#0EA5E9', '#10B981'][Math.floor(Math.random() * 3)]
                    : activity === 'rowing'
                    ? ['#D97706', '#2563EB', '#0F766E'][Math.floor(Math.random() * 3)]
                    : ['#06B6D4', '#F59E0B', '#EC4899'][Math.floor(Math.random() * 3)],
                hatColor: !hasBuiltDockAtSpot ? '#FDE047' : undefined,
                animPhase: 0,
                state: 'walking',
                homeBuildingId: orig.id,
                targetTileX: spot.tile.x,
                targetTileY: spot.tile.y,
                pedestrianPath: path,
                pedestrianPathIndex: path.length > 1 ? 1 : 0,
                holdTimer: 22 + Math.random() * 10,
              });
            }
          }
        }
      }
    }

    // 2. Spawn School Field Trips ONLY during Mon-Fri School Hours (8:00 AM - 4:00 PM)
    const activeStudents = this.people.filter((p) => p.role === 'student').length;
    const schools = this.buildingsList.filter((b) => b.category === 'school');
    const tripVenues = this.buildingsList.filter(
      (b) =>
        b.category === 'park' ||
        b.category === 'crops' ||
        b.category === 'landmark' ||
        b.category === 'city_hall'
    );
    if (!curfew && !isWarPanic && !this.isWeekend() && isSchoolHours && schools.length > 0 && tripVenues.length > 0 && activeStudents === 0) {
      this.fieldTripAccumulator += simDt;
      if (this.fieldTripAccumulator >= 55) {
        this.fieldTripAccumulator = 0;
        const sch = schools[Math.floor(Math.random() * schools.length)];
        const dest = tripVenues[Math.floor(Math.random() * tripVenues.length)];
        const path = this.findPedestrianPath(this.tiles, { x: sch.x, y: sch.y }, { x: dest.x, y: dest.y });
        if (path) {
          this.logDailyNews(`FIELD TRIP CHAOS: Kids from ${sch.name} cheered louder than fire sirens visiting ${dest.name} during school hours!`);
          for (let k = 0; k < 4; k++) {
            this.people.push({
              id: `ppl_${this.personIdCounter++}`,
              role: 'student',
              isChild: k > 0,
              wx: (sch.x + 0.5) * TILE_SIZE + (k - 1.5) * 3,
              wy: (sch.y + 0.78) * TILE_SIZE,
              targetWx: (dest.x + 0.5) * TILE_SIZE + (k - 1.5) * 4,
              targetWy: (dest.y + 0.8) * TILE_SIZE,
              speed: 24,
              shirtColor: k === 0 ? '#0F766E' : '#FACC15',
              hatColor: k === 0 ? undefined : '#0284C7',
              animPhase: k * 0.7,
              state: 'walking',
              homeBuildingId: sch.id,
              destBuildingId: dest.id,
              targetTileX: dest.x,
              targetTileY: dest.y,
              pedestrianPath: [...path],
              pedestrianPathIndex: path.length > 1 ? 1 : 0,
              holdTimer: 10,
            });
          }
        }
      }
    }

    // 3. Citizen Construction Proposals (to Mayor / User Allow or Decline) & Timed Construction Sites
    this.updateConstructionProposalsAndSites(simDt, playAudio);

    // 4. Step Water Sports (Human Boat/Canoe Builders, Paddlers, Rowers, Swimmers), Field Trips, and Citizen Builders
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];

      if (p.role === 'kayaker') {
        if ((curfew || isWarPanic || this.season === 'Winter') && p.state !== 'returning') {
          p.isPanicking = isWarPanic;
          p.speed = isWarPanic ? 48 : 34;
          if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          continue;
        }
        if (p.state === 'walking') {
          const res = this.stepPersonAlongPath(p, realDt, 7.5);
          if (res === 'arrived') {
            if (p.waterActivity !== 'swim' && !p.boatBuilt) {
              // Ensure the water is still large & long before building the canoe/boat
              const wtx = p.waterTileX ?? p.targetTileX;
              const wty = p.waterTileY ?? p.targetTileY;
              if (
                wtx !== undefined &&
                wty !== undefined &&
                this.getWaterBodyInfo(wtx, wty).isLargeForBoats
              ) {
                p.state = 'building_boat';
                p.holdTimer = 4.6;
              } else {
                if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
              }
            } else {
              p.state = 'kayaking';
            }
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'building_boat') {
          p.animPhase += realDt * 9.5;
          p.holdTimer -= realDt;
          if (Math.random() < realDt * 3.8) {
            this.woodChips.push({
              wx: p.wx + 5 + (Math.random() - 0.5) * 6,
              wy: p.wy - 2,
              vx: (Math.random() - 0.5) * 24,
              vy: -12 - Math.random() * 12,
              age: 0,
              maxAge: 0.36,
              color: Math.random() < 0.5 ? '#D97706' : '#FDE047',
            });
          }
          if (p.holdTimer <= 0) {
            const wtx = p.waterTileX;
            const wty = p.waterTileY;
            const shoreTile =
              p.targetTileX !== undefined && p.targetTileY !== undefined
                ? this.getTile(p.targetTileX, p.targetTileY)
                : null;
            const waterInfo =
              wtx !== undefined && wty !== undefined
                ? this.getWaterBodyInfo(wtx, wty)
                : null;
            if (!waterInfo || !waterInfo.isLargeForBoats) {
              if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
              continue;
            }
            const stallGoods: StallGoodsType = p.waterActivity === 'rowing' ? 'rowboat' : 'kayak';
            const awningColor = p.waterActivity === 'rowing' ? '#B45309' : '#0891B2';
            if (
              shoreTile &&
              (shoreTile.terrain === 'grass' || shoreTile.terrain === 'sand') &&
              !shoreTile.building &&
              !shoreTile.hasRoad &&
              !this.marketStalls.some((s) => s.x === shoreTile.x && s.y === shoreTile.y) &&
              this.marketStalls.length < 8
            ) {
              this.marketStalls.push({
                id: `stall_${this.stallIdCounter++}`,
                x: shoreTile.x,
                y: shoreTile.y,
                wx: (shoreTile.x + 0.5) * TILE_SIZE,
                wy: (shoreTile.y + 0.54) * TILE_SIZE,
                goods: stallGoods,
                awningColor,
                vendorPersonId: p.homeBuildingId || p.id,
                stock: 6,
                salesCount: 0,
                age: 0,
                maxAge: 110,
              });
            }
            this.floatingLabels.push({
              wx: p.wx,
              wy: p.wy - 12,
              text: p.waterActivity === 'rowing' ? '+Built Boat!' : '+Built Canoe!',
              color: '#FEF9C3',
              bgColor: awningColor,
              age: 0,
              maxAge: 1.7,
            });
            if (playAudio) soundEngine.playPlantTree();
            p.boatBuilt = true;
            p.hatColor = undefined;
            p.waterWaypoints = this.buildWaterCruisePath(wtx!, wty!, waterInfo.tiles);
            p.waterWaypointIndex = 0;
            p.holdTimer = 24 + Math.random() * 10;
            p.state = 'kayaking';
            p.wx = (wtx! + 0.5) * TILE_SIZE;
            p.wy = (wty! + 0.5) * TILE_SIZE;
          }
        } else if (p.state === 'kayaking') {
          const animRate = p.waterActivity === 'swim' ? 6.2 : p.waterActivity === 'rowing' ? 3.8 : 4.6;
          p.animPhase += realDt * animRate;
          p.holdTimer -= realDt;

          if (p.waterActivity !== 'swim' && p.waterWaypoints && p.waterWaypoints.length > 0) {
            const wpIdx = p.waterWaypointIndex ?? 0;
            const wp = p.waterWaypoints[wpIdx % p.waterWaypoints.length];
            const wpTile = this.getTile(wp.x, wp.y);
            if (!wpTile || wpTile.terrain !== 'water') {
              if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
              continue;
            }
            const targetWx = (wp.x + 0.5) * TILE_SIZE;
            const targetWy = (wp.y + 0.5) * TILE_SIZE;
            const dx = targetWx - p.wx;
            const dy = targetWy - p.wy;
            const dist = Math.hypot(dx, dy);
            if (dist < 6) {
              p.waterWaypointIndex = (wpIdx + 1) % p.waterWaypoints.length;
            } else {
              const cruiseSpeed = p.waterActivity === 'rowing' ? 21 : 25;
              const move = Math.min(dist, cruiseSpeed * realDt);
              p.wx += (dx / dist) * move;
              p.wy += (dy / dist) * move;
              p.facingAngle = Math.atan2(dy, dx);
            }
          } else {
            const wtx = p.waterTileX ?? p.targetTileX;
            const wty = p.waterTileY ?? p.targetTileY;
            if (wtx !== undefined && wty !== undefined) {
              const cx = (wtx + 0.5) * TILE_SIZE;
              const cy = (wty + 0.5) * TILE_SIZE;
              const rx = p.waterActivity === 'swim' ? 7 : 10;
              const ry = p.waterActivity === 'swim' ? 4.5 : 5.5;
              p.wx = cx + Math.sin(p.animPhase * 0.45) * rx;
              p.wy = cy + Math.cos(p.animPhase * 0.9) * ry;
            }
          }

          if (p.holdTimer <= 0) {
            const wtx = p.waterTileX;
            const wty = p.waterTileY;
            if (wtx !== undefined && wty !== undefined && p.waterActivity !== 'swim') {
              const dockWx = (wtx + 0.5) * TILE_SIZE;
              const dockWy = (wty + 0.5) * TILE_SIZE;
              const dx = dockWx - p.wx;
              const dy = dockWy - p.wy;
              const dist = Math.hypot(dx, dy);
              if (dist > 14 && !isWarPanic) {
                const dockSpeed = 28;
                const move = Math.min(dist, dockSpeed * realDt);
                p.wx += (dx / dist) * move;
                p.wy += (dy / dist) * move;
                p.facingAngle = Math.atan2(dy, dx);
                continue;
              }
            }
            if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 8);
          if (res !== 'moving' || p.holdTimer <= 0) this.people.splice(i, 1);
        }
        continue;
      }

      if (p.role === 'student') {
        if ((curfew || isWarPanic || !isSchoolHours) && p.state !== 'returning') {
          p.isPanicking = isWarPanic;
          p.speed = isWarPanic ? 46 : 36;
          if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          continue;
        }
        if (p.state === 'walking') {
          const res = this.stepPersonAlongPath(p, realDt, 7.5);
          if (res === 'arrived') {
            p.state = 'field_trip';
            p.holdTimer = 8.5 + Math.random() * 2;
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'field_trip') {
          p.animPhase += realDt * 4.5;
          p.holdTimer -= realDt;
          if (p.holdTimer <= 0) {
            if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 8);
          if (res !== 'moving' || p.holdTimer <= 0) this.people.splice(i, 1);
        }
        continue;
      }

      if (p.role === 'builder') {
        const site = p.targetConstructionId
          ? this.activeConstructions.find((c) => c.id === p.targetConstructionId)
          : undefined;
        if (p.state === 'walking') {
          if (!site) {
            if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
            continue;
          }
          const res = this.stepPersonAlongPath(p, realDt, 8);
          if (res === 'arrived') {
            p.state = 'building';
            p.holdTimer = 999;
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'building') {
          if (!site) {
            if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
            continue;
          }
          p.animPhase += realDt * 9;
          if (Math.random() < realDt * 3.4) {
            this.woodChips.push({
              wx: p.wx + (Math.random() - 0.5) * 8,
              wy: p.wy - 2,
              vx: (Math.random() - 0.5) * 24,
              vy: -12 - Math.random() * 12,
              age: 0,
              maxAge: 0.35,
              color: '#FDE047',
            });
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 8);
          if (res !== 'moving' || p.holdTimer <= 0) this.people.splice(i, 1);
        }
      }
    }
  }

  private dispatchBuildersForConstruction(site: ActiveConstruction) {
    const origins = this.buildingsList
      .filter((b) => b.category === 'residential' || b.category === 'workplace')
      .sort(
        (a, b) =>
          Math.hypot(a.x - site.x, a.y - site.y) - Math.hypot(b.x - site.x, b.y - site.y)
      );
    if (origins.length === 0) return;

    const crewCount = site.totalGameMinutes >= 160 ? 2 : 1;
    let spawned = 0;
    for (const orig of origins.slice(0, 5)) {
      const path = this.findPedestrianPath(this.tiles, { x: orig.x, y: orig.y }, { x: site.x, y: site.y });
      if (!path) continue;
      const offsetX = spawned === 0 ? 0.32 : 0.68;
      this.people.push({
        id: `ppl_${this.personIdCounter++}`,
        role: 'builder',
        wx: (orig.x + 0.5) * TILE_SIZE,
        wy: (orig.y + 0.78) * TILE_SIZE,
        targetWx: (site.x + offsetX) * TILE_SIZE,
        targetWy: (site.y + 0.68) * TILE_SIZE,
        speed: 28,
        shirtColor: '#F59E0B',
        hatColor: '#FDE047',
        animPhase: spawned * 1.4,
        state: 'walking',
        homeBuildingId: orig.id,
        targetConstructionId: site.id,
        targetTileX: site.x,
        targetTileY: site.y,
        pedestrianPath: [...path],
        pedestrianPathIndex: path.length > 1 ? 1 : 0,
        holdTimer: 0,
      });
      spawned++;
      if (spawned >= crewCount) break;
    }
  }

  private tryCreateConstructionProposal() {
    const openLots = this.tiles.filter(
      (t) =>
        (t.terrain === 'grass' || t.terrain === 'sand') &&
        !t.hasRoad &&
        !t.building &&
        !this.marketStalls.some((s) => s.x === t.x && s.y === t.y) &&
        !this.pendingProposals.some((p) => p.x === t.x && p.y === t.y) &&
        !this.activeConstructions.some((c) => c.x === t.x && c.y === t.y) &&
        !this.blastCraters.some((cr) => cr.x === t.x && cr.y === t.y) &&
        this.getRoadNeighbors(this.tiles, t.x, t.y).length > 0
    );
    if (openLots.length === 0) return;

    const allBps = this.getAllBlueprints();
    const candidateSpecs: Array<{
      blueprintId: string;
      displayName?: string;
      minMins: number;
      maxMins: number;
      note: string;
    }> = [
      {
        blueprintId: 'house',
        displayName: 'House',
        minMins: 100,
        maxMins: 170,
        note: 'Family home near the street',
      },
      {
        blueprintId: 'house',
        displayName: 'Cozy Cottage',
        minMins: 90,
        maxMins: 150,
        note: 'Two-bedroom timber cottage',
      },
      {
        blueprintId: 'electronics_shop',
        displayName: 'Electronics Shop',
        minMins: 160,
        maxMins: 240,
        note: 'Gadgets, repairs & neon display corner',
      },
      {
        blueprintId: 'bakery',
        displayName: 'Bakery',
        minMins: 130,
        maxMins: 200,
        note: 'Morning bread & pastry counter',
      },
      {
        blueprintId: 'cafe',
        displayName: 'Neighborhood Cafe',
        minMins: 120,
        maxMins: 190,
        note: 'Coffee shop for commuters & students',
      },
      {
        blueprintId: 'market',
        displayName: 'Corner Market',
        minMins: 150,
        maxMins: 220,
        note: 'Fresh meat, groceries & pantry supplies',
      },
      {
        blueprintId: 'flower_shop',
        displayName: 'Florist',
        minMins: 110,
        maxMins: 170,
        note: 'Neighborhood flower & plant boutique',
      },
      {
        blueprintId: 'bookshop',
        displayName: 'Bookshop',
        minMins: 120,
        maxMins: 185,
        note: 'Quiet reading & stationery corner',
      },
      {
        blueprintId: 'office',
        displayName: 'Small Office',
        minMins: 180,
        maxMins: 260,
        note: 'Local studio workspace',
      },
      {
        blueprintId: 'park',
        displayName: 'Pocket Park',
        minMins: 80,
        maxMins: 140,
        note: 'Community benches & greenery',
      },
    ];

    const lot = openLots[Math.floor(Math.random() * openLots.length)];
    const spec = candidateSpecs[Math.floor(Math.random() * candidateSpecs.length)];
    const baseBp = allBps.find((b) => b.id === spec.blueprintId) || allBps[0];
    if (!baseBp) return;

    const applicants = [
      'Maya Lin',
      'Tariq Hassan',
      'Elena Vance',
      'Noah Patel',
      'Clara Kim',
      'Samir Ortiz',
      'Hannah Brooks',
      'Leo Chen',
      'Nadia Kovacs',
      'Owen Murphy',
    ];
    const applicantName = applicants[Math.floor(Math.random() * applicants.length)];
    const durationRaw = spec.minMins + Math.random() * (spec.maxMins - spec.minMins);
    const durationGameMinutes = Math.round(durationRaw / 10) * 10;
    const areaName = this.describeArea(lot.x, lot.y);

    const proposedPlotName = this.generateUniquePlotName(spec.displayName || baseBp.name, undefined, true);

    this.pendingProposals.push({
      id: `prop_${this.proposalIdCounter++}`,
      applicantName,
      blueprintId: baseBp.id,
      blueprintName: proposedPlotName,
      category: baseBp.category,
      iconGrid: [...baseBp.iconGrid],
      accentColor: baseBp.accentColor,
      x: lot.x,
      y: lot.y,
      areaName,
      durationGameMinutes,
      note: spec.note,
      createdAtDay: this.dayCount,
    });

    this.floatingLabels.push({
      wx: (lot.x + 0.5) * TILE_SIZE,
      wy: (lot.y + 0.25) * TILE_SIZE,
      text: 'Permit Proposed!',
      color: '#0F172A',
      bgColor: '#FDE047',
      age: 0,
      maxAge: 2.0,
    });
  }

  private updateConstructionProposalsAndSites(simDt: number, playAudio: boolean) {
    // 1. Prune stale pending proposals whose lots became blocked/occupied
    for (let i = this.pendingProposals.length - 1; i >= 0; i--) {
      const pr = this.pendingProposals[i];
      const tile = this.getTile(pr.x, pr.y);
      if (
        !tile ||
        (tile.terrain !== 'grass' && tile.terrain !== 'sand') ||
        tile.hasRoad ||
        tile.building ||
        this.activeConstructions.some((c) => c.x === pr.x && c.y === pr.y)
      ) {
        this.pendingProposals.splice(i, 1);
      }
    }

    // 2. Advance active construction sites by elapsed game minutes (4 game mins / 1s at 1x)
    for (let i = this.activeConstructions.length - 1; i >= 0; i--) {
      const c = this.activeConstructions[i];
      const tile = this.getTile(c.x, c.y);
      if (!tile || tile.terrain === 'water' || tile.terrain === 'void' || tile.hasRoad || tile.building) {
        this.clearPermitsAtTile(c.x, c.y);
        continue;
      }

      // Ensure at least one builder is assigned when awake/safe
      const hasBuilder = this.people.some((p) => p.role === 'builder' && p.targetConstructionId === c.id);
      if (!hasBuilder && !this.isOutdoorCurfew()) {
        this.dispatchBuildersForConstruction(c);
      }

      c.elapsedGameMinutes += simDt * 4;
      if (c.elapsedGameMinutes >= c.totalGameMinutes) {
        this.activeConstructions.splice(i, 1);
        const baseBp = this.getAllBlueprints().find((b) => b.id === c.blueprintId);
        const finishBp: BuildingBlueprint = baseBp
          ? {
              ...baseBp,
              name: c.blueprintName,
              iconGrid: [...c.iconGrid],
              accentColor: c.accentColor,
            }
          : {
              id: c.blueprintId,
              name: c.blueprintName,
              category: c.category,
              iconGrid: [...c.iconGrid],
              accentColor: c.accentColor,
              capacity: c.category === 'residential' ? 4 : 18,
            };
        const placed = this.placeBuilding(c.x, c.y, finishBp);
        if (placed) {
          this.floatingLabels.push({
            wx: (placed.x + 0.5) * TILE_SIZE,
            wy: (placed.y + 0.25) * TILE_SIZE,
            text: `+Built ${placed.name}!`,
            color: '#FEF9C3',
            bgColor: '#0F766E',
            age: 0,
            maxAge: 2.0,
          });
          this.logDailyNews(
            `PERMIT COMPLETED: ${c.applicantName} finished constructing a new ${placed.name} at ${c.areaName} (${c.x}, ${c.y})!`
          );
          if (playAudio) soundEngine.playPlantTree();
        }
        for (const p of this.people) {
          if (p.targetConstructionId === c.id) {
            p.targetConstructionId = undefined;
            if (!this.assignReturnRoute(p)) {
              p.state = 'returning';
              p.holdTimer = 0;
            }
          }
        }
      }
    }

    // 3. Citizens file new construction proposals to the Mayor for approval
    const isWarPanic = this.crises.warActive || this.people.some((o) => o.role === 'invader');
    if (
      !isWarPanic &&
      this.buildingsList.length >= 3 &&
      this.buildingsList.length < 64 &&
      this.pendingProposals.length < 4 &&
      this.activeConstructions.length < 4
    ) {
      this.citizenBuildAccumulator += simDt;
      if (this.citizenBuildAccumulator >= 85) {
        this.citizenBuildAccumulator = 0;
        this.tryCreateConstructionProposal();
      }
    }
  }
}
