import { DEFAULT_BLUEPRINTS, PRESET_MAPS } from '../data/defaultBlueprints';
import {
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
  NukeBlast,
  Person,
  PlacedBuilding,
  ProtestIncident,
  RoadIntersectionConfig,
  RobberyIncident,
  SavedMapData,
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
  VehicleType,
  WeatherType,
  WoodChipParticle,
} from '../types/game';
import { soundEngine } from '../utils/sound';
import {
  findAdjacentRoadTile,
  findNearestWalkableTile,
  findPedestrianPath,
  findRoadPath,
  getRoadNeighbors,
  inBounds,
  isHighwayTile,
  isIntersectionTile,
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
  };

  public mapId = 'preset_oakridge';
  public mapName = 'Oakridge Valley';

  // Time: 1 game minute = 1 real second at 1x speed
  public dayCount = 1;
  public minutesOfDay = 7 * 60 + 5; // 07:05 AM right as morning rush begins
  public timeScale = 1; // 1 = 1 game min per 1 real sec
  public isRunning = true;

  public season: SeasonType = 'Spring';
  public seasonIndex = 0;
  public weather: WeatherType = 'Clear';
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
  public economyScore = 82;
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
  private crashCheckAccumulator = 18;
  private bridgeBreakAccumulator = 36;
  private zzzAccumulator = 0;
  private sadIndoorAccumulator = 0;
  private factorySmokeAccumulator = 0;
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
  private roadTilesCount = 0;
  private buildingsList: PlacedBuilding[] = [];

  constructor(initialMap?: SavedMapData) {
    this.loadMap(initialMap || PRESET_MAPS[0]);
  }

  public loadMap(data: SavedMapData) {
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
    this.economyScore = 82;
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
    this.crashCheckAccumulator = 18;
    this.bridgeBreakAccumulator = 36;
    this.zzzAccumulator = 0;
    this.sadIndoorAccumulator = 0;
    this.factorySmokeAccumulator = 0;
    this.lastFestivalDay = -3;
    this.lastCeremonyDay = -3;
    this.dayCount = 1;
    this.minutesOfDay = 7 * 60 + 5;
    this.seasonIndex = 0;
    this.season = 'Spring';
    this.weather = 'Clear';
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
    };

    this.tiles = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        this.tiles.push({
          x,
          y,
          terrain: 'grass',
          hasRoad: false,
          hasZebraCrossing: false,
          hasFootbridge: false,
          isBridgeBroken: false,
          intersection: { controlType: 'signal', cycleDuration: 18, phaseOffset: (x + y) % 10 },
          building: null,
          congestionScore: 0,
          jammedCarsCount: 0,
        });
      }
    }

    let hasLoadedCityHall = false;
    for (const savedTile of data.tiles) {
      if (!inBounds(savedTile.x, savedTile.y)) continue;
      const idx = savedTile.y * GRID_COLS + savedTile.x;
      this.tiles[idx].terrain = savedTile.terrain;
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
        this.tiles[idx].building = {
          ...savedTile.building,
          iconGrid: [...savedTile.building.iconGrid],
          activeTripsOut: 0,
          activeTripsIn: 0,
        };
      }
    }

    this.rebuildCaches();
    // Seed initial traffic if map already has connected buildings
    this.seedInitialTraffic(14);
  }

  public exportMapData(name?: string, subtitle?: string): SavedMapData {
    return {
      id: this.mapId,
      name: name || this.mapName,
      subtitle: subtitle || `${this.buildingsList.length} plots · ${this.roadTilesCount} road tiles`,
      updatedAt: Date.now(),
      tiles: this.tiles.map((t) => ({
        x: t.x,
        y: t.y,
        terrain: t.terrain,
        hasRoad: t.hasRoad,
        hasZebraCrossing: t.hasZebraCrossing || undefined,
        hasFootbridge: t.hasFootbridge || undefined,
        intersection: t.hasRoad ? { ...t.intersection } : undefined,
        building: t.building ? { ...t.building, iconGrid: [...t.building.iconGrid] } : null,
      })),
      customBlueprints: this.customBlueprints.map((bp) => ({ ...bp, iconGrid: [...bp.iconGrid] })),
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
    if (!inBounds(x, y)) return null;
    return this.tiles[y * GRID_COLS + x];
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
            if (!this.assignReturnRoute(p)) p.holdTimer = 0;
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
    const tile = this.getTile(x, y);
    if (!tile) return false;
    if (tile.terrain === terrain) return false;
    if (terrain !== 'water') {
      tile.hasFootbridge = false;
      this.resolveBrokenBridgeAt(x, y);
    }
    if (terrain === 'water' || terrain === 'forest') {
      if (tile.building) tile.building = null;
      if (terrain === 'forest') tile.hasRoad = false;
      this.removeStallOnTile(x, y);
    }
    tile.terrain = terrain;
    this.rebuildCaches();
    return true;
  }

  public paveRoad(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile) return false;
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

  public placeBuilding(x: number, y: number, blueprint: BuildingBlueprint): PlacedBuilding | null {
    const tile = this.getTile(x, y);
    if (!tile) return null;
    if (blueprint.category === 'city_hall' && this.hasCityHall()) {
      return null;
    }
    const isRoadPath = blueprint.category === 'road_path';
    if (tile.terrain === 'water') return null;
    if (tile.hasRoad && !isRoadPath) return null;

    tile.terrain = 'grass';
    tile.hasFootbridge = false;
    this.removeStallOnTile(x, y);
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
    const bld: PlacedBuilding = {
      id: `bld_${this.buildingIdCounter++}_${Date.now().toString(36)}`,
      blueprintId: blueprint.id,
      name: blueprint.name,
      category: blueprint.category,
      iconGrid: [...blueprint.iconGrid],
      accentColor: blueprint.accentColor,
      x,
      y,
      capacity: blueprint.capacity,
      activeTripsOut: 0,
      activeTripsIn: 0,
      totalVisits: 0,
    };
    tile.building = bld;
    this.rebuildCaches();
    return bld;
  }

  public bulldozeTile(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile) return false;
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

  public getRushPeriodLabel(): string {
    const h = this.minutesOfDay / 60;
    if (h >= 7.0 && h < 9.5) return 'Morning Rush';
    if (h >= 14.5 && h < 16.25) return 'School Pickup';
    if (h >= 16.5 && h < 19.25) return 'Evening Rush';
    if (h >= 19.5 || h < 5.5) return 'Night Calm';
    return 'Midday Flow';
  }

  public getDemandMultiplier(): number {
    const h = this.minutesOfDay / 60;
    if (h >= 7.2 && h < 9.2) return 2.4; // Morning commute surge
    if (h >= 14.7 && h < 16.0) return 2.0; // School pickup wave
    if (h >= 16.8 && h < 19.0) return 2.5; // Evening rush hour
    if (h >= 11.5 && h < 13.8) return 1.3; // Lunchtime errands
    if (h >= 21.5 || h < 5.5) return 0.35; // Late night sparse traffic
    return 1.0;
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

  public triggerRushBurst(count = 14) {
    for (let i = 0; i < count; i++) {
      this.trySpawnCar();
    }
  }

  public step(rawDt: number, playAudio = true) {
    const dt = Math.min(rawDt, 0.05);
    if (!this.isRunning) return;

    const simDt = dt * this.timeScale;

    // Advance time: 1 game minute = 1 real second at 1x
    this.minutesOfDay += simDt;
    if (this.minutesOfDay >= 1440) {
      this.minutesOfDay -= 1440;
      this.dayCount += 1;
      if (this.dayCount % 2 === 1) {
        this.cycleSeason(false);
      }
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
      this.honkRipples[i].age += dt;
      if (this.honkRipples[i].age >= this.honkRipples[i].maxAge) {
        this.honkRipples.splice(i, 1);
      }
    }

    // Step floating labels (fishing catches, musical notes, shop treats)
    for (let i = this.floatingLabels.length - 1; i >= 0; i--) {
      this.floatingLabels[i].age += dt;
      if (this.floatingLabels[i].age >= this.floatingLabels[i].maxAge) {
        this.floatingLabels.splice(i, 1);
      }
    }

    // Step gunfire tracers
    for (let i = this.gunfireTracers.length - 1; i >= 0; i--) {
      this.gunfireTracers[i].age += dt;
      if (this.gunfireTracers[i].age >= this.gunfireTracers[i].maxAge) {
        this.gunfireTracers.splice(i, 1);
      }
    }

    // Step Neighbourhood Robberies & Police Dispatch
    this.updateRobberies(simDt, playAudio);

    // Step Citizen Deaths & Cemetery Hearses
    this.updateDeaths(simDt, dt, playAudio);

    // Step Woodcutters, Planters, Arsonists, Firefighters & Mayor
    this.updatePeopleAndChop(simDt, dt, playAudio);

    // Step Fishers, Hobbyists & Small Business Shoppers
    this.updateCitizensAndHobbies(simDt, dt, playAudio);

    // Step Pop-up Market Stalls, Illicit Stalls & Beggars
    this.updateMarketStallsAndBeggars(simDt, dt, playAudio);

    // Step Jail Releases
    this.updateJailAndReleases(simDt);

    // Step City Hall Chaos Crises (Virus Outbreak, War, Poverty) & Post-Invasion Elections
    this.updateCrises(simDt, dt, playAudio);

    // Step Mayor Speeches & Reforestation Drives
    this.updateMayorSpeeches(simDt);

    // Step Protests at City Hall & Police Captures
    this.updateProtests(simDt, dt, playAudio);

    // Step Arsonists, House Fires & Fire Truck Dispatch
    this.updateFiresAndArson(simDt, dt, playAudio);

    // Step Natural Rare Celebrations, Ceremonies, Weddings & Events
    this.updateCityEvents(simDt, dt, playAudio);

    // Step Car Crashes & Emergency Responders
    this.updateCarCrashes(simDt, dt, playAudio);

    // Step Seasons, Weather, Seasonal Particles, Broken Bridges, Economy & Citizen Happiness
    this.updateWeather(simDt, dt);
    this.updateSeasonalParticlesAndIndoorMood(simDt, dt);
    this.updateBrokenBridges(simDt, dt, playAudio);
    this.updateEconomy(simDt, dt);
    this.updateCitizenHappiness(dt);

    // Step cars physics (including occasional car-vs-pedestrian impacts)
    this.carPedHitCooldown = Math.max(0, this.carPedHitCooldown - dt);
    this.updateCars(simDt, dt, playAudio);
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
    if (playAudio) soundEngine.playDeathChime();
  }

  private dispatchHearseToCemetery(origin: PlacedBuilding): boolean {
    const cemeteries = this.buildingsList.filter((b) => b.category === 'cemetery');
    if (cemeteries.length === 0) return false;

    const startRoad = findAdjacentRoadTile(this.tiles, origin.x, origin.y);
    if (!startRoad) return false;

    const sortedCemeteries = [...cemeteries].sort(
      (a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y)
    );

    for (const cem of sortedCemeteries) {
      const endRoad = findAdjacentRoadTile(this.tiles, cem.x, cem.y);
      if (!endRoad) continue;
      const path = findRoadPath(this.tiles, startRoad, endRoad, 1.0);
      if (!path || path.length < 2) continue;

      const p0 = path[0];
      const p1 = path[1];
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const rightX = -Math.sin(angle) * LANE_OFFSET;
      const rightY = Math.cos(angle) * LANE_OFFSET;

      const hearse: Car = {
        id: `car_${this.carIdCounter++}`,
        type: 'hearse',
        color: '#0F172A',
        wx: (p0.x + 0.5) * TILE_SIZE + rightX,
        wy: (p0.y + 0.5) * TILE_SIZE + rightY,
        angle,
        speed: 28,
        maxSpeed: 54,
        path,
        pathIndex: 1,
        originBuildingId: origin.id,
        destBuildingId: cem.id,
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
    // Update existing robbery timers
    for (let i = this.robberies.length - 1; i >= 0; i--) {
      const rob = this.robberies[i];
      if (rob.status === 'active') {
        rob.elapsedSeconds += simDt;
        // Retry police dispatch if a player just built/connected a Police Station
        if (!rob.policeDispatched) {
          this.dispatchPoliceToRobbery(rob);
        }
        if (rob.elapsedSeconds >= rob.escapeLimitSeconds) {
          rob.status = 'escaped';
          rob.statusTimer = 4.0;
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
    const stations = this.buildingsList.filter((b) => b.category === 'police');
    if (stations.length === 0) return false;

    const destRoad = findAdjacentRoadTile(this.tiles, incident.x, incident.y);
    if (!destRoad) return false;

    // Pick closest road-connected police station
    let bestStation: PlacedBuilding | null = null;
    let bestPath: { x: number; y: number }[] | null = null;

    const sortedStations = [...stations].sort(
      (a, b) =>
        Math.hypot(a.x - incident.x, a.y - incident.y) -
        Math.hypot(b.x - incident.x, b.y - incident.y)
    );

    for (const st of sortedStations) {
      const startRoad = findAdjacentRoadTile(this.tiles, st.x, st.y);
      if (!startRoad) continue;
      const path = findRoadPath(this.tiles, startRoad, destRoad, 0.8);
      if (path && path.length >= 2) {
        bestStation = st;
        bestPath = path;
        break;
      }
    }

    if (!bestStation || !bestPath) return false;

    const p0 = bestPath[0];
    const p1 = bestPath[1];
    const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const rightX = -Math.sin(angle) * LANE_OFFSET;
    const rightY = Math.cos(angle) * LANE_OFFSET;

    const cruiser: Car = {
      id: `car_${this.carIdCounter++}`,
      type: 'police',
      color: '#1E293B',
      wx: (p0.x + 0.5) * TILE_SIZE + rightX,
      wy: (p0.y + 0.5) * TILE_SIZE + rightY,
      angle,
      speed: 45,
      maxSpeed: 94,
      path: bestPath,
      pathIndex: 1,
      originBuildingId: bestStation.id,
      destBuildingId: incident.buildingId,
      originCategory: 'police',
      destCategory: 'residential',
      waitSeconds: 0,
      isBraking: false,
      isJammed: false,
      hornFlash: 0,
      sirenPhase: 0,
      targetRobberyId: incident.id,
    };

    bestStation.activeTripsOut += 1;
    this.cars.push(cruiser);
    incident.policeDispatched = true;
    return true;
  }

  private pickOriginAndDest(): { origin: PlacedBuilding; dest: PlacedBuilding; vehicleType: VehicleType } | null {
    const connected = this.buildingsList.filter(
      (b) =>
        b.category !== 'road_path' &&
        b.category !== 'landmark' &&
        getRoadNeighbors(this.tiles, b.x, b.y).length > 0
    );
    if (connected.length < 2) return null;

    const h = this.minutesOfDay / 60;
    const byCat = (cat: BuildingCategory) => connected.filter((b) => b.category === cat);

    const homes = byCat('residential');
    const schools = byCat('school');
    const hospitals = byCat('hospital');
    const offices = [...byCat('workplace'), ...byCat('factory'), ...byCat('city_hall')];
    const visitSpots = [...byCat('visit_spot'), ...byCat('commercial')];
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

    // Occasional ambulance dispatch from/to hospital
    if (hospitals.length > 0 && r < 0.08) {
      vehicleType = 'ambulance';
      if (Math.random() < 0.5) {
        originPool = hospitals;
        destPool = homes.length ? homes : connected;
      } else {
        originPool = homes.length ? homes : connected;
        destPool = hospitals;
      }
    } else if (h >= 6.8 && h < 9.5) {
      // Morning rush: Homes -> Schools & Job Opportunities (Offices/Factories)
      originPool = homes.length ? homes : connected;
      if (schools.length && r < 0.36) {
        destPool = schools;
        if (Math.random() < 0.35) vehicleType = 'bus';
      } else if (offices.length && r < 0.8) {
        destPool = offices;
      } else if (visitSpots.length) {
        destPool = visitSpots;
        if (Math.random() < 0.22) vehicleType = 'van';
      }
    } else if (h >= 14.5 && h < 16.3) {
      // School pickup & afternoon library/shop visits
      if (schools.length && homes.length && r < 0.5) {
        originPool = schools;
        destPool = homes;
        if (Math.random() < 0.4) vehicleType = 'bus';
      } else if (visitSpots.length) {
        destPool = visitSpots;
      }
    } else if (h >= 16.5 && h < 19.5) {
      // Evening rush: Workplaces & Visit Spots -> Homes
      const workPool = [...offices, ...visitSpots];
      originPool = workPool.length ? workPool : connected;
      destPool = homes.length ? homes : connected;
      if (Math.random() < 0.14) vehicleType = 'van';
    } else {
      // Midday / Night: errands, libraries, cafes & parks
      const errands = [...visitSpots, ...parks, ...hospitals, ...offices];
      if (r < 0.55 && homes.length && errands.length) {
        originPool = homes;
        destPool = errands;
      } else if (visitSpots.length) {
        if (Math.random() < 0.22) vehicleType = 'van';
      }
    }

    const origin = originPool[Math.floor(Math.random() * originPool.length)];
    let dest = destPool[Math.floor(Math.random() * destPool.length)];
    if (dest.id === origin.id) {
      const others = connected.filter((b) => b.id !== origin.id);
      if (others.length === 0) return null;
      dest = others[Math.floor(Math.random() * others.length)];
    }

    if ((origin.category === 'factory' || dest.category === 'factory') && vehicleType !== 'ambulance' && Math.random() < 0.38) {
      vehicleType = 'van';
    }

    return { origin, dest, vehicleType };
  }

  private trySpawnCar(): boolean {
    if (this.cars.length >= MAX_CARS) return false;
    const pair = this.pickOriginAndDest();
    if (!pair) return false;

    const { origin, dest, vehicleType } = pair;
    const startRoad = findAdjacentRoadTile(this.tiles, origin.x, origin.y);
    const endRoad = findAdjacentRoadTile(this.tiles, dest.x, dest.y);
    if (!startRoad || !endRoad) return false;

    const path = findRoadPath(this.tiles, startRoad, endRoad);
    if (!path || path.length < 2) return false;

    // Compute initial heading & lane-offset position
    const p0 = path[0];
    const p1 = path[1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const angle = Math.atan2(dy, dx);
    const rightX = -Math.sin(angle) * LANE_OFFSET;
    const rightY = Math.cos(angle) * LANE_OFFSET;

    const spawnWx = (p0.x + 0.5) * TILE_SIZE + rightX;
    const spawnWy = (p0.y + 0.5) * TILE_SIZE + rightY;

    // Prevent spawning directly on top of another car
    for (const other of this.cars) {
      const distSq = (other.wx - spawnWx) ** 2 + (other.wy - spawnWy) ** 2;
      if (distSq < 28 * 28) return false;
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
      maxSpeed = 88;
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
      originCategory: origin.category,
      destCategory: dest.category,
      waitSeconds: 0,
      isBraking: false,
      isJammed: false,
      hornFlash: 0,
      sirenPhase: Math.random() * Math.PI * 2,
    };

    origin.activeTripsOut += 1;
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
    const rightX = -Math.sin(angle) * LANE_OFFSET;
    const rightY = Math.cos(angle) * LANE_OFFSET;

    return {
      tx: (pt.x + 0.5) * TILE_SIZE + rightX,
      ty: (pt.y + 0.5) * TILE_SIZE + rightY,
      angle,
    };
  }

  private updateCars(dt: number, realDt: number, playAudio: boolean) {
    if (dt <= 0) return;

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

      if (car.pathIndex >= car.path.length) {
        if (
          this.handleProtestCarArrival(car) ||
          this.handleFireCarArrival(car) ||
          this.handleCrashCarArrival(car) ||
          this.handleRaidCarArrival(car)
        ) {
          continue;
        }
        this.finishTrip(car);
        this.cars.splice(i, 1);
        continue;
      }

      const { tx, ty, angle: segmentAngle } = this.getTargetWorldPos(car, car.pathIndex);
      const toX = tx - car.wx;
      const toY = ty - car.wy;
      const distToTarget = Math.hypot(toX, toY);
      const passedWaypoint =
        toX * Math.cos(segmentAngle) + toY * Math.sin(segmentAngle) < 2 && distToTarget < 24;

      if (distToTarget < 11 || passedWaypoint) {
        car.pathIndex += 1;
        if (car.pathIndex >= car.path.length) {
          if (
            this.handleProtestCarArrival(car) ||
            this.handleFireCarArrival(car) ||
            this.handleCrashCarArrival(car) ||
            this.handleRaidCarArrival(car)
          ) {
            continue;
          }
          this.finishTrip(car);
          this.cars.splice(i, 1);
          continue;
        }
      }

      // Smoothly steer toward target point
      const desiredAngle = distToTarget > 1 ? Math.atan2(toY, toX) : segmentAngle;
      let angleDiff = desiredAngle - car.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      car.angle += angleDiff * Math.min(1, dt * 11);

      const fwdX = Math.cos(car.angle);
      const fwdY = Math.sin(car.angle);

      // 1. Check car-following distance ahead in same lane & direction
      const isEmergency =
        car.type === 'ambulance' || car.type === 'police' || car.type === 'firetruck';
      const weatherSpeedMult = isEmergency
        ? 1
        : this.weather === 'Storm'
        ? 0.78
        : this.weather === 'Rain' || this.weather === 'Snow'
        ? 0.88
        : 1;
      let desiredMaxSpeed = car.maxSpeed * weatherSpeedMult;
      let blockedByVehicle = false;
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
          } else {
            desiredMaxSpeed = Math.min(desiredMaxSpeed, ((projFwd - 25) / 17) * car.maxSpeed * 0.45);
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
            break;
          } else {
            desiredMaxSpeed = Math.min(desiredMaxSpeed, ((projFwd - 26) / 18) * car.maxSpeed * 0.4);
          }
        }
      }

      // 2. Check upcoming intersection traffic signal & highway speed / broken bridges
      const currTileX = Math.floor(car.wx / TILE_SIZE);
      const currTileY = Math.floor(car.wy / TILE_SIZE);
      if (isHighwayTile(this.tiles, currTileX, currTileY)) {
        desiredMaxSpeed *= 1.32;
      }
      const inIntersectionNow = isIntersectionTile(this.tiles, currTileX, currTileY);
      const nextPt = car.path[car.pathIndex];
      const nextTile = this.getTile(nextPt.x, nextPt.y);

      if (nextTile && nextTile.isBridgeBroken && (currTileX !== nextPt.x || currTileY !== nextPt.y)) {
        desiredMaxSpeed = 0;
        blockedByVehicle = true;
      }

      if (
        !inIntersectionNow &&
        nextTile &&
        nextTile.hasRoad &&
        (currTileX !== nextPt.x || currTileY !== nextPt.y) &&
        isIntersectionTile(this.tiles, nextPt.x, nextPt.y)
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
              car.type !== 'firetruck'
            ) {
              const movingVertical = Math.abs(ady) > Math.abs(adx);
              const aspect = this.getSignalAspect(nextTile, movingVertical ? 'NS' : 'EW');
              if (aspect === 'red' || (aspect === 'amber' && stopLineDist > 8)) {
                shouldHoldAtStopLine = true;
              }
            }

            // Don't Block the Box: if exit lane beyond intersection is jammed, wait before stop line
            if (!shouldHoldAtStopLine && stopLineDist < 16 && car.pathIndex + 1 < car.path.length) {
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
                desiredMaxSpeed = Math.min(desiredMaxSpeed, (stopLineDist / 36) * car.maxSpeed * 0.55);
              }
            }
          }
        }
      }

      // 2.5 Yield to anyone crossing on upcoming Zebra Crossing
      if (
        nextTile &&
        nextTile.hasRoad &&
        nextTile.hasZebraCrossing &&
        (currTileX !== nextPt.x || currTileY !== nextPt.y) &&
        car.type !== 'ambulance' &&
        car.type !== 'police' &&
        car.type !== 'firetruck'
      ) {
        const hasPedestrianOnCrossing = this.people.some((p) => {
          const ptx = Math.floor(p.wx / TILE_SIZE);
          const pty = Math.floor(p.wy / TILE_SIZE);
          if (ptx === nextPt.x && pty === nextPt.y) return true;
          if (p.role === 'pedestrian' && p.targetTileX === nextPt.x && p.targetTileY === nextPt.y) {
            return true;
          }
          if (p.pedestrianPath && p.pedestrianPathIndex !== undefined) {
            const nextWp = p.pedestrianPath[p.pedestrianPathIndex];
            if (
              nextWp &&
              nextWp.x === nextPt.x &&
              nextWp.y === nextPt.y &&
              Math.hypot((nextPt.x + 0.5) * TILE_SIZE - p.wx, (nextPt.y + 0.5) * TILE_SIZE - p.wy) <
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
                desiredMaxSpeed = Math.min(desiredMaxSpeed, (zebraDist / 30) * car.maxSpeed * 0.5);
              }
            }
          }
        }
      }

      // Anti-stall guarantee: a car inside an intersection must always clear the box
      if (inIntersectionNow && car.waitSeconds > 1.2) {
        desiredMaxSpeed = Math.max(desiredMaxSpeed, 28);
      }

      // Accelerate or brake smoothly
      if (car.speed < desiredMaxSpeed) {
        car.speed = Math.min(desiredMaxSpeed, car.speed + 58 * dt);
        car.isBraking = false;
      } else if (car.speed > desiredMaxSpeed) {
        car.speed = Math.max(desiredMaxSpeed, car.speed - 130 * dt);
        car.isBraking = true;
      } else {
        car.isBraking = desiredMaxSpeed < 5;
      }

      if (car.speed < 4) {
        car.waitSeconds += dt;
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
      } else {
        car.waitSeconds = Math.max(0, car.waitSeconds - dt * 1.8);
        if (car.waitSeconds < 1.2) car.isJammed = false;
      }

      // Advance position
      car.wx += Math.cos(car.angle) * car.speed * dt;
      car.wy += Math.sin(car.angle) * car.speed * dt;

      // Occasional car-vs-pedestrian collision when a fast car fails to stop in time on road/crossing
      if (
        !isEmergency &&
        car.type !== 'hearse' &&
        car.speed > 26 &&
        this.carPedHitCooldown <= 0
      ) {
        const cTileX = Math.floor(car.wx / TILE_SIZE);
        const cTileY = Math.floor(car.wy / TILE_SIZE);
        const cTile = this.getTile(cTileX, cTileY);
        if (cTile && cTile.hasRoad) {
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
            if (pfwd > 2 && pfwd < 12 && pside < 7.5) {
              const pedTile = this.getTile(
                Math.floor(ped.wx / TILE_SIZE),
                Math.floor(ped.wy / TILE_SIZE)
              );
              if (pedTile && pedTile.hasRoad) {
                this.carPedHitCooldown = 26;
                if (Math.random() < 0.24) {
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
                  const originBld =
                    this.buildingsList.find((b) => b.id === ped.homeBuildingId) ||
                    this.buildingsList[0];
                  if (originBld) {
                    const hearseDispatched = this.dispatchHearseToCemetery(originBld);
                    this.deathEvents.push({
                      id: `death_${this.deathIdCounter++}`,
                      x: cTileX,
                      y: cTileY,
                      wx: ped.wx,
                      wy: ped.wy,
                      buildingName: `Crossing (${cTileX}, ${cTileY})`,
                      age: 0,
                      maxAge: 8.5,
                      hearseDispatched,
                    });
                    this.totalDeaths += 1;
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

    // 2. Spawn woodcutters if forest tiles & connected buildings exist (never spawn in middle of nowhere or during curfew)
    const forestTiles = this.tiles.filter((t) => t.terrain === 'forest');
    const activeWoodcutters = this.people.filter((p) => p.role === 'woodcutter');
    const desiredWoodcutters =
      !curfew && forestTiles.length > 0 && this.buildingsList.length > 0
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
      !curfew && walkerOrigins.length >= 2
        ? Math.min(6, Math.max(2, Math.floor(walkerOrigins.length / 4)))
        : 0;
    if (activePeds.length < desiredPeds) {
      this.pedestrianSpawnAccumulator += simDt;
      if (this.pedestrianSpawnAccumulator >= 3.2) {
        this.pedestrianSpawnAccumulator = 0;
        this.spawnBuildingPedestrian();
      }
    }

    // 3. Step Mayors, Woodcutters, and Building Pedestrians
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];

      if (p.role === 'pedestrian') {
        if (curfew && p.state !== 'returning') {
          p.speed = Math.max(p.speed, 38);
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
              if (dest) dest.totalVisits += 1;
            }
            p.state = 'idling';
            p.holdTimer = 1.6 + Math.random() * 1.4;
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'idling') {
          p.holdTimer -= realDt;
          if (p.holdTimer <= 0) {
            if (!this.assignReturnRoute(p)) {
              this.people.splice(i, 1);
            }
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 7.6);
          if (res !== 'moving' || p.holdTimer <= 0) {
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
        (p.role === 'police' && p.homeBuildingId && !p.protestId && !p.raidStallId) ||
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
        if (curfew && p.state !== 'returning') {
          p.speed = Math.max(p.speed, 38);
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

  private getCurrentWalkableStart(wx: number, wy: number, allowFrozenWater = false): GridPoint | null {
    const tx = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(wx / TILE_SIZE)));
    const ty = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(wy / TILE_SIZE)));
    const tile = this.getTile(tx, ty);
    if (tile && isPedestrianTileWalkable(tile, allowFrozenWater)) {
      return { x: tx, y: ty };
    }
    return findNearestWalkableTile(this.tiles, tx, ty, 3, allowFrozenWater);
  }

  private assignPedestrianRoute(
    p: Person,
    destTileX: number,
    destTileY: number,
    finalWx?: number,
    finalWy?: number
  ): boolean {
    const allowFrozen = this.canPersonSkateOnFrozenWater(p);
    const startPt = this.getCurrentWalkableStart(p.wx, p.wy, allowFrozen);
    if (!startPt) return false;
    const path = findPedestrianPath(this.tiles, startPt, { x: destTileX, y: destTileY }, allowFrozen);
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
    allowFrozenWater = false
  ): boolean {
    if (!tile || !isPedestrianTileWalkable(tile, allowFrozenWater)) return false;
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
    const allowFrozen = this.canPersonSkateOnFrozenWater(p);
    // If person is stranded on a newly paved unmarked road or water tile, step back to adjacent walkable tile (never leap across a river)
    const curTx = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(p.wx / TILE_SIZE)));
    const curTy = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(p.wy / TILE_SIZE)));
    const curTile = this.getTile(curTx, curTy);
    if (curTile && !isPedestrianTileWalkable(curTile, allowFrozen)) {
      const prevIdx = Math.max(0, (p.pedestrianPathIndex ?? 1) - 1);
      const prevWp = p.pedestrianPath?.[prevIdx];
      const prevTile = prevWp ? this.getTile(prevWp.x, prevWp.y) : null;
      const safe =
        prevTile && isPedestrianTileWalkable(prevTile, allowFrozen)
          ? prevWp!
          : findNearestWalkableTile(this.tiles, curTx, curTy, 1, allowFrozen);
      if (!safe) return 'blocked';
      p.wx = (safe.x + 0.5) * TILE_SIZE;
      p.wy = (safe.y + 0.5) * TILE_SIZE;
      p.pedestrianPath = undefined;
    }

    if (!p.pedestrianPath || p.pedestrianPath.length === 0) {
      if (p.targetTileX === undefined || p.targetTileY === undefined) return 'blocked';
      if (!this.assignPedestrianRoute(p, p.targetTileX, p.targetTileY, p.targetWx, p.targetWy)) {
        return 'blocked';
      }
    }

    const path = p.pedestrianPath!;
    const idx = p.pedestrianPathIndex ?? 0;

    if (idx < path.length) {
      const wp = path[idx];
      const wpTile = this.getTile(wp.x, wp.y);
      if (!this.canPersonStepOntoTile(wpTile, p.targetTileX, p.targetTileY, allowFrozen)) {
        // Road, water, broken bridge, or building was placed ahead! Re-route around it via gaps/crossings/footbridges
        if (p.targetTileX === undefined || p.targetTileY === undefined) return 'blocked';
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
        const nextTx = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(nextWx / TILE_SIZE)));
        const nextTy = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(nextWy / TILE_SIZE)));
        if (nextTx !== curTx || nextTy !== curTy) {
          const nextTile = this.getTile(nextTx, nextTy);
          if (!this.canPersonStepOntoTile(nextTile, p.targetTileX, p.targetTileY, allowFrozen)) {
            if (
              p.targetTileX === undefined ||
              p.targetTileY === undefined ||
              !this.assignPedestrianRoute(p, p.targetTileX, p.targetTileY, p.targetWx, p.targetWy)
            ) {
              return 'blocked';
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
    const startPt = this.getCurrentWalkableStart(p.wx, p.wy, allowFrozen);
    if (!startPt) return false;

    if (p.homeBuildingId) {
      const home = this.buildingsList.find((b) => b.id === p.homeBuildingId);
      if (home) {
        const path = findPedestrianPath(this.tiles, startPt, { x: home.x, y: home.y }, allowFrozen);
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
      const path = findPedestrianPath(this.tiles, startPt, { x: c.x, y: c.y }, allowFrozen);
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
      const candidatePath = findPedestrianPath(this.tiles, { x: h.x, y: h.y }, { x: target.x, y: target.y });
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
      const path = findPedestrianPath(this.tiles, startPt, { x: candidate.x, y: candidate.y });
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

    // 1. Spawn Fishers along reachable riverbanks / water shorelines (disabled during Night/Rain curfew)
    const shoreSpots = this.getWalkableShoreTiles();
    const activeFishers = this.people.filter((p) => p.role === 'fisher');
    const tackleShops = this.buildingsList.filter((b) => b.blueprintId === 'tackle_shop');
    const maxFishers =
      !curfew && shoreSpots.length > 0 && this.buildingsList.length > 0
        ? Math.min(5, Math.max(1, 2 + Math.min(2, tackleShops.length)))
        : 0;

    if (activeFishers.length < maxFishers) {
      this.fisherSpawnAccumulator += simDt;
      if (this.fisherSpawnAccumulator >= 5.5) {
        this.fisherSpawnAccumulator = 0;
        this.spawnFisher(shoreSpots, tackleShops);
      }
    }

    // 2. Spawn Seasonal Hobbyists from real buildings (disabled during Night/Rain curfew)
    const activeHobbyists = this.people.filter((p) => p.role === 'hobbyist');
    const maxHobbyists = curfew ? 0 : 6;
    if (activeHobbyists.length < maxHobbyists && this.buildingsList.length > 0) {
      this.hobbyistSpawnAccumulator += simDt;
      if (this.hobbyistSpawnAccumulator >= 5.2) {
        this.hobbyistSpawnAccumulator = 0;
        this.spawnHobbyist();
      }
    }

    // 3. Spawn Small Business & Market Stall Shoppers walking from homes (disabled during curfew)
    const houses = this.buildingsList.filter((b) => b.category === 'residential');
    const shops = this.buildingsList.filter(
      (b) => b.category === 'commercial' || b.category === 'visit_spot'
    );
    const activeShoppers = this.people.filter((p) => p.role === 'shopper');
    const povertyFactor = this.crises.povertyActive ? 0.55 : 1.0;
    const maxShoppers =
      !curfew && houses.length > 0 && (shops.length > 0 || this.marketStalls.length > 0)
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
        if (curfew && p.state !== 'returning') {
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
              this.economyScore = Math.max(5, this.economyScore - 3.0);
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
        if ((curfew || wrongIceSeason) && p.state !== 'returning') {
          p.speed = Math.max(p.speed, 38);
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
          p.animPhase += realDt * (p.hobbyKind === 'music' ? 7 : p.hobbyKind === 'ice_skating' ? 5.2 : 4.2);
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
        if (curfew && !p.isShadyBuyer && p.state !== 'returning') {
          p.speed = Math.max(p.speed, 38);
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
                this.economyScore = Math.max(5, this.economyScore - 5.5);
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
                this.economyScore = Math.min(100, this.economyScore + 0.35);
                const saleText =
                  stall.goods === 'fish'
                    ? 'Bought Fish!'
                    : stall.goods === 'clothes'
                    ? 'Bought Clothes!'
                    : stall.goods === 'produce'
                    ? 'Bought Produce!'
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
            shop.totalVisits += 1;
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
              this.economyScore = Math.max(5, this.economyScore - 4.5);
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
            } else {
              this.economyScore = Math.min(100, this.economyScore + 0.2);
            }
            p.state = 'shopping';
            p.holdTimer = 2.0 + Math.random() * 1.4;
          } else if (res === 'blocked') {
            this.people.splice(i, 1);
          }
        } else if (p.state === 'shopping') {
          p.holdTimer -= realDt;
          if (p.holdTimer <= 0) {
            if (!this.assignReturnRoute(p)) {
              this.people.splice(i, 1);
            }
          }
        } else {
          p.holdTimer -= realDt;
          const res = this.stepPersonAlongPath(p, realDt, 8.2);
          if (res !== 'moving' || p.holdTimer <= 0) {
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
      const candidatePath = findPedestrianPath(
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
    const seasonalPools: Record<SeasonType, HobbyKind[]> = {
      Winter: ['ice_skating', 'snowball_fight', 'snowman', 'music'],
      Autumn: ['raking_leaves', 'harvesting', 'painting', 'birdwatching', 'music'],
      Spring: ['gardening', 'kite', 'painting', 'birdwatching', 'music'],
      Summer: ['sunbathing', 'kite', 'painting', 'birdwatching', 'music'],
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
      if (t.building && t.building.category !== 'park') continue;

      if (hobbyKind === 'painting') {
        const nearScenic = dirs.some((d) => {
          const nt = this.getTile(t.x + d.dx, t.y + d.dy);
          return nt && (nt.terrain === 'water' || nt.terrain === 'forest' || nt.building?.category === 'park');
        });
        if (nearScenic && t.terrain === 'grass') candidateSpots.push(t);
      } else if (hobbyKind === 'kite' || hobbyKind === 'snowball_fight' || hobbyKind === 'snowman' || hobbyKind === 'sunbathing') {
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
          dirs.some((d) => {
            const nt = this.getTile(t.x + d.dx, t.y + d.dy);
            return nt && (nt.terrain === 'forest' || nt.building?.category === 'park' || nt.building?.category === 'residential');
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
      const p = findPedestrianPath(this.tiles, { x: h.x, y: h.y }, { x: target.x, y: target.y }, allowFrozen);
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
          const p2 = findPedestrianPath(this.tiles, { x: h.x, y: h.y }, { x: partnerTarget.x, y: partnerTarget.y });
          if (p2) {
            partnerOrigin = h;
            partnerPath = p2;
            break;
          }
        }
      }
    }

    const partnerId = partnerTarget && partnerOrigin && partnerPath ? `ppl_${this.personIdCounter++}` : undefined;

    this.people.push({
      id: primaryId,
      role: 'hobbyist',
      hobbyKind,
      wx: (originBuilding.x + 0.5) * TILE_SIZE,
      wy: (originBuilding.y + 0.78) * TILE_SIZE,
      targetWx: (target.x + 0.5) * TILE_SIZE + (Math.random() - 0.5) * 10,
      targetWy: (target.y + 0.5) * TILE_SIZE + (Math.random() - 0.5) * 8,
      speed: hobbyKind === 'ice_skating' ? 32 : 26,
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
        wx: (partnerOrigin.x + 0.5) * TILE_SIZE,
        wy: (partnerOrigin.y + 0.78) * TILE_SIZE,
        targetWx: (partnerTarget.x + 0.5) * TILE_SIZE,
        targetWy: (partnerTarget.y + 0.5) * TILE_SIZE,
        speed: 26,
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
          const path = findPedestrianPath(this.tiles, { x: home.x, y: home.y }, { x: stall.x, y: stall.y });
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
        const path = findPedestrianPath(this.tiles, { x: home.x, y: home.y }, { x: shop.x, y: shop.y });
        if (path) {
          const shirts = ['#EC4899', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#FB7185'];
          this.people.push({
            id: `ppl_${this.personIdCounter++}`,
            role: 'shopper',
            wx: (home.x + 0.5) * TILE_SIZE,
            wy: (home.y + 0.78) * TILE_SIZE,
            targetWx: (shop.x + 0.5) * TILE_SIZE + (Math.random() - 0.5) * 8,
            targetWy: (shop.y + 0.8) * TILE_SIZE,
            speed: 30,
            shirtColor: shirts[Math.floor(Math.random() * shirts.length)],
            animPhase: Math.random() * Math.PI * 2,
            state: 'walking',
            homeBuildingId: home.id,
            destBuildingId: shop.id,
            targetTileX: shop.x,
            targetTileY: shop.y,
            pedestrianPath: path,
            pedestrianPathIndex: path.length > 1 ? 1 : 0,
            holdTimer: 0,
          });
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

    for (const origin of shuffled.slice(0, 6)) {
      const destPool = buildings
        .filter((b) => b.id !== origin.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 6);

      for (const dest of destPool) {
        const path = findPedestrianPath(this.tiles, { x: origin.x, y: origin.y }, { x: dest.x, y: dest.y });
        if (path && path.length >= 2) {
          this.people.push({
            id: `ppl_${this.personIdCounter++}`,
            role: 'pedestrian',
            wx: (origin.x + 0.5) * TILE_SIZE,
            wy: (origin.y + 0.78) * TILE_SIZE,
            targetWx: (dest.x + 0.5) * TILE_SIZE,
            targetWy: (dest.y + 0.78) * TILE_SIZE,
            speed: 25,
            shirtColor: pedShirts[Math.floor(Math.random() * pedShirts.length)],
            animPhase: Math.random() * Math.PI * 2,
            state: 'walking',
            homeBuildingId: origin.id,
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
      const path = findPedestrianPath(this.tiles, startPt, { x: tile.x, y: tile.y });
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
      jail.totalVisits += count;
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

  private updateJailAndReleases(simDt: number) {
    if (this.prisonInmates <= 0) return;
    this.prisonReleaseAccumulator += simDt;
    if (this.prisonReleaseAccumulator < 30) return;
    this.prisonReleaseAccumulator = 0;

    this.prisonInmates = Math.max(0, this.prisonInmates - 1);
    this.totalReleased += 1;

    const jails = this.buildingsList.filter((b) => b.category === 'jail');
    if (jails.length === 0) return;
    const jail = jails[Math.floor(Math.random() * jails.length)];
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
      const path = findPedestrianPath(this.tiles, { x: jail.x, y: jail.y }, { x: dest.x, y: dest.y });
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
            if (!this.assignReturnRoute(p)) p.holdTimer = 0;
          }
        }
      }
    }

    // 2. Spawn Vendors setting up pop-up stalls in empty grass areas (paused during curfew)
    const maxStalls = curfew ? 0 : this.crises.povertyActive ? 7 : 5;
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

    // 3. Spawn Beggars logically from homes (disabled during curfew)
    const activeBeggars = this.people.filter((p) => p.role === 'beggar').length;
    const maxBeggars = curfew ? 0 : this.crises.povertyActive ? 5 : this.buildingsList.length >= 4 ? 1 : 0;
    if (activeBeggars < maxBeggars) {
      this.beggarSpawnAccumulator += simDt;
      if (this.beggarSpawnAccumulator >= (this.crises.povertyActive ? 5.0 : 18.0)) {
        this.beggarSpawnAccumulator = 0;
        this.spawnBeggar();
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
              crafts: '#D97706',
              contraband: '#312E81',
            };
            const produceFactor = Math.max(0.25, 1 - (this.crises.pollutionLevel / 100) * 0.75);
            const initialStock = isIllicit
              ? 8
              : goods === 'produce' || goods === 'fish'
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
        if (curfew && p.state !== 'returning') {
          p.speed = Math.max(p.speed, 38);
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
      const path = findPedestrianPath(this.tiles, startPt, { x: item.tile.x, y: item.tile.y });
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
      const path = findPedestrianPath(this.tiles, { x: home.x, y: home.y }, { x: stall.x, y: stall.y });
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
    const stations = this.buildingsList.filter((b) => b.category === 'police');
    if (stations.length === 0) return false;
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

    // Find closest road tile to the remote illicit stall
    let nearestRoad: GridPoint | null = null;
    let bestRoadDist = Infinity;
    for (const t of this.tiles) {
      if (!t.hasRoad) continue;
      const d = Math.hypot(t.x - stall.x, t.y - stall.y);
      if (d < bestRoadDist) {
        bestRoadDist = d;
        nearestRoad = { x: t.x, y: t.y };
      }
    }

    const sortedStations = [...stations].sort(
      (a, b) => Math.hypot(a.x - stall.x, a.y - stall.y) - Math.hypot(b.x - stall.x, b.y - stall.y)
    );

    if (nearestRoad) {
      for (const st of sortedStations) {
        const startRoad = findAdjacentRoadTile(this.tiles, st.x, st.y);
        if (!startRoad) continue;
        const path = findRoadPath(this.tiles, startRoad, nearestRoad, 0.8);
        if (!path || path.length < 2) continue;
        const pedCheck = findPedestrianPath(
          this.tiles,
          findNearestWalkableTile(this.tiles, nearestRoad.x, nearestRoad.y, 1) || nearestRoad,
          { x: stall.x, y: stall.y }
        );
        if (!pedCheck) continue;

        const p0 = path[0];
        const p1 = path[1];
        const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        const rightX = -Math.sin(angle) * LANE_OFFSET;
        const rightY = Math.cos(angle) * LANE_OFFSET;
        const carId = `car_${this.carIdCounter++}`;
        const cruiser: Car = {
          id: carId,
          type: 'police',
          color: '#1E293B',
          wx: (p0.x + 0.5) * TILE_SIZE + rightX,
          wy: (p0.y + 0.5) * TILE_SIZE + rightY,
          angle,
          speed: 45,
          maxSpeed: 96,
          path,
          pathIndex: 1,
          originBuildingId: st.id,
          destBuildingId: st.id,
          originCategory: 'police',
          destCategory: 'police',
          waitSeconds: 0,
          isBraking: false,
          isJammed: false,
          hornFlash: 0,
          sirenPhase: 0,
          targetRaidStallId: stall.id,
        };
        st.activeTripsOut += 1;
        this.cars.push(cruiser);
        stall.raidCarId = carId;
        return true;
      }
    }

    // Fallback: send raid officers directly on foot from nearest Police Station
    for (const st of sortedStations) {
      const path = findPedestrianPath(this.tiles, { x: st.x, y: st.y }, { x: stall.x, y: stall.y });
      if (!path) continue;
      for (let k = 0; k < 2; k++) {
        this.people.push({
          id: `ppl_${this.personIdCounter++}`,
          role: 'police',
          wx: (st.x + 0.5) * TILE_SIZE + (k === 0 ? -4 : 4),
          wy: (st.y + 0.78) * TILE_SIZE,
          targetWx: stall.wx,
          targetWy: stall.wy,
          targetTileX: stall.x,
          targetTileY: stall.y,
          pedestrianPath: [...path],
          pedestrianPathIndex: path.length > 1 ? 1 : 0,
          speed: 46,
          shirtColor: '#1D4ED8',
          hatColor: '#1E3A8A',
          animPhase: k * Math.PI,
          state: 'chasing',
          homeBuildingId: st.id,
          raidStallId: stall.id,
          holdTimer: 0,
        });
      }
      return true;
    }

    return false;
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
      const tx = Math.floor(car.wx / TILE_SIZE);
      const ty = Math.floor(car.wy / TILE_SIZE);
      const walkStart = findNearestWalkableTile(this.tiles, tx, ty, 1) || { x: tx, y: ty };
      const path = findPedestrianPath(this.tiles, walkStart, { x: stall.x, y: stall.y });
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
          speed: 48,
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
      car.parkedAtRaid = false;
      this.finishTrip(car);
      this.cars.splice(idx, 1);
    }
  }

  private spawnVendor() {
    const origins = this.buildingsList.filter(
      (b) => b.category === 'residential' || b.category === 'commercial' || b.category === 'park'
    );
    if (origins.length === 0) return;

    const shuffled = [...origins].sort(() => Math.random() - 0.5);
    for (const orig of shuffled.slice(0, 6)) {
      const spot = this.findOpenStallTile({ x: orig.x, y: orig.y });
      if (!spot) continue;
      const goodsPool: StallGoodsType[] = ['clothes', 'produce', 'crafts', 'fish'];
      const goods =
        orig.blueprintId === 'tackle_shop'
          ? 'fish'
          : orig.blueprintId === 'bakery' || orig.blueprintId === 'flower_shop'
          ? 'produce'
          : goodsPool[Math.floor(Math.random() * goodsPool.length)];
      const shirts = ['#D97706', '#0284C7', '#E11D48', '#16A34A'];
      this.people.push({
        id: `ppl_${this.personIdCounter++}`,
        role: 'vendor',
        stallGoods: goods,
        carryingItem: goods === 'fish' ? 'fish' : goods === 'clothes' ? 'clothes' : 'produce',
        wx: (orig.x + 0.5) * TILE_SIZE,
        wy: (orig.y + 0.78) * TILE_SIZE,
        targetWx: (spot.tile.x + 0.5) * TILE_SIZE,
        targetWy: (spot.tile.y + 0.45) * TILE_SIZE,
        speed: 25,
        shirtColor: shirts[Math.floor(Math.random() * shirts.length)],
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

  private spawnBeggar() {
    const homes = this.buildingsList.filter(
      (b) => b.category === 'residential' || b.category === 'park' || b.category === 'cemetery'
    );
    const hubs = this.buildingsList.filter(
      (b) => b.category === 'commercial' || b.category === 'visit_spot' || b.category === 'city_hall'
    );
    if (homes.length === 0 || hubs.length === 0) return;

    const dirs = [
      { dx: 0, dy: 1 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: -1 },
    ];
    const shuffledHomes = [...homes].sort(() => Math.random() - 0.5);
    const shuffledHubs = [...hubs].sort(() => Math.random() - 0.5);

    for (const home of shuffledHomes.slice(0, 5)) {
      for (const hub of shuffledHubs.slice(0, 5)) {
        for (const d of dirs) {
          const spot = this.getTile(hub.x + d.dx, hub.y + d.dy);
          if (!spot || spot.hasRoad || spot.terrain !== 'grass' || spot.building) continue;
          const path = findPedestrianPath(this.tiles, { x: home.x, y: home.y }, { x: spot.x, y: spot.y });
          if (path) {
            const coats = ['#57534E', '#64748B', '#78350F', '#4D7C0F'];
            this.people.push({
              id: `ppl_${this.personIdCounter++}`,
              role: 'beggar',
              wx: (home.x + 0.5) * TILE_SIZE,
              wy: (home.y + 0.78) * TILE_SIZE,
              targetWx: (spot.x + 0.5) * TILE_SIZE + (Math.random() - 0.5) * 8,
              targetWy: (spot.y + 0.65) * TILE_SIZE,
              speed: 19,
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
            return;
          }
        }
      }
    }
  }

  public triggerCrisis(type: CrisisType, active?: boolean, playAudio = true) {
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
    for (const t of this.tiles) {
      if (!isPedestrianTileWalkable(t)) continue;
      const nearWater =
        this.getTile(t.x + 1, t.y)?.terrain === 'water' ||
        this.getTile(t.x - 1, t.y)?.terrain === 'water' ||
        this.getTile(t.x, t.y + 1)?.terrain === 'water' ||
        this.getTile(t.x, t.y - 1)?.terrain === 'water';
      if (nearWater || t.hasRoad) dirtyTargets.push(t);
    }
    if (dirtyTargets.length === 0) return;

    for (let k = 0; k < count; k++) {
      const origin = originPool[k % originPool.length];
      const shuffled = [...dirtyTargets].sort(() => Math.random() - 0.5);
      for (const spot of shuffled.slice(0, 8)) {
        const path = findPedestrianPath(this.tiles, { x: origin.x, y: origin.y }, { x: spot.x, y: spot.y });
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
      const path = findPedestrianPath(this.tiles, { x: origin.x, y: origin.y }, { x: crater.x, y: crater.y });
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

  public spawnInvadingArmy(count = 3) {
    const targets = this.buildingsList.filter((b) => b.category !== 'road_path');
    if (targets.length === 0) return;
    const cityHalls = targets.filter((b) => b.category === 'city_hall');

    // Invading armies enter from walkable perimeter edges of the map
    const borderEntries: MapTile[] = [];
    for (const t of this.tiles) {
      const onEdge = t.x === 0 || t.y === 0 || t.x === GRID_COLS - 1 || t.y === GRID_ROWS - 1;
      if (onEdge && isPedestrianTileWalkable(t)) {
        borderEntries.push(t);
      }
    }
    if (borderEntries.length === 0) return;

    for (let k = 0; k < count; k++) {
      const entry = borderEntries[Math.floor(Math.random() * borderEntries.length)];
      const dest =
        cityHalls.length > 0 && (this.mayorAlive ? Math.random() < 0.65 : Math.random() < 0.4)
          ? cityHalls[0]
          : targets[Math.floor(Math.random() * targets.length)];
      const path = findPedestrianPath(this.tiles, { x: entry.x, y: entry.y }, { x: dest.x, y: dest.y });
      if (!path) continue;
      this.people.push({
        id: `ppl_${this.personIdCounter++}`,
        role: 'invader',
        wx: (entry.x + 0.5) * TILE_SIZE,
        wy: (entry.y + 0.5) * TILE_SIZE,
        targetWx: (dest.x + 0.5) * TILE_SIZE,
        targetWy: (dest.y + 0.78) * TILE_SIZE,
        speed: 31,
        shirtColor: '#991B1B',
        hatColor: '#450A0A',
        animPhase: Math.random() * Math.PI * 2,
        state: 'invading',
        shootCooldown: 2.0 + Math.random() * 2.5,
        destBuildingId: dest.id,
        targetTileX: dest.x,
        targetTileY: dest.y,
        pedestrianPath: path,
        pedestrianPathIndex: path.length > 1 ? 1 : 0,
        holdTimer: 0,
      });
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
    this.spawnInvadingArmy(3);
    if (playAudio) soundEngine.playCrisisAlert();
    return true;
  }

  public triggerNukeStrike(targetX?: number, targetY?: number, playAudio = true): boolean {
    if (this.chaosCooldowns.nuke > 0) return false;
    this.chaosCooldowns.nuke = this.CHAOS_COOLDOWN_SECONDS;

    let tx = targetX;
    let ty = targetY;

    if (tx === undefined || ty === undefined) {
      const houses = this.buildingsList.filter((b) => b.category === 'residential');
      const nonHallBuildings = this.buildingsList.filter(
        (b) => b.category !== 'city_hall' && b.category !== 'road_path'
      );
      const pool = houses.length > 0 ? houses : nonHallBuildings;
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        tx = pick.x;
        ty = pick.y;
      } else {
        tx = Math.floor(GRID_COLS / 2);
        ty = Math.floor(GRID_ROWS / 2);
      }
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

    // Destroy houses (and core buildings except City Hall) & leave road-blocking craters across blast radius
    const destroyedBuildingIds = new Set<string>();
    const casualtyBuildings: PlacedBuilding[] = [];

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const distSq = dx * dx + dy * dy;
        if (distSq > 5) continue;
        const t = this.getTile(tx + dx, ty + dy);
        if (!t || t.terrain === 'water') continue;
        if (t.building?.category === 'city_hall') continue;

        if (t.terrain === 'forest') {
          t.terrain = 'grass';
        }

        // Destroy houses in blast radius (and other non-essential buildings at ground zero)
        if (
          t.building &&
          (t.building.category === 'residential' ||
            (distSq <= 2 &&
              t.building.category !== 'hospital' &&
              t.building.category !== 'police' &&
              t.building.category !== 'fire_station'))
        ) {
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

        // Place scorched craters (including right on roads so traffic gets blocked and jammed)
        if (!this.blastCraters.some((c) => c.x === t.x && c.y === t.y) && this.blastCraters.length < 18) {
          this.blastCraters.push({
            id: `crater_${this.craterIdCounter++}`,
            x: t.x,
            y: t.y,
            wx: (t.x + 0.5) * TILE_SIZE,
            wy: (t.y + 0.5) * TILE_SIZE,
            radius: 9 + Math.random() * 5,
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
      this.rebuildCaches();
    }

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

    // Casualties at destroyed houses / nearby buildings (dramatic, balanced)
    const nearbyHomes =
      casualtyBuildings.length > 0
        ? casualtyBuildings
        : this.buildingsList
            .filter((b) => b.category === 'residential' || b.category === 'workplace' || b.category === 'commercial')
            .sort((a, b) => Math.hypot(a.x - tx!, a.y - ty!) - Math.hypot(b.x - tx!, b.y - ty!));
    for (const victimBld of nearbyHomes.slice(0, 3)) {
      this.spawnDeathEvent(victimBld, false);
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
      this.weather = 'Clear';
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
      this.season === 'Winter' ? ['Clear', 'Snow', 'Storm'] : ['Clear', 'Rain', 'Storm'];
    const idx = options.indexOf(this.weather);
    this.weather = options[(idx + 1) % options.length];
    this.weatherTimer = 85;
    this.weatherParticles = [];
    if (playAudio) soundEngine.playUiTick();
  }

  private rollWeatherForSeason(): WeatherType {
    const r = Math.random();
    if (this.season === 'Winter') {
      if (r < 0.42) return 'Clear';
      if (r < 0.9) return 'Snow';
      return 'Storm';
    }
    if (this.season === 'Spring') {
      if (r < 0.52) return 'Clear';
      if (r < 0.86) return 'Rain';
      return 'Storm';
    }
    if (this.season === 'Summer') {
      if (r < 0.66) return 'Clear';
      if (r < 0.86) return 'Rain';
      return 'Storm';
    }
    // Autumn
    if (r < 0.46) return 'Clear';
    if (r < 0.82) return 'Rain';
    return 'Storm';
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

    const mapW = GRID_COLS * TILE_SIZE;
    const mapH = GRID_ROWS * TILE_SIZE;
    const targetCount =
      this.weather === 'Storm'
        ? 145
        : this.weather === 'Rain'
        ? 95
        : this.weather === 'Snow'
        ? 95
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
      if (this.weather === 'Snow' || this.weather === 'Clear') {
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

  private updateEconomy(simDt: number, realDt: number) {
    this.lawsuitShock = Math.max(0, this.lawsuitShock - simDt * 0.25);

    let businesses = 0;
    let workplaces = 0;
    let factories = 0;
    for (const b of this.buildingsList) {
      if (b.category === 'commercial' || b.category === 'visit_spot' || b.category === 'landmark') {
        businesses++;
      } else if (b.category === 'workplace') {
        workplaces++;
      } else if (b.category === 'factory') {
        factories++;
      }
    }

    let totalSpeedRatio = 0;
    let jammedCars = 0;
    for (const c of this.cars) {
      if (c.isJammed) jammedCars++;
      totalSpeedRatio += c.speed / c.maxSpeed;
    }
    const flowPct = this.cars.length === 0 ? 100 : (totalSpeedRatio / this.cars.length) * 100;

    const cleanFishStalls = this.marketStalls.filter((s) => !s.isContaminated).length;
    const taintedStalls = this.marketStalls.filter((s) => s.isContaminated).length;

    const businessBoost = Math.min(28, businesses * 2.5 + workplaces * 3.0 + factories * 4.5);
    const stallBoost = Math.min(10, cleanFishStalls * 2.0);
    const trafficBonus = flowPct >= 75 ? 8 : flowPct >= 55 ? 3 : 0;
    const cleanWaterBonus = this.crises.pollutionLevel < 20 ? 4 : 0;

    const povertyDrag = this.crises.povertyActive ? 24 : 0;
    const virusDrag = this.crises.virusActive ? 16 : 0;
    const warDrag = this.crises.warActive ? 18 : 0;
    const pollutionDrag = this.crises.pollutionLevel * 0.28;
    const taintedFishDrag = taintedStalls * 4.5;
    const jamDrag =
      (flowPct < 55 ? Math.min(10, (55 - flowPct) * 0.25) : 0) + Math.min(6, jammedCars * 0.6);
    const craterDrag = Math.min(12, this.blastCraters.length * 2.0);
    const incidentDrag =
      Math.min(8, this.fires.filter((f) => f.status === 'active').length * 3.5) +
      Math.min(6, this.robberies.filter((r) => r.status === 'active').length * 3);

    const rawTarget =
      52 +
      businessBoost +
      stallBoost +
      trafficBonus +
      cleanWaterBonus -
      povertyDrag -
      virusDrag -
      warDrag -
      pollutionDrag -
      taintedFishDrag -
      this.lawsuitShock -
      jamDrag -
      craterDrag -
      incidentDrag;

    const target = Math.max(5, Math.min(100, rawTarget));
    this.economyScore += (target - this.economyScore) * Math.min(1, realDt * 0.75);
  }

  private updateCitizenHappiness(realDt: number) {
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
    const economyPenalty = this.economyScore < 50 ? Math.min(14, (50 - this.economyScore) * 0.35) : 0;
    const economyBoost = this.economyScore >= 80 ? 3 : 0;
    const incidentPenalty =
      Math.min(12, activeFires * 6) +
      Math.min(10, activeRobberies * 5) +
      Math.min(8, activeProtests * 4);

    const weatherDelta =
      this.weather === 'Storm'
        ? -4
        : this.weather === 'Clear' && (this.season === 'Spring' || this.season === 'Summer')
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
      economyBoost +
      weatherDelta -
      trafficPenalty -
      virusPenalty -
      warPenalty -
      povertyPenalty -
      pollutionPenalty -
      craterPenalty -
      lawsuitPenalty -
      economyPenalty -
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
    if (economyPenalty >= 3) notes.push(`Economy -${Math.round(economyPenalty)}`);
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
      const path = findPedestrianPath(this.tiles, { x: base.x, y: base.y }, destPt);
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

    // 1. Ambient & Active Pollution + Mayor Cleanup Crews (includes Factories!)
    const workplaces = this.buildingsList.filter((b) => b.category === 'workplace').length;
    const factories = this.buildingsList.filter((b) => b.category === 'factory').length;
    const jammedCarsCount = this.cars.filter((c) => c.isJammed).length;
    this.pollutionTickAccumulator += simDt;
    if (this.pollutionTickAccumulator >= 2.0) {
      this.pollutionTickAccumulator = 0;
      const emission =
        (this.crises.pollutionActive ? 1.15 : 0) +
        workplaces * 0.06 +
        factories * 0.22 +
        jammedCarsCount * 0.04;
      if (emission > 0) {
        const cap = this.crises.pollutionActive ? 100 : factories > 0 ? 44 : 28;
        this.crises.pollutionLevel = Math.min(cap, this.crises.pollutionLevel + emission);
      } else if (!this.crises.pollutionActive && this.crises.pollutionLevel > 0) {
        this.crises.pollutionLevel = Math.max(0, this.crises.pollutionLevel - 0.35);
      }
    }

    if (this.crises.pollutionActive) {
      this.crises.pollutionRemaining = Math.max(0, this.crises.pollutionRemaining - simDt);
      if (this.crises.pollutionRemaining <= 0) {
        this.crises.pollutionActive = false;
      }
    }

    // Mayor dispatches cleaners when pollution >= 18
    const activeCleaners = this.people.filter((p) => p.role === 'cleaner').length;
    if ((this.crises.pollutionActive || this.crises.pollutionLevel >= 18) && activeCleaners < 3) {
      if (Math.random() < realDt * 0.45) {
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
            this.crises.pollutionLevel = Math.max(0, this.crises.pollutionLevel - 9);
            if (this.crises.pollutionLevel <= 4) {
              this.crises.pollutionActive = false;
              this.crises.pollutionRemaining = 0;
            }
            this.floatingLabels.push({
              wx: p.wx,
              wy: p.wy - 10,
              text: '+Cleaned!',
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
            // Untreated citizens may succumb if no hospital/medic reaches them in time
            if (Math.random() < 0.25 && this.buildingsList.length > 0) {
              const nearestHome =
                this.buildingsList.find((b) => b.id === p.homeBuildingId) || this.buildingsList[0];
              this.spawnDeathEvent(nearestHome, playAudio);
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
        if (this.invasionTickAccumulator >= 14) {
          this.invasionTickAccumulator = 0;
          if (activeInvaders.length < 6) {
            this.spawnInvadingArmy(2);
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

    // Step defenders & invaders + skirmish combat & shootings
    if (this.crises.warActive || activeInvaders.length > 0 || activeDefenders.length > 0) {
      for (let i = this.people.length - 1; i >= 0; i--) {
        const p = this.people[i];
        if (p.role === 'soldier') {
          const foeIdx = this.people.findIndex(
            (f) => f.role === 'invader' && Math.hypot(f.wx - p.wx, f.wy - p.wy) < 16
          );
          if (foeIdx !== -1) {
            const foe = this.people[foeIdx];
            this.gunfireTracers.push({
              x1: p.wx,
              y1: p.wy - 4,
              x2: foe.wx,
              y2: foe.wy - 4,
              age: 0,
              maxAge: 0.22,
              color: '#38BDF8',
            });
            this.floatingLabels.push({
              wx: foe.wx,
              wy: foe.wy - 10,
              text: 'Repelled!',
              color: '#F8FAFC',
              bgColor: '#1D4ED8',
              age: 0,
              maxAge: 1.3,
            });
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
            this.people.splice(foeIdx, 1);
            if (foeIdx < i) i -= 1;
            continue;
          }
          const res = this.stepPersonAlongPath(p, realDt, 9.5);
          if (res !== 'moving') {
            if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
          }
        } else if (p.role === 'invader') {
          p.shootCooldown = Math.max(0, (p.shootCooldown || 0) - simDt);

          if (p.shootCooldown <= 0) {
            // Check if Mayor is in range first
            const mayorIdx = this.mayorAlive
              ? this.people.findIndex(
                  (m) => m.role === 'mayor' && Math.hypot(m.wx - p.wx, m.wy - p.wy) < 82
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
                maxAge: 0.28,
                color: '#EF4444',
              });
              for (let s = 0; s < 5; s++) {
                this.smokeParticles.push({
                  wx: mayor.wx + (Math.random() - 0.5) * 6,
                  wy: mayor.wy - 4,
                  vx: (Math.random() - 0.5) * 14,
                  vy: -12 - Math.random() * 8,
                  age: 0,
                  maxAge: 0.7,
                  size: 3,
                  color: 'rgba(239, 68, 68, 0.75)',
                });
              }
              this.mayorAlive = false;
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
              p.shootCooldown = 4.5 + Math.random() * 3.0;
              if (playAudio) soundEngine.playDeathChime();
            } else {
              // Shoot nearby citizens in range
              const victimIdx = this.people.findIndex(
                (v) =>
                  v.role !== 'invader' &&
                  v.role !== 'mayor' &&
                  Math.hypot(v.wx - p.wx, v.wy - p.wy) < 72
              );
              if (victimIdx !== -1) {
                const victim = this.people[victimIdx];
                this.gunfireTracers.push({
                  x1: p.wx,
                  y1: p.wy - 4,
                  x2: victim.wx,
                  y2: victim.wy - 4,
                  age: 0,
                  maxAge: 0.24,
                  color: '#EF4444',
                });
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
                const bldOrigin =
                  this.buildingsList.find((b) => b.id === victim.homeBuildingId) ||
                  this.buildingsList[0];
                if (bldOrigin) {
                  this.spawnDeathEvent(bldOrigin, playAudio);
                }
                this.people.splice(victimIdx, 1);
                if (victimIdx < i) i -= 1;
                p.shootCooldown = 5.5 + Math.random() * 4.0;
              }
            }
          }

          const res = this.stepPersonAlongPath(p, realDt, 8.5);
          if (res === 'arrived') {
            // Invader reaches building (e.g. City Hall): small fire or target next building
            if (
              p.targetTileX !== undefined &&
              p.targetTileY !== undefined &&
              Math.random() < 0.45 &&
              this.fires.filter((f) => f.status === 'active').length < 3
            ) {
              this.startFireAt(p.targetTileX, p.targetTileY, false, playAudio);
            }
            if (!this.assignReturnRoute(p)) this.people.splice(i, 1);
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
          this.citizenHappiness = Math.min(100, this.citizenHappiness + 8);
          this.economyScore = Math.min(100, this.economyScore + 5);
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
      const path = findPedestrianPath(this.tiles, { x: orig.x, y: orig.y }, { x: hall.x, y: hall.y });
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
        path: findPedestrianPath(this.tiles, { x: b.x, y: b.y }, { x: hall!.x, y: hall!.y }),
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
    const stations = this.buildingsList.filter((b) => b.category === 'police');
    if (stations.length === 0) return false;

    const destRoad = findAdjacentRoadTile(this.tiles, incident.x, incident.y);
    if (!destRoad) return false;

    let bestStation: PlacedBuilding | null = null;
    let bestPath: { x: number; y: number }[] | null = null;

    const sortedStations = [...stations].sort(
      (a, b) =>
        Math.hypot(a.x - incident.x, a.y - incident.y) -
        Math.hypot(b.x - incident.x, b.y - incident.y)
    );

    for (const st of sortedStations) {
      const startRoad = findAdjacentRoadTile(this.tiles, st.x, st.y);
      if (!startRoad) continue;
      const path = findRoadPath(this.tiles, startRoad, destRoad, 0.8);
      if (path && path.length >= 2) {
        bestStation = st;
        bestPath = path;
        break;
      }
    }

    if (!bestStation || !bestPath) return false;

    const p0 = bestPath[0];
    const p1 = bestPath[1];
    const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const rightX = -Math.sin(angle) * LANE_OFFSET;
    const rightY = Math.cos(angle) * LANE_OFFSET;

    const carId = `car_${this.carIdCounter++}`;
    const cruiser: Car = {
      id: carId,
      type: 'police',
      color: '#1E293B',
      wx: (p0.x + 0.5) * TILE_SIZE + rightX,
      wy: (p0.y + 0.5) * TILE_SIZE + rightY,
      angle,
      speed: 45,
      maxSpeed: 94,
      path: bestPath,
      pathIndex: 1,
      originBuildingId: bestStation.id,
      destBuildingId: incident.cityHallId,
      originCategory: 'police',
      destCategory: 'city_hall',
      waitSeconds: 0,
      isBraking: false,
      isJammed: false,
      hornFlash: 0,
      sirenPhase: 0,
      targetProtestId: incident.id,
    };

    bestStation.activeTripsOut += 1;
    this.cars.push(cruiser);
    incident.policeDispatched = true;
    incident.policeCarId = carId;
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
      car.parkedAtProtest = false;
      this.finishTrip(car);
      this.cars.splice(idx, 1);
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
        path: findPedestrianPath(this.tiles, { x: b.x, y: b.y }, { x: venue!.x, y: venue!.y }),
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
      const path = findPedestrianPath(this.tiles, startPt, { x: pick.x, y: pick.y });
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
      const candidate = findPedestrianPath(this.tiles, { x: h.x, y: h.y }, { x: targetX, y: targetY });
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

  private startFireAt(x: number, y: number, byArsonist: boolean, playAudio: boolean): FireIncident | null {
    const tile = this.getTile(x, y);
    if (!tile || tile.terrain === 'water' || tile.hasRoad) return null;
    if (this.fires.some((f) => f.x === x && f.y === y && f.status === 'active')) return null;

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
      const path = findPedestrianPath(this.tiles, startPt, { x: fire.x, y: fire.y });
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

    const destRoad = findAdjacentRoadTile(this.tiles, fire.x, fire.y);
    if (!destRoad) return false;

    let bestStation: PlacedBuilding | null = null;
    let bestPath: { x: number; y: number }[] | null = null;

    const sorted = [...stations].sort(
      (a, b) => Math.hypot(a.x - fire.x, a.y - fire.y) - Math.hypot(b.x - fire.x, b.y - fire.y)
    );

    for (const st of sorted) {
      const startRoad = findAdjacentRoadTile(this.tiles, st.x, st.y);
      if (!startRoad) continue;
      const path = findRoadPath(this.tiles, startRoad, destRoad, 0.8);
      if (path && path.length >= 2) {
        bestStation = st;
        bestPath = path;
        break;
      }
    }

    if (!bestStation || !bestPath) return false;

    const p0 = bestPath[0];
    const p1 = bestPath[1];
    const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const rightX = -Math.sin(angle) * LANE_OFFSET;
    const rightY = Math.cos(angle) * LANE_OFFSET;

    const carId = `car_${this.carIdCounter++}`;
    const truck: Car = {
      id: carId,
      type: 'firetruck',
      color: '#DC2626',
      wx: (p0.x + 0.5) * TILE_SIZE + rightX,
      wy: (p0.y + 0.5) * TILE_SIZE + rightY,
      angle,
      speed: 78,
      maxSpeed: 145,
      path: bestPath,
      pathIndex: 1,
      originBuildingId: bestStation.id,
      destBuildingId: fire.buildingId || bestStation.id,
      originCategory: 'fire_station',
      destCategory: 'residential',
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
        : findPedestrianPath(
            this.tiles,
            findNearestWalkableTile(this.tiles, truckTx, truckTy, 1) || { x: truckTx, y: truckTy },
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
      car.parkedAtFire = false;
      this.finishTrip(car);
      this.cars.splice(idx, 1);
    }
  }

  private updateCarCrashes(simDt: number, realDt: number, playAudio: boolean) {
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

    const activeCount = this.crashes.filter((c) => c.status === 'active').length;
    if (activeCount >= 1 || this.cars.length < 4) return;

    this.crashCheckAccumulator += simDt;
    if (this.crashCheckAccumulator < 44) return;

    // Look for two civilian cars in a tight near-collision (crossing intersection or fast rear-end)
    let bestPair: [number, number] | null = null;
    let bestDist = Infinity;

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
      if (a.speed < 14) continue;

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
        if (b.speed < 10) continue;

        const d = Math.hypot(a.wx - b.wx, a.wy - b.wy);
        if (d > 19) continue;

        const midWx = (a.wx + b.wx) * 0.5;
        const midWy = (a.wy + b.wy) * 0.5;
        const tx = Math.floor(midWx / TILE_SIZE);
        const ty = Math.floor(midWy / TILE_SIZE);
        const tile = this.getTile(tx, ty);
        if (!tile || !tile.hasRoad) continue;
        if (this.crashes.some((c) => Math.abs(c.x - tx) <= 1 && Math.abs(c.y - ty) <= 1)) continue;

        const headingDot = Math.cos(a.angle - b.angle);
        const atIntersection = isIntersectionTile(this.tiles, tx, ty);
        const unsignaled = atIntersection && tile.intersection.controlType !== 'signal';
        const isCrossing = headingDot < 0.45;
        const isFastClose = d < 16 && (a.speed > 26 || b.speed > 26);

        if ((isCrossing || unsignaled || isFastClose) && d < bestDist) {
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
        tile && isIntersectionTile(this.tiles, tx, ty) && tile.intersection.controlType !== 'signal';
      const chance = unsignaled ? 0.42 : 0.22;
      if (Math.random() < chance) {
        this.triggerCarCrash(idxA, idxB, playAudio);
      }
    }
  }

  private triggerCarCrash(idxA: number, idxB: number, playAudio: boolean): CrashIncident | null {
    const firstIdx = Math.max(idxA, idxB);
    const secondIdx = Math.min(idxA, idxB);
    const carA = this.cars[firstIdx];
    const carB = this.cars[secondIdx];
    if (!carA || !carB) return null;

    const wx = (carA.wx + carB.wx) * 0.5;
    const wy = (carA.wy + carB.wy) * 0.5;
    const tx = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(wx / TILE_SIZE)));
    const ty = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(wy / TILE_SIZE)));

    // Decrement active trip counters cleanly for the two crashed cars
    for (const crashedCar of [carA, carB]) {
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

    const serious = Math.random() < 0.25;
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
    const category: BuildingCategory = vehicleType === 'ambulance' ? 'hospital' : 'police';
    const stations = this.buildingsList.filter((b) => b.category === category);
    if (stations.length === 0) return false;

    const destRoad = { x: crash.x, y: crash.y };
    if (!this.getTile(destRoad.x, destRoad.y)?.hasRoad) return false;

    const sorted = [...stations].sort(
      (a, b) => Math.hypot(a.x - crash.x, a.y - crash.y) - Math.hypot(b.x - crash.x, b.y - crash.y)
    );

    for (const st of sorted) {
      const startRoad = findAdjacentRoadTile(this.tiles, st.x, st.y);
      if (!startRoad) continue;
      const path = findRoadPath(this.tiles, startRoad, destRoad, 0.8);
      if (!path || path.length < 2) continue;

      const p0 = path[0];
      const p1 = path[1];
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const rightX = -Math.sin(angle) * LANE_OFFSET;
      const rightY = Math.cos(angle) * LANE_OFFSET;

      const carId = `car_${this.carIdCounter++}`;
      const responder: Car = {
        id: carId,
        type: vehicleType,
        color: vehicleType === 'ambulance' ? '#F8FAFC' : '#1E3A8A',
        wx: (p0.x + 0.5) * TILE_SIZE + rightX,
        wy: (p0.y + 0.5) * TILE_SIZE + rightY,
        angle,
        speed: 45,
        maxSpeed: 94,
        path,
        pathIndex: 1,
        originBuildingId: st.id,
        destBuildingId: st.id,
        originCategory: category,
        destCategory: category,
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
      if (vehicleType === 'ambulance') crash.ambulanceDispatched = true;
      else crash.policeDispatched = true;
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
        car.parkedAtCrash = false;
        this.finishTrip(car);
        this.cars.splice(idx, 1);
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
        b.totalVisits += 1;
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
      const path = findPedestrianPath(this.tiles, { x: orig.x, y: orig.y }, { x: dest.x, y: dest.y });
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
      if (b.category === 'residential') population += b.capacity;
      else population += Math.round(b.capacity * 0.2);
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
      minutesOfDay: this.minutesOfDay,
      formattedTime,
      timePhase: this.getTimePhase(),
      rushPeriodLabel: this.getRushPeriodLabel(),
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
      economyScore: Math.round(this.economyScore),
      totalLawsuits: this.totalLawsuits,
      hasCityHall: this.hasCityHall(),
      prisonInmates: this.prisonInmates,
      totalJailed: this.totalJailed,
      totalReleased: this.totalReleased,
      mayorAlive: this.mayorAlive,
      electionActive: this.electionActive,
      electionRemaining: Math.ceil(this.electionRemaining),
      brokenBridgesCount: this.brokenBridges.filter((b) => b.status === 'broken').length,
      season: this.season,
      weather: this.weather,
      chaosCooldowns: {
        virus: Math.ceil(this.chaosCooldowns.virus),
        war: Math.ceil(this.chaosCooldowns.war),
        poverty: Math.ceil(this.chaosCooldowns.poverty),
        pollution: Math.ceil(this.chaosCooldowns.pollution),
        invade: Math.ceil(this.chaosCooldowns.invade),
        nuke: Math.ceil(this.chaosCooldowns.nuke),
      },
    };
  }
}
