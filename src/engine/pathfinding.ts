import { GRID_COLS, GRID_ROWS, GridPoint, MapTile } from '../types/game';

const DIRS: GridPoint[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export function inBounds(
  x: number,
  y: number,
  cols = GRID_COLS,
  rows = GRID_ROWS
): boolean {
  return x >= 0 && x < cols && y >= 0 && y < rows;
}

export function getRoadNeighbors(
  tiles: MapTile[],
  x: number,
  y: number,
  cols = GRID_COLS,
  rows = GRID_ROWS
): GridPoint[] {
  const res: GridPoint[] = [];
  for (const d of DIRS) {
    const nx = x + d.x;
    const ny = y + d.y;
    if (inBounds(nx, ny, cols, rows) && tiles[ny * cols + nx]?.hasRoad) {
      res.push({ x: nx, y: ny });
    }
  }
  return res;
}

export function getRoadMask(
  tiles: MapTile[],
  x: number,
  y: number,
  cols = GRID_COLS,
  rows = GRID_ROWS
): number {
  // Bitmask: N=1, E=2, S=4, W=8
  let mask = 0;
  if (inBounds(x, y - 1, cols, rows) && tiles[(y - 1) * cols + x]?.hasRoad) mask |= 1;
  if (inBounds(x + 1, y, cols, rows) && tiles[y * cols + (x + 1)]?.hasRoad) mask |= 2;
  if (inBounds(x, y + 1, cols, rows) && tiles[(y + 1) * cols + x]?.hasRoad) mask |= 4;
  if (inBounds(x - 1, y, cols, rows) && tiles[y * cols + (x - 1)]?.hasRoad) mask |= 8;
  return mask;
}

export function getEffectiveRoadMask(
  tiles: MapTile[],
  x: number,
  y: number,
  cols = GRID_COLS,
  rows = GRID_ROWS
): number {
  const has = (tx: number, ty: number) =>
    inBounds(tx, ty, cols, rows) && Boolean(tiles[ty * cols + tx]?.hasRoad);
  if (!has(x, y)) return 0;

  let mask = 0;
  if (has(x, y - 1)) {
    const parallelEW =
      has(x - 1, y) &&
      has(x - 1, y - 1) &&
      has(x + 1, y) &&
      has(x + 1, y - 1) &&
      !has(x, y - 2) &&
      !has(x, y + 1);
    if (!parallelEW) mask |= 1;
  }
  if (has(x, y + 1)) {
    const parallelEW =
      has(x - 1, y) &&
      has(x - 1, y + 1) &&
      has(x + 1, y) &&
      has(x + 1, y + 1) &&
      !has(x, y - 1) &&
      !has(x, y + 2);
    if (!parallelEW) mask |= 4;
  }
  if (has(x + 1, y)) {
    const parallelNS =
      has(x, y - 1) &&
      has(x + 1, y - 1) &&
      has(x, y + 1) &&
      has(x + 1, y + 1) &&
      !has(x - 1, y) &&
      !has(x + 2, y);
    if (!parallelNS) mask |= 2;
  }
  if (has(x - 1, y)) {
    const parallelNS =
      has(x, y - 1) &&
      has(x - 1, y - 1) &&
      has(x, y + 1) &&
      has(x - 1, y + 1) &&
      !has(x + 1, y) &&
      !has(x - 2, y);
    if (!parallelNS) mask |= 8;
  }
  return mask;
}

export function isHighwayTile(_tiles: MapTile[], _x: number, _y: number): boolean {
  // Parallel side-by-side roads remain separate 2-lane roads and never merge into wide highway slabs.
  return false;
}

export function isIntersectionTile(
  tiles: MapTile[],
  x: number,
  y: number,
  cols = GRID_COLS,
  rows = GRID_ROWS
): boolean {
  if (!inBounds(x, y, cols, rows)) return false;
  const tile = tiles[y * cols + x];
  if (!tile || !tile.hasRoad) return false;
  const mask = getEffectiveRoadMask(tiles, x, y, cols, rows);
  const arms =
    ((mask & 1) ? 1 : 0) + ((mask & 2) ? 1 : 0) + ((mask & 4) ? 1 : 0) + ((mask & 8) ? 1 : 0);
  return arms >= 3;
}

export function findAdjacentRoadTile(
  tiles: MapTile[],
  bx: number,
  by: number,
  cols = GRID_COLS,
  rows = GRID_ROWS
): GridPoint | null {
  const candidates = getRoadNeighbors(tiles, bx, by, cols, rows);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function findNearestRoadTile(
  tiles: MapTile[],
  bx: number,
  by: number,
  maxRadius = 6,
  cols = GRID_COLS,
  rows = GRID_ROWS
): GridPoint | null {
  const adjacent = getRoadNeighbors(tiles, bx, by, cols, rows);
  if (adjacent.length > 0) {
    const usable = adjacent.filter((pt) => !tiles[pt.y * cols + pt.x]?.isBridgeBroken);
    const pool = usable.length > 0 ? usable : adjacent;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  for (let r = 0; r <= maxRadius; r++) {
    let best: GridPoint | null = null;
    let bestDist = Infinity;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = bx + dx;
        const ny = by + dy;
        if (!inBounds(nx, ny, cols, rows)) continue;
        const t = tiles[ny * cols + nx];
        if (!t || t.terrain === 'void' || !t.hasRoad || t.isBridgeBroken) continue;
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          best = { x: nx, y: ny };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

export function findClosestReachableRoad(
  tiles: MapTile[],
  start: GridPoint,
  goalX: number,
  goalY: number,
  cols = GRID_COLS,
  rows = GRID_ROWS
): GridPoint | null {
  if (!inBounds(start.x, start.y, cols, rows)) return null;
  const startTile = tiles[start.y * cols + start.x];
  if (!startTile?.hasRoad || startTile.terrain === 'void' || startTile.isBridgeBroken) return null;

  const total = cols * rows;
  const visited = new Uint8Array(total);
  const queue: number[] = [start.y * cols + start.x];
  visited[start.y * cols + start.x] = 1;

  let best: GridPoint = { x: start.x, y: start.y };
  let bestDist = (start.x - goalX) ** 2 + (start.y - goalY) ** 2;

  for (let head = 0; head < queue.length; head++) {
    const curr = queue[head];
    const cx = curr % cols;
    const cy = Math.floor(curr / cols);
    const d = (cx - goalX) ** 2 + (cy - goalY) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = { x: cx, y: cy };
    }

    for (const dir of DIRS) {
      const nx = cx + dir.x;
      const ny = cy + dir.y;
      if (!inBounds(nx, ny, cols, rows)) continue;
      const nIdx = ny * cols + nx;
      if (visited[nIdx]) continue;
      const nt = tiles[nIdx];
      if (!nt || nt.terrain === 'void' || !nt.hasRoad || nt.isBridgeBroken) continue;
      visited[nIdx] = 1;
      queue.push(nIdx);
    }
  }
  return best;
}

export function findRoadPath(
  tiles: MapTile[],
  start: GridPoint,
  goal: GridPoint,
  congestionWeight = 1.4,
  cols = GRID_COLS,
  rows = GRID_ROWS
): GridPoint[] | null {
  if (!inBounds(start.x, start.y, cols, rows) || !inBounds(goal.x, goal.y, cols, rows)) return null;
  const startTile = tiles[start.y * cols + start.x];
  const goalTile = tiles[goal.y * cols + goal.x];
  if (!startTile?.hasRoad || !goalTile?.hasRoad) return null;
  if (startTile.terrain === 'void' || goalTile.terrain === 'void') return null;

  if (start.x === goal.x && start.y === goal.y) {
    return [start];
  }

  const total = cols * rows;
  const gScore = new Float32Array(total).fill(Infinity);
  const fScore = new Float32Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const inOpen = new Uint8Array(total);

  const startIdx = start.y * cols + start.x;
  const goalIdx = goal.y * cols + goal.x;

  gScore[startIdx] = 0;
  fScore[startIdx] = Math.abs(goal.x - start.x) + Math.abs(goal.y - start.y);

  const open: number[] = [startIdx];
  inOpen[startIdx] = 1;
  let stepsLeft = Math.max(4000, total * 4);

  while (open.length > 0 && stepsLeft-- > 0) {
    let bestPos = 0;
    let current = open[0];
    let bestF = fScore[current];
    for (let i = 1; i < open.length; i++) {
      const idx = open[i];
      if (fScore[idx] < bestF) {
        bestF = fScore[idx];
        current = idx;
        bestPos = i;
      }
    }

    if (current === goalIdx) {
      const path: GridPoint[] = [];
      let curr = current;
      while (curr !== -1) {
        path.push({
          x: curr % cols,
          y: Math.floor(curr / cols),
        });
        curr = cameFrom[curr];
      }
      path.reverse();
      return path;
    }

    open.splice(bestPos, 1);
    inOpen[current] = 0;
    closed[current] = 1;

    const cx = current % cols;
    const cy = Math.floor(current / cols);
    const currentMask = getEffectiveRoadMask(tiles, cx, cy, cols, rows);
    const prevIdx = cameFrom[current];
    const px = prevIdx !== -1 ? prevIdx % cols : cx;
    const py = prevIdx !== -1 ? Math.floor(prevIdx / cols) : cy;

    for (let di = 0; di < DIRS.length; di++) {
      if (!(currentMask & (1 << di))) continue;
      const d = DIRS[di];
      const nx = cx + d.x;
      const ny = cy + d.y;
      if (!inBounds(nx, ny, cols, rows)) continue;
      const nIdx = ny * cols + nx;
      if (closed[nIdx]) continue;
      const nTile = tiles[nIdx];
      if (!nTile || nTile.terrain === 'void' || !nTile.hasRoad || nTile.isBridgeBroken) continue;

      let turnPenalty = 0;
      if (prevIdx !== -1) {
        const pdx = cx - px;
        const pdy = cy - py;
        if (pdx !== d.x || pdy !== d.y) {
          turnPenalty = 0.2;
        }
      }

      const highwayMult = isHighwayTile(tiles, nx, ny) ? 0.82 : 1;
      const stepCost = (1 + turnPenalty + nTile.congestionScore * congestionWeight) * highwayMult;
      const tentativeG = gScore[current] + stepCost;

      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = current;
        gScore[nIdx] = tentativeG;
        fScore[nIdx] = tentativeG + Math.abs(goal.x - nx) + Math.abs(goal.y - ny);
        if (!inOpen[nIdx]) {
          inOpen[nIdx] = 1;
          open.push(nIdx);
        }
      }
    }
  }

  return null;
}

export function isPedestrianTileWalkable(
  tile: MapTile,
  allowFrozenWater = false,
  allowAllTerrain = false
): boolean {
  if (tile.terrain === 'void') return false;
  if (allowAllTerrain) return true;
  if (tile.isBridgeBroken) return false;
  if (tile.hasRoad) {
    return Boolean(tile.hasZebraCrossing) || tile.building?.category === 'road_path';
  }
  if (tile.terrain === 'water') {
    if (tile.hasFootbridge) return true;
    return allowFrozenWater;
  }
  return true;
}

export function findNearestWalkableTile(
  tiles: MapTile[],
  originX: number,
  originY: number,
  maxRadius = 3,
  allowFrozenWater = false,
  cols = GRID_COLS,
  rows = GRID_ROWS
): GridPoint | null {
  for (let r = 0; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = originX + dx;
        const ny = originY + dy;
        if (!inBounds(nx, ny, cols, rows)) continue;
        const t = tiles[ny * cols + nx];
        if (
          t &&
          isPedestrianTileWalkable(t, allowFrozenWater) &&
          (!t.building || t.building.category === 'park' || t.building.category === 'road_path')
        ) {
          return { x: nx, y: ny };
        }
      }
    }
  }
  for (let r = 0; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = originX + dx;
        const ny = originY + dy;
        if (!inBounds(nx, ny, cols, rows)) continue;
        const t = tiles[ny * cols + nx];
        if (t && isPedestrianTileWalkable(t, allowFrozenWater)) {
          return { x: nx, y: ny };
        }
      }
    }
  }
  return null;
}

