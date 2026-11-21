import { GRID_COLS, GRID_ROWS, GridPoint, MapTile } from '../types/game';

const DIRS: GridPoint[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS;
}

export function getRoadNeighbors(tiles: MapTile[], x: number, y: number): GridPoint[] {
  const res: GridPoint[] = [];
  for (const d of DIRS) {
    const nx = x + d.x;
    const ny = y + d.y;
    if (inBounds(nx, ny) && tiles[ny * GRID_COLS + nx].hasRoad) {
      res.push({ x: nx, y: ny });
    }
  }
  return res;
}

export function getRoadMask(tiles: MapTile[], x: number, y: number): number {
  // Bitmask: N=1, E=2, S=4, W=8
  let mask = 0;
  if (inBounds(x, y - 1) && tiles[(y - 1) * GRID_COLS + x].hasRoad) mask |= 1;
  if (inBounds(x + 1, y) && tiles[y * GRID_COLS + (x + 1)].hasRoad) mask |= 2;
  if (inBounds(x, y + 1) && tiles[(y + 1) * GRID_COLS + x].hasRoad) mask |= 4;
  if (inBounds(x - 1, y) && tiles[y * GRID_COLS + (x - 1)].hasRoad) mask |= 8;
  return mask;
}

export function isIntersectionTile(tiles: MapTile[], x: number, y: number): boolean {
  const tile = tiles[y * GRID_COLS + x];
  if (!tile || !tile.hasRoad) return false;
  return getRoadNeighbors(tiles, x, y).length >= 3;
}

export function isHighwayTile(tiles: MapTile[], x: number, y: number): boolean {
  const has = (tx: number, ty: number) =>
    inBounds(tx, ty) && tiles[ty * GRID_COLS + tx].hasRoad;
  if (!has(x, y)) return false;
  // Two or more adjacent road lanes side-by-side form a multi-lane highway (any 2x2 road block)
  const quads = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  for (const [dx, dy] of quads) {
    if (has(x + dx, y) && has(x, y + dy) && has(x + dx, y + dy)) {
      return true;
    }
  }
  return false;
}

export function findAdjacentRoadTile(tiles: MapTile[], bx: number, by: number): GridPoint | null {
  const candidates = getRoadNeighbors(tiles, bx, by);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function findRoadPath(
  tiles: MapTile[],
  start: GridPoint,
  goal: GridPoint,
  congestionWeight = 1.4
): GridPoint[] | null {
  if (!inBounds(start.x, start.y) || !inBounds(goal.x, goal.y)) return null;
  const startTile = tiles[start.y * GRID_COLS + start.x];
  const goalTile = tiles[goal.y * GRID_COLS + goal.x];
  if (!startTile.hasRoad || !goalTile.hasRoad) return null;

  if (start.x === goal.x && start.y === goal.y) {
    return [start];
  }

  const total = GRID_COLS * GRID_ROWS;
  const gScore = new Float32Array(total).fill(Infinity);
  const fScore = new Float32Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);

  const startIdx = start.y * GRID_COLS + start.x;
  const goalIdx = goal.y * GRID_COLS + goal.x;

  gScore[startIdx] = 0;
  fScore[startIdx] = Math.abs(goal.x - start.x) + Math.abs(goal.y - start.y);

  const open: number[] = [startIdx];

  while (open.length > 0) {
    // Find lowest fScore in open list
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
          x: curr % GRID_COLS,
          y: Math.floor(curr / GRID_COLS),
        });
        curr = cameFrom[curr];
      }
      path.reverse();
      return path;
    }

    open.splice(bestPos, 1);
    closed[current] = 1;

    const cx = current % GRID_COLS;
    const cy = Math.floor(current / GRID_COLS);
    const prevIdx = cameFrom[current];
    const px = prevIdx !== -1 ? prevIdx % GRID_COLS : cx;
    const py = prevIdx !== -1 ? Math.floor(prevIdx / GRID_COLS) : cy;

    for (const d of DIRS) {
      const nx = cx + d.x;
      const ny = cy + d.y;
      if (!inBounds(nx, ny)) continue;
      const nIdx = ny * GRID_COLS + nx;
      if (closed[nIdx]) continue;
      const nTile = tiles[nIdx];
      if (!nTile.hasRoad || nTile.isBridgeBroken) continue;

      // Slight turn penalty so cars prefer straight avenues, plus congestion cost & highway bonus
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
        if (!open.includes(nIdx)) {
          open.push(nIdx);
        }
      }
    }
  }

  return null;
}

