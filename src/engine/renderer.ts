import { WINDOW_GLOW_COLORS } from '../data/defaultBlueprints';
import {
  BuildingBlueprint,
  Car,
  ICON_SIZE,
  MapTile,
  Person,
  SeasonType,
  SelectionTarget,
  TILE_SIZE,
  ToolMode,
} from '../types/game';
import { getEffectiveRoadMask, isHighwayTile, isIntersectionTile } from './pathfinding';
import { CitySimulation } from './simulation';

export interface CameraState {
  x: number; // world center x
  y: number; // world center y
  zoom: number;
}

export interface HoverState {
  tileX: number;
  tileY: number;
  visible: boolean;
  worldX?: number;
  worldY?: number;
}

export interface RenderOptions {
  camera: CameraState;
  hover: HoverState;
  selection: SelectionTarget | null;
  selectedCarId?: string | null;
  toolMode: ToolMode;
  activeBlueprint: BuildingBlueprint | null;
  showTrafficOverlay: boolean;
  showGrid: boolean;
  wallTimeSeconds: number;
}

interface CachedIcon {
  dayCanvas: HTMLCanvasElement;
  glowCanvas: HTMLCanvasElement;
  hasGlow: boolean;
}

const iconCache = new Map<string, CachedIcon>();

function getOrCreateIconCanvas(iconGrid: string[]): CachedIcon {
  const key = iconGrid.join(',');
  const existing = iconCache.get(key);
  if (existing) return existing;

  // Prevent unbounded cache growth while painting
  if (iconCache.size > 300) {
    iconCache.clear();
  }

  const dayCanvas = document.createElement('canvas');
  dayCanvas.width = ICON_SIZE;
  dayCanvas.height = ICON_SIZE;
  const dCtx = dayCanvas.getContext('2d')!;

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = ICON_SIZE;
  glowCanvas.height = ICON_SIZE;
  const gCtx = glowCanvas.getContext('2d')!;

  let hasGlow = false;

  for (let py = 0; py < ICON_SIZE; py++) {
    for (let px = 0; px < ICON_SIZE; px++) {
      const color = iconGrid[py * ICON_SIZE + px];
      if (!color) continue;
      dCtx.fillStyle = color;
      dCtx.fillRect(px, py, 1, 1);

      if (WINDOW_GLOW_COLORS.has(color.toUpperCase())) {
        gCtx.fillStyle = color;
        gCtx.fillRect(px, py, 1, 1);
        hasGlow = true;
      }
    }
  }

  const entry = { dayCanvas, glowCanvas, hasGlow };
  iconCache.set(key, entry);
  return entry;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Returns nightFactor (0 = bright noon, 1 = midnight) and goldenFactor (0..1 sunrise/sunset warmth)
 */
export function getDaylightFactors(minutesOfDay: number): {
  nightFactor: number;
  goldenFactor: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
} {
  const h = minutesOfDay / 60;

  // Dawn: 5.0 -> 7.5 fades night 1 -> 0
  // Dusk: 17.0 -> 19.8 fades night 0 -> 1
  let nightFactor = 0;
  if (h < 5.0 || h >= 19.8) {
    nightFactor = 1;
  } else if (h >= 5.0 && h < 7.5) {
    nightFactor = 1 - smoothstep(5.0, 7.5, h);
  } else if (h >= 17.0 && h < 19.8) {
    nightFactor = smoothstep(17.0, 19.8, h);
  }

  // Golden hour warmth peaks around 6.3 and 18.0
  const dawnPeak = Math.exp(-Math.pow((h - 6.3) / 0.85, 2));
  const duskPeak = Math.exp(-Math.pow((h - 18.1) / 0.95, 2));
  const goldenFactor = clamp01(Math.max(dawnPeak, duskPeak));

  // Sun travels East -> West: shadows point West in morning, East in afternoon
  const dayProgress = clamp01((h - 6) / 12); // 0 at 6am, 1 at 6pm
  const shadowOffsetX = (dayProgress - 0.5) * 8;
  const shadowOffsetY = 3.5 + (1 - Math.sin(dayProgress * Math.PI)) * 3;

  return { nightFactor, goldenFactor, shadowOffsetX, shadowOffsetY };
}

export function renderSimulation(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sim: CitySimulation,
  opts: RenderOptions
) {
  const { camera, hover, selection, selectedCarId, toolMode, activeBlueprint, showTrafficOverlay, showGrid, wallTimeSeconds } = opts;
  const { nightFactor, goldenFactor, shadowOffsetX, shadowOffsetY } = getDaylightFactors(sim.minutesOfDay);

  // Outer horizon backdrop (cheerful sky-teal by day, starry deep blue by night)
  const backdropColor = nightFactor > 0.55 ? '#0B162C' : nightFactor > 0.2 ? '#1A3A5C' : '#1E5B7A';
  ctx.fillStyle = backdropColor;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  const shakeAmt = sim.earthquakeShakeIntensity > 0 ? sim.earthquakeShakeIntensity : 0;
  const shakeX = shakeAmt > 0 ? Math.sin(wallTimeSeconds * 54) * 5.5 * shakeAmt : 0;
  const shakeY = shakeAmt > 0 ? Math.cos(wallTimeSeconds * 43) * 4.5 * shakeAmt : 0;
  ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  // Compute visible tile bounds for culling
  const halfW = width / (2 * camera.zoom);
  const halfH = height / (2 * camera.zoom);
  const minX = Math.max(0, Math.floor((camera.x - halfW) / TILE_SIZE) - 1);
  const maxX = Math.min(sim.gridCols - 1, Math.ceil((camera.x + halfW) / TILE_SIZE) + 1);
  const minY = Math.max(0, Math.floor((camera.y - halfH) / TILE_SIZE) - 1);
  const maxY = Math.min(sim.gridRows - 1, Math.ceil((camera.y + halfH) / TILE_SIZE) + 1);
  const isWindy = sim.weather === 'Windy';

  // 1. Render Base Terrain Tiles
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const tile = sim.tiles[y * sim.gridCols + x];
      const wx = x * TILE_SIZE;
      const wy = y * TILE_SIZE;

      if (tile.terrain === 'void') {
        ctx.fillStyle = backdropColor;
        ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
        if (toolMode === 'land' && sim.canPlaceExpansionLandAt(x, y)) {
          ctx.save();
          ctx.fillStyle = 'rgba(52, 211, 153, 0.14)';
          ctx.fillRect(wx + 2, wy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(wx + 2, wy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.restore();
        }
        continue;
      }

      if (tile.terrain === 'water') {
        drawWaterTile(ctx, sim, tile, wx, wy, wallTimeSeconds);
        if (tile.hasFootbridge) {
          drawFootbridgeTile(ctx, sim, tile);
        }
      } else if (tile.terrain === 'sand') {
        const alt = (x + y) % 2 === 0;
        ctx.fillStyle =
          sim.season === 'Winter'
            ? alt
              ? '#E2E0D4'
              : '#D6D4C8'
            : alt
            ? '#EED6A4'
            : '#E5CA94';
        ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
        if (!tile.hasRoad && !tile.building) {
          const hash = ((x * 59 + y * 107) ^ (x * y * 19)) >>> 0;
          ctx.fillStyle = 'rgba(180, 132, 68, 0.36)';
          ctx.fillRect(wx + 10 + (hash % 24), wy + 12 + ((hash >> 3) % 22), 2.2, 1.8);
          ctx.fillRect(wx + 26 - (hash % 12), wy + 30 - ((hash >> 5) % 10), 1.8, 1.8);
          if (hash % 4 === 0) {
            ctx.fillStyle = 'rgba(255, 251, 235, 0.72)';
            ctx.beginPath();
            ctx.arc(wx + 18 + (hash % 14), wy + 22 + ((hash >> 4) % 12), 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        // Seasonal meadow ground checkerboard
        const alt = (x + y) % 2 === 0;
        ctx.fillStyle =
          sim.season === 'Winter'
            ? alt
              ? '#DCEAF7'
              : '#CEE0F2'
            : sim.season === 'Autumn'
            ? alt
              ? '#A3A852'
              : '#959B47'
            : sim.season === 'Summer'
            ? alt
              ? '#78C258'
              : '#6CB64F'
            : alt
            ? '#6DC067'
            : '#63B65E';
        ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);

        if (!tile.hasRoad && !tile.building && tile.terrain === 'grass') {
          drawGrassDetails(ctx, wx, wy, x, y, wallTimeSeconds, sim.season, isWindy);
        }

        if (tile.terrain === 'forest') {
          drawForestTile(ctx, wx, wy, x, y, shadowOffsetX, shadowOffsetY, sim.season, wallTimeSeconds, isWindy);
        }
      }

      if (tile.isFlooded && tile.terrain !== 'water') {
        const waveShift = Math.sin(wallTimeSeconds * 3.1 + x * 0.7 + y * 0.5) * 0.06;
        ctx.fillStyle = `rgba(2, 132, 199, ${0.42 + waveShift})`;
        ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wx + 6, wy + 15 + Math.sin(wallTimeSeconds * 2.5 + x) * 2);
        ctx.lineTo(wx + 22, wy + 15 + Math.sin(wallTimeSeconds * 2.5 + x) * 2);
        ctx.moveTo(wx + 24, wy + 33 + Math.cos(wallTimeSeconds * 2.2 + y) * 2);
        ctx.lineTo(wx + 41, wy + 33 + Math.cos(wallTimeSeconds * 2.2 + y) * 2);
        ctx.stroke();
      }

      if (toolMode === 'land' && !tile.isDefaultLand) {
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(wx + 1.5, wy + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
      }

      if (showGrid) {
        ctx.strokeStyle =
          sim.season === 'Winter' ? 'rgba(51, 65, 85, 0.14)' : 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, wy, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // 2. Render Roads, Bridges, Markings & Congestion Heatmap
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const tile = sim.tiles[y * sim.gridCols + x];
      if (!tile.hasRoad || tile.terrain === 'void') continue;
      drawRoadTile(ctx, sim, tile, showTrafficOverlay);
    }
  }

  // 2.2 Citywide Floodwater Surge Layer across streets, yards & low ground
  if (sim.crises.floodActive) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const tile = sim.tiles[y * sim.gridCols + x];
        if (!tile.isFlooded || tile.terrain === 'water' || tile.terrain === 'void') continue;
        const fx = x * TILE_SIZE;
        const fy = y * TILE_SIZE;
        const wave = Math.sin(wallTimeSeconds * 3.4 + x * 0.65 + y * 0.45) * 0.05;
        ctx.fillStyle = `rgba(14, 116, 144, ${0.34 + wave})`;
        ctx.fillRect(fx, fy, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.42)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fx + 5, fy + 16 + Math.sin(wallTimeSeconds * 2.8 + x) * 2);
        ctx.lineTo(fx + 22, fy + 16 + Math.sin(wallTimeSeconds * 2.8 + x) * 2);
        ctx.moveTo(fx + 24, fy + 34 + Math.cos(wallTimeSeconds * 2.4 + y) * 2);
        ctx.lineTo(fx + 43, fy + 34 + Math.cos(wallTimeSeconds * 2.4 + y) * 2);
        ctx.stroke();
      }
    }
  }

  // 2.5 Render Neighbourhood Zone Highlights & Blast Craters
  drawNeighbourhoodZones(ctx, sim);
  drawBlastCraters(ctx, sim, wallTimeSeconds);

  // 3. Render Placed Buildings & Custom Pixel Icons
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const tile = sim.tiles[y * sim.gridCols + x];
      if (!tile.building || tile.terrain === 'void') continue;
      drawBuildingTile(ctx, sim, tile, shadowOffsetX, shadowOffsetY, wallTimeSeconds);
      if (sim.crises.floodActive && tile.isFlooded) {
        const fx = x * TILE_SIZE;
        const fy = y * TILE_SIZE;
        if (!sim.isTallShelterBuilding(tile.building)) {
          // Low buildings sit partially submerged in floodwater
          ctx.fillStyle = 'rgba(3, 105, 161, 0.36)';
          ctx.fillRect(fx + 4, fy + TILE_SIZE * 0.56, TILE_SIZE - 8, TILE_SIZE * 0.38);
          ctx.strokeStyle = 'rgba(186, 230, 253, 0.6)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(fx + 6, fy + TILE_SIZE * 0.56 + Math.sin(wallTimeSeconds * 3 + x) * 1.3);
          ctx.lineTo(fx + TILE_SIZE - 6, fy + TILE_SIZE * 0.56 + Math.cos(wallTimeSeconds * 3 + y) * 1.3);
          ctx.stroke();
        } else {
          // Tall shelter buildings show water lapping only at the base while upper floors stay dry
          ctx.fillStyle = 'rgba(3, 105, 161, 0.32)';
          ctx.fillRect(fx + 4, fy + TILE_SIZE - 10, TILE_SIZE - 8, 6);
        }
      }
    }
  }

  // 3.5 Render Felled Tree Stumps, Trash Items, Porch Papers & Pop-up Market Stalls
  drawChoppedTreeEvents(ctx, sim);
  drawTrashItems(ctx, sim, wallTimeSeconds);
  drawPorchPapers(ctx, sim);
  drawMarketStalls(ctx, sim, wallTimeSeconds);
  drawProposalsAndConstructions(ctx, sim, wallTimeSeconds);

  // 4. Render Cars, Hover/Selected Destination & Crashes
  for (const car of sim.cars) {
    drawCar(ctx, car, nightFactor);
  }
  drawCarCrashes(ctx, sim, wallTimeSeconds);
  const selectedCar = selectedCarId ? sim.cars.find((c) => c.id === selectedCarId) : undefined;
  if (selectedCar) {
    drawCarTooltipBadge(ctx, selectedCar, true);
  }
  if (hover.visible && hover.worldX !== undefined && hover.worldY !== undefined) {
    drawHoveredCarTooltip(ctx, sim, hover.worldX, hover.worldY, selectedCar?.id);
  }

  // 4.5 Render Snowmen, Animals, People, Wood Chips, Confetti, Flames & Smoke
  drawSnowmen(ctx, sim);
  drawAnimals(ctx, sim, wallTimeSeconds);
  drawPeople(ctx, sim, wallTimeSeconds);
  drawFires(ctx, sim, wallTimeSeconds);
  drawWoodChips(ctx, sim);
  drawSmokeParticles(ctx, sim);
  drawGunfireTracers(ctx, sim);
  drawSnowballs(ctx, sim);
  drawConfetti(ctx, sim);

  // 5. Render Honk Ripples
  for (const ripple of sim.honkRipples) {
    const progress = ripple.age / ripple.maxAge;
    const radius = 8 + progress * 24;
    ctx.strokeStyle = `rgba(251, 191, 36, ${(1 - progress) * 0.8})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ripple.wx, ripple.wy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 6. Pollution Smog Haze + Day/Night Atmospheric Tint + Night Lights
  const smogFactor = Math.max(0, Math.min(1, (sim.crises.pollutionLevel - 18) / 82));
  if (smogFactor > 0.01) {
    ctx.fillStyle = `rgba(98, 114, 42, ${smogFactor * 0.22})`;
    ctx.fillRect(0, 0, sim.gridCols * TILE_SIZE, sim.gridRows * TILE_SIZE);
  }

  if (goldenFactor > 0.02) {
    ctx.fillStyle = `rgba(249, 115, 22, ${goldenFactor * 0.16})`;
    ctx.fillRect(0, 0, sim.gridCols * TILE_SIZE, sim.gridRows * TILE_SIZE);
  }

  if (nightFactor > 0.02) {
    // Cozy twilight/midnight darkness wash (luminous rather than pitch black)
    ctx.fillStyle = `rgba(10, 18, 44, ${nightFactor * 0.56})`;
    ctx.fillRect(0, 0, sim.gridCols * TILE_SIZE, sim.gridRows * TILE_SIZE);

    const lightStrength = smoothstep(0.15, 0.85, nightFactor);
    if (lightStrength > 0.02) {
      drawNightLighting(ctx, sim, minX, maxX, minY, maxY, lightStrength, wallTimeSeconds);
    }
  }

  // 7. Traffic Signals & Neighbourhood Labels & Civic Alerts (crisp above night wash)
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const tile = sim.tiles[y * sim.gridCols + x];
      if (!tile.hasRoad || tile.terrain === 'void') continue;
      if (isIntersectionTile(sim.tiles, x, y, sim.gridCols, sim.gridRows)) {
        drawIntersectionControl(ctx, sim, tile, nightFactor);
      }
    }
  }

  drawNeighbourhoodLabels(ctx, sim);
  drawRobberyAlerts(ctx, sim, wallTimeSeconds);
  drawProtestAlerts(ctx, sim, wallTimeSeconds);
  drawFireAlerts(ctx, sim, wallTimeSeconds);
  drawCrashAlerts(ctx, sim, wallTimeSeconds);
  drawBrokenBridgeAlerts(ctx, sim, wallTimeSeconds);
  drawCityEvents(ctx, sim, wallTimeSeconds);
  drawCapturePopups(ctx, sim);
  drawDeathPopups(ctx, sim);
  drawSleepZzz(ctx, sim);
  drawFloatingLabels(ctx, sim);
  drawNukeBlasts(ctx, sim);
  drawTornado(ctx, sim, wallTimeSeconds);
  drawWeatherEffects(ctx, sim);

  // 8. Selection Reticle & Tool Hover Preview
  if (selection) {
    const sx = selection.x * TILE_SIZE;
    const sy = selection.y * TILE_SIZE;
    drawCornerReticle(ctx, sx, sy, TILE_SIZE, '#FACC15', 2.5);
  }

  if (hover.visible && hover.tileX >= 0 && hover.tileX < sim.gridCols && hover.tileY >= 0 && hover.tileY < sim.gridRows) {
    drawHoverPreview(ctx, sim, hover, toolMode, activeBlueprint);
  }

  ctx.restore();
}

function drawGunfireTracers(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  if (sim.gunfireTracers.length === 0) return;
  ctx.save();
  for (const t of sim.gunfireTracers) {
    const progress = t.age / t.maxAge;
    const alpha = Math.max(0, 1 - progress);
    // Outer warm tracer glow
    ctx.globalAlpha = alpha * 0.75;
    ctx.strokeStyle = t.color || '#FB923C';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.lineTo(t.x2, t.y2);
    ctx.stroke();

    // Inner bright bullet core
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.lineTo(t.x2, t.y2);
    ctx.stroke();

    // Muzzle flash & impact spark
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(t.x1, t.y1, 2.2 * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(t.x2, t.y2, 2.8 * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGrassDetails(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  tx: number,
  ty: number,
  wallTimeSeconds: number,
  season: SeasonType,
  isWindy = false
) {
  const hash = ((tx * 73 + ty * 139) ^ (tx * ty * 31)) >>> 0;
  const amp = isWindy ? 2.8 : 0.8;
  const speed = isWindy ? 5.2 : 2.1;
  const sway = Math.sin(wallTimeSeconds * speed + tx * 0.7 + ty * 0.5) * amp + (isWindy ? 1.4 : 0);

  if (season === 'Winter') {
    // Crisp winter snow tufts & frost sparkles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    const gx = wx + 8 + (hash % 28);
    const gy = wy + 10 + ((hash >> 3) % 26);
    ctx.beginPath();
    ctx.arc(gx, gy, 2.2, 0, Math.PI * 2);
    ctx.arc(gx + 6, gy + 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Soft sunlit grass blade tufts
  ctx.fillStyle =
    season === 'Autumn' ? 'rgba(217, 119, 6, 0.35)' : 'rgba(167, 243, 208, 0.35)';
  const gx = wx + 8 + (hash % 28);
  const gy = wy + 10 + ((hash >> 3) % 26);
  ctx.fillRect(gx + sway * 0.5, gy, 2, 4);
  ctx.fillRect(gx + 3 + sway * 0.5, gy + 1, 2, 3);

  // Occasional seasonal wildflowers or fallen autumn leaves
  if (hash % 3 === 0) {
    const fx = wx + 10 + ((hash >> 5) % 28);
    const fy = wy + 12 + ((hash >> 7) % 24);
    const detailColors =
      season === 'Autumn'
        ? ['#EA580C', '#F59E0B', '#DC2626', '#CA8A04']
        : season === 'Summer'
        ? ['#FACC15', '#FEF9C3', '#FB923C', '#FFFFFF']
        : ['#FDE047', '#FEF9C3', '#F9A8D4', '#93C5FD'];
    ctx.fillStyle = detailColors[hash % detailColors.length];
    ctx.beginPath();
    ctx.arc(fx + sway, fy, 2.1, 0, Math.PI * 2);
    ctx.fill();

    if (hash % 6 === 0) {
      ctx.fillStyle = detailColors[(hash + 1) % detailColors.length];
      ctx.beginPath();
      ctx.arc(fx + 6 - sway * 0.6, fy + 5, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWaterTile(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  tile: MapTile,
  wx: number,
  wy: number,
  wallTimeSeconds: number
) {
  const pol = Math.max(0, Math.min(1, sim.crises.pollutionLevel / 100));
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

  const isWater = (nx: number, ny: number) => {
    const t = sim.getTile(nx, ny);
    return t ? t.terrain === 'water' : true;
  };

  if (sim.season === 'Winter') {
    // Frozen river / lake ice sheet in Winter
    const ir = lerp(165, 148, pol);
    const ig = lerp(224, 184, pol);
    const ib = lerp(250, 156, pol);
    ctx.fillStyle = `rgb(${ir}, ${ig}, ${ib})`;
    ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);

    // Subtle frosted snow-rimmed shoreline
    ctx.fillStyle = 'rgba(248, 250, 252, 0.72)';
    if (!isWater(tile.x, tile.y - 1)) ctx.fillRect(wx, wy, TILE_SIZE, 3.5);
    if (!isWater(tile.x, tile.y + 1)) ctx.fillRect(wx, wy + TILE_SIZE - 3.5, TILE_SIZE, 3.5);
    if (!isWater(tile.x - 1, tile.y)) ctx.fillRect(wx, wy, 3.5, TILE_SIZE);
    if (!isWater(tile.x + 1, tile.y)) ctx.fillRect(wx + TILE_SIZE - 3.5, wy, 3.5, TILE_SIZE);

    // Diagonal specular ice sheen & delicate frost fractures
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx, wy, TILE_SIZE, TILE_SIZE);
    ctx.clip();

    ctx.fillStyle = 'rgba(240, 249, 255, 0.42)';
    ctx.beginPath();
    ctx.moveTo(wx + 6, wy);
    ctx.lineTo(wx + 22, wy);
    ctx.lineTo(wx + 8, wy + TILE_SIZE);
    ctx.lineTo(wx - 8, wy + TILE_SIZE);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
    ctx.lineWidth = 1;
    const h = (tile.x * 17 + tile.y * 31) % 3;
    ctx.beginPath();
    ctx.moveTo(wx + 10 + h * 4, wy + 12);
    ctx.lineTo(wx + 22 + h * 3, wy + 22);
    ctx.lineTo(wx + 31, wy + 19);
    ctx.moveTo(wx + 22 + h * 3, wy + 22);
    ctx.lineTo(wx + 18, wy + 34);
    ctx.stroke();

    const glint = 0.25 + 0.35 * Math.max(0, Math.sin(wallTimeSeconds * 2.2 + tile.x * 1.3 + tile.y));
    ctx.fillStyle = `rgba(255, 255, 255, ${glint})`;
    ctx.beginPath();
    ctx.arc(wx + 34, wy + 12 + h * 6, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Turquoise (#209CEE) shifts to murky olive/sludge green when polluted
  const wr = lerp(32, 82, pol);
  const wg = lerp(156, 116, pol);
  const wb = lerp(238, 44, pol);
  ctx.fillStyle = `rgb(${wr}, ${wg}, ${wb})`;
  ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);

  // Soft sandy/aqua bank highlight (murkier greenish-brown when polluted)
  const br = lerp(186, 152, pol);
  const bg = lerp(230, 174, pol);
  const bb = lerp(253, 82, pol);
  ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, 0.45)`;
  if (!isWater(tile.x, tile.y - 1)) ctx.fillRect(wx, wy, TILE_SIZE, 3);
  if (!isWater(tile.x, tile.y + 1)) ctx.fillRect(wx, wy + TILE_SIZE - 3, TILE_SIZE, 3);
  if (!isWater(tile.x - 1, tile.y)) ctx.fillRect(wx, wy, 3, TILE_SIZE);
  if (!isWater(tile.x + 1, tile.y)) ctx.fillRect(wx + TILE_SIZE - 3, wy, 3, TILE_SIZE);

  // Continuous downstream flowing ripples & sunlit sparkles / toxic bubbles
  ctx.save();
  ctx.beginPath();
  ctx.rect(wx, wy, TILE_SIZE, TILE_SIZE);
  ctx.clip();

  const flow = (wallTimeSeconds * (24 - pol * 9)) % TILE_SIZE;
  const sway = Math.sin(wallTimeSeconds * 2.5 + tile.x * 0.8 + tile.y * 0.5) * 3;

  // Flowing current bands
  ctx.strokeStyle =
    pol > 0.35
      ? `rgba(${lerp(186, 190, pol)}, ${lerp(230, 212, pol)}, ${lerp(253, 94, pol)}, 0.48)`
      : 'rgba(186, 230, 253, 0.48)';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (let row = -1; row <= 1; row++) {
    const ry = wy + ((flow + row * 24 + (tile.x % 2) * 12) % (TILE_SIZE + 12)) - 6;
    const rx = wx + 8 + ((tile.x * 13 + tile.y * 7 + row * 11) % 18) + sway;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.quadraticCurveTo(rx + 6, ry + 2.5, rx + 13, ry);
    ctx.stroke();
  }

  if (pol > 0.35) {
    // Murky toxic algae/scum bubbles when polluted
    const bubbleAlpha = 0.28 + 0.28 * Math.max(0, Math.sin(wallTimeSeconds * 2.8 + tile.x * 1.9 + tile.y));
    ctx.fillStyle = `rgba(163, 230, 53, ${bubbleAlpha * Math.min(1, pol * 1.3)})`;
    ctx.beginPath();
    ctx.arc(wx + 22 + sway * 0.5, wy + ((flow * 1.2 + 12) % TILE_SIZE), 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(101, 163, 13, ${bubbleAlpha * 0.7})`;
    ctx.beginPath();
    ctx.arc(wx + 12 - sway * 0.4, wy + ((flow * 0.9 + 28) % TILE_SIZE), 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Sun glint sparkle
    const glintAlpha = 0.25 + 0.3 * Math.max(0, Math.sin(wallTimeSeconds * 3.4 + tile.x * 1.7 + tile.y));
    ctx.fillStyle = `rgba(255, 255, 255, ${glintAlpha})`;
    ctx.beginPath();
    ctx.arc(wx + 24 + sway * 0.5, wy + ((flow * 1.3 + 14) % TILE_SIZE), 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawFootbridgeTile(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  tile: MapTile
) {
  const wx = tile.x * TILE_SIZE;
  const wy = tile.y * TILE_SIZE;
  const connectsWalkable = (nx: number, ny: number) => {
    const nt = sim.getTile(nx, ny);
    if (!nt) return false;
    return nt.terrain !== 'water' || Boolean(nt.hasFootbridge) || nt.hasRoad;
  };
  const horizCount =
    (connectsWalkable(tile.x - 1, tile.y) ? 1 : 0) + (connectsWalkable(tile.x + 1, tile.y) ? 1 : 0);
  const vertCount =
    (connectsWalkable(tile.x, tile.y - 1) ? 1 : 0) + (connectsWalkable(tile.x, tile.y + 1) ? 1 : 0);
  const isHoriz = horizCount >= vertCount;

  ctx.save();
  if (tile.isBridgeBroken) {
    // Collapsed footbridge with snapped timber stubs & hazard barricades
    if (isHoriz) {
      const deckY = wy + 13;
      const deckH = 22;
      ctx.fillStyle = '#92400E';
      ctx.fillRect(wx, deckY, 12, deckH);
      ctx.fillRect(wx + TILE_SIZE - 12, deckY, 12, deckH);
      ctx.fillStyle = '#B45309';
      ctx.fillRect(wx + 16, deckY + 6, 7, 4);
      ctx.fillRect(wx + 24, deckY + 13, 6, 4);
      // Hazard cones
      ctx.fillStyle = '#EA580C';
      ctx.fillRect(wx + 6, deckY + 4, 4, 4);
      ctx.fillRect(wx + TILE_SIZE - 10, deckY + deckH - 8, 4, 4);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(wx + 7, deckY + 5, 2, 2);
      ctx.fillRect(wx + TILE_SIZE - 9, deckY + deckH - 7, 2, 2);
    } else {
      const deckX = wx + 13;
      const deckW = 22;
      ctx.fillStyle = '#92400E';
      ctx.fillRect(deckX, wy, deckW, 12);
      ctx.fillRect(deckX, wy + TILE_SIZE - 12, deckW, 12);
      ctx.fillStyle = '#B45309';
      ctx.fillRect(deckX + 5, wy + 17, 4, 7);
      ctx.fillRect(deckX + 12, wy + 25, 4, 6);
      ctx.fillStyle = '#EA580C';
      ctx.fillRect(deckX + 4, wy + 6, 4, 4);
      ctx.fillRect(deckX + deckW - 8, wy + TILE_SIZE - 10, 4, 4);
    }
    ctx.restore();
    return;
  }

  if (isHoriz) {
    const deckY = wy + 13;
    const deckH = 22;
    // Water drop shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.fillRect(wx, deckY + 4, TILE_SIZE, deckH);
    // Warm cedar timber deck
    ctx.fillStyle = '#B45309';
    ctx.fillRect(wx, deckY, TILE_SIZE, deckH);
    // Individual wooden plank slats
    ctx.fillStyle = '#D97706';
    for (let px = 2; px < TILE_SIZE; px += 6) {
      ctx.fillRect(wx + px, deckY + 2, 4, deckH - 4);
    }
    // Side railings
    ctx.fillStyle = '#78350F';
    ctx.fillRect(wx, deckY, TILE_SIZE, 2.5);
    ctx.fillRect(wx, deckY + deckH - 2.5, TILE_SIZE, 2.5);
    // Timber posts
    ctx.fillStyle = '#FDE68A';
    for (const postX of [wx + 4, wx + TILE_SIZE / 2 - 1.5, wx + TILE_SIZE - 7]) {
      ctx.fillRect(postX, deckY - 1, 3, 3.5);
      ctx.fillRect(postX, deckY + deckH - 2.5, 3, 3.5);
    }
  } else {
    const deckX = wx + 13;
    const deckW = 22;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.fillRect(deckX + 3, wy, deckW, TILE_SIZE);
    ctx.fillStyle = '#B45309';
    ctx.fillRect(deckX, wy, deckW, TILE_SIZE);
    ctx.fillStyle = '#D97706';
    for (let py = 2; py < TILE_SIZE; py += 6) {
      ctx.fillRect(deckX + 2, wy + py, deckW - 4, 4);
    }
    ctx.fillStyle = '#78350F';
    ctx.fillRect(deckX, wy, 2.5, TILE_SIZE);
    ctx.fillRect(deckX + deckW - 2.5, wy, 2.5, TILE_SIZE);
    ctx.fillStyle = '#FDE68A';
    for (const postY of [wy + 4, wy + TILE_SIZE / 2 - 1.5, wy + TILE_SIZE - 7]) {
      ctx.fillRect(deckX - 1, postY, 3.5, 3);
      ctx.fillRect(deckX + deckW - 2.5, postY, 3.5, 3);
    }
  }
  ctx.restore();
}

function drawMarketStalls(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  wallTimeSeconds: number
) {
  if (sim.marketStalls.length === 0) return;
  ctx.save();
  for (const stall of sim.marketStalls) {
    const cx = stall.wx;
    const cy = stall.wy;
    const w = 28;
    const h = 16;

    // Ground shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx + 1, cy + 7, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wooden counter base
    ctx.fillStyle = '#78350F';
    ctx.fillRect(cx - w / 2 + 2, cy - 1, w - 4, 8);
    ctx.fillStyle = '#D97706';
    ctx.fillRect(cx - w / 2 + 1, cy - 2, w - 2, 3);

    // Displayed wares on counter
    const isIllicit = stall.goods === 'contraband' || Boolean(stall.isIllicit);
    const isTaintedFish =
      stall.goods === 'fish' && (stall.isContaminated || sim.crises.pollutionLevel >= 35);
    if (isIllicit) {
      // Shady dark crates & glowing illicit vials
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(cx - 10, cy - 4.5, 8, 3.8);
      ctx.fillStyle = '#312E81';
      ctx.fillRect(cx + 1, cy - 4.2, 8, 3.5);
      ctx.fillStyle = '#A855F7';
      ctx.fillRect(cx - 7, cy - 5.2, 2.2, 2.5);
      ctx.fillStyle = '#10B981';
      ctx.fillRect(cx + 3, cy - 5, 2.2, 2.3);
    } else if (stall.goods === 'fish') {
      // Ice bed & fresh silver-blue (or polluted lime-green) fish
      ctx.fillStyle = isTaintedFish ? '#D9F99D' : '#BAE6FD';
      ctx.fillRect(cx - 10, cy - 3.5, 20, 3.5);
      ctx.fillStyle = isTaintedFish ? '#65A30D' : '#0284C7';
      ctx.beginPath();
      ctx.ellipse(cx - 5, cy - 2, 3.2, 1.3, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 3, cy - 2, 3.2, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (stall.goods === 'clothes') {
      // Folded colorful garments stack
      const colors = ['#F43F5E', '#38BDF8', '#FACC15', '#A78BFA'];
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = colors[k];
        ctx.fillRect(cx - 9 + k * 5, cy - 4, 4, 3);
      }
    } else if (stall.goods === 'produce') {
      // Fresh fruit & veggies baskets
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 2.5, 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.arc(cx, cy - 2.5, 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.arc(cx + 6, cy - 2.5, 2.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (stall.goods === 'meat') {
      // Butcher wooden tray with marbled steak cuts & sausages
      ctx.fillStyle = '#FDE68A';
      ctx.fillRect(cx - 10, cy - 3.6, 20, 3.4);
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.ellipse(cx - 5, cy - 2.1, 3.1, 1.5, -0.1, 0, Math.PI * 2);
      ctx.ellipse(cx + 2, cy - 2.1, 3.2, 1.5, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FCA5A5';
      ctx.fillRect(cx - 6.2, cy - 2.5, 2.2, 0.8);
      ctx.fillRect(cx + 1.2, cy - 2.4, 2.2, 0.8);
      ctx.fillStyle = '#991B1B';
      ctx.beginPath();
      ctx.arc(cx + 7.4, cy - 2.2, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(cx + 7, cy - 2.5, 0.9, 0.7);
    } else if (stall.goods === 'kayak') {
      // Twin miniature kayaks on shore rack with paddles
      ctx.fillStyle = '#06B6D4';
      ctx.beginPath();
      ctx.ellipse(cx - 4.5, cy - 2.6, 5.2, 1.8, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.ellipse(cx + 4.5, cy - 2.6, 5.2, 1.8, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy - 4.2);
      ctx.lineTo(cx + 9, cy - 4.2);
      ctx.stroke();
    } else if (stall.goods === 'rowboat') {
      // Wooden rowboat hull + crossed oars on stand
      ctx.fillStyle = '#92400E';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 2.4, 7.2, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#D97706';
      ctx.fillRect(cx - 3.5, cy - 3.2, 7, 1.6);
      ctx.strokeStyle = '#FEF3C7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 5);
      ctx.lineTo(cx + 6, cy - 1);
      ctx.moveTo(cx + 6, cy - 5);
      ctx.lineTo(cx - 6, cy - 1);
      ctx.stroke();
    } else if (stall.goods === 'swim') {
      // Lifebuoy ring + beach swim floats
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(cx - 4.5, cy - 2.8, 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx - 4.5, cy - 2.8, 3, 0, Math.PI * 0.5);
      ctx.stroke();
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(cx + 4.5, cy - 2.8, 2.7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Handcrafted pottery & woven goods
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(cx - 8, cy - 4.5, 4, 3.5);
      ctx.fillStyle = '#EC4899';
      ctx.fillRect(cx - 2, cy - 4.5, 4, 3.5);
      ctx.fillStyle = '#06B6D4';
      ctx.fillRect(cx + 4, cy - 4.5, 4, 3.5);
    }

    // Wooden canopy posts
    ctx.fillStyle = isIllicit ? '#1E293B' : '#92400E';
    ctx.fillRect(cx - w / 2 + 2, cy - h + 2, 2, h - 3);
    ctx.fillRect(cx + w / 2 - 4, cy - h + 2, 2, h - 3);

    // Striped market awning roof
    const stripes = 5;
    const stripeW = w / stripes;
    const sway = Math.sin(wallTimeSeconds * 3 + stall.x) * 0.4;
    for (let s = 0; s < stripes; s++) {
      ctx.fillStyle =
        s % 2 === 0
          ? isIllicit
            ? '#312E81'
            : stall.awningColor
          : isIllicit
          ? '#0F172A'
          : '#FFFBEB';
      ctx.fillRect(cx - w / 2 + s * stripeW, cy - h + sway * 0.4, stripeW + 0.4, 7.5);
    }
    ctx.strokeStyle = isIllicit ? 'rgba(192, 132, 252, 0.55)' : 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(cx - w / 2, cy - h + sway * 0.4, w, 7.5);

    // Tiny crisp goods label tag above canopy
    const tag = isIllicit
      ? stall.raidDispatched
        ? 'RAID!'
        : 'ILLICIT'
      : isTaintedFish
      ? 'TAINTED FISH'
      : stall.goods === 'fish'
      ? 'FISH'
      : stall.goods === 'clothes'
      ? 'CLOTHES'
      : stall.goods === 'produce'
      ? 'PRODUCE'
      : stall.goods === 'meat'
      ? 'MEAT'
      : stall.goods === 'kayak'
      ? 'CANOE'
      : stall.goods === 'rowboat'
      ? 'BOATS'
      : stall.goods === 'swim'
      ? 'SWIM CLUB'
      : 'CRAFTS';
    ctx.font = '700 7px "Plus Jakarta Sans", sans-serif';
    const tw = ctx.measureText(tag).width + 6;
    ctx.fillStyle = isIllicit
      ? stall.raidDispatched
        ? 'rgba(185, 28, 28, 0.96)'
        : 'rgba(67, 20, 108, 0.94)'
      : isTaintedFish
      ? 'rgba(153, 27, 27, 0.92)'
      : 'rgba(15, 23, 42, 0.86)';
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, cy - h - 9, tw, 8.5, 2.5);
    ctx.fill();
    ctx.fillStyle = isIllicit
      ? stall.raidDispatched
        ? '#FEE2E2'
        : '#F5D0FE'
      : isTaintedFish
      ? '#ECFCCB'
      : '#FEF9C3';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, cx, cy - h - 4.6);
  }
  ctx.restore();
}

function drawProposalsAndConstructions(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  wallTimeSeconds: number
) {
  if (sim.pendingProposals.length === 0 && sim.activeConstructions.length === 0) return;
  ctx.save();

  // 1. Survey stakes & blueprint outline for pending Mayor permit proposals
  for (const prop of sim.pendingProposals) {
    const wx = prop.x * TILE_SIZE;
    const wy = prop.y * TILE_SIZE;
    const pulse = 0.55 + Math.sin(wallTimeSeconds * 3.5 + prop.x) * 0.25;

    ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
    ctx.fillRect(wx + 3, wy + 3, TILE_SIZE - 6, TILE_SIZE - 6);

    ctx.save();
    ctx.strokeStyle = `rgba(250, 204, 21, ${pulse})`;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(wx + 3, wy + 3, TILE_SIZE - 6, TILE_SIZE - 6);
    ctx.restore();

    // Corner wooden survey stakes
    ctx.fillStyle = '#B45309';
    ctx.fillRect(wx + 3, wy + 3, 2.5, 5);
    ctx.fillRect(wx + TILE_SIZE - 5.5, wy + 3, 2.5, 5);
    ctx.fillRect(wx + 3, wy + TILE_SIZE - 8, 2.5, 5);
    ctx.fillRect(wx + TILE_SIZE - 5.5, wy + TILE_SIZE - 8, 2.5, 5);

    // Subtle blueprint ghost in center
    const cached = getOrCreateIconCanvas(prop.iconGrid);
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cached.dayCanvas, wx + 8, wy + 8, TILE_SIZE - 16, TILE_SIZE - 16);
    ctx.restore();

    // Permit badge tag
    const tag = 'PERMIT?';
    ctx.font = '700 7px "Plus Jakarta Sans", sans-serif';
    const tw = ctx.measureText(tag).width + 6;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(wx + TILE_SIZE / 2 - tw / 2, wy - 4, tw, 9, 2.5);
    ctx.fill();
    ctx.fillStyle = '#FDE047';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, wx + TILE_SIZE / 2, wy + 0.5);
  }

  // 2. Active Construction Sites with dirt pad, scaffolding, crane & progress bar
  for (const site of sim.activeConstructions) {
    const wx = site.x * TILE_SIZE;
    const wy = site.y * TILE_SIZE;
    const progress = Math.max(0, Math.min(1, site.elapsedGameMinutes / Math.max(1, site.totalGameMinutes)));

    // Graded construction dirt pad
    ctx.fillStyle = '#A16207';
    ctx.fillRect(wx + 4, wy + 5, TILE_SIZE - 8, TILE_SIZE - 9);
    ctx.fillStyle = '#CA8A04';
    ctx.fillRect(wx + 6, wy + 7, TILE_SIZE - 12, TILE_SIZE - 13);

    // Rising target building silhouette
    const cached = getOrCreateIconCanvas(site.iconGrid);
    ctx.save();
    ctx.globalAlpha = 0.25 + progress * 0.55;
    ctx.imageSmoothingEnabled = false;
    const revealH = Math.max(8, (TILE_SIZE - 12) * (0.3 + progress * 0.7));
    ctx.drawImage(cached.dayCanvas, wx + 6, wy + TILE_SIZE - 6 - revealH, TILE_SIZE - 12, revealH);
    ctx.restore();

    // Timber / steel scaffolding frame around plot
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(wx + 5, wy + 6, TILE_SIZE - 10, TILE_SIZE - 11);
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(wx + 5, wy + TILE_SIZE * 0.42);
    ctx.lineTo(wx + TILE_SIZE - 5, wy + TILE_SIZE * 0.42);
    ctx.moveTo(wx + 5, wy + TILE_SIZE * 0.68);
    ctx.lineTo(wx + TILE_SIZE - 5, wy + TILE_SIZE * 0.68);
    ctx.stroke();

    // Mini yellow crane jib at top-right corner
    const swing = Math.sin(wallTimeSeconds * 1.4 + site.x) * 2.5;
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(wx + TILE_SIZE - 10, wy + 5, 2.2, 16);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(wx + TILE_SIZE - 9, wy + 6);
    ctx.lineTo(wx + TILE_SIZE * 0.42 + swing, wy + 2);
    ctx.stroke();

    // Orange safety cones on front corners
    for (const cx of [wx + 7, wx + TILE_SIZE - 9]) {
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(cx, wy + TILE_SIZE - 4);
      ctx.lineTo(cx + 2, wy + TILE_SIZE - 9);
      ctx.lineTo(cx + 4, wy + TILE_SIZE - 4);
      ctx.closePath();
      ctx.fill();
    }

    // Crisp construction progress bar
    const barW = TILE_SIZE - 10;
    const barX = wx + 5;
    const barY = wy - 5;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, 6, 2);
    ctx.fill();
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.roundRect(barX + 1, barY + 1, Math.max(2, (barW - 2) * progress), 4, 1.5);
    ctx.fill();
  }

  ctx.restore();
}

function drawForestTile(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  tx: number,
  ty: number,
  shadowX: number,
  shadowY: number,
  season: SeasonType,
  wallTimeSeconds = 0,
  isWindy = false
) {
  const seed = (tx * 37 + ty * 17) % 7;
  const hasBlossom = (tx * 19 + ty * 23) % 5 === 0;
  const trees =
    season === 'Autumn'
      ? [
          { dx: 14, dy: 15, r: 9.5, c: '#D97706', hi: '#FDE047' },
          { dx: 33, dy: 16, r: 8.5, c: hasBlossom ? '#DC2626' : '#EA580C', hi: '#FDBA74' },
          { dx: 23, dy: 32, r: 10.5, c: '#B45309', hi: '#FBBF24' },
        ]
      : season === 'Winter'
      ? [
          { dx: 14, dy: 15, r: 9.5, c: '#166534', hi: '#F1F5F9' },
          { dx: 33, dy: 16, r: 8.5, c: '#15803D', hi: '#F8FAFC' },
          { dx: 23, dy: 32, r: 10.5, c: '#14532D', hi: '#E2E8F0' },
        ]
      : season === 'Summer'
      ? [
          { dx: 14, dy: 15, r: 9.5, c: '#15803D', hi: '#86EFAC' },
          { dx: 33, dy: 16, r: 8.5, c: '#16A34A', hi: '#BBF7D0' },
          { dx: 23, dy: 32, r: 10.5, c: '#166534', hi: '#4ADE80' },
        ]
      : [
          { dx: 14, dy: 15, r: 9.5, c: '#16A34A', hi: '#86EFAC' },
          { dx: 33, dy: 16, r: 8.5, c: hasBlossom ? '#F472B6' : '#22C55E', hi: hasBlossom ? '#FBCFE8' : '#BBF7D0' },
          { dx: 23, dy: 32, r: 10.5, c: '#15803D', hi: '#4ADE80' },
        ];

  const gustBase = isWindy
    ? Math.sin(wallTimeSeconds * 3.8 + tx * 0.55 + ty * 0.35) * 2.5 +
      Math.cos(wallTimeSeconds * 2.1 + tx * 0.25) * 1.1 +
      1.3
    : Math.sin(wallTimeSeconds * 1.4 + tx * 0.6 + ty * 0.4) * 0.35;

  trees.forEach((t, ti) => {
    const ox = t.dx + ((seed % 5) - 2) * 0.8;
    const oy = t.dy + (seed % 2) * 1.2;
    const swayX = isWindy
      ? gustBase + Math.sin(wallTimeSeconds * 5.1 + ti * 1.4 + ty) * 0.9
      : gustBase;
    const swayY = isWindy ? Math.cos(wallTimeSeconds * 4.2 + ti + tx * 0.4) * 0.65 : 0;

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.beginPath();
    ctx.arc(wx + ox + shadowX * 0.5 + swayX * 0.35, wy + oy + shadowY * 0.5, t.r, 0, Math.PI * 2);
    ctx.fill();

    // Trunk peeking when wind bends canopy
    if (isWindy) {
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx + ox, wy + oy + 3);
      ctx.lineTo(wx + ox + swayX * 0.8, wy + oy - 1);
      ctx.stroke();
    }

    ctx.fillStyle = t.c;
    ctx.beginPath();
    ctx.arc(wx + ox + swayX, wy + oy + swayY, t.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = t.hi;
    ctx.globalAlpha = season === 'Winter' ? 0.82 : 0.45;
    ctx.beginPath();
    ctx.arc(
      wx + ox + swayX - 2.2,
      wy + oy + swayY - 2.2,
      season === 'Winter' ? t.r * 0.58 : t.r * 0.45,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawRoadTile(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  tile: MapTile,
  showTrafficOverlay: boolean
) {
  const wx = tile.x * TILE_SIZE;
  const wy = tile.y * TILE_SIZE;
  const mask = getEffectiveRoadMask(sim.tiles, tile.x, tile.y, sim.gridCols, sim.gridRows);
  const roadW = 34;
  const pad = (TILE_SIZE - roadW) / 2; // 7px curb margin
  const mid = TILE_SIZE / 2;

  const isBridge = tile.terrain === 'water';

  if (isBridge && tile.isBridgeBroken) {
    // Collapsed road bridge over river showing snapped concrete decks + orange hazard barriers
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(wx + pad - 2, wy + pad - 2, 11, roadW + 4);
    ctx.fillRect(wx + TILE_SIZE - pad - 9, wy + pad - 2, 11, roadW + 4);
    ctx.fillStyle = '#2B3340';
    ctx.fillRect(wx + pad, wy + pad, 9, roadW);
    ctx.fillRect(wx + TILE_SIZE - pad - 9, wy + pad, 9, roadW);
    if (mask & 1) ctx.fillRect(wx + pad, wy, roadW, 10);
    if (mask & 4) ctx.fillRect(wx + pad, wy + TILE_SIZE - 10, roadW, 10);
    if (mask & 2) ctx.fillRect(wx + TILE_SIZE - 10, wy + pad, 10, roadW);
    if (mask & 8) ctx.fillRect(wx, wy + pad, 10, roadW);

    // Submerged debris chunks in gap
    ctx.fillStyle = '#475569';
    ctx.fillRect(wx + 17, wy + 18, 6, 5);
    ctx.fillRect(wx + 25, wy + 25, 7, 5);
    ctx.fillStyle = '#EA580C';
    ctx.fillRect(wx + 11, wy + 13, 3.5, 6);
    ctx.fillRect(wx + TILE_SIZE - 14.5, wy + 28, 3.5, 6);
    return;
  }

  const highway = isHighwayTile(sim.tiles, tile.x, tile.y);
  const nHw = highway && isHighwayTile(sim.tiles, tile.x, tile.y - 1);
  const sHw = highway && isHighwayTile(sim.tiles, tile.x, tile.y + 1);
  const wHw = highway && isHighwayTile(sim.tiles, tile.x - 1, tile.y);
  const eHw = highway && isHighwayTile(sim.tiles, tile.x + 1, tile.y);

  if (highway) {
    const x0 = wHw ? wx : wx + pad;
    const x1 = eHw ? wx + TILE_SIZE : wx + TILE_SIZE - pad;
    const y0 = nHw ? wy : wy + pad;
    const y1 = sHw ? wy + TILE_SIZE : wy + TILE_SIZE - pad;

    if (isBridge) {
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(x0 - (wHw ? 0 : 3), y0 - (nHw ? 0 : 3), x1 - x0 + (wHw ? 0 : 3) + (eHw ? 0 : 3), y1 - y0 + (nHw ? 0 : 3) + (sHw ? 0 : 3));
    }

    // Wide merged highway asphalt
    ctx.fillStyle = '#232B38';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (mask & 1 && !nHw) ctx.fillRect(x0, wy, x1 - x0, pad + 2);
    if (mask & 4 && !sHw) ctx.fillRect(x0, wy + TILE_SIZE - pad - 2, x1 - x0, pad + 2);
    if (mask & 8 && !wHw) ctx.fillRect(wx, y0, pad + 2, y1 - y0);
    if (mask & 2 && !eHw) ctx.fillRect(wx + TILE_SIZE - pad - 2, y0, pad + 2, y1 - y0);

    // Outer shoulder curbs only on outer edges
    ctx.fillStyle = isBridge ? '#CBD5E1' : '#64748B';
    if (!nHw && !(mask & 1)) ctx.fillRect(x0, y0, x1 - x0, 2.2);
    if (!sHw && !(mask & 4)) ctx.fillRect(x0, y1 - 2.2, x1 - x0, 2.2);
    if (!wHw && !(mask & 8)) ctx.fillRect(x0, y0, 2.2, y1 - y0);
    if (!eHw && !(mask & 2)) ctx.fillRect(x1 - 2.2, y0, 2.2, y1 - y0);

    // Crisp white shoulder lines
    ctx.fillStyle = 'rgba(248, 250, 252, 0.72)';
    if (!nHw && !(mask & 1)) ctx.fillRect(x0, y0 + 3, x1 - x0, 1.2);
    if (!sHw && !(mask & 4)) ctx.fillRect(x0, y1 - 4.2, x1 - x0, 1.2);
    if (!wHw && !(mask & 8)) ctx.fillRect(x0 + 3, y0, 1.2, y1 - y0);
    if (!eHw && !(mask & 2)) ctx.fillRect(x1 - 4.2, y0, 1.2, y1 - y0);

    // Highway yellow center seam along shared highway tile boundary & dashed white lane dividers
    ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
    if (nHw && !sHw) ctx.fillRect(wx, wy, TILE_SIZE, 1.5);
    if (wHw && !eHw) ctx.fillRect(wx, wy, 1.5, TILE_SIZE);

    ctx.strokeStyle = 'rgba(248, 250, 252, 0.58)';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    if (mask & 2 || mask & 8) {
      ctx.moveTo(wx, wy + mid);
      ctx.lineTo(wx + TILE_SIZE, wy + mid);
    }
    if (mask & 1 || mask & 4) {
      ctx.moveTo(wx + mid, wy);
      ctx.lineTo(wx + mid, wy + TILE_SIZE);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // Standard 2-lane city road
    if (isBridge) {
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(wx + pad - 3, wy + pad - 3, roadW + 6, roadW + 6);
      if (mask & 1) ctx.fillRect(wx + pad - 3, wy, roadW + 6, pad);
      if (mask & 4) ctx.fillRect(wx + pad - 3, wy + TILE_SIZE - pad, roadW + 6, pad);
      if (mask & 2) ctx.fillRect(wx + TILE_SIZE - pad, wy + pad - 3, pad, roadW + 6);
      if (mask & 8) ctx.fillRect(wx, wy + pad - 3, pad, roadW + 6);
    }

    ctx.fillStyle = '#2B3340';
    ctx.fillRect(wx + pad, wy + pad, roadW, roadW);
    if (mask & 1) ctx.fillRect(wx + pad, wy, roadW, pad + 2);
    if (mask & 4) ctx.fillRect(wx + pad, wy + TILE_SIZE - pad - 2, roadW, pad + 2);
    if (mask & 2) ctx.fillRect(wx + TILE_SIZE - pad - 2, wy + pad, pad + 2, roadW);
    if (mask & 8) ctx.fillRect(wx, wy + pad, pad + 2, roadW);

    ctx.fillStyle = isBridge ? '#CBD5E1' : '#526073';
    const curb = 2;
    if (!(mask & 1)) ctx.fillRect(wx + pad, wy + pad, roadW, curb);
    if (!(mask & 4)) ctx.fillRect(wx + pad, wy + TILE_SIZE - pad - curb, roadW, curb);
    if (!(mask & 8)) ctx.fillRect(wx + pad, wy + pad, curb, roadW);
    if (!(mask & 2)) ctx.fillRect(wx + TILE_SIZE - pad - curb, wy + pad, curb, roadW);

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.72)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    if (mask & 1) {
      ctx.moveTo(wx + mid, wy);
      ctx.lineTo(wx + mid, wy + mid - 6);
    }
    if (mask & 4) {
      ctx.moveTo(wx + mid, wy + mid + 6);
      ctx.lineTo(wx + mid, wy + TILE_SIZE);
    }
    if (mask & 8) {
      ctx.moveTo(wx, wy + mid);
      ctx.lineTo(wx + mid - 6, wy + mid);
    }
    if (mask & 2) {
      ctx.moveTo(wx + mid + 6, wy + mid);
      ctx.lineTo(wx + TILE_SIZE, wy + mid);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Crosswalks on 3+ way intersections (crisp white zebra bars)
  const neighborCount =
    ((mask & 1) ? 1 : 0) + ((mask & 2) ? 1 : 0) + ((mask & 4) ? 1 : 0) + ((mask & 8) ? 1 : 0);
  if ((neighborCount >= 3 && !highway) || tile.hasZebraCrossing) {
    const isHorizOnly = (mask & 2 || mask & 8) && !(mask & 1 || mask & 4);
    const isVertOnly = (mask & 1 || mask & 4) && !(mask & 2 || mask & 8);

    if (tile.hasZebraCrossing && (isHorizOnly || isVertOnly)) {
      // Full dedicated mid-block zebra crossing with bright white stripes & yellow curb beacons
      ctx.fillStyle = '#2B3340';
      if (isHorizOnly) {
        ctx.fillRect(wx + mid - 10, wy + pad + 2, 20, roadW - 4);
        ctx.fillStyle = 'rgba(248, 250, 252, 0.94)';
        for (let s = -12; s <= 12; s += 6) {
          ctx.fillRect(wx + mid - 9, wy + mid + s - 1.6, 18, 3.2);
        }
        // Curbside amber pedestrian beacons
        for (const by of [wy + pad - 1, wy + TILE_SIZE - pad + 1]) {
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.arc(wx + mid, by, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FACC15';
          ctx.beginPath();
          ctx.arc(wx + mid, by, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillRect(wx + pad + 2, wy + mid - 10, roadW - 4, 20);
        ctx.fillStyle = 'rgba(248, 250, 252, 0.94)';
        for (let s = -12; s <= 12; s += 6) {
          ctx.fillRect(wx + mid + s - 1.6, wy + mid - 9, 3.2, 18);
        }
        for (const bx of [wx + pad - 1, wx + TILE_SIZE - pad + 1]) {
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.arc(bx, wy + mid, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FACC15';
          ctx.beginPath();
          ctx.arc(bx, wy + mid, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // Crisp intersection zebra crossings along connected arms
      ctx.fillStyle = tile.hasZebraCrossing
        ? 'rgba(248, 250, 252, 0.94)'
        : 'rgba(248, 250, 252, 0.78)';
      for (let s = -11; s <= 11; s += 5.5) {
        if (mask & 1) ctx.fillRect(wx + mid + s - 1.3, wy + 2, 2.6, 6);
        if (mask & 4) ctx.fillRect(wx + mid + s - 1.3, wy + TILE_SIZE - 8, 2.6, 6);
        if (mask & 8) ctx.fillRect(wx + 2, wy + mid + s - 1.3, 6, 2.6);
        if (mask & 2) ctx.fillRect(wx + TILE_SIZE - 8, wy + mid + s - 1.3, 6, 2.6);
      }
    }
  }

  // Congestion heatmap overlay
  if (showTrafficOverlay) {
    const score = tile.congestionScore;
    let heatColor = 'rgba(16, 185, 129, 0.25)';
    if (score > 0.55) heatColor = `rgba(239, 68, 68, ${0.35 + score * 0.35})`;
    else if (score > 0.22) heatColor = `rgba(245, 158, 11, ${0.28 + score * 0.3})`;
    ctx.fillStyle = heatColor;
    ctx.fillRect(wx + pad, wy + pad, roadW, roadW);
  } else if (tile.congestionScore > 0.45) {
    // Subtle natural red tint on heavily jammed tiles even without overlay
    ctx.fillStyle = `rgba(239, 68, 68, ${(tile.congestionScore - 0.45) * 0.36})`;
    ctx.fillRect(wx + pad, wy + pad, roadW, roadW);
  }
}

function drawIntersectionControl(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  tile: MapTile,
  nightFactor: number
) {
  const wx = tile.x * TILE_SIZE;
  const wy = tile.y * TILE_SIZE;

  if (tile.intersection.controlType === 'stop') {
    // Red octagonal stop marker on corner
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(wx + 9, wy + 9, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 1;
    ctx.stroke();
    return;
  }

  if (tile.intersection.controlType !== 'signal') return;

  const ns = sim.getSignalAspect(tile, 'NS');
  const ew = sim.getSignalAspect(tile, 'EW');

  const aspectColor = (aspect: 'green' | 'amber' | 'red') =>
    aspect === 'green' ? '#22C55E' : aspect === 'amber' ? '#F59E0B' : '#EF4444';

  // Small traffic light indicators on N/S and E/W corners
  const drawSignalDot = (cx: number, cy: number, color: string) => {
    if (nightFactor > 0.2) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.28 * nightFactor;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.7, 0, Math.PI * 2);
    ctx.fill();
  };

  // Top-left & bottom-right control NS, Top-right & bottom-left control EW
  drawSignalDot(wx + 7, wy + 7, aspectColor(ns));
  drawSignalDot(wx + TILE_SIZE - 7, wy + TILE_SIZE - 7, aspectColor(ns));
  drawSignalDot(wx + TILE_SIZE - 7, wy + 7, aspectColor(ew));
  drawSignalDot(wx + 7, wy + TILE_SIZE - 7, aspectColor(ew));
}

function drawBuildingTile(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  tile: MapTile,
  shadowOffsetX: number,
  shadowOffsetY: number,
  wallTimeSeconds: number
) {
  const bld = tile.building;
  if (!bld) return;

  const wx = tile.x * TILE_SIZE;
  const wy = tile.y * TILE_SIZE;

  if (bld.category === 'road_path') {
    const cached = getOrCreateIconCanvas(bld.iconGrid);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cached.dayCanvas, wx + 2, wy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.imageSmoothingEnabled = true;
    return;
  }

  // Lot concrete/garden/soil base
  ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
  ctx.fillRect(wx + 4 + shadowOffsetX * 0.45, wy + 4 + shadowOffsetY * 0.45, TILE_SIZE - 8, TILE_SIZE - 8);

  ctx.fillStyle =
    bld.category === 'park'
      ? '#3B7A46'
      : bld.category === 'crops'
      ? '#6B4423'
      : '#CBD5E1';
  ctx.fillRect(wx + 4, wy + 4, TILE_SIZE - 8, TILE_SIZE - 8);

  if (bld.category === 'park') {
    const variant = bld.parkVariant || 'playground';
    if (variant === 'playground') {
      // Natural green lawn + safety woodchip mulch play zone + animated swing set, slide, roundabout & climbing dome
      ctx.fillStyle = sim.season === 'Winter' ? '#DCEAF7' : '#58B95B';
      ctx.fillRect(wx + 4, wy + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      // Warm woodchip safety pit
      ctx.fillStyle = '#D6A86E';
      ctx.beginPath();
      ctx.roundRect(wx + 7, wy + 13, TILE_SIZE - 14, TILE_SIZE - 20, 4);
      ctx.fill();
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(wx + 7, wy + 13, TILE_SIZE - 14, TILE_SIZE - 20);

      // Perimeter wooden fence posts
      ctx.fillStyle = '#78350F';
      for (const fx of [wx + 6, wx + 18, wx + 30, wx + 40]) {
        ctx.fillRect(fx, wy + 5.5, 2, 3);
      }

      // Park bench at top left
      ctx.fillStyle = '#92400E';
      ctx.fillRect(wx + 8, wy + 7.5, 11, 3);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(wx + 9, wy + 8, 9, 1.5);

      // Colorful Slide (left)
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(wx + 9.5, wy + 16, 3.2, 11.5);
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(wx + 12.2, wy + 16.5);
      ctx.lineTo(wx + 21.5, wy + 27);
      ctx.lineTo(wx + 18.5, wy + 28.5);
      ctx.lineTo(wx + 10.5, wy + 18.5);
      ctx.closePath();
      ctx.fill();

      // Spinning Merry-Go-Round Carousel (bottom-left center)
      const spin = wallTimeSeconds * 2.4 + tile.x + tile.y;
      const mcX = wx + 16;
      const mcY = wy + 34.5;
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(mcX, mcY, 5.2, 0, Math.PI * 2);
      ctx.fill();
      const carouselColors = ['#EF4444', '#3B82F6', '#F59E0B', '#10B981'];
      for (let c = 0; c < 4; c++) {
        const ang = spin + (c * Math.PI) / 2;
        ctx.strokeStyle = carouselColors[c];
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(mcX, mcY);
        ctx.lineTo(mcX + Math.cos(ang) * 4.6, mcY + Math.sin(ang) * 4.6);
        ctx.stroke();
      }
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(mcX, mcY, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Animated Swing Set (top-right)
      const swing1 = Math.sin(wallTimeSeconds * 3.4 + tile.x) * 3.2;
      const swing2 = Math.sin(wallTimeSeconds * 3.4 + tile.x + 1.4) * 3.2;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(wx + 25.5, wy + 27);
      ctx.lineTo(wx + 27.5, wy + 14.5);
      ctx.lineTo(wx + 38.5, wy + 14.5);
      ctx.lineTo(wx + 40.5, wy + 27);
      ctx.stroke();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wx + 30.5, wy + 14.5);
      ctx.lineTo(wx + 30.5 + swing1 * 0.45, wy + 22.5 + Math.abs(swing1) * 0.25);
      ctx.moveTo(wx + 35.5, wy + 14.5);
      ctx.lineTo(wx + 35.5 + swing2 * 0.45, wy + 22.5 + Math.abs(swing2) * 0.25);
      ctx.stroke();
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(wx + 29 + swing1 * 0.45, wy + 22 + Math.abs(swing1) * 0.25, 3, 1.6);
      ctx.fillStyle = '#F43F5E';
      ctx.fillRect(wx + 34 + swing2 * 0.45, wy + 22 + Math.abs(swing2) * 0.25, 3, 1.6);

      // Geodesic Climbing Dome (bottom-right)
      const domeX = wx + 33.5;
      const domeY = wy + 34.5;
      ctx.strokeStyle = '#0EA5E9';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(domeX, domeY, 4.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(domeX - 4, domeY);
      ctx.lineTo(domeX + 4, domeY);
      ctx.moveTo(domeX, domeY - 4);
      ctx.lineTo(domeX, domeY + 4);
      ctx.stroke();
    } else if (variant === 'garden') {
      // Cozy botanical flower garden + stone path + fountain
      ctx.fillStyle = '#4D9B56';
      ctx.fillRect(wx + 4, wy + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(wx + 21, wy + 4, 6, TILE_SIZE - 8);
      ctx.fillRect(wx + 4, wy + 21, TILE_SIZE - 8, 6);
      const bedPositions = [
        [10, 10, '#F43F5E'],
        [30, 10, '#FACC15'],
        [10, 30, '#EC4899'],
        [30, 30, '#A855F7'],
      ] as const;
      for (const [bx, by, col] of bedPositions) {
        ctx.fillStyle = '#15803D';
        ctx.fillRect(wx + bx, wy + by, 8, 8);
        ctx.fillStyle = col;
        ctx.fillRect(wx + bx + 1.5, wy + by + 1.5, 2.2, 2.2);
        ctx.fillRect(wx + bx + 4.5, wy + by + 4.5, 2.2, 2.2);
      }
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(wx + TILE_SIZE / 2, wy + TILE_SIZE / 2, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Multipurpose sports pitch with crisp lines & white goals
      ctx.fillStyle = '#22A355';
      ctx.fillRect(wx + 4, wy + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(wx + 7, wy + 8, TILE_SIZE - 14, TILE_SIZE - 16);
      ctx.beginPath();
      ctx.moveTo(wx + TILE_SIZE / 2, wy + 8);
      ctx.lineTo(wx + TILE_SIZE / 2, wy + TILE_SIZE - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(wx + TILE_SIZE / 2, wy + TILE_SIZE / 2, 4.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(wx + 5.5, wy + 19, 2.5, 10);
      ctx.fillRect(wx + TILE_SIZE - 8, wy + 19, 2.5, 10);
    }
  } else {
    // Crisp pixel-art building icon
    const cached = getOrCreateIconCanvas(bld.iconGrid);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cached.dayCanvas, wx + 4, wy + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    ctx.imageSmoothingEnabled = true;
  }

  // Animated swaying crop stalks scaled by growth stage (0..3)
  if (bld.category === 'crops') {
    const stage = bld.cropStage ?? 1;
    ctx.save();
    // Soil furrows
    ctx.fillStyle = 'rgba(69, 26, 3, 0.45)';
    for (let row = 0; row < 3; row++) {
      ctx.fillRect(wx + 7, wy + 14 + row * 9, TILE_SIZE - 14, 3);
    }
    if (stage > 0) {
      const windMult = sim.weather === 'Windy' ? 2.6 : 1;
      const sway =
        Math.sin(wallTimeSeconds * (sim.weather === 'Windy' ? 5.2 : 2.4) + tile.x * 0.8 + tile.y * 0.5) *
          (0.7 + stage * 0.45) *
          windMult +
        (sim.weather === 'Windy' ? 1.2 : 0);
      const height = 2 + stage * 1.8;
      ctx.strokeStyle =
        sim.season === 'Winter'
          ? '#E2E8F0'
          : stage === 1
          ? '#4ADE80'
          : stage === 2
          ? '#A3E635'
          : '#FACC15';
      ctx.lineWidth = stage >= 3 ? 1.7 : 1.3;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const sx = wx + 11 + col * 8.5;
          const sy = wy + 16 + row * 9;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + sway, sy - height);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // Closed night shutter & badge for Commercial stores outside 06:00 - 22:00
  if (bld.category === 'commercial' && !sim.isStoreOpen()) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.46)';
    ctx.fillRect(wx + 7, wy + 22, TILE_SIZE - 14, 15);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(wx + 16, wy + 6, 16, 5);
    ctx.fillStyle = '#FEF2F2';
    ctx.fillRect(wx + 18, wy + 8, 12, 1.2);
  }

  // Subtle emerald cellar hatch badge if building has an underground bunker/basement
  if (bld.hasBasement) {
    ctx.fillStyle = '#059669';
    ctx.fillRect(wx + TILE_SIZE - 12, wy + 5, 7, 7);
    ctx.strokeStyle = '#ECFDF5';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(wx + TILE_SIZE - 12, wy + 5, 7, 7);
  }
}

function drawTrashItems(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  wallTimeSeconds: number
) {
  if (sim.trashItems.length === 0) return;
  ctx.save();
  for (const tr of sim.trashItems) {
    const bob = tr.inWater ? Math.sin(wallTimeSeconds * 2.8 + tr.x + tr.y) * 1.4 : 0;
    const x = tr.wx;
    const y = tr.wy + bob;

    if (tr.inWater) {
      // Water ripple around floating ocean trash
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.55)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(x, y + 1, 5.2, 2.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.beginPath();
      ctx.ellipse(x, y + 1.5, 3.6, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (tr.kind === 'bottle') {
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(x - 1.5, y - 2.6, 3, 4.6);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(x - 1, y - 3.6, 2, 1.1);
    } else if (tr.kind === 'can') {
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(x - 1.8, y - 1.8, 3.6, 3);
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(x - 1.8, y - 0.6, 3.6, 1.1);
    } else if (tr.kind === 'bag') {
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(x, y - 0.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(x - 1.4, y - 2.2, 2.8, 0.8);
    } else {
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(x - 2.2, y - 1.4, 4.4, 2.4);
    }
  }
  ctx.restore();
}

function drawCarTooltipBadge(ctx: CanvasRenderingContext2D, car: Car, isSelected = false) {
  if (!car.destLabel) return;

  if (isSelected) {
    ctx.save();
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(car.wx, car.wy, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const text = `→ ${car.destLabel}`;
  ctx.save();
  ctx.font = '600 10px Inter, system-ui, sans-serif';
  const tw = ctx.measureText(text).width;
  const px = Math.round(car.wx - (tw + 12) / 2);
  const py = Math.round(car.wy - 26);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  ctx.beginPath();
  ctx.roundRect(px, py, tw + 12, 16, 4);
  ctx.fill();
  ctx.strokeStyle = isSelected ? '#FACC15' : 'rgba(250, 204, 21, 0.75)';
  ctx.lineWidth = isSelected ? 1.4 : 1;
  ctx.stroke();

  ctx.fillStyle = '#FEF9C3';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, px + 6, py + 8);
  ctx.restore();
}

function drawHoveredCarTooltip(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  worldX: number,
  worldY: number,
  alreadyDrawnId?: string
) {
  let nearest: Car | null = null;
  let bestDist = 18;
  for (const car of sim.cars) {
    const d = Math.hypot(car.wx - worldX, car.wy - worldY);
    if (d < bestDist) {
      bestDist = d;
      nearest = car;
    }
  }
  if (!nearest || !nearest.destLabel || nearest.id === alreadyDrawnId) return;
  drawCarTooltipBadge(ctx, nearest, false);
}

function drawAnimals(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  wallTimeSeconds: number
) {
  if (sim.animals.length === 0) return;
  ctx.save();
  for (const a of sim.animals) {
    ctx.save();
    ctx.translate(a.wx, a.wy);
    if (a.vx < -0.5) {
      ctx.scale(-1, 1);
    }

    if (a.kind === 'bird') {
      const flap = Math.sin(wallTimeSeconds * 16 + a.animPhase) * 2.5;
      const altitude = a.state === 'flying' ? -8 : -Math.abs(Math.sin(wallTimeSeconds * 5 + a.animPhase)) * 1.4;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 3, 2.8, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.ellipse(0, altitude, 2.8, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-2, altitude - flap * 0.5);
      ctx.lineTo(0, altitude);
      ctx.lineTo(2, altitude - flap * 0.5);
      ctx.stroke();
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(2.6, altitude - 0.5, 1.4, 0.9);
    } else if (a.kind === 'cow') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
      ctx.beginPath();
      ctx.ellipse(0, 3.2, 5.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      const bob = a.state === 'roaming' ? Math.abs(Math.sin(a.animPhase)) * 0.8 : 0;
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(-4.5, -3.5 - bob, 8, 5);
      // Black cow patches
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-3.5, -3.5 - bob, 2.8, 2.6);
      ctx.fillRect(0.6, -1.6 - bob, 2.2, 2.2);
      // Legs
      ctx.fillRect(-4, 1.2, 1.2, 2.2);
      ctx.fillRect(-1.5, 1.2, 1.2, 2.2);
      ctx.fillRect(1.8, 1.2, 1.2, 2.2);
      // Head
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(3.2, -3.8 - bob, 3, 3.2);
      ctx.fillStyle = '#FDA4AF';
      ctx.fillRect(4.8, -2 - bob, 1.8, 1.4);
    } else if (a.kind === 'pig') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 2.8, 4.2, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      const bob = a.state === 'roaming' ? Math.abs(Math.sin(a.animPhase)) * 0.7 : 0;
      ctx.fillStyle = '#F9A8D4';
      ctx.beginPath();
      ctx.ellipse(0, -1 - bob, 4.2, 2.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F472B6';
      ctx.fillRect(3.4, -2.1 - bob, 1.8, 2);
      ctx.fillStyle = '#DB2777';
      ctx.fillRect(-2.6, 1.3, 1, 1.6);
      ctx.fillRect(1.4, 1.3, 1, 1.6);
    } else {
      // Chicken
      const hop = Math.abs(Math.sin(wallTimeSeconds * 7 + a.animPhase)) * 1.1;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 2.5, 2.5, 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFBEB';
      ctx.beginPath();
      ctx.ellipse(0, -hop, 2.4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(0.6, -2.8 - hop, 1.5, 1.1);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(2.1, -0.6 - hop, 1.3, 0.9);
    }

    ctx.restore();
  }
  ctx.restore();
}

function drawTornado(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  wallTimeSeconds: number
) {
  if (!sim.crises.tornadoActive) return;
  const x = sim.crises.tornadoWx;
  const y = sim.crises.tornadoWy;

  ctx.save();
  // Ground dust shadow vortex
  ctx.fillStyle = 'rgba(51, 65, 85, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 26, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stacked swirling funnel rings tapering bottom-to-top
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    const sway = Math.sin(wallTimeSeconds * 9 + i * 0.7) * (3 + t * 5);
    const ry = y - i * 8.5;
    const radX = 5 + t * 24;
    const radY = 2.6 + t * 5.2;
    ctx.fillStyle =
      i % 2 === 0 ? 'rgba(71, 85, 105, 0.72)' : 'rgba(100, 116, 139, 0.62)';
    ctx.beginPath();
    ctx.ellipse(x + sway, ry, radX, radY, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Orbiting debris specks
  ctx.fillStyle = '#CBD5E1';
  for (let d = 0; d < 8; d++) {
    const ang = wallTimeSeconds * 8 + d * 0.8;
    const rx = x + Math.cos(ang) * (10 + d * 2.8);
    const ry = y - 12 - d * 8 + Math.sin(ang) * 4;
    ctx.fillRect(rx, ry, 2.5, 2.5);
  }
  ctx.restore();
}

function drawCar(ctx: CanvasRenderingContext2D, car: Car, nightFactor: number) {
  ctx.save();
  ctx.translate(car.wx, car.wy);
  ctx.rotate(car.angle);
  if (car.swerveOffset) {
    ctx.translate(0, car.swerveOffset);
  }

  let len = 13;
  let wid = 7.4;
  if (car.type === 'bus' || car.type === 'firetruck') {
    len = 18;
    wid = 8.4;
  } else if (car.type === 'van' || car.type === 'ambulance' || car.type === 'hearse') {
    len = 15.5;
    wid = 8;
  } else if (car.type === 'hatchback') {
    len = 11.5;
    wid = 7;
  }

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(-len / 2 + 1.5, -wid / 2 + 1.5, len, wid);

  // Car body
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-len / 2, -wid / 2, len, wid, 2);
  ctx.fill();

  // Body outline for high contrast
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Windshield
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(len * 0.08, -wid * 0.35, len * 0.24, wid * 0.7);

  // Rear window for sedan/hatchback
  if (car.type === 'sedan' || car.type === 'hatchback') {
    ctx.fillRect(-len * 0.35, -wid * 0.32, len * 0.16, wid * 0.64);
  }

  // School bus dark stripes
  if (car.type === 'bus') {
    ctx.fillStyle = '#78350F';
    ctx.fillRect(-len * 0.4, -wid * 0.38, len * 0.42, 1.2);
    ctx.fillRect(-len * 0.4, wid * 0.38 - 1.2, len * 0.42, 1.2);
  }

  // Ambulance red stripe & flashing roof lightbar
  if (car.type === 'ambulance') {
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-len * 0.36, -1.2, len * 0.35, 2.4);
    const flashRed = Math.sin(car.sirenPhase) > 0;
    ctx.fillStyle = flashRed ? '#EF4444' : '#3B82F6';
    ctx.fillRect(-1.5, -2.5, 3, 5);
  }

  // Police cruiser white doors & flashing red/blue roof lightbar
  if (car.type === 'police') {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(-len * 0.2, -wid / 2 + 0.5, len * 0.42, wid - 1);
    const flashRed = Math.sin(car.sirenPhase) > 0;
    ctx.fillStyle = flashRed ? '#EF4444' : '#38BDF8';
    ctx.fillRect(-1.5, -2.8, 3, 5.6);
  }

  // Fire truck white roof ladder & flashing red/amber siren
  if (car.type === 'firetruck') {
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(-len * 0.42, -wid * 0.28, len * 0.55, 1.1);
    ctx.fillRect(-len * 0.42, wid * 0.28 - 1.1, len * 0.55, 1.1);
    for (let rung = -len * 0.36; rung <= len * 0.06; rung += 2.6) {
      ctx.fillRect(rung, -wid * 0.28, 0.9, wid * 0.56);
    }
    const flashRed = Math.sin(car.sirenPhase) > 0;
    ctx.fillStyle = flashRed ? '#FACC15' : '#FFFFFF';
    ctx.fillRect(len * 0.12, -2.8, 2.4, 5.6);
  }

  // Hearse silver roof trim
  if (car.type === 'hearse') {
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.strokeRect(-len * 0.42, -wid * 0.34, len * 0.48, wid * 0.68);
  }

  // Brake lights (bright red when braking/jammed!)
  if (car.isBraking || car.isJammed || nightFactor > 0.25) {
    const intensity = car.isBraking || car.isJammed ? 1.0 : 0.55;
    ctx.fillStyle = `rgba(239, 68, 68, ${intensity})`;
    ctx.fillRect(-len / 2 - 0.5, -wid * 0.4, 1.8, 2);
    ctx.fillRect(-len / 2 - 0.5, wid * 0.4 - 2, 1.8, 2);
  }

  // Headlight lamps at dusk/night
  if (nightFactor > 0.18) {
    ctx.fillStyle = '#FEF9C3';
    ctx.fillRect(len / 2 - 1.2, -wid * 0.4, 1.6, 1.8);
    ctx.fillRect(len / 2 - 1.2, wid * 0.4 - 1.8, 1.6, 1.8);
  }

  ctx.restore();
}

function drawNightLighting(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  strength: number,
  wallTimeSeconds: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 1. Building lit windows + cozy ambient warm glow
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const tile = sim.tiles[y * sim.gridCols + x];
      const wx = x * TILE_SIZE;
      const wy = y * TILE_SIZE;

      if (tile.building && (tile.building.category !== 'commercial' || sim.isStoreOpen())) {
        const cached = getOrCreateIconCanvas(tile.building.iconGrid);
        if (cached.hasGlow) {
          ctx.globalAlpha = strength * 0.92;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(cached.glowCanvas, wx + 4, wy + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          ctx.imageSmoothingEnabled = true;

          // Warm spill halo around building
          const cx = wx + TILE_SIZE / 2;
          const cy = wy + TILE_SIZE / 2;
          const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 34);
          grad.addColorStop(0, `rgba(253, 224, 71, ${strength * 0.24})`);
          grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
          ctx.globalAlpha = 1;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, 34, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Streetlights at road intersections & every 3rd road tile, plus footbridge lanterns
      if (
        (tile.hasRoad && ((x + y) % 3 === 0 || isIntersectionTile(sim.tiles, x, y, sim.gridCols, sim.gridRows))) ||
        (tile.terrain === 'water' && tile.hasFootbridge)
      ) {
        const cx = wx + TILE_SIZE / 2;
        const cy = wy + TILE_SIZE / 2;
        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 30);
        grad.addColorStop(0, `rgba(251, 191, 36, ${strength * 0.22})`);
        grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Warm canopy lantern glow over pop-up market stalls at night
  for (const stall of sim.marketStalls) {
    const grad = ctx.createRadialGradient(stall.wx, stall.wy - 4, 2, stall.wx, stall.wy - 4, 32);
    grad.addColorStop(0, `rgba(253, 224, 71, ${strength * 0.36})`);
    grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(stall.wx, stall.wy - 4, 32, 0, Math.PI * 2);
    ctx.fill();
  }

  // Festive lantern halo around active celebrations, weddings, ceremonies, and events at night
  for (const ev of sim.cityEvents) {
    const cx = (ev.x + 0.5) * TILE_SIZE;
    const cy = (ev.y + 0.5) * TILE_SIZE;
    const pulse = 0.85 + 0.15 * Math.sin(wallTimeSeconds * 5 + ev.x);
    const glowRgb =
      ev.type === 'wedding'
        ? '251, 113, 133'
        : ev.type === 'ceremony'
        ? '167, 139, 250'
        : ev.type === 'celebration'
        ? '244, 114, 182'
        : ev.type === 'campaign'
        ? '74, 222, 128'
        : '250, 204, 21';
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 46);
    grad.addColorStop(0, `rgba(${glowRgb}, ${strength * 0.42 * pulse})`);
    grad.addColorStop(1, `rgba(${glowRgb}, 0)`);
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.fill();
  }

  // Flickering firelight halo around active fires at night
  for (const fire of sim.fires) {
    if (fire.status !== 'active') continue;
    const flicker = 0.8 + 0.2 * Math.sin(wallTimeSeconds * 16 + fire.x * 2);
    const grad = ctx.createRadialGradient(fire.wx, fire.wy, 4, fire.wx, fire.wy, 52);
    grad.addColorStop(0, `rgba(251, 146, 60, ${strength * 0.65 * fire.intensity * flicker})`);
    grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(fire.wx, fire.wy, 52, 0, Math.PI * 2);
    ctx.fill();
  }

  // Blinking amber/red hazard glow around active car crashes at night
  for (const crash of sim.crashes) {
    if (crash.status !== 'active') continue;
    const blink = Math.sin(wallTimeSeconds * 9 + crash.x) > 0;
    const grad = ctx.createRadialGradient(crash.wx, crash.wy, 2, crash.wx, crash.wy, 34);
    grad.addColorStop(
      0,
      blink ? `rgba(245, 158, 11, ${strength * 0.55})` : `rgba(239, 68, 68, ${strength * 0.48})`
    );
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(crash.wx, crash.wy, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  // Warm lantern halo for fishers out by the water at night
  for (const person of sim.people) {
    if (person.role !== 'fisher' || person.state !== 'fishing') continue;
    const flicker = 0.9 + 0.1 * Math.sin(wallTimeSeconds * 7 + person.wx);
    const grad = ctx.createRadialGradient(person.wx, person.wy, 2, person.wx, person.wy, 26);
    grad.addColorStop(0, `rgba(253, 224, 71, ${strength * 0.45 * flicker})`);
    grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(person.wx, person.wy, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Car headlights & brake/emergency glows
  ctx.globalAlpha = 1;
  for (const car of sim.cars) {
    ctx.save();
    ctx.translate(car.wx, car.wy);
    ctx.rotate(car.angle);

    // Forward headlight cone
    const coneLen = 58;
    const coneGrad = ctx.createLinearGradient(5, 0, coneLen, 0);
    coneGrad.addColorStop(0, `rgba(254, 249, 195, ${strength * 0.42})`);
    coneGrad.addColorStop(1, 'rgba(254, 249, 195, 0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(5, -3.5);
    ctx.lineTo(coneLen, -16);
    ctx.lineTo(coneLen, 16);
    ctx.lineTo(5, 3.5);
    ctx.closePath();
    ctx.fill();

    // Brake taillight glow
    if (car.isBraking || car.isJammed) {
      const tailGrad = ctx.createRadialGradient(-7, 0, 1, -7, 0, 14);
      tailGrad.addColorStop(0, `rgba(239, 68, 68, ${strength * 0.55})`);
      tailGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      ctx.arc(-7, 0, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ambulance, Police & Fire Truck siren halo
    if (car.type === 'ambulance' || car.type === 'police' || car.type === 'firetruck') {
      const flashRed = Math.sin(car.sirenPhase + wallTimeSeconds * 2) > 0;
      const sirenColor =
        car.type === 'firetruck'
          ? flashRed
            ? 'rgba(239, 68, 68, 0.6)'
            : 'rgba(250, 204, 21, 0.55)'
          : flashRed
          ? 'rgba(239, 68, 68, 0.55)'
          : 'rgba(59, 130, 246, 0.55)';
      const sGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
      sGrad.addColorStop(0, sirenColor);
      sGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
}

function drawNeighbourhoodZones(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  for (const nb of sim.neighbourhoods) {
    ctx.save();
    for (const pt of nb.tiles) {
      const wx = pt.x * TILE_SIZE;
      const wy = pt.y * TILE_SIZE;
      ctx.fillStyle = `${nb.color}22`;
      ctx.fillRect(wx + 1, wy + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      ctx.strokeStyle = `${nb.color}88`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(wx + 1.5, wy + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
    }

    // Subtle dashed outer bounding frame around the cluster
    const bx = nb.minX * TILE_SIZE - 2;
    const by = nb.minY * TILE_SIZE - 2;
    const bw = (nb.maxX - nb.minX + 1) * TILE_SIZE + 4;
    const bh = (nb.maxY - nb.minY + 1) * TILE_SIZE + 4;
    ctx.strokeStyle = `${nb.color}66`;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawNeighbourhoodLabels(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  ctx.save();
  ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
  ctx.textBaseline = 'middle';

  for (const nb of sim.neighbourhoods) {
    const label = `${nb.name} · ${nb.houseIds.length} homes`;
    const metrics = ctx.measureText(label);
    const padX = 7;
    const w = metrics.width + padX * 2;
    const h = 18;
    const cx = ((nb.minX + nb.maxX + 1) / 2) * TILE_SIZE;
    const ly = Math.max(4, nb.minY * TILE_SIZE - 12);
    const lx = cx - w / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
    ctx.beginPath();
    ctx.roundRect(lx, ly - h / 2, w, h, 4);
    ctx.fill();

    ctx.strokeStyle = nb.color;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, ly + 0.5);
  }
  ctx.restore();
}

function drawRobberyAlerts(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  wallTimeSeconds: number
) {
  ctx.save();
  for (const rob of sim.robberies) {
    const cx = (rob.x + 0.5) * TILE_SIZE;
    const cy = (rob.y + 0.5) * TILE_SIZE;

    if (rob.status === 'active') {
      const pulse = (Math.sin(wallTimeSeconds * 7) + 1) * 0.5;
      const ringRadius = 22 + pulse * 8;

      // Pulsing crimson alert ring
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.45 + pulse * 0.5})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Escape countdown arc
      const remainingFrac = Math.max(0, 1 - rob.elapsedSeconds / rob.escapeLimitSeconds);
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remainingFrac);
      ctx.stroke();

      // Alert badge tag above house
      const text = rob.policeDispatched ? 'ROBBERY · POLICE EN ROUTE' : 'ROBBERY!';
      ctx.font = '700 9px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(text).width + 10;
      const by = rob.y * TILE_SIZE - 11;

      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2, by - 7, tw, 15, 3);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, by + 0.5);
    } else {
      const isCaught = rob.status === 'caught';
      const text = isCaught ? 'STOPPED!' : 'ESCAPED';
      ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(text).width + 10;
      const by = rob.y * TILE_SIZE - 12;

      ctx.fillStyle = isCaught ? '#059669' : '#D97706';
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2, by - 8, tw, 16, 3);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, by + 0.5);
    }
  }
  ctx.restore();
}

function drawDeathPopups(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  for (const ev of sim.deathEvents) {
    const t = ev.age / ev.maxAge;
    // Pop-in bounce in first 0.35s, fade out in last 1.2s
    const popIn = Math.min(1, ev.age / 0.3);
    const scale = popIn < 1 ? 0.4 + 0.6 * (1 - Math.pow(1 - popIn, 3)) : 1;
    const fadeOut = ev.age > ev.maxAge - 1.2 ? Math.max(0, (ev.maxAge - ev.age) / 1.2) : 1;
    const floatY = ev.wy - 18 - t * 20;

    ctx.save();
    ctx.globalAlpha = fadeOut;
    ctx.translate(ev.wx, floatY);
    ctx.scale(scale, scale);

    // Subtle soft memorial halo
    ctx.fillStyle = 'rgba(203, 213, 225, 0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();

    // Dark slate circular medallion
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Crisp Skull Death Icon inside medallion
    ctx.fillStyle = '#F8FAFC';
    // Cranium
    ctx.beginPath();
    ctx.arc(0, -1.5, 5.8, 0, Math.PI * 2);
    ctx.fill();
    // Jaw
    ctx.fillRect(-3.4, 2, 6.8, 4.2);

    // Eyes
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-2.1, -1.3, 1.35, 0, Math.PI * 2);
    ctx.arc(2.1, -1.3, 1.35, 0, Math.PI * 2);
    ctx.fill();

    // Teeth slits
    ctx.fillRect(-1.8, 4.1, 1, 2.1);
    ctx.fillRect(0.8, 4.1, 1, 2.1);

    // R.I.P. caption tag below medallion
    ctx.font = '700 8.5px "Plus Jakarta Sans", sans-serif';
    const label = 'PASSED AWAY';
    const tw = ctx.measureText(label).width + 8;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(-tw / 2, 15, tw, 13, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.fillStyle = '#E2E8F0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 21.8);

    ctx.restore();
  }
}

function drawChoppedTreeEvents(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  for (const ev of sim.choppedTreeEvents) {
    const fade = ev.age > ev.maxAge - 1.5 ? Math.max(0, (ev.maxAge - ev.age) / 1.5) : 1;
    ctx.save();
    ctx.globalAlpha = fade;

    // Fresh wooden stump on grass
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath();
    ctx.ellipse(ev.wx + 1, ev.wy + 5, 6.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#78350F';
    ctx.fillRect(ev.wx - 4, ev.wy - 2, 8, 6);
    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.ellipse(ev.wx, ev.wy - 2, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Floating TIMBER! label during first 2.5s
    if (ev.age < 2.5) {
      const lift = (ev.age / 2.5) * 14;
      ctx.font = '700 8.5px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#78350F';
      ctx.fillText('TIMBER!', ev.wx + 0.5, ev.wy - 10 - lift + 0.5);
      ctx.fillStyle = '#FEF3C7';
      ctx.fillText('TIMBER!', ev.wx, ev.wy - 10 - lift);
    }

    ctx.restore();
  }
}

function drawWoodChips(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  for (const chip of sim.woodChips) {
    const alpha = Math.max(0, 1 - chip.age / chip.maxAge);
    ctx.fillStyle = chip.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(chip.wx - 1.5, chip.wy - 1.5, 3, 2.5);
  }
  ctx.globalAlpha = 1;
}

function drawSmokeParticles(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  for (const s of sim.smokeParticles) {
    const alpha = Math.max(0, 1 - s.age / s.maxAge);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.wx, s.wy, s.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFires(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  wallTimeSeconds: number
) {
  for (const fire of sim.fires) {
    if (fire.status !== 'active') continue;
    const scale = Math.max(0.35, fire.intensity);
    const flicker1 = Math.sin(wallTimeSeconds * 16 + fire.x * 2.1) * 2.5;
    const flicker2 = Math.cos(wallTimeSeconds * 21 + fire.y * 1.7) * 2.2;

    const tongues = [
      { ox: -7, oy: 4, h: 15 * scale + flicker1, w: 6 },
      { ox: 6, oy: 5, h: 13 * scale + flicker2, w: 5.5 },
      { ox: 0, oy: 1, h: 19 * scale - flicker1 * 0.7, w: 7 },
    ];

    for (const t of tongues) {
      const fx = fire.wx + t.ox;
      const fy = fire.wy + t.oy;
      // Outer orange-red flame
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.beginPath();
      ctx.moveTo(fx - t.w, fy);
      ctx.quadraticCurveTo(fx - t.w * 0.5, fy - t.h * 0.7, fx + flicker2 * 0.4, fy - t.h);
      ctx.quadraticCurveTo(fx + t.w * 0.5, fy - t.h * 0.7, fx + t.w, fy);
      ctx.closePath();
      ctx.fill();

      // Inner bright amber/yellow core
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(fx - t.w * 0.5, fy);
      ctx.quadraticCurveTo(fx, fy - t.h * 0.55, fx, fy - t.h * 0.65);
      ctx.quadraticCurveTo(fx, fy - t.h * 0.55, fx + t.w * 0.5, fy);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawConfetti(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  for (const c of sim.confetti) {
    const alpha = Math.max(0, 1 - c.age / c.maxAge);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(c.wx, c.wy);
    ctx.rotate(c.age * 9 + c.wx * 0.2);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.size * 0.5, -c.size * 0.35, c.size, c.size * 0.7);
    ctx.restore();
  }
}

function drawSnowmen(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  if (sim.snowmen.length === 0) return;
  for (const sm of sim.snowmen) {
    ctx.save();
    ctx.translate(sm.wx, sm.wy);
    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 5.2, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    // Base + torso + head
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 1, 4.4, 0, Math.PI * 2);
    ctx.arc(0, -4.5, 3.2, 0, Math.PI * 2);
    ctx.arc(0, -9, 2.3, 0, Math.PI * 2);
    ctx.fill();
    // Scarf
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(-2.6, -7, 5.2, 1.4);
    // Carrot nose
    ctx.fillStyle = '#F97316';
    ctx.fillRect(0.6, -9.2, 2.5, 1);
    // Top hat
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-2.8, -11.4, 5.6, 1);
    ctx.fillRect(-1.8, -13.6, 3.6, 2.3);
    ctx.restore();
  }
}

function drawSnowballs(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  if (sim.snowballs.length === 0) return;
  for (const sb of sim.snowballs) {
    const t = Math.max(0, Math.min(1, sb.progress));
    const x = sb.x1 + (sb.x2 - sb.x1) * t;
    const yGround = sb.y1 + (sb.y2 - sb.y1) * t;
    const arcLift = Math.sin(t * Math.PI) * 14;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x, yGround + 4, 2.2, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, yGround - arcLift, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPorchPapers(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  if (sim.porchPapers.length === 0) return;
  ctx.save();
  for (const pp of sim.porchPapers) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.26)';
    ctx.fillRect(pp.wx - 3, pp.wy + 1.5, 6.2, 3.6);
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(pp.wx - 3.2, pp.wy - 1.5, 6.4, 3.8);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(pp.wx - 3.2, pp.wy - 1.5, 6.4, 3.8);
    // Tiny headline & red tie ribbon
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(pp.wx - 2.1, pp.wy - 0.5, 4.2, 0.9);
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(pp.wx - 0.4, pp.wy - 1.5, 0.9, 3.8);
  }
  ctx.restore();
}

function drawPeople(ctx: CanvasRenderingContext2D, sim: CitySimulation, wallTimeSeconds: number) {
  const isRaining = sim.isRainingOrStorming();
  const sorted = [...sim.people].sort((a, b) => a.wy - b.wy);
  for (const p of sorted) {
    if (sim.crises.floodActive && p.role !== 'kayaker') {
      const pt = sim.getTile(Math.floor(p.wx / TILE_SIZE), Math.floor(p.wy / TILE_SIZE));
      if (pt?.isFlooded) {
        ctx.save();
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.78)';
        ctx.lineWidth = 1.1;
        const r = 4.5 + Math.abs(Math.sin(wallTimeSeconds * 7 + p.animPhase)) * 2.2;
        ctx.beginPath();
        ctx.ellipse(p.wx, p.wy + 2.2, r, r * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    drawPersonSprite(ctx, p, wallTimeSeconds, sim.season, isRaining);
  }
}

function drawPersonSprite(
  ctx: CanvasRenderingContext2D,
  p: Person,
  wallTimeSeconds: number,
  season: SeasonType,
  isRaining: boolean
) {
  // Hostile Armored Tank unit during invasions
  if (p.role === 'invader' && p.hasTank) {
    ctx.save();
    ctx.translate(p.wx, p.wy);
    const angle = Math.atan2(p.targetWy - p.wy, p.targetWx - p.wx);
    ctx.save();
    ctx.rotate(angle);
    // Tank shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.fillRect(-10, -7, 21, 16);
    // Heavy caterpillar treads
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-10.5, -8, 21, 3.2);
    ctx.fillRect(-10.5, 4.8, 21, 3.2);
    // Olive-slate armored hull
    ctx.fillStyle = '#3F4D36';
    ctx.fillRect(-8.5, -5.8, 17, 11.6);
    ctx.strokeStyle = '#7F1D1D';
    ctx.lineWidth = 1;
    ctx.strokeRect(-8.5, -5.8, 17, 11.6);
    // Cannon turret + barrel
    ctx.fillStyle = '#4B5E3F';
    ctx.beginPath();
    ctx.arc(-1, 0, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(2, -1.2, 11, 2.4);
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-2.5, -1.5, 3, 3);
    ctx.restore();

    // Armor health pips above tank
    const hp = p.health ?? 3;
    const pipCount = Math.max(3, hp);
    const totalW = pipCount * 4.2;
    for (let h = 0; h < pipCount; h++) {
      ctx.fillStyle = h < hp ? '#EF4444' : '#334155';
      ctx.fillRect(-totalW / 2 + h * 4.4, -12.5, 3.4, 2.2);
    }
    ctx.restore();
    return;
  }

  // Floating/paddling Kayaker, Canoer, Rower, or Swimmer on water
  if (p.role === 'kayaker' && p.state === 'kayaking') {
    ctx.save();
    ctx.translate(p.wx, p.wy);
    const act = p.waterActivity || 'kayak';

    if (act === 'swim') {
      // Front-crawl swimmer with splashing water ripples & goggles
      const stroke = Math.sin(p.animPhase * 1.4);
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.85)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(0, 1.5, 7 + Math.abs(stroke) * 2.5, 3.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Torso submerged horizontally
      ctx.fillStyle = p.shirtColor;
      ctx.fillRect(-3.8, -1.2, 6.2, 3.4);
      // Animated reaching swim arms
      ctx.strokeStyle = '#FDBA74';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.lineTo(4.2, -3.5 + stroke * 3);
      ctx.moveTo(0, 1.5);
      ctx.lineTo(-3.5, 3.6 - stroke * 2.8);
      ctx.stroke();
      // Swim cap + goggles
      ctx.fillStyle = p.hatColor || '#F43F5E';
      ctx.beginPath();
      ctx.arc(3.5, -0.4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(4.3, -1.3, 1.8, 1.3);
      ctx.restore();
      return;
    }

    const yaw = p.facingAngle !== undefined ? p.facingAngle : 0;
    const faceDir = Math.cos(yaw) < 0 ? -1 : 1;

    if (act === 'rowing') {
      // Classic wooden rowboat hull with twin side oars & wake rings
      const rowPull = Math.sin(p.animPhase * 0.9) * 0.6;
      ctx.save();
      ctx.scale(faceDir, 1);
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.72)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(0, 3.2, 12.2, 4.8, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Boat hull
      ctx.fillStyle = '#92400E';
      ctx.beginPath();
      ctx.ellipse(0, 1.6, 10.6, 4.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.ellipse(0, 1.3, 7.6, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wooden thwart bench + seated rower
      ctx.fillStyle = '#78350F';
      ctx.fillRect(-1.8, -0.8, 3.6, 4.4);
      ctx.fillStyle = p.shirtColor;
      ctx.fillRect(-2.4, -4.4, 4.8, 4.8);
      ctx.fillStyle = '#FDBA74';
      ctx.beginPath();
      ctx.arc(0, -6.5, 2.3, 0, Math.PI * 2);
      ctx.fill();
      // Twin synchronized side oars
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-1, -1.5);
      ctx.lineTo(-4 + rowPull * 5, -7.2);
      ctx.moveTo(1, 2.8);
      ctx.lineTo(-2 + rowPull * 5, 8.6);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
      return;
    }

    const paddleAngle = Math.sin(p.animPhase) * 0.55;
    ctx.save();
    ctx.scale(faceDir, 1);
    // Water wake ripples
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.7)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(0, 3, 10.5, 4.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Sleek canoe / kayak hull
    ctx.fillStyle = p.shirtColor === '#06B6D4' ? '#F59E0B' : '#06B6D4';
    ctx.beginPath();
    ctx.ellipse(0, 1.5, 9.5, 3.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.ellipse(0, 1.2, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Seated paddler torso + head
    ctx.fillStyle = p.shirtColor;
    ctx.fillRect(-2.6, -4.5, 5.2, 5.2);
    ctx.fillStyle = '#FDBA74';
    ctx.beginPath();
    ctx.arc(0, -6.8, 2.4, 0, Math.PI * 2);
    ctx.fill();
    // Sweeping double-bladed paddle
    ctx.save();
    ctx.translate(0, -2.5);
    ctx.rotate(paddleAngle);
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-9.5, -1.2, 2.4, 2.4);
    ctx.fillRect(7.1, -1.2, 2.4, 2.4);
    ctx.restore();
    ctx.restore();
    ctx.restore();
    return;
  }

  const bob =
    p.role === 'celebrant' || p.state === 'playing_park'
      ? Math.abs(Math.sin(p.animPhase)) * 2.5
      : p.state === 'walking' ||
        p.state === 'chasing' ||
        p.state === 'returning' ||
        p.state === 'protesting' ||
        p.state === 'patrolling' ||
        p.state === 'invading' ||
        p.state === 'escaping' ||
        p.state === 'delivering' ||
        p.state === 'delivering_paper' ||
        p.state === 'building' ||
        p.state === 'building_boat' ||
        p.state === 'field_trip'
      ? Math.abs(Math.sin(p.animPhase)) * 1.8
      : 0;

  ctx.save();
  ctx.translate(p.wx, p.wy);

  // Partially built wooden canoe or rowboat hull on shoreline sawhorses while human builds it
  if (p.role === 'kayaker' && p.state === 'building_boat') {
    const progress = Math.max(0.15, Math.min(1, 1 - p.holdTimer / 4.6));
    const isRow = p.waterActivity === 'rowing';
    // Timber sawhorses
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(4, 3);
    ctx.lineTo(6, 0);
    ctx.lineTo(8, 3);
    ctx.moveTo(11, 3);
    ctx.lineTo(13, 0);
    ctx.lineTo(15, 3);
    ctx.stroke();
    // Wooden boat/canoe hull growing as carpenter builds
    ctx.fillStyle = isRow ? '#92400E' : '#B45309';
    ctx.beginPath();
    ctx.ellipse(9.5, 0.2, 7.5 * progress + 2, isRow ? 2.8 : 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    if (progress > 0.45) {
      ctx.fillStyle = isRow ? '#FEF3C7' : '#F59E0B';
      ctx.beginPath();
      ctx.ellipse(9.5, -0.1, 4.8 * progress + 1, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Tiny construction progress bar above
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(2, -9.5, 15, 2.6);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(2.5, -9, 14 * progress, 1.6);
  }

  // Beach towel underneath sunbathers
  if (p.role === 'hobbyist' && p.hobbyKind === 'sunbathing' && p.state === 'doing_hobby') {
    ctx.fillStyle = '#F43F5E';
    ctx.fillRect(-7, 0.5, 14, 6);
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(-5, 0.5, 3, 6);
    ctx.fillRect(2, 0.5, 3, 6);
  }

  // Subtle lime fever ring for infected citizens during a Virus Outbreak
  if (p.isInfected) {
    const pulse = 0.55 + 0.35 * Math.sin(wallTimeSeconds * 7 + p.animPhase);
    ctx.strokeStyle = `rgba(132, 204, 22, ${pulse})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 3.5, 6.2, 3.1, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const isKid = Boolean(p.isChild || (p.role === 'student' && p.shirtColor !== '#0F766E'));

  // Ground shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
  ctx.beginPath();
  ctx.ellipse(
    0,
    3.5,
    p.role === 'paperboy' || p.hasBicycle ? 7.5 : isKid ? 3.2 : 4.2,
    isKid ? 1.7 : 2.2,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Bicycle under delivering paperboy
  if (p.role === 'paperboy' || p.hasBicycle) {
    const dir = p.targetWx < p.wx - 1 ? -1 : 1;
    ctx.save();
    ctx.scale(dir, 1);
    // Wheels
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-4.5, 2.2, 2.6, 0, Math.PI * 2);
    ctx.arc(4.8, 2.2, 2.6, 0, Math.PI * 2);
    ctx.stroke();
    // Bicycle diamond frame & handlebars
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-4.5, 2.2);
    ctx.lineTo(-0.8, -1.6);
    ctx.lineTo(3.5, -1.6);
    ctx.lineTo(4.8, 2.2);
    ctx.moveTo(-0.8, -1.6);
    ctx.lineTo(0.2, 2.2);
    ctx.stroke();
    // Handlebars & front paper basket
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(3.5, -1.6);
    ctx.lineTo(3.1, -4.4);
    ctx.lineTo(4.8, -4.6);
    ctx.stroke();
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(3.6, -3.5, 2.8, 2.1);
    ctx.restore();
  }

  // Ice-skate trail arc & blades for Winter ice skaters
  if (p.role === 'hobbyist' && p.hobbyKind === 'ice_skating' && p.state === 'doing_hobby') {
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.8)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(-2, 3, 7, Math.PI * 0.2, Math.PI * 1.1);
    ctx.stroke();
  }

  // Skateboard deck & tiny wheels under skaters
  if (p.role === 'hobbyist' && p.hobbyKind === 'skateboarding' && p.state === 'doing_hobby') {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-5.2, 2.2, 10.4, 2.1);
    ctx.fillStyle = '#F43F5E';
    ctx.fillRect(-4.4, 2.5, 8.8, 1.3);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-4, 4.2, 1.6, 1.2);
    ctx.fillRect(2.4, 4.2, 1.6, 1.2);
  }

  ctx.save();
  if (isKid) {
    // Anchor feet at ground level (y = 3.5) and scale kids noticeably shorter than adults
    ctx.translate(0, 3.5);
    ctx.scale(0.84, 0.7);
    ctx.translate(0, -3.5);
  }

  const bodyY = -bob;

  // Legs (or skates in Winter ice skating)
  ctx.fillStyle = '#1E293B';
  const stride =
    p.state === 'walking' ||
    p.state === 'chasing' ||
    p.state === 'returning' ||
    p.state === 'patrolling' ||
    p.state === 'invading' ||
    p.state === 'escaping' ||
    p.state === 'delivering'
      ? Math.sin(p.animPhase) * 1.4
      : 0;
  ctx.fillRect(-2.2, bodyY + 0.5, 1.8, 3 + stride * 0.4);
  ctx.fillRect(0.4, bodyY + 0.5, 1.8, 3 - stride * 0.4);
  if (p.role === 'hobbyist' && p.hobbyKind === 'ice_skating') {
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(-2.6, bodyY + 3.4, 2.6, 1.1);
    ctx.fillRect(0.4, bodyY + 3.4, 2.6, 1.1);
  }

  // Shirt / Seasonal Coat
  ctx.fillStyle = p.shirtColor;
  ctx.beginPath();
  ctx.roundRect(season === 'Winter' ? -3.8 : -3.4, bodyY - 5, season === 'Winter' ? 7.6 : 6.8, 6, 1.5);
  ctx.fill();

  // Seasonal wardrobe details (Winter coat trim & scarf, Autumn warm vest/scarf, Spring light collar)
  if (season === 'Winter' && p.role !== 'invader') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(-3.8, bodyY - 0.5, 7.6, 1.2);
    const scarfColors = ['#EF4444', '#38BDF8', '#FACC15', '#EC4899'];
    ctx.fillStyle = scarfColors[p.shirtColor.charCodeAt(1) % scarfColors.length];
    ctx.fillRect(-2.8, bodyY - 5.2, 5.6, 1.5);
  } else if (season === 'Autumn' && p.role !== 'invader' && p.role !== 'police' && p.role !== 'firefighter') {
    ctx.fillStyle = '#92400E';
    ctx.fillRect(-2.5, bodyY - 5, 5, 1.3);
  } else if (season === 'Spring' && p.role === 'pedestrian') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.fillRect(-2.4, bodyY - 5, 4.8, 1.1);
  }

  // Mayor golden sash
  if (p.role === 'mayor') {
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-2.8, bodyY - 4.5);
    ctx.lineTo(2.8, bodyY + 0.5);
    ctx.stroke();
  }

  // Police badge chest dot / Vendor apron / Groom tie
  if (p.role === 'police') {
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(1, bodyY - 3.5, 1.4, 1.4);
  } else if (p.role === 'vendor') {
    ctx.fillStyle = '#FFFBEB';
    ctx.fillRect(-2.4, bodyY - 4.2, 4.8, 5.2);
  } else if (p.weddingRole === 'groom') {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(-1.1, bodyY - 4.8, 2.2, 4.2);
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-1.3, bodyY - 4.7, 2.6, 1.1);
  } else if (p.role === 'soldier') {
    ctx.fillStyle = '#A3E635';
    ctx.fillRect(-2.6, bodyY - 4.2, 1.6, 1.2);
  } else if (p.role === 'invader') {
    ctx.fillStyle = '#450A0A';
    ctx.fillRect(-2.5, bodyY - 4.4, 5, 2.2);
  } else if (p.role === 'cleaner') {
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-2.8, bodyY - 3.6, 5.6, 1.2);
  } else if (p.role === 'repairer' || p.role === 'builder') {
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(-2.6, bodyY - 4.4, 1.2, 4.4);
    ctx.fillRect(1.4, bodyY - 4.4, 1.2, 4.4);
  } else if (p.role === 'escapee') {
    // Bright orange jumpsuit with dark horizontal prison stripes
    ctx.fillStyle = '#F97316';
    ctx.fillRect(-3.4, bodyY - 5, 6.8, 6);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-3.4, bodyY - 3.6, 6.8, 1);
    ctx.fillRect(-3.4, bodyY - 1.4, 6.8, 1);
  } else if (p.role === 'farmer') {
    // Denim overalls
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(-2.6, bodyY - 2.8, 5.2, 3.8);
  } else if (p.role === 'butcher') {
    // Crisp white butcher apron
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(-2.6, bodyY - 4, 5.2, 5);
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-1.4, bodyY - 2.2, 2.8, 0.9);
  } else if (p.role === 'parent') {
    // Warm cardigan trim
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(-0.8, bodyY - 4.8, 1.6, 5.5);
  } else if (p.role === 'student') {
    // School backpack straps
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(-3.8, bodyY - 4.2, 1.2, 4);
  }

  // Head
  ctx.fillStyle = '#FDBA74';
  ctx.beginPath();
  ctx.arc(0, bodyY - 7.5, 2.7, 0, Math.PI * 2);
  ctx.fill();

  // Summer sunglasses on sunny outdoor walkers / sunbathers
  if (
    (season === 'Summer' && !isRaining && (p.role === 'shopper' || p.role === 'pedestrian' || p.role === 'hobbyist')) ||
    p.hobbyKind === 'sunbathing'
  ) {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-2.1, bodyY - 8.3, 1.8, 1.1);
    ctx.fillRect(0.3, bodyY - 8.3, 1.8, 1.1);
  }

  // Medical face mask if infected
  if (p.isInfected) {
    ctx.fillStyle = '#BAE6FD';
    ctx.fillRect(-2.2, bodyY - 7.3, 4.4, 2.1);
  }

  // Hats / Hair
  if (p.role === 'mayor') {
    // Tall dark top hat with gold band
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-3.4, bodyY - 10.3, 6.8, 1.3);
    ctx.fillRect(-2.2, bodyY - 13.5, 4.4, 3.4);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-2.2, bodyY - 11.1, 4.4, 1);
  } else if (p.role === 'police') {
    // Peaked police cap
    ctx.fillStyle = '#1E3A8A';
    ctx.fillRect(-3, bodyY - 10.6, 6, 2);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-0.7, bodyY - 10.3, 1.4, 1.2);
  } else if (p.role === 'woodcutter') {
    // Warm lumberjack cap
    ctx.fillStyle = p.hatColor || '#FDE68A';
    ctx.fillRect(-3.2, bodyY - 10.2, 6.4, 1.8);
  } else if (p.role === 'planter') {
    // Leafy green gardener cap
    ctx.fillStyle = '#16A34A';
    ctx.fillRect(-3.2, bodyY - 10.2, 6.4, 1.9);
  } else if (p.role === 'arsonist') {
    // Dark suspicious cap/hood
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-3.2, bodyY - 10.5, 6.4, 2.3);
  } else if (p.role === 'firefighter') {
    // Bright yellow firefighter helmet
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-3.4, bodyY - 10.4, 6.8, 2.2);
    ctx.fillRect(-2.2, bodyY - 11.6, 4.4, 1.4);
  } else if (p.role === 'medic') {
    // Crisp white medical cap with red cross emblem
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(-3.1, bodyY - 10.6, 6.2, 2.1);
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-0.6, bodyY - 10.4, 1.2, 1.7);
    ctx.fillRect(-1.1, bodyY - 9.9, 2.2, 0.7);
  } else if (p.weddingRole === 'bride') {
    // Flowing white bridal veil & tiny floral crown
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, bodyY - 8.2, 3.3, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();
    ctx.fillRect(-3.6, bodyY - 8.2, 2.2, 6.2);
    ctx.fillStyle = '#F472B6';
    ctx.fillRect(-2, bodyY - 10.6, 4, 1.2);
  } else if (p.weddingRole === 'groom') {
    // Sleek dark top hat
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-3.4, bodyY - 10.2, 6.8, 1.2);
    ctx.fillRect(-2.1, bodyY - 13.1, 4.2, 3);
  } else if (p.role === 'celebrant' && p.balloonColor) {
    // Festive cone party hat
    ctx.fillStyle = p.balloonColor;
    ctx.beginPath();
    ctx.moveTo(-2.6, bodyY - 9.2);
    ctx.lineTo(0, bodyY - 14.5);
    ctx.lineTo(2.6, bodyY - 9.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(0, bodyY - 14.8, 1.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.role === 'soldier') {
    // Olive military helmet
    ctx.fillStyle = '#365314';
    ctx.beginPath();
    ctx.arc(0, bodyY - 8.2, 3.2, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-3.5, bodyY - 8.8, 7, 1.2);
  } else if (p.role === 'beggar') {
    // Knitted cap / beanie
    ctx.fillStyle = '#78716C';
    ctx.beginPath();
    ctx.arc(0, bodyY - 8.4, 2.8, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#A8A29E';
    ctx.fillRect(-2.8, bodyY - 8.9, 5.6, 1.1);
  } else if (p.role === 'vendor') {
    // Market vendor visor cap
    ctx.fillStyle = '#B45309';
    ctx.fillRect(-3.1, bodyY - 10.2, 6.2, 1.6);
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(0.2, bodyY - 9.7, 3.6, 0.9);
  } else if (p.role === 'fisher') {
    // Wide-brim bucket / angler hat
    ctx.fillStyle = p.hatColor || '#FDE68A';
    ctx.fillRect(-3.8, bodyY - 10.1, 7.6, 1.3);
    ctx.fillRect(-2.4, bodyY - 11.7, 4.8, 1.7);
  } else if (p.role === 'hobbyist') {
    if (p.hobbyKind === 'painting') {
      // Painter beret
      ctx.fillStyle = '#E11D48';
      ctx.beginPath();
      ctx.ellipse(-0.5, bodyY - 10.2, 3.6, 1.5, -0.18, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.hobbyKind === 'birdwatching') {
      // Safari / sun hat
      ctx.fillStyle = '#D97706';
      ctx.fillRect(-4, bodyY - 10.1, 8, 1.2);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-2.4, bodyY - 11.5, 4.8, 1.5);
    } else if (p.hobbyKind === 'music') {
      // Street musician fedora
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-3.6, bodyY - 10.2, 7.2, 1.2);
      ctx.fillRect(-2.2, bodyY - 11.8, 4.4, 1.7);
      ctx.fillStyle = '#F43F5E';
      ctx.fillRect(-2.2, bodyY - 10.7, 4.4, 0.7);
    } else {
      // Kite flyer cap with visor
      ctx.fillStyle = '#0EA5E9';
      ctx.fillRect(-2.8, bodyY - 10.3, 5.6, 1.7);
      ctx.fillRect(0.5, bodyY - 9.8, 3.6, 1);
    }
  } else if (p.role === 'invader') {
    // Dark crimson enemy helmet
    ctx.fillStyle = '#450A0A';
    ctx.beginPath();
    ctx.arc(0, bodyY - 8.2, 3.2, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-3.4, bodyY - 8.9, 6.8, 1.2);
  } else if (p.role === 'cleaner') {
    // Sanitation crew cap
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(-3.1, bodyY - 10.3, 6.2, 1.8);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(0.2, bodyY - 9.8, 3.2, 0.9);
  } else if (
    p.role === 'repairer' ||
    p.role === 'builder' ||
    (p.role === 'kayaker' && (p.state === 'building_boat' || (!p.boatBuilt && p.waterActivity !== 'swim')))
  ) {
    // Yellow engineer / boat-builder hard hat
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(0, bodyY - 8.3, 3.1, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-3.6, bodyY - 8.9, 7.2, 1.2);
  } else if (p.role === 'farmer') {
    // Wide straw farm sun hat
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(-4.2, bodyY - 10.2, 8.4, 1.3);
    ctx.fillStyle = '#EAB308';
    ctx.fillRect(-2.5, bodyY - 12, 5, 1.9);
  } else if (p.role === 'butcher') {
    // Crisp white butcher cap
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(-3, bodyY - 10.6, 6, 2);
  } else if (p.role === 'parent') {
    // Neat hair / cap
    ctx.fillStyle = '#78350F';
    ctx.beginPath();
    ctx.arc(0, bodyY - 8.4, 2.7, Math.PI, 0);
    ctx.fill();
  } else if (p.role === 'student' && p.hatColor) {
    ctx.fillStyle = p.hatColor;
    ctx.beginPath();
    ctx.arc(0, bodyY - 8.4, 2.5, Math.PI, 0);
    ctx.fill();
  } else if (p.role === 'escapee') {
    // No hat + bright red alert indicator
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(0, bodyY - 12.6, 1.7, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.isIllicitVendor || p.isShadyBuyer) {
    // Dark suspicious hoodie/cap for illicit vendors & secret buyers
    ctx.fillStyle = '#1E1B4B';
    ctx.beginPath();
    ctx.arc(0, bodyY - 8.3, 2.9, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#312E81';
    ctx.fillRect(-3, bodyY - 8.9, 6, 1.1);
  } else if (p.role === 'voter') {
    // Indigo civic voter cap
    ctx.fillStyle = '#4338CA';
    ctx.beginPath();
    ctx.arc(0, bodyY - 8.3, 2.7, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#E0E7FF';
    ctx.fillRect(-2.8, bodyY - 8.8, 5.6, 0.9);
  } else if (p.role === 'shopper' || p.role === 'pedestrian') {
    if (season === 'Winter') {
      // Cozy knit winter beanie with pom-pom
      ctx.fillStyle = p.shirtColor;
      ctx.beginPath();
      ctx.arc(0, bodyY - 8.4, 2.9, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(-2.9, bodyY - 8.9, 5.8, 1);
      ctx.beginPath();
      ctx.arc(0, bodyY - 11.4, 1.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (season === 'Summer' && p.role === 'pedestrian') {
      // Light sun cap
      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.arc(0, bodyY - 8.4, 2.6, Math.PI, 0);
      ctx.fill();
    } else {
      ctx.fillStyle = p.role === 'shopper' ? '#475569' : '#334155';
      ctx.beginPath();
      ctx.arc(0, bodyY - 8.4, 2.5, Math.PI, 0);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, bodyY - 8.4, 2.4, Math.PI, 0);
    ctx.fill();
  }

  // Role props
  if (p.role === 'woodcutter') {
    const swing = p.state === 'chopping' ? Math.sin(p.animPhase) * 0.95 : -0.3;
    ctx.save();
    ctx.translate(2.5, bodyY - 3);
    ctx.rotate(swing);
    // Axe handle
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(5.5, -5.5);
    ctx.stroke();
    // Axe blade
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(4, -7.2, 3, 2.6);
    ctx.restore();
  } else if (p.role === 'planter' && (p.state === 'walking' || p.state === 'planting')) {
    // Green tree sapling carried by citizen
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(3.4, bodyY - 1);
    ctx.lineTo(3.4, bodyY - 8.5);
    ctx.stroke();
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.arc(3.4, bodyY - 10, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#86EFAC';
    ctx.beginPath();
    ctx.arc(2.6, bodyY - 10.8, 1.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.role === 'arsonist' && (p.state === 'walking' || p.state === 'burning')) {
    // Torch with flickering flame
    const flicker = Math.sin(wallTimeSeconds * 18) * 0.9;
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(3, bodyY - 1);
    ctx.lineTo(4.2, bodyY - 9);
    ctx.stroke();
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.arc(4.2 + flicker * 0.4, bodyY - 10.8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(4.2, bodyY - 10.5, 1.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.role === 'firefighter') {
    // Fire hose nozzle
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(2.5, bodyY - 2);
    ctx.lineTo(6.5, bodyY - 4);
    ctx.stroke();
  } else if (p.role === 'protester' && p.state !== 'captured') {
    const wave = Math.sin(p.animPhase) * 1.4;
    // Picket stick
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(3.2, bodyY - 1);
    ctx.lineTo(3.2, bodyY - 11.5 + wave);
    ctx.stroke();
    // Colorful protest sign
    ctx.fillStyle = p.signColor || '#FDE047';
    ctx.fillRect(-0.5, bodyY - 16.5 + wave, 7.5, 5.2);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 0.7;
    ctx.strokeRect(-0.5, bodyY - 16.5 + wave, 7.5, 5.2);
    // Tiny script lines on sign
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0.8, bodyY - 14.8 + wave, 4.8, 1);
    ctx.fillRect(0.8, bodyY - 13 + wave, 3.6, 1);
  } else if (p.role === 'protester' && p.state === 'captured') {
    // Small handcuffed indicator dot
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(0, bodyY - 13, 1.8 + Math.sin(wallTimeSeconds * 8) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.role === 'celebrant') {
    if (p.balloonColor) {
      const swayX = Math.sin(wallTimeSeconds * 3.5 + p.animPhase) * 1.6;
      // Balloon string
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(3.2, bodyY - 2);
      ctx.quadraticCurveTo(3.8 + swayX * 0.5, bodyY - 10, 4 + swayX, bodyY - 17);
      ctx.stroke();
      // Floating balloon
      ctx.fillStyle = p.balloonColor;
      ctx.beginPath();
      ctx.ellipse(4 + swayX, bodyY - 19.5, 3.1, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(3 + swayX, bodyY - 20.8, 0.9, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.signColor) {
      const wave = Math.sin(p.animPhase) * 1.2;
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(3.2, bodyY - 1);
      ctx.lineTo(3.2, bodyY - 11.5 + wave);
      ctx.stroke();
      ctx.fillStyle = p.signColor;
      ctx.fillRect(-0.5, bodyY - 16.5 + wave, 7.5, 5.2);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(-0.5, bodyY - 16.5 + wave, 7.5, 5.2);
    }
  } else if (p.role === 'fisher') {
    const ang = p.facingAngle ?? 0;
    const dirX = Math.cos(ang);
    const dirY = Math.sin(ang);
    if (p.state === 'fishing') {
      // Fishing rod extending toward water
      const tipX = dirX * 12;
      const tipY = bodyY - 5 + dirY * 10;
      const bobOffset = Math.sin(wallTimeSeconds * 3.5 + p.animPhase) * 1.1;
      const bobX = dirX * 19;
      const bobY = dirY * 19 + bobOffset;

      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(dirX * 2, bodyY - 2.5);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // Thin fishing line to floating bobber
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.75)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(bobX, bobY);
      ctx.stroke();

      // Concentric water ripple around bobber
      const ripple = (wallTimeSeconds * 0.9 + p.animPhase) % 1;
      ctx.strokeStyle = `rgba(224, 242, 254, ${(1 - ripple) * 0.55})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(bobX, bobY + 0.5, 2 + ripple * 4.5, 1.1 + ripple * 2.4, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Red & white bobber
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(bobX, bobY, 1.5, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(bobX, bobY, 1.5, 0, Math.PI);
      ctx.fill();
    } else {
      // Carrying fishing rod over shoulder while walking
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-2.5, bodyY + 1);
      ctx.lineTo(4.5, bodyY - 12);
      ctx.stroke();
    }
  } else if (p.role === 'hobbyist' && p.state === 'doing_hobby') {
    if (p.hobbyKind === 'painting') {
      // Wooden easel & colorful canvas in front of painter
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(5.5, 2.5);
      ctx.lineTo(7.5, -10);
      ctx.lineTo(9.5, 2.5);
      ctx.stroke();
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(4.5, -9.5, 6.2, 5.2);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(5.2, -8.8, 4.8, 2.1);
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(5.2, -6.7, 4.8, 1.7);
      // Paintbrush movement
      const strokeY = Math.sin(p.animPhase) * 1.1;
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(2.5, bodyY - 3);
      ctx.lineTo(5.6, bodyY - 6 + strokeY);
      ctx.stroke();
    } else if (p.hobbyKind === 'kite') {
      // High-flying colorful diamond kite swaying in the breeze
      const swayX = Math.sin(wallTimeSeconds * 2.6 + p.animPhase) * 5;
      const swayY = Math.cos(wallTimeSeconds * 3.1 + p.animPhase) * 2;
      const kx = 11 + swayX;
      const ky = bodyY - 26 + swayY;

      ctx.strokeStyle = 'rgba(248, 250, 252, 0.75)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(2.8, bodyY - 3);
      ctx.quadraticCurveTo(6 + swayX * 0.4, bodyY - 15, kx, ky + 3.5);
      ctx.stroke();

      // Diamond kite body
      ctx.fillStyle = '#F43F5E';
      ctx.beginPath();
      ctx.moveTo(kx, ky - 4.2);
      ctx.lineTo(kx + 3.6, ky);
      ctx.lineTo(kx, ky + 4.2);
      ctx.lineTo(kx - 3.6, ky);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(kx, ky - 4.2);
      ctx.lineTo(kx + 3.6, ky);
      ctx.lineTo(kx, ky);
      ctx.closePath();
      ctx.fill();

      // Kite tail
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(kx, ky + 4.2);
      ctx.quadraticCurveTo(kx - 2 - swayX * 0.25, ky + 7.5, kx - 1 + swayX * 0.2, ky + 10.5);
      ctx.stroke();
    } else if (p.hobbyKind === 'birdwatching') {
      // Binoculars raised to eyes
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(1.5, bodyY - 8.4, 3.6, 1.8);
      // Tiny nearby songbird perched beside them
      const hop = Math.abs(Math.sin(wallTimeSeconds * 4 + p.animPhase)) * 1.4;
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.ellipse(9.5, -2 - hop, 2.1, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(11.4, -2.2 - hop);
      ctx.lineTo(13, -1.8 - hop);
      ctx.lineTo(11.4, -1.3 - hop);
      ctx.closePath();
      ctx.fill();
    } else if (p.hobbyKind === 'music') {
      // Acoustic guitar held across torso
      const strum = Math.sin(p.animPhase) * 0.14;
      ctx.save();
      ctx.translate(0.5, bodyY - 2.2);
      ctx.rotate(-0.35 + strum);
      ctx.fillStyle = '#D97706';
      ctx.beginPath();
      ctx.ellipse(-1.4, 0, 2.5, 1.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350F';
      ctx.beginPath();
      ctx.arc(-1.4, 0, 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0.8, 0);
      ctx.lineTo(5.6, 0);
      ctx.stroke();
      ctx.restore();
    } else if (p.hobbyKind === 'snowball_fight') {
      const throwLift = Math.sin(p.animPhase * 2) * 1.6;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(3.8, bodyY - 6 + throwLift, 1.9, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.hobbyKind === 'snowman') {
      // Half-built snowman pile next to citizen
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(6.5, 1, 3.6, 0, Math.PI * 2);
      ctx.arc(6.5, -3.5, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.hobbyKind === 'raking_leaves') {
      const sweep = Math.sin(p.animPhase) * 0.45;
      ctx.save();
      ctx.translate(2.5, bodyY - 2);
      ctx.rotate(sweep);
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(3, 5.2);
      ctx.stroke();
      ctx.fillStyle = '#D97706';
      ctx.fillRect(1, 4.6, 4.4, 1.6);
      ctx.restore();
      // Autumn leaf pile
      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.arc(7.5, 2.5, 2.6, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(9.5, 2.5, 2, Math.PI, 0);
      ctx.fill();
    } else if (p.hobbyKind === 'harvesting') {
      // Woven harvest basket filled with produce
      ctx.fillStyle = '#B45309';
      ctx.fillRect(4.5, -1, 5.8, 4.2);
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(6.2, -1.4, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.arc(8.5, -1.2, 1.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.hobbyKind === 'gardening') {
      // Sky-blue watering can & green sprout
      ctx.fillStyle = '#0EA5E9';
      ctx.fillRect(3.2, bodyY - 3, 4, 2.8);
      ctx.strokeStyle = '#0EA5E9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(7.2, bodyY - 1.8);
      ctx.lineTo(9.2, bodyY - 3);
      ctx.stroke();
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(8.5, 0.5, 1.4, 3);
      ctx.fillStyle = '#F472B6';
      ctx.beginPath();
      ctx.arc(9.2, 0.2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.hobbyKind === 'sunbathing') {
      // Summer drink beside lounger
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(6.5, -0.5, 2.2, 3.2);
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(7.6, -0.5);
      ctx.lineTo(8.6, -2.2);
      ctx.stroke();
    } else if (p.hobbyKind === 'bird_feeding') {
      // Golden seed crumbs & two tiny pecking songbirds
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(4.5, 1.8, 1.3, 1.1);
      ctx.fillRect(6.8, 2.2, 1.2, 1);
      ctx.fillRect(8.5, 1.7, 1.2, 1);
      const peck = Math.abs(Math.sin(wallTimeSeconds * 7 + p.animPhase)) * 1.1;
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.ellipse(6.5, 0.8 + peck * 0.5, 1.9, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.ellipse(10, 1.2 - peck * 0.4, 1.8, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (p.role === 'farmer') {
    // Wooden pitchfork / hoe
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(3.1, bodyY + 1);
    ctx.lineTo(3.1, bodyY - 10);
    ctx.stroke();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, bodyY - 10);
    ctx.lineTo(4.2, bodyY - 10);
    ctx.moveTo(2, bodyY - 10);
    ctx.lineTo(2, bodyY - 12);
    ctx.moveTo(3.1, bodyY - 10);
    ctx.lineTo(3.1, bodyY - 12.2);
    ctx.moveTo(4.2, bodyY - 10);
    ctx.lineTo(4.2, bodyY - 12);
    ctx.stroke();
  } else if (p.role === 'butcher') {
    // Shiny steel cleaver prop
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(2.8, bodyY - 2);
    ctx.lineTo(4.5, bodyY - 4);
    ctx.stroke();
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(3.8, bodyY - 6.8, 2.8, 3);
  } else if (p.role === 'parent') {
    // Tote bag for school pickup/drop-off
    ctx.fillStyle = '#D97706';
    ctx.fillRect(-4.6, bodyY - 2.2, 2.2, 2.8);
  } else if (p.role === 'kayaker') {
    if (p.waterActivity === 'swim') {
      // Bright swim ring / floatie carried on walk to water
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(3.2, bodyY - 2, 2.4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.state === 'building_boat') {
      // Swinging carpenter hammer at shoreline
      const swing = Math.sin(p.animPhase) * 0.95;
      ctx.save();
      ctx.translate(2.5, bodyY - 3);
      ctx.rotate(swing);
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(4.8, -4.8);
      ctx.stroke();
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(3.6, -6.5, 3, 2.2);
      ctx.restore();
    } else if (!p.boatBuilt) {
      // Carrying wooden planks to build the canoe/boat at the shore
      ctx.fillStyle = '#B45309';
      ctx.fillRect(-4.8, bodyY - 4.2, 3.2, 6.2);
      ctx.fillStyle = '#D97706';
      ctx.fillRect(-4.4, bodyY - 3.6, 1.1, 5.2);
    } else {
      // Carrying kayak/canoe paddle or wooden rowing oar upright on shore walk
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(3.2, bodyY + 1);
      ctx.lineTo(3.2, bodyY - 12);
      ctx.stroke();
      ctx.fillStyle = p.waterActivity === 'rowing' ? '#D97706' : '#06B6D4';
      ctx.fillRect(2, bodyY - 13, 2.4, 2.2);
    }
  } else if (p.role === 'builder') {
    const swing = p.state === 'building' ? Math.sin(p.animPhase) * 0.9 : -0.3;
    ctx.save();
    ctx.translate(2.5, bodyY - 3);
    ctx.rotate(swing);
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(4.8, -4.8);
    ctx.stroke();
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(3.6, -6.5, 3, 2.2);
    ctx.restore();
  } else if (p.role === 'beggar' && p.state === 'begging') {
    // Small cardboard sign & coin cup
    ctx.fillStyle = '#D6D3D1';
    ctx.fillRect(-6.8, bodyY - 4.5, 5.2, 3.8);
    ctx.strokeStyle = '#57534E';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(-6.8, bodyY - 4.5, 5.2, 3.8);
    ctx.fillStyle = '#44403C';
    ctx.fillRect(-5.8, bodyY - 3, 3.2, 0.9);
    // Brass begging cup on ground
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(4.5, 1.2, 2.6, 2.4);
  } else if (p.role === 'soldier') {
    // Tactical rifle/pack silhouette
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(2.4, bodyY - 3.5);
    ctx.lineTo(5.8, bodyY - 7.2);
    ctx.stroke();
  } else if (p.role === 'invader') {
    // Crimson rifle & hostile marker
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-2.4, bodyY - 3.2);
    ctx.lineTo(-6.2, bodyY - 6.8);
    ctx.stroke();
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(0, bodyY - 13, 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.role === 'cleaner') {
    // Broom / skimmer pole sweeping back and forth while cleaning
    const sweep = p.state === 'cleaning' ? Math.sin(p.animPhase) * 0.55 : -0.25;
    ctx.save();
    ctx.translate(2.5, bodyY - 2.5);
    ctx.rotate(sweep);
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(2.5, 5.5);
    ctx.stroke();
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(0.6, 5, 4.4, 1.8);
    ctx.restore();
  } else if (p.role === 'repairer') {
    // Engineer hammer/wrench swinging while repairing craters
    const swing = p.state === 'repairing' ? Math.sin(p.animPhase) * 0.95 : -0.35;
    ctx.save();
    ctx.translate(2.5, bodyY - 3);
    ctx.rotate(swing);
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(4.8, -4.8);
    ctx.stroke();
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(3.6, -6.5, 3, 2.2);
    ctx.restore();
  } else if (p.weddingRole === 'bride') {
    // Bridal rose bouquet
    ctx.fillStyle = '#16A34A';
    ctx.fillRect(2.6, bodyY - 3.8, 1.2, 2.6);
    ctx.fillStyle = '#F472B6';
    ctx.beginPath();
    ctx.arc(3.2, bodyY - 4.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(4.2, bodyY - 3.8, 1.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.role === 'voter') {
    // Crisp white voting ballot slip held in hand
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(2.8, bodyY - 6, 3.6, 4.4);
    ctx.strokeStyle = '#4338CA';
    ctx.lineWidth = 0.7;
    ctx.strokeRect(2.8, bodyY - 6, 3.6, 4.4);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(3.6, bodyY - 4.8, 2, 1);
  }

  // Carried items (fresh fish, coffee cup, book stack, flower bouquet, clothes, produce, shopping bag)
  if (p.carryingItem) {
    if (p.carryingItem === 'fish') {
      ctx.fillStyle = '#93C5FD';
      ctx.beginPath();
      ctx.ellipse(4.4, bodyY - 2.2, 2.8, 1.3, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6.6, bodyY - 2.8);
      ctx.lineTo(8.2, bodyY - 4);
      ctx.lineTo(8, bodyY - 1.5);
      ctx.closePath();
      ctx.fill();
    } else if (p.carryingItem === 'clothes') {
      ctx.fillStyle = '#F43F5E';
      ctx.fillRect(2.8, bodyY - 4.2, 3.4, 1.3);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(2.8, bodyY - 2.8, 3.4, 1.3);
    } else if (p.carryingItem === 'produce') {
      ctx.fillStyle = '#B45309';
      ctx.fillRect(2.8, bodyY - 3.2, 3.4, 2.3);
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(3.8, bodyY - 3.6, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.arc(5.3, bodyY - 3.6, 1.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.carryingItem === 'coffee') {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(3.2, bodyY - 4.4, 2.2, 2.8);
      ctx.fillStyle = '#78350F';
      ctx.fillRect(3, bodyY - 4.8, 2.6, 0.7);
    } else if (p.carryingItem === 'flowers') {
      ctx.fillStyle = '#16A34A';
      ctx.fillRect(3.4, bodyY - 4.5, 1.2, 3);
      ctx.fillStyle = '#F472B6';
      ctx.beginPath();
      ctx.arc(3.5, bodyY - 5.2, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(4.8, bodyY - 4.8, 1.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.carryingItem === 'books') {
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(2.8, bodyY - 3.6, 3.2, 1.2);
      ctx.fillStyle = '#2563EB';
      ctx.fillRect(2.8, bodyY - 4.9, 3.2, 1.2);
    } else if (p.carryingItem === 'meat') {
      // Wrapped butcher parcel / fresh steak cut
      ctx.fillStyle = '#FEF2F2';
      ctx.fillRect(2.6, bodyY - 3.8, 3.8, 2.8);
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(3.1, bodyY - 3.3, 2.8, 1.8);
      ctx.fillStyle = '#FCA5A5';
      ctx.fillRect(3.6, bodyY - 2.9, 1.2, 0.8);
    } else if (p.carryingItem === 'electronics') {
      // Tech gadget box with neon cyan stripe
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(2.6, bodyY - 4.2, 3.6, 3.2);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(3.0, bodyY - 3.7, 2.8, 1.2);
    } else {
      // Shopping tote bag
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(2.8, bodyY - 3.5, 3, 3.2);
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(2.8, bodyY - 3.5, 3, 3.2);
    }
  }

  // Mayor speech bubble or MAYOR label above Mayor
  if (p.role === 'mayor') {
    if (p.state === 'speaking' && p.speechTopic) {
      const text = `MAYOR: "${p.speechTopic}"`;
      ctx.font = '700 8.5px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(text).width + 12;
      const by = bodyY - 27;
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.roundRect(-tw / 2, by - 7.5, tw, 15, 4);
      ctx.fill();
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, by + 0.3);
    } else {
      ctx.font = '700 7.5px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(-14, bodyY - 22, 28, 9.5, 2.5);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.textBaseline = 'middle';
      ctx.fillText('MAYOR', 0, bodyY - 17);
    }
  }

  // Panic exclamation badge during war flight
  if (p.isPanicking) {
    ctx.font = '800 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#DC2626';
    ctx.fillText('!', 0, bodyY - 15.5);
  }

  // Open colorful umbrella during Rain or Storm
  if (isRaining && p.role !== 'invader' && p.state !== 'captured') {
    const canopyColors = ['#EF4444', '#38BDF8', '#FACC15', '#EC4899', '#10B981'];
    const uColor =
      p.role === 'police'
        ? '#1D4ED8'
        : p.role === 'mayor'
        ? '#1E293B'
        : canopyColors[p.shirtColor.charCodeAt(1) % canopyColors.length];
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2.4, bodyY - 2);
    ctx.lineTo(1.2, bodyY - 14.5);
    ctx.stroke();
    ctx.fillStyle = uColor;
    ctx.beginPath();
    ctx.arc(0.5, bodyY - 12.8, 6.2, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}

function drawSleepZzz(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  if (sim.sleepZzzParticles.length === 0) return;
  ctx.save();
  for (const z of sim.sleepZzzParticles) {
    const alpha = Math.max(0, 1 - z.age / z.maxAge);
    ctx.globalAlpha = alpha;
    ctx.font = `800 ${Math.round(9 * z.scale)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('Zzz', z.wx + 0.8, z.wy + 0.8);
    ctx.fillStyle = '#BAE6FD';
    ctx.fillText('Zzz', z.wx, z.wy);
  }
  ctx.restore();
}

function drawBrokenBridgeAlerts(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  wallTimeSeconds: number
) {
  for (const b of sim.brokenBridges) {
    if (b.status !== 'broken') continue;
    const pulse = (Math.sin(wallTimeSeconds * 7 + b.x) + 1) * 0.5;
    ctx.save();
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.45 + pulse * 0.45})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(b.wx, b.wy, 18 + pulse * 5, 0, Math.PI * 2);
    ctx.stroke();

    const label = b.repairerArrived
      ? 'REPAIRING BRIDGE'
      : b.repairerDispatched
      ? 'BRIDGE OUT · CREW EN ROUTE'
      : 'BRIDGE COLLAPSED!';
    ctx.font = '700 8.5px "Plus Jakarta Sans", sans-serif';
    const tw = ctx.measureText(label).width + 10;
    const by = b.wy - 22;
    ctx.fillStyle = '#B91C1C';
    ctx.beginPath();
    ctx.roundRect(b.wx - tw / 2, by - 7.5, tw, 15, 3.5);
    ctx.fill();
    ctx.strokeStyle = '#FECACA';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, b.wx, by + 0.2);
    ctx.restore();
  }
}

function drawFireAlerts(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  wallTimeSeconds: number
) {
  if (sim.fires.length === 0) return;
  ctx.save();
  for (const fire of sim.fires) {
    const cx = fire.wx;
    const cy = fire.wy;

    if (fire.status === 'active') {
      const pulse = (Math.sin(wallTimeSeconds * 8) + 1) * 0.5;
      ctx.strokeStyle = `rgba(249, 115, 22, ${0.5 + pulse * 0.45})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx, cy, 22 + pulse * 7, 0, Math.PI * 2);
      ctx.stroke();

      const prefix = fire.targetType === 'house' ? 'HOUSE ON FIRE!' : 'FIRE!';
      const suffix = fire.fireTruckArrived
        ? 'EXTINGUISHING'
        : fire.fireTruckDispatched
        ? 'FIRE TRUCK EN ROUTE'
        : fire.byArsonist
        ? 'ARSON!'
        : 'NEEDS FIREHOUSE';
      const label = `${prefix} · ${suffix}`;
      ctx.font = '700 9px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(label).width + 12;
      const by = fire.y * TILE_SIZE - 12;

      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2, by - 7.5, tw, 15.5, 3.5);
      ctx.fill();
      ctx.strokeStyle = '#FED7AA';
      ctx.lineWidth = 0.9;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, by + 0.3);
    } else {
      const label = 'FIRE OUT!';
      ctx.font = '700 9.5px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(label).width + 10;
      const by = fire.y * TILE_SIZE - 12;

      ctx.fillStyle = '#0284C7';
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2, by - 7.5, tw, 15.5, 3.5);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, by + 0.3);
    }
  }
  ctx.restore();
}

function drawCarCrashes(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  wallTimeSeconds: number
) {
  if (sim.crashes.length === 0) return;
  ctx.save();
  const blink = Math.sin(wallTimeSeconds * 9) > 0;

  for (const crash of sim.crashes) {
    if (crash.status !== 'active') continue;

    // Dark skid marks leading into the collision point
    ctx.save();
    ctx.translate(crash.wx, crash.wy);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-Math.cos(crash.carAAngle) * 14, -Math.sin(crash.carAAngle) * 14);
    ctx.lineTo(-Math.cos(crash.carAAngle) * 3, -Math.sin(crash.carAAngle) * 3);
    ctx.moveTo(-Math.cos(crash.carBAngle) * 14, -Math.sin(crash.carBAngle) * 14);
    ctx.lineTo(-Math.cos(crash.carBAngle) * 3, -Math.sin(crash.carBAngle) * 3);
    ctx.stroke();

    // Draw the two collided cars angled together
    const wrecks = [
      { ox: -5.5, oy: -2, angle: crash.carAAngle, color: crash.carAColor },
      { ox: 5.5, oy: 2.5, angle: crash.carBAngle, color: crash.carBColor },
    ];
    for (const w of wrecks) {
      ctx.save();
      ctx.translate(w.ox, w.oy);
      ctx.rotate(w.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(-6, -3.5, 13, 8);
      ctx.fillStyle = w.color;
      ctx.beginPath();
      ctx.roundRect(-6.5, -4, 13, 8, 2);
      ctx.fill();
      // Crumpled hood dent & cracked windshield
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-1.5, -2.8, 4.5, 5.6);
      // Blinking hazard flasher dots
      if (blink) {
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(-6.5, -3.8, 2, 2);
        ctx.fillRect(-6.5, 1.8, 2, 2);
      }
      ctx.restore();
    }

    // Small orange warning cone on the asphalt next to wreck
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(-3, 12.5);
    ctx.lineTo(3, 12.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
  ctx.restore();
}

function drawCrashAlerts(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  wallTimeSeconds: number
) {
  if (sim.crashes.length === 0) return;
  ctx.save();
  for (const crash of sim.crashes) {
    const cx = crash.wx;
    const cy = crash.wy;

    if (crash.status === 'active') {
      const pulse = (Math.sin(wallTimeSeconds * 7 + crash.x) + 1) * 0.5;
      ctx.strokeStyle = `rgba(245, 158, 11, ${0.45 + pulse * 0.45})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(cx, cy, 18 + pulse * 6, 0, Math.PI * 2);
      ctx.stroke();

      const statusText =
        crash.ambulanceArrived || crash.policeArrived
          ? 'CRASH · CLEARING'
          : crash.ambulanceDispatched || crash.policeDispatched
          ? 'CRASH · HELP EN ROUTE'
          : 'CAR CRASH!';
      ctx.font = '700 8.8px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(statusText).width + 10;
      const by = cy - 22;

      ctx.fillStyle = '#B45309';
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2, by - 7.5, tw, 15, 3.5);
      ctx.fill();
      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(statusText, cx, by + 0.3);
    } else {
      const label = 'ROAD CLEARED';
      ctx.font = '700 9px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(label).width + 10;
      const by = cy - 20;

      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2, by - 7.5, tw, 15, 3.5);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, by + 0.3);
    }
  }
  ctx.restore();
}

function drawProtestAlerts(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  wallTimeSeconds: number
) {
  ctx.save();
  for (const prot of sim.protests) {
    const cx = (prot.x + 0.5) * TILE_SIZE;
    const cy = (prot.y + 0.5) * TILE_SIZE;

    if (prot.status === 'active') {
      const pulse = (Math.sin(wallTimeSeconds * 6) + 1) * 0.5;
      ctx.strokeStyle = prot.started
        ? `rgba(168, 85, 247, ${0.45 + pulse * 0.45})`
        : `rgba(168, 85, 247, ${0.22 + pulse * 0.2})`;
      ctx.lineWidth = prot.started ? 2.2 : 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 24 + pulse * 6, 0, Math.PI * 2);
      ctx.stroke();

      const statusSuffix = !prot.started
        ? 'MARCHING TO CITY HALL'
        : prot.policeArrived
        ? `CAPTURING ${prot.capturedCount}/${prot.totalProtesters}`
        : prot.policeDispatched
        ? 'POLICE EN ROUTE'
        : 'NEED POLICE';
      const text = prot.started
        ? `PROTEST: ${prot.reason} · ${statusSuffix}`
        : `${prot.reason} · ${statusSuffix}`;
      ctx.font = '700 9px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(text).width + 12;
      const by = prot.y * TILE_SIZE - 13;

      ctx.fillStyle = prot.started ? '#6D28D9' : 'rgba(91, 33, 182, 0.82)';
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2, by - 7.5, tw, 15.5, 3.5);
      ctx.fill();
      ctx.strokeStyle = '#DDD6FE';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, by + 0.3);
    } else {
      const isCaptured = prot.status === 'captured';
      const text = isCaptured ? 'PROTESTERS CAPTURED!' : 'PROTEST DISPERSED';
      ctx.font = '700 9.5px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(text).width + 10;
      const by = prot.y * TILE_SIZE - 13;

      ctx.fillStyle = isCaptured ? '#0284C7' : '#64748B';
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2, by - 7.5, tw, 15.5, 3.5);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, by + 0.3);
    }
  }
  ctx.restore();
}

function drawCityEvents(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  wallTimeSeconds: number
) {
  if (sim.cityEvents.length === 0) return;
  ctx.save();
  const flagPalette = ['#F43F5E', '#FACC15', '#38BDF8', '#4ADE80', '#A78BFA'];

  for (const ev of sim.cityEvents) {
    const wx = ev.x * TILE_SIZE;
    const wy = ev.y * TILE_SIZE;
    const cx = wx + TILE_SIZE / 2;
    const cy = wy + TILE_SIZE / 2;
    const pulse = (Math.sin(wallTimeSeconds * 4.5 + ev.x) + 1) * 0.5;

    const ringRgb =
      ev.type === 'wedding'
        ? '244, 63, 94'
        : ev.type === 'election'
        ? '99, 102, 241'
        : ev.type === 'ceremony'
        ? '139, 92, 246'
        : ev.type === 'celebration'
        ? '236, 72, 153'
        : ev.type === 'campaign'
        ? '16, 185, 129'
        : '245, 158, 11';
    const bgHex =
      ev.type === 'wedding'
        ? '#E11D48'
        : ev.type === 'election'
        ? '#4338CA'
        : ev.type === 'ceremony'
        ? '#7C3AED'
        : ev.type === 'celebration'
        ? '#DB2777'
        : ev.type === 'campaign'
        ? '#059669'
        : '#D97706';
    const borderHex =
      ev.type === 'wedding'
        ? '#FFE4E6'
        : ev.type === 'election'
        ? '#E0E7FF'
        : ev.type === 'ceremony'
        ? '#DDD6FE'
        : ev.type === 'celebration'
        ? '#FBCFE8'
        : ev.type === 'campaign'
        ? '#A7F3D0'
        : '#FDE68A';
    const tagPrefix =
      ev.type === 'wedding'
        ? 'WEDDING'
        : ev.type === 'election'
        ? 'ELECTION'
        : ev.type === 'ceremony'
        ? 'CEREMONY'
        : ev.type === 'celebration'
        ? 'CELEBRATION'
        : ev.type === 'campaign'
        ? 'CAMPAIGN'
        : 'EVENT';

    // Festive pulsing ground halo
    ctx.strokeStyle = `rgba(${ringRgb}, ${0.42 + pulse * 0.4})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, cy, 25 + pulse * 5, 0, Math.PI * 2);
    ctx.stroke();

    if (ev.type === 'election') {
      // Civic Ballot Box outside City Hall entrance
      ctx.fillStyle = '#E0E7FF';
      ctx.fillRect(cx - 5, wy + 22, 10, 7);
      ctx.strokeStyle = '#312E81';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 5, wy + 22, 10, 7);
      ctx.fillStyle = '#312E81';
      ctx.fillRect(cx - 2.5, wy + 23.2, 5, 1.3);
    } else if (ev.type === 'wedding') {
      // Romantic floral wedding arch at venue entrance
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(cx, wy + 20, 12, Math.PI, 0);
      ctx.stroke();
      const blooms = [-10, -5, 0, 5, 10];
      for (let b = 0; b < blooms.length; b++) {
        ctx.fillStyle = b % 2 === 0 ? '#FB7185' : '#FBCFE8';
        ctx.beginPath();
        ctx.arc(cx + blooms[b], wy + 10 + Math.abs(blooms[b]) * 0.35, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Bunting string across top of venue tile
      const bx0 = wx + 4;
      const bx1 = wx + TILE_SIZE - 4;
      const byTop = wy + 3;
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx0, byTop);
      ctx.quadraticCurveTo(cx, byTop + 4, bx1, byTop);
      ctx.stroke();

      // Triangular party pennant flags
      const count = 5;
      for (let f = 0; f < count; f++) {
        const t = (f + 0.5) / count;
        const fx = bx0 + (bx1 - bx0) * t;
        const sag = Math.sin(t * Math.PI) * 2.5;
        const flutter = Math.sin(wallTimeSeconds * 6 + f * 1.1) * 1.1;
        ctx.fillStyle = flagPalette[(f + ev.x) % flagPalette.length];
        ctx.beginPath();
        ctx.moveTo(fx - 2.6, byTop + sag);
        ctx.lineTo(fx + 2.6, byTop + sag);
        ctx.lineTo(fx + flutter, byTop + sag + 5.2);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Floating event banner above venue
    const remaining = Math.max(0, Math.ceil(ev.durationSeconds - ev.elapsedSeconds));
    const label = `${tagPrefix}: ${ev.title} · ${remaining}s`;
    ctx.font = '700 9px "Plus Jakarta Sans", sans-serif';
    const tw = ctx.measureText(label).width + 12;
    const bannerY = wy - 12;

    ctx.fillStyle = bgHex;
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, bannerY - 7.5, tw, 15.5, 3.5);
    ctx.fill();
    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, bannerY + 0.3);
  }
  ctx.restore();
}

function drawCapturePopups(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  for (const pop of sim.capturePopups) {
    const t = pop.age / pop.maxAge;
    const alpha = Math.max(0, 1 - t);
    const y = pop.wy - t * 18;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '700 8.5px "Plus Jakarta Sans", sans-serif';
    const label = 'CAPTURED!';
    const tw = ctx.measureText(label).width + 8;
    ctx.fillStyle = '#1D4ED8';
    ctx.beginPath();
    ctx.roundRect(pop.wx - tw / 2, y - 6, tw, 12, 3);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pop.wx, y + 0.2);
    ctx.restore();
  }
}

function drawFloatingLabels(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  if (sim.floatingLabels.length === 0) return;
  for (const lbl of sim.floatingLabels) {
    const t = Math.min(1, lbl.age / lbl.maxAge);
    const alpha = t < 0.75 ? 1 : Math.max(0, 1 - (t - 0.75) / 0.25);
    const y = lbl.wy - 10 - t * 14;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '800 9px "Plus Jakarta Sans", sans-serif';
    const tw = ctx.measureText(lbl.text).width + 10;

    ctx.fillStyle = lbl.bgColor;
    ctx.beginPath();
    ctx.roundRect(lbl.wx - tw / 2, y - 6.5, tw, 13, 3.5);
    ctx.fill();
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    ctx.fillStyle = lbl.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lbl.text, lbl.wx, y + 0.2);
    ctx.restore();
  }
}

function drawBlastCraters(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  wallTimeSeconds: number
) {
  if (sim.blastCraters.length === 0) return;
  ctx.save();
  for (const c of sim.blastCraters) {
    // Outer scorched ash blast ring
    ctx.fillStyle = 'rgba(30, 41, 59, 0.55)';
    ctx.beginPath();
    ctx.ellipse(c.wx, c.wy + 1, c.radius * 1.4, c.radius * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jagged earth rim
    ctx.fillStyle = '#57534E';
    ctx.beginPath();
    ctx.ellipse(c.wx, c.wy, c.radius * 1.05, c.radius * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();

    // Deep charred pit
    ctx.fillStyle = '#1C1917';
    ctx.beginPath();
    ctx.ellipse(c.wx, c.wy + 0.5, c.radius * 0.72, c.radius * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    // Faint glowing embers on fresh craters
    if (c.age < 30) {
      const emberAlpha = (1 - c.age / 30) * (0.45 + 0.35 * Math.sin(wallTimeSeconds * 7 + c.x));
      ctx.fillStyle = `rgba(249, 115, 22, ${emberAlpha})`;
      ctx.beginPath();
      ctx.arc(c.wx - 2.5, c.wy, 1.6, 0, Math.PI * 2);
      ctx.arc(c.wx + 3, c.wy + 1.5, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Orange hazard cones when crater blocks a road
    const tile = sim.getTile(c.x, c.y);
    if (tile && tile.hasRoad) {
      for (const ox of [-11, 11]) {
        const kx = c.wx + ox;
        const ky = c.wy - 7;
        ctx.fillStyle = '#EA580C';
        ctx.beginPath();
        ctx.moveTo(kx, ky - 5.5);
        ctx.lineTo(kx - 3.2, ky + 1.5);
        ctx.lineTo(kx + 3.2, ky + 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(kx - 1.6, ky - 2.4, 3.2, 1.4);
      }
    }
  }
  ctx.restore();
}

function drawNukeBlasts(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  if (sim.nukeBlasts.length === 0) return;
  for (const nb of sim.nukeBlasts) {
    const t = Math.min(1, nb.age / nb.maxAge);
    const fade = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);

    ctx.save();

    // 1. Initial blinding radial flash
    if (nb.age < 0.65) {
      const flashAlpha = (1 - nb.age / 0.65) * 0.85;
      const r = 36 + (nb.age / 0.65) * 120;
      const grad = ctx.createRadialGradient(nb.wx, nb.wy, 4, nb.wx, nb.wy, r);
      grad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
      grad.addColorStop(0.45, `rgba(253, 224, 71, ${flashAlpha * 0.75})`);
      grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(nb.wx, nb.wy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Expanding ground shockwave ring
    if (nb.age < 2.2) {
      const ringT = nb.age / 2.2;
      const ringR = 14 + ringT * 140;
      ctx.strokeStyle = `rgba(251, 191, 36, ${(1 - ringT) * 0.85})`;
      ctx.lineWidth = Math.max(1, 4.5 * (1 - ringT));
      ctx.beginPath();
      ctx.ellipse(nb.wx, nb.wy, ringR, ringR * 0.72, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Rising mushroom cloud stem & cap
    const rise = Math.min(1, nb.age / 1.4);
    const cloudH = 18 + rise * 56;
    const capY = nb.wy - cloudH;
    const capR = 16 + rise * 22;

    ctx.globalAlpha = fade;

    // Ground dust skirt
    ctx.fillStyle = 'rgba(71, 85, 105, 0.72)';
    ctx.beginPath();
    ctx.ellipse(nb.wx, nb.wy + 2, 22 + rise * 14, 9 + rise * 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stem column
    const stemW = 10 + rise * 4;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.roundRect(nb.wx - stemW / 2, capY, stemW, cloudH + 2, 4);
    ctx.fill();

    // Inner glowing stem core
    ctx.fillStyle = `rgba(249, 115, 22, ${0.75 * (1 - t * 0.7)})`;
    ctx.beginPath();
    ctx.roundRect(nb.wx - stemW * 0.25, capY + 6, stemW * 0.5, cloudH - 6, 2);
    ctx.fill();

    // Billowing smoke cap lobes
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(nb.wx, capY, capR, capR * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(nb.wx - capR * 0.55, capY + 2, capR * 0.52, 0, Math.PI * 2);
    ctx.arc(nb.wx + capR * 0.55, capY + 2, capR * 0.52, 0, Math.PI * 2);
    ctx.fill();

    // Fiery top core inside mushroom cap
    if (t < 0.75) {
      const fireAlpha = (1 - t / 0.75) * 0.9;
      ctx.fillStyle = `rgba(251, 146, 60, ${fireAlpha})`;
      ctx.beginPath();
      ctx.ellipse(nb.wx, capY - 2, capR * 0.68, capR * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(254, 240, 138, ${fireAlpha})`;
      ctx.beginPath();
      ctx.ellipse(nb.wx, capY - 3, capR * 0.36, capR * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawWeatherEffects(ctx: CanvasRenderingContext2D, sim: CitySimulation) {
  const mapW = sim.gridCols * TILE_SIZE;
  const mapH = sim.gridRows * TILE_SIZE;

  // Atmospheric weather washes
  if (sim.weather === 'Storm') {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
    ctx.fillRect(0, 0, mapW, mapH);
  } else if (sim.weather === 'Rain') {
    ctx.fillStyle = 'rgba(30, 58, 138, 0.12)';
    ctx.fillRect(0, 0, mapW, mapH);
  } else if (sim.weather === 'Cloudy') {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.fillRect(0, 0, mapW, mapH);
  } else if (sim.weather === 'Foggy') {
    ctx.fillStyle = 'rgba(226, 232, 240, 0.36)';
    ctx.fillRect(0, 0, mapW, mapH);
  }

  // Brief lightning flash during storms
  if (sim.lightningFlash > 0.02) {
    ctx.fillStyle = `rgba(241, 245, 249, ${sim.lightningFlash * 0.35})`;
    ctx.fillRect(0, 0, mapW, mapH);
  }

  if (sim.weatherParticles.length === 0) return;

  ctx.save();
  if (sim.weather === 'Rain' || sim.weather === 'Storm') {
    ctx.lineCap = 'round';
    ctx.lineWidth = sim.weather === 'Storm' ? 1.4 : 1.1;
    for (const pt of sim.weatherParticles) {
      ctx.strokeStyle = `rgba(186, 230, 253, ${pt.alpha})`;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x + pt.vx * 0.032, pt.y + pt.size);
      ctx.stroke();
    }
  } else if (sim.weather === 'Foggy') {
    for (const pt of sim.weatherParticles) {
      ctx.fillStyle = `rgba(241, 245, 249, ${pt.alpha * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(pt.x, pt.y, pt.size * 5, pt.size * 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (sim.weather === 'Snow') {
    for (const pt of sim.weatherParticles) {
      ctx.fillStyle = `rgba(248, 250, 252, ${pt.alpha})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Drifting autumn leaves or spring petals
    for (const pt of sim.weatherParticles) {
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color || '#F97316';
      ctx.beginPath();
      ctx.ellipse(pt.x, pt.y, pt.size, pt.size * 0.58, pt.x * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawCornerReticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  lineWidth: number
) {
  const c = 10;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  // TL
  ctx.moveTo(x, y + c);
  ctx.lineTo(x, y);
  ctx.lineTo(x + c, y);
  // TR
  ctx.moveTo(x + size - c, y);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size, y + c);
  // BR
  ctx.moveTo(x + size, y + size - c);
  ctx.lineTo(x + size, y + size);
  ctx.lineTo(x + size - c, y + size);
  // BL
  ctx.moveTo(x + c, y + size);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x, y + size - c);
  ctx.stroke();
}

function drawHoverPreview(
  ctx: CanvasRenderingContext2D,
  sim: CitySimulation,
  hover: HoverState,
  toolMode: ToolMode,
  activeBlueprint: BuildingBlueprint | null
) {
  const tx = hover.tileX;
  const ty = hover.tileY;
  const tile = sim.getTile(tx, ty);
  if (!tile) return;
  const wx = tx * TILE_SIZE;
  const wy = ty * TILE_SIZE;

  if (toolMode === 'pan') {
    return;
  }

  if (toolMode === 'camera') {
    const cx = hover.worldX ?? wx + TILE_SIZE / 2;
    const cy = hover.worldY ?? wy + TILE_SIZE / 2;
    const vw = 360;
    const vh = 240;
    const rx = cx - vw / 2;
    const ry = cy - vh / 2;
    const canShoot = sim.canPublishTodayPhotoNews();

    ctx.save();
    ctx.strokeStyle = canShoot ? '#FACC15' : '#94A3B8';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(rx, ry, vw, vh);
    ctx.setLineDash([]);
    ctx.fillStyle = canShoot ? 'rgba(250, 204, 21, 0.08)' : 'rgba(148, 163, 184, 0.1)';
    ctx.fillRect(rx, ry, vw, vh);

    const tag = canShoot ? 'CLICK TO SNAP NEWS PHOTO' : 'DAILY PHOTO ALREADY TAKEN';
    ctx.font = '700 10px Inter, system-ui, sans-serif';
    const tw = ctx.measureText(tag).width;
    ctx.fillStyle = canShoot ? '#0F172A' : '#1E293B';
    ctx.fillRect(cx - (tw + 12) / 2, ry - 18, tw + 12, 16);
    ctx.fillStyle = canShoot ? '#FACC15' : '#CBD5E1';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, cx - tw / 2, ry - 10);
    ctx.restore();
    return;
  }

  if (toolMode === 'select') {
    drawCornerReticle(ctx, wx + 1, wy + 1, TILE_SIZE - 2, 'rgba(248, 250, 252, 0.7)', 1.5);
    return;
  }

  if (toolMode === 'land') {
    if (tile.terrain === 'void') {
      const canAdd = sim.canPlaceExpansionLandAt(tx, ty);
      ctx.fillStyle = canAdd ? 'rgba(16, 185, 129, 0.36)' : 'rgba(239, 68, 68, 0.28)';
      ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
      drawCornerReticle(ctx, wx + 1, wy + 1, TILE_SIZE - 2, canAdd ? '#10B981' : '#EF4444', 2);
      return;
    }
    const canRemove = sim.canRemoveExpansionLandAt(tx, ty);
    ctx.fillStyle = canRemove ? 'rgba(250, 204, 21, 0.32)' : 'rgba(239, 68, 68, 0.28)';
    ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
    drawCornerReticle(ctx, wx + 1, wy + 1, TILE_SIZE - 2, canRemove ? '#FACC15' : '#EF4444', 2);
    return;
  }

  if (tile.terrain === 'void') {
    drawCornerReticle(ctx, wx + 1, wy + 1, TILE_SIZE - 2, '#64748B', 1.5);
    return;
  }

  if (toolMode === 'bulldoze') {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
    ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
    drawCornerReticle(ctx, wx + 1, wy + 1, TILE_SIZE - 2, '#EF4444', 2);
    return;
  }

  if (toolMode === 'road') {
    const valid = !tile.building;
    ctx.fillStyle = valid ? 'rgba(56, 189, 248, 0.28)' : 'rgba(239, 68, 68, 0.32)';
    ctx.fillRect(wx + 7, wy + 7, TILE_SIZE - 14, TILE_SIZE - 14);
    drawCornerReticle(ctx, wx + 1, wy + 1, TILE_SIZE - 2, valid ? '#38BDF8' : '#EF4444', 2);
    return;
  }

  if (toolMode === 'zebra') {
    const valid = tile.hasRoad;
    ctx.fillStyle = valid ? 'rgba(248, 250, 252, 0.32)' : 'rgba(239, 68, 68, 0.32)';
    ctx.fillRect(wx + 7, wy + 7, TILE_SIZE - 14, TILE_SIZE - 14);
    if (valid) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let s = -10; s <= 10; s += 5) {
        ctx.fillRect(wx + 16, wy + TILE_SIZE / 2 + s - 1.2, TILE_SIZE - 32, 2.4);
      }
    }
    drawCornerReticle(ctx, wx + 1, wy + 1, TILE_SIZE - 2, valid ? '#F8FAFC' : '#EF4444', 2);
    return;
  }

  if (toolMode === 'footbridge') {
    const valid = tile.terrain === 'water' && !tile.hasRoad && !tile.building;
    ctx.fillStyle = valid ? 'rgba(217, 119, 6, 0.45)' : 'rgba(239, 68, 68, 0.32)';
    ctx.fillRect(wx, wy + 13, TILE_SIZE, 22);
    drawCornerReticle(ctx, wx + 1, wy + 1, TILE_SIZE - 2, valid ? '#F59E0B' : '#EF4444', 2);
    return;
  }

  if (toolMode === 'water') {
    ctx.fillStyle = 'rgba(14, 165, 233, 0.42)';
    ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
    drawCornerReticle(ctx, wx + 1, wy + 1, TILE_SIZE - 2, '#38BDF8', 2);
    return;
  }

  if (toolMode === 'forest') {
    ctx.fillStyle = 'rgba(34, 197, 94, 0.32)';
    ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
    drawCornerReticle(ctx, wx + 1, wy + 1, TILE_SIZE - 2, '#22C55E', 2);
    return;
  }

  if (toolMode === 'plot' && activeBlueprint) {
    const valid =
      tile.terrain !== 'water' && (!tile.hasRoad || activeBlueprint.category === 'road_path');
    ctx.fillStyle = valid ? 'rgba(255, 255, 255, 0.16)' : 'rgba(239, 68, 68, 0.32)';
    ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
    if (valid) {
      const cached = getOrCreateIconCanvas(activeBlueprint.iconGrid);
      ctx.save();
      ctx.globalAlpha = 0.78;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cached.dayCanvas, wx + 4, wy + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      ctx.restore();
    }
    drawCornerReticle(ctx, wx + 1, wy + 1, TILE_SIZE - 2, valid ? '#FACC15' : '#EF4444', 2);
  }
}