export function findPedestrianPath(
  tiles: MapTile[],
  start: GridPoint,
  goal: GridPoint,
  allowFrozenWater = false,
  allowAllTerrain = false,
  cols = GRID_COLS,
  rows = GRID_ROWS
): GridPoint[] | null {
  if (!inBounds(start.x, start.y, cols, rows) || !inBounds(goal.x, goal.y, cols, rows)) return null;
  const goalTile = tiles[goal.y * cols + goal.x];
  if (!goalTile || !isPedestrianTileWalkable(goalTile, allowFrozenWater, allowAllTerrain)) return null;

  if (start.x === goal.x && start.y === goal.y) {
    return [start];
  }

  const total = cols * rows;
  const gScore = new Float32Array(total).fill(Infinity);
  const fScore = new Float32Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const inOpen = new Uint8Array(total);

  const startIdx = start.y * cols + start.x;
  const goalIdx = goal.y * cols + goal.x;

  gScore[startIdx] = 0;
  fScore[startIdx] = Math.abs(goal.x - start.x) + Math.abs(goal.y - start.y);

  const open: number[] = [startIdx];
  inOpen[startIdx] = 1;
  let stepsLeft = Math.max(4000, total * 4);

  while (open.length > 0 && stepsLeft-- > 0) {
    let bestPos = 0;
    let current = open[0];
    let bestF = fScore[current];
    for (let i = 1; i < open.length; i++) {
      const idx = open[i];
      if (fScore[idx] < bestF) {
        bestF = fScore[idx];
        current = idx;
        bestPos = i;
      }
    }

    if (current === goalIdx) {
      const path: GridPoint[] = [];
      let curr = current;
      while (curr !== -1) {
        path.push({
          x: curr % cols,
          y: Math.floor(curr / cols),
        });
        curr = cameFrom[curr];
      }
      path.reverse();
      return path;
    }

    open.splice(bestPos, 1);
    inOpen[current] = 0;
    closed[current] = 1;

    const cx = current % cols;
    const cy = Math.floor(current / cols);

    for (const d of DIRS) {
      const nx = cx + d.x;
      const ny = cy + d.y;
      if (!inBounds(nx, ny, cols, rows)) continue;
      const nIdx = ny * cols + nx;
      if (closed[nIdx]) continue;

      const nTile = tiles[nIdx];
      if (!nTile || !isPedestrianTileWalkable(nTile, allowFrozenWater, allowAllTerrain)) continue;

      if (
        !allowAllTerrain &&
        nIdx !== goalIdx &&
        nTile.building &&
        nTile.building.category !== 'park' &&
        nTile.building.category !== 'road_path'
      ) {
        continue;
      }

      const stepCost = allowAllTerrain && nTile.terrain === 'water' && !nTile.hasRoad && !nTile.hasFootbridge ? 4 : 1;
      const tentativeG = gScore[current] + stepCost;

      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = current;
        gScore[nIdx] = tentativeG;
        fScore[nIdx] = tentativeG + Math.abs(goal.x - nx) + Math.abs(goal.y - ny);
        if (!inOpen[nIdx]) {
          inOpen[nIdx] = 1;
          open.push(nIdx);
        }
      }
    }
  }

  return null;
}