export function isPedestrianTileWalkable(tile: MapTile, allowFrozenWater = false): boolean {
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
  allowFrozenWater = false
): GridPoint | null {
  // Pass 1: prefer open gaps (grass/forest/park/crossings) without solid buildings
  for (let r = 0; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = originX + dx;
        const ny = originY + dy;
        if (!inBounds(nx, ny)) continue;
        const t = tiles[ny * GRID_COLS + nx];
        if (
          isPedestrianTileWalkable(t, allowFrozenWater) &&
          (!t.building || t.building.category === 'park' || t.building.category === 'road_path')
        ) {
          return { x: nx, y: ny };
        }
      }
    }
  }
  // Pass 2: fallback to any walkable tile
  for (let r = 0; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = originX + dx;
        const ny = originY + dy;
        if (!inBounds(nx, ny)) continue;
        const t = tiles[ny * GRID_COLS + nx];
        if (isPedestrianTileWalkable(t, allowFrozenWater)) {
          return { x: nx, y: ny };
        }
      }
    }
  }
  return null;
}

/**
 * Finds a 4-directional walking path for citizens, woodcutters, planters, fishers, and hobbyists.
 * Strictly prohibits stepping onto road tiles unless the tile has a Zebra Crossing (or road_path).
 */
export function findPedestrianPath(
  tiles: MapTile[],
  start: GridPoint,
  goal: GridPoint,
  allowFrozenWater = false
): GridPoint[] | null {
  if (!inBounds(start.x, start.y) || !inBounds(goal.x, goal.y)) return null;
  const goalTile = tiles[goal.y * GRID_COLS + goal.x];
  if (!isPedestrianTileWalkable(goalTile, allowFrozenWater)) return null;

  if (start.x === goal.x && start.y === goal.y) {
    return [start];
  }

  const total = GRID_COLS * GRID_ROWS;
  const gScore = new Float32Array(total).fill(Infinity);
  const fScore = new Float32Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);

  const startIdx = start.y * GRID_COLS + start.x;
  const goalIdx = goal.y * GRID_COLS + goal.x;

  gScore[startIdx] = 0;
  fScore[startIdx] = Math.abs(goal.x - start.x) + Math.abs(goal.y - start.y);

  const open: number[] = [startIdx];

  while (open.length > 0) {
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
          x: curr % GRID_COLS,
          y: Math.floor(curr / GRID_COLS),
        });
        curr = cameFrom[curr];
      }
      path.reverse();
      return path;
    }

    open.splice(bestPos, 1);
    closed[current] = 1;

    const cx = current % GRID_COLS;
    const cy = Math.floor(current / GRID_COLS);

    for (const d of DIRS) {
      const nx = cx + d.x;
      const ny = cy + d.y;
      if (!inBounds(nx, ny)) continue;
      const nIdx = ny * GRID_COLS + nx;
      if (closed[nIdx]) continue;

      const nTile = tiles[nIdx];
      if (!isPedestrianTileWalkable(nTile, allowFrozenWater)) continue;

      // Strictly forbid walking on top of intermediate buildings: route through gaps, parks, crossings & open ground
      if (
        nIdx !== goalIdx &&
        nTile.building &&
        nTile.building.category !== 'park' &&
        nTile.building.category !== 'road_path'
      ) {
        continue;
      }

      const stepCost = 1;
      const tentativeG = gScore[current] + stepCost;

      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = current;
        gScore[nIdx] = tentativeG;
        fScore[nIdx] = tentativeG + Math.abs(goal.x - nx) + Math.abs(goal.y - ny);
        if (!open.includes(nIdx)) {
          open.push(nIdx);
        }
      }
    }
  }

  return null;
}

