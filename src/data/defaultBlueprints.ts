import {
  BuildingBlueprint,
  CustomBiomeConfig,
  GRID_COLS,
  GRID_ROWS,
  ICON_SIZE,
  MAX_BIOME_COLS,
  MAX_BIOME_ROWS,
  MIN_BIOME_COLS,
  MIN_BIOME_ROWS,
  MapTemplateKind,
  PlacedBuilding,
  SavedMapData,
  TerrainType,
} from '../types/game';

function parseArt(rows: string[], palette: Record<string, string>): string[] {
  const grid = new Array<string>(ICON_SIZE * ICON_SIZE).fill('');
  for (let y = 0; y < ICON_SIZE; y++) {
    const row = rows[y] || '';
    for (let x = 0; x < ICON_SIZE; x++) {
      const ch = row[x] || '.';
      grid[y * ICON_SIZE + x] = palette[ch] || '';
    }
  }
  return grid;
}

export const WINDOW_GLOW_COLORS = new Set(['#FDE047', '#FEF08A', '#FACC15', '#38BDF8']);

export const PAINTER_PALETTE: { name: string; hex: string; glowsAtNight?: boolean }[] = [
  { name: 'Terracotta', hex: '#C2410C' },
  { name: 'Brick Red', hex: '#DC2626' },
  { name: 'Coral Roof', hex: '#EA580C' },
  { name: 'School Gold', hex: '#D97706' },
  { name: 'Warm Sand', hex: '#FDE68A' },
  { name: 'Plaster Cream', hex: '#F8FAFC' },
  { name: 'Limestone', hex: '#CBD5E1' },
  { name: 'Slate Steel', hex: '#475569' },
  { name: 'Charcoal', hex: '#1E293B' },
  { name: 'Glass Blue', hex: '#0284C7' },
  { name: 'Lit Window', hex: '#FDE047', glowsAtNight: true },
  { name: 'Neon Cyan', hex: '#38BDF8', glowsAtNight: true },
  { name: 'Leaf Green', hex: '#16A34A' },
  { name: 'Forest', hex: '#14532D' },
  { name: 'Timber', hex: '#78350F' },
  { name: 'Pond Blue', hex: '#0EA5E9' },
];

const HOUSE_ART = parseArt(
  [
    '....................',
    '....................',
    '........RRRR........',
    '......RRRRRRRR......',
    '.....RRRRRRRRRR.....',
    '....RRRRRRRRRRRR....',
    '...RRRRRRRRRRRRRR...',
    '..RRRRRRRRRRRRRRRR..',
    '..SSSSSSSSSSSSSSSS..',
    '...WWWWWWWWWWWWWW...',
    '...WWYYWWWWWWYYWW...',
    '...WWYYWWWWWWYYWW...',
    '...WWWWWWWWWWWWWW...',
    '...WWWWWWDDWWWWWW...',
    '...WWYYWWDDWWYYWW...',
    '...WWWWWWDDWWWWWW...',
    '...GGGGGGGGGGGGGG...',
    '..GGGGGGGGGGGGGGGG..',
    '....................',
    '....................',
  ],
  {
    '.': '',
    R: '#C2410C',
    S: '#9A3412',
    W: '#F8FAFC',
    Y: '#FDE047',
    D: '#78350F',
    G: '#16A34A',
  }
);

const SCHOOL_ART = parseArt(
  [
    '....................',
    '.........AA.........',
    '........AAAA........',
    '........AYYA........',
    '........AAAA........',
    '....BBBBBBBBBBBB....',
    '...BBBBBBBBBBBBBB...',
    '..BBBBBBBBBBBBBBBB..',
    '..CCCCCCCCCCCCCCCC..',
    '..CCYYCCYYYYCCYYCC..',
    '..CCYYCCYYYYCCYYCC..',
    '..CCCCCCCCCCCCCCCC..',
    '..CCYYCCDDDDCCYYCC..',
    '..CCYYCCDDDDCCYYCC..',
    '..CCCCCCDDDDCCCCCC..',
    '..SSSSSSSSSSSSSSSS..',
    '..GGGGGGGGGGGGGGGG..',
    '....................',
    '....................',
    '....................',
  ],
  {
    '.': '',
    A: '#B45309',
    B: '#D97706',
    C: '#FEF3C7',
    Y: '#FDE047',
    D: '#78350F',
    S: '#94A3B8',
    G: '#16A34A',
  }
);

const HOSPITAL_ART = parseArt(
  [
    '....................',
    '....................',
    '....WWWWWWWWWWWW....',
    '...WWWWWWWWWWWWWW...',
    '...WWWWWWWRRWWWWW...',
    '...WWWWWWRRRRWWWW...',
    '...WWWWWWWRRWWWWW...',
    '...WWWWWWWWWWWWWW...',
    '..SSSSSSSSSSSSSSSS..',
    '..WWBBWWBBBBWWBBWW..',
    '..WWBBWWBBBBWWBBWW..',
    '..WWWWWWWWWWWWWWWW..',
    '..WWYYWWWWWWWWYYWW..',
    '..WWYYWWCCCCWWYYWW..',
    '..WWWWWWCCCCWWWWWW..',
    '..WWWWWWCCCCWWWWWW..',
    '..LLLLLLLLLLLLLLLL..',
    '....................',
    '....................',
    '....................',
  ],
  {
    '.': '',
    W: '#F8FAFC',
    R: '#DC2626',
    S: '#CBD5E1',
    B: '#38BDF8',
    Y: '#FDE047',
    C: '#0284C7',
    L: '#94A3B8',
  }
);

const OFFICE_ART = parseArt(
  [
    '....................',
    '........DDDD........',
    '......DDDDDDDD......',
    '.....DDDDDDDDDD.....',
    '.....DYYDBBDYYD.....',
    '.....DYYDBBDYYD.....',
    '.....DDDDDDDDDD.....',
    '.....DBBDYYDBBD.....',
    '.....DBBDYYDBBD.....',
    '.....DDDDDDDDDD.....',
    '.....DYYDBBDYYD.....',
    '.....DYYDBBDYYD.....',
    '.....DDDDDDDDDD.....',
    '.....DDDDCCDDDD.....',
    '.....DDDDCCDDDD.....',
    '....SSSSSSSSSSSS....',
    '....SSSSSSSSSSSS....',
    '....................',
    '....................',
    '....................',
  ],
  {
    '.': '',
    D: '#334155',
    B: '#0284C7',
    Y: '#FDE047',
    C: '#38BDF8',
    S: '#64748B',
  }
);

const MARKET_ART = parseArt(
  [
    '....................',
    '....................',
    '....................',
    '...CCCCCCCCCCCCCC...',
    '..CCCCCCCCCCCCCCCC..',
    '..RRWWRRWWRRWWRRWW..',
    '..RRWWRRWWRRWWRRWW..',
    '..SSSSSSSSSSSSSSSS..',
    '...YYYYYYYYYYYYYY...',
    '...YYBBYYDDYYBBYY...',
    '...YYBBYYDDYYBBYY...',
    '...YYYYYYDDYYYYYY...',
    '...WWWWWWDDWWWWWW...',
    '...WWWWWWWWWWWWWW...',
    '..LLLLLLLLLLLLLLLL..',
    '..LLLLLLLLLLLLLLLL..',
    '....................',
    '....................',
    '....................',
    '....................',
  ],
  {
    '.': '',
    C: '#475569',
    R: '#EA580C',
    W: '#F8FAFC',
    S: '#CBD5E1',
    Y: '#FDE047',
    B: '#38BDF8',
    D: '#78350F',
    L: '#94A3B8',
  }
);

const PARK_ART = parseArt(
  [
    '....................',
    '....FFFF....GGGG....',
    '...FFFFFF..GGGGGG...',
    '...FFFFFF..GGGGGG...',
    '....FFFF....GGGG....',
    '.....TT......TT.....',
    '........PPPP........',
    '.......PPPPPP.......',
    '..GGG..PPPPPP..FFF..',
    '.GGGGG.PPPPPP.FFFFF.',
    '.GGGGG..PPPP..FFFFF.',
    '..GGG....SS....FFF..',
    '...T.....SS.....T...',
    '........SSSS........',
    '...FFFF.SSSS.GGGG...',
    '..FFFFFFSSSSGGGGGG..',
    '...FFFF......GGGG...',
    '....TT........TT....',
    '....................',
    '....................',
  ],
  {
    '.': '',
    F: '#15803D',
    G: '#22C55E',
    T: '#78350F',
    P: '#0EA5E9',
    S: '#CBD5E1',
  }
);

const POLICE_ART = parseArt(
  [
    '....................',
    '........C..R........',
    '.......BBBBBB.......',
    '.....BBBBBBBBBB.....',
    '....BBBBBBBBBBBB....',
    '...BBBBBBYYBBBBBB...',
    '...BBBBYYYYYYBBBB...',
    '...BBBBBBYYBBBBBB...',
    '..SSSSSSSSSSSSSSSS..',
    '..WWCCWWWWWWWWCCWW..',
    '..WWCCWWWWWWWWCCWW..',
    '..WWWWWWWWWWWWWWWW..',
    '..WWYYWWDDDDWWYYWW..',
    '..WWYYWWDDDDWWYYWW..',
    '..WWWWWWDDDDWWWWWW..',
    '..LLLLLLLLLLLLLLLL..',
    '..LLLLLLLLLLLLLLLL..',
    '....................',
    '....................',
    '....................',
  ],
  {
    '.': '',
    B: '#1D4ED8',
    C: '#38BDF8',
    R: '#EF4444',
    Y: '#FDE047',
    W: '#F8FAFC',
    S: '#94A3B8',
    D: '#1E293B',
    L: '#64748B',
  }
);

const CEMETERY_ART = parseArt(
  [
    '....................',
    '..FF............FF..',
    '.FFFF...SSSS...FFFF.',
    '.FFFF..SSYYSS..FFFF.',
    '..FF...SSDDSS...FF..',
    '..TT...SSDDSS...TT..',
    '..GGGGGGGGGGGGGGGG..',
    '..GGLLGGGGGGLLGGGG..',
    '..GLLLLGGGGLLLLGGG..',
    '..GLLLLGGGGLLLLGGG..',
    '..GGGGGGSSGGGGGGGG..',
    '..GGGGGGGGGGGGGGGG..',
    '..GGLLGGGGGGLLGGGG..',
    '..GLLLLGGGGLLLLGGG..',
    '..GLLLLGGGGLLLLGGG..',
    '..GGGGGGSSGGGGGGGG..',
    '..GGGGGGGGGGGGGGGG..',
    '...SSSSSSSSSSSSSS...',
    '....................',
    '....................',
  ],
  {
    '.': '',
    F: '#14532D',
    T: '#78350F',
    G: '#15803D',
    S: '#64748B',
    L: '#CBD5E1',
    D: '#1E293B',
    Y: '#FDE047',
  }
);

const CITY_HALL_ART = parseArt(
  [
    '....................',
    '.........YY.........',
    '........YYYY........',
    '.......GGGGGG.......',
    '......GGGGGGGG......',
    '....PPPPPPPPPPPP....',
    '...PPWWPPYYPPWWPP...',
    '..SSSSSSSSSSSSSSSS..',
    '..SSWWWWWWWWWWWWSS..',
    '..SWYWWYYWWYYWWYWS..',
    '..SWWWWWWWWWWWWWWS..',
    '..SSCCSSCCCCSSCCSS..',
    '..SSCCSSCDDCSSCCSS..',
    '..SSCCSSCDDCSSCCSS..',
    '..SSCCSSCDDCSSCCSS..',
    '..LLLLLLLLLLLLLLLL..',
    '.LLLLLLLLLLLLLLLLLL.',
    '.GGGGGGGGGGGGGGGGGG.',
    '....................',
    '....................',
  ],
  {
    '.': '',
    Y: '#FDE047',
    G: '#D97706',
    P: '#7C3AED',
    W: '#F8FAFC',
    S: '#CBD5E1',
    C: '#E2E8F0',
    D: '#78350F',
    L: '#94A3B8',
  }
);

const FIRE_STATION_ART = parseArt(
  [
    '....................',
    '........YY..........',
    '.......RRRR.........',
    '......RRRRRR........',
    '....RRRRRRRRRR......',
    '...RRRRRRRRRRRR.....',
    '..RRRRRRRRRRRRRR....',
    '..SSSSSSSSSSSSSS....',
    '..RRYYRRRRRRYYRR....',
    '..RRYYRRRRRRYYRR....',
    '..RRRRRRRRRRRRRR....',
    '..RRDDDDDDDRRRRR....',
    '..RRDYYYYYDRRRRR....',
    '..RRDYYYYYDRRWW.....',
    '..RRDDDDDDDRRWW.....',
    '..LLLLLLLLLLLLLL....',
    '..LLLLLLLLLLLLLL....',
    '....................',
    '....................',
    '....................',
  ],
  {
    '.': '',
    R: '#DC2626',
    Y: '#FDE047',
    S: '#CBD5E1',
    D: '#1E293B',
    W: '#F8FAFC',
    L: '#64748B',
  }
);

const BAKERY_ART = parseArt(
  [
    '....................',
    '........YYYY........',
    '.......YYAAYY.......',
    '..RRRRRRRRRRRRRRRR..',
    '..SSSSSSSSSSSSSSSS..',
    '..OOCCOOCCOOCCOOCC..',
    '..OOCCOOCCOOCCOOCC..',
    '..WWWWWWWWWWWWWWWW..',
    '..WWYYYYWWWWYYYYWW..',
    '..WWYAAYWWWWYAAYWW..',
    '..WWYYYYWWWWYYYYWW..',
    '..WWWWWWDDDDWWWWWW..',
    '..WWBBWWDDDDWWBBWW..',
    '..WWWWWWDDDDWWWWWW..',
    '..LLLLLLLLLLLLLLLL..',
    '..LLLLLLLLLLLLLLLL..',
    '....................',
    '....................',
    '....................',
    '....................',
  ],
  {
    '.': '',
    Y: '#FDE047',
    A: '#D97706',
    R: '#EA580C',
    S: '#9A3412',
    O: '#FB923C',
    C: '#FFFBEB',
    W: '#FEF3C7',
    D: '#78350F',
    B: '#FDE68A',
    L: '#94A3B8',
  }
);

const CAFE_ART = parseArt(
  [
    '....................',
    '.........CC.........',
    '........C..C........',
    '.......MMMMMM.......',
    '..BBBBBBBBBBBBBBBB..',
    '..MMMMMMMMMMMMMMMM..',
    '..BBWWBBWWBBWWBBWW..',
    '..BBWWBBWWBBWWBBWW..',
    '..TTTTTTTTTTTTTTTT..',
    '..TTYYYYTTDDTTYYTT..',
    '..TTYYYYTTDDTTYYTT..',
    '..TTTTTTDDDDTTTTTT..',
    '..GGTTTTDDDDTTTTGG..',
    '..GGTTTTDDDDTTTTGG..',
    '..LLLLLLLLLLLLLLLL..',
    '..LLLLLLLLLLLLLLLL..',
    '....................',
    '....................',
    '....................',
    '....................',
  ],
  {
    '.': '',
    C: '#F8FAFC',
    M: '#78350F',
    B: '#92400E',
    W: '#FEF3C7',
    T: '#F5EFE6',
    Y: '#FDE047',
    D: '#451A03',
    G: '#16A34A',
    L: '#64748B',
  }
);

const BOOKSHOP_ART = parseArt(
  [
    '....................',
    '......RRRRGGGG......',
    '.....BBBBRRRRGG.....',
    '...TTTTTTTTTTTTTT...',
    '..TTTTTTTTTTTTTTTT..',
    '..SSSSSSSSSSSSSSSS..',
    '..CCYYYYCCCCYYYYCC..',
    '..CCYBBYCCCCYRRYCC..',
    '..CCYYYYCCCCYYYYCC..',
    '..CCCCCCCCCCCCCCCC..',
    '..CCBBCCDDDDCCGGCC..',
    '..CCRRCCDDDDCCBBCC..',
    '..CCCCCCDDDDCCCCCC..',
    '..LLLLLLLLLLLLLLLL..',
    '..LLLLLLLLLLLLLLLL..',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
  ],
  {
    '.': '',
    R: '#DC2626',
    G: '#16A34A',
    B: '#0284C7',
    T: '#1E3A8A',
    S: '#0369A1',
    C: '#F8FAFC',
    Y: '#FDE047',
    D: '#78350F',
    L: '#94A3B8',
  }
);

const FLOWER_SHOP_ART = parseArt(
  [
    '....................',
    '.......PP..YY.......',
    '......PPPPYYYY......',
    '..PPPPPPPPPPPPPPPP..',
    '..PPWWPPWWPPWWPPWW..',
    '..PPWWPPWWPPWWPPWW..',
    '..WWWWWWWWWWWWWWWW..',
    '..WWCCCCWWWWCCCCWW..',
    '..WWCCCCWWWWCCCCWW..',
    '..WWYYYYDDDDYYYYWW..',
    '..WWPPYYDDDDYYPPWW..',
    '..GGRRGGDDDDGGBBGG..',
    '..GGGGGGDDDDGGGGGG..',
    '..LLLLLLLLLLLLLLLL..',
    '..LLLLLLLLLLLLLLLL..',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
  ],
  {
    '.': '',
    P: '#EC4899',
    Y: '#FDE047',
    W: '#FFF1F2',
    C: '#38BDF8',
    D: '#78350F',
    G: '#16A34A',
    R: '#FB7185',
    B: '#A78BFA',
    L: '#94A3B8',
  }
);

const TACKLE_SHOP_ART = parseArt(
  [
    '....................',
    '........CCCC........',
    '.......CCCCCC.......',
    '....TTTTTTTTTTTT....',
    '...TTTTTTTTTTTTTT...',
    '..BBBBBBBBBBBBBBBB..',
    '..WWCCWWWWWWWWCCWW..',
    '..WWWWWWWWWWWWWWWW..',
    '..WWYYWWDDDDWWYYWW..',
    '..WWYYWWDDDDWWYYWW..',
    '..WWWWWWDDDDWWWWWW..',
    '..MMYYMMDDDDMMYYMM..',
    '..MMMMMMMMMMMMMMMM..',
    '..LLLLLLLLLLLLLLLL..',
    '..SSSSSSSSSSSSSSSS..',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
  ],
  {
    '.': '',
    C: '#38BDF8',
    T: '#0284C7',
    B: '#0369A1',
    W: '#E0F2FE',
    Y: '#FDE047',
    D: '#78350F',
    M: '#92400E',
    L: '#B45309',
    S: '#0EA5E9',
  }
);

const JAIL_ART = parseArt(
  [
    '....................',
    '....................',
    '..RRRRRRRRRRRRRRRR..',
    '..RBBBBBBBBBBBBBBR..',
    '..SSSSSSSSSSSSSSSS..',
    '..SSSSSSSSSSSSSSSS..',
    '..SSKKKKSSSSKKKKSS..',
    '..SSKWWKSSSSKWWKSS..',
    '..SSKWWKSSSSKWWKSS..',
    '..SSKKKKSSSSKKKKSS..',
    '..SSSSSSSSSSSSSSSS..',
    '..SSSSSSKKKKSSSSSS..',
    '..SSSSSKBBBBKSSSSS..',
    '..SSSSSKBKKBKSSSSS..',
    '..SSSSSKBKKBKSSSSS..',
    '..SSSSSKBKKBKSSSSS..',
    '..GGGGGGGGGGGGGGGG..',
    '....................',
    '....................',
    '....................',
  ],
  {
    '.': '',
    R: '#334155',
    B: '#2563EB',
    S: '#94A3B8',
    K: '#0F172A',
    W: '#CBD5E1',
    G: '#64748B',
  }
);

const FACTORY_ART = parseArt(
  [
    '....................',
    '..KKK.........KKK...',
    '..SSS.........SSS...',
    '..SSS.........SSS...',
    '..SSS.........SSS...',
    '..SSSRRR..RRR.SSS...',
    '..SSSRRRRRRRRRRRR...',
    '..RRRRRRRRRRRRRRR...',
    '..BBBBBBBBBBBBBBB...',
    '..BBYYBBYYBBYYBBB...',
    '..BBYYBBYYBBYYBBB...',
    '..BBBBBBBBBBBBBBB...',
    '..BBGGGBBBBBYYBBB...',
    '..BBGGGBBBBBYYBBB...',
    '..BBGGGBBBBBBBBBB...',
    '..MMMMMMMMMMMMMMM...',
    '..LLLLLLLLLLLLLLL...',
    '....................',
    '....................',
    '....................',
  ],
  {
    '.': '',
    K: '#94A3B8',
    S: '#475569',
    R: '#334155',
    B: '#B45309',
    Y: '#FDE047',
    G: '#1E293B',
    M: '#64748B',
    L: '#94A3B8',
  }
);

const CROPS_ART = parseArt(
  [
    '....................',
    '..SSSSSSSSSSSSSSSS..',
    '..SDDDDDDDDDDDDDDS..',
    '..SDYYGGYYYYGGYYDS..',
    '..SDYYGGYYYYGGYYDS..',
    '..SDDDDDDDDDDDDDDS..',
    '..SDGGYYYYGGYYYYDS..',
    '..SDGGYYYYGGYYYYDS..',
    '..SDDDDDDDDDDDDDDS..',
    '..SDYYGGYYYYGGYYDS..',
    '..SDYYGGYYYYGGYYDS..',
    '..SDDDDDDDDDDDDDDS..',
    '..SBBBBBBDDDDDDDDS..',
    '..SBRRRRBDGGGGGGDS..',
    '..SBRWWRBDDDDDDDDS..',
    '..SBBBBBBDDDDDDDDS..',
    '..SSSSSSSSSSSSSSSS..',
    '....................',
    '....................',
    '....................',
  ],
  {
    '.': '',
    S: '#78350F',
    D: '#713F12',
    Y: '#FACC15',
    G: '#4ADE80',
    B: '#B91C1C',
    R: '#DC2626',
    W: '#FEF3C7',
  }
);

const ELECTRONICS_SHOP_ART = parseArt(
  [
    '....................',
    '......AA....AA......',
    '.......AA..AA.......',
    '........AAAA........',
    '...RRRRRRRRRRRRRR...',
    '..RRRRRRRRRRRRRRRR..',
    '..CCCCCCCCCCCCCCCC..',
    '..CCNNNNNNNNNNNNCC..',
    '..CCNYNYNNNNNYNYCC..',
    '..CCCCCCCCCCCCCCCC..',
    '..WWBBBBBBBBBBBBWW..',
    '..WWBNNBBDDDBNNBWW..',
    '..WWBNNBBDDDBNNBWW..',
    '..WWBBBBBBBBBBBBWW..',
    '..WWYYBBDDDDDBYYWW..',
    '..WWYYBBDDDDDBYYWW..',
    '..LLLLLLLLLLLLLLLL..',
    '....................',
    '....................',
    '....................',
  ],
  {
    '.': '',
    A: '#94A3B8',
    R: '#1E293B',
    C: '#0284C7',
    N: '#38BDF8',
    Y: '#FDE047',
    W: '#E2E8F0',
    B: '#0F172A',
    D: '#7DD3FC',
    L: '#64748B',
  }
);

export const DEFAULT_BLUEPRINTS: BuildingBlueprint[] = [
  {
    id: 'house',
    name: 'House',
    category: 'residential',
    iconGrid: HOUSE_ART,
    accentColor: '#C2410C',
    capacity: 5,
  },
  {
    id: 'city_hall',
    name: 'City Hall',
    category: 'city_hall',
    iconGrid: CITY_HALL_ART,
    accentColor: '#7C3AED',
    capacity: 35,
  },
  {
    id: 'school',
    name: 'School',
    category: 'school',
    iconGrid: SCHOOL_ART,
    accentColor: '#D97706',
    capacity: 100,
  },
  {
    id: 'hospital',
    name: 'Hospital',
    category: 'hospital',
    iconGrid: HOSPITAL_ART,
    accentColor: '#DC2626',
    capacity: 45,
  },
  {
    id: 'police',
    name: 'Police',
    category: 'police',
    iconGrid: POLICE_ART,
    accentColor: '#1D4ED8',
    capacity: 30,
  },
  {
    id: 'jail',
    name: 'City Jail',
    category: 'jail',
    iconGrid: JAIL_ART,
    accentColor: '#475569',
    capacity: 24,
  },
  {
    id: 'fire_station',
    name: 'Firehouse',
    category: 'fire_station',
    iconGrid: FIRE_STATION_ART,
    accentColor: '#DC2626',
    capacity: 26,
  },
  {
    id: 'cemetery',
    name: 'Cemetery',
    category: 'cemetery',
    iconGrid: CEMETERY_ART,
    accentColor: '#64748B',
    capacity: 20,
  },
  {
    id: 'office',
    name: 'Office',
    category: 'workplace',
    iconGrid: OFFICE_ART,
    accentColor: '#0284C7',
    capacity: 40,
  },
  {
    id: 'factory',
    name: 'Factory',
    category: 'factory',
    iconGrid: FACTORY_ART,
    accentColor: '#D97706',
    capacity: 45,
  },
  {
    id: 'crops',
    name: 'Crops',
    category: 'crops',
    iconGrid: CROPS_ART,
    accentColor: '#CA8A04',
    capacity: 12,
  },
  {
    id: 'market',
    name: 'Market',
    category: 'commercial',
    iconGrid: MARKET_ART,
    accentColor: '#EA580C',
    capacity: 25,
  },
  {
    id: 'bakery',
    name: 'Bakery',
    category: 'commercial',
    iconGrid: BAKERY_ART,
    accentColor: '#EA580C',
    capacity: 18,
  },
  {
    id: 'cafe',
    name: 'Cafe',
    category: 'visit_spot',
    iconGrid: CAFE_ART,
    accentColor: '#92400E',
    capacity: 20,
  },
  {
    id: 'bookshop',
    name: 'Bookshop',
    category: 'visit_spot',
    iconGrid: BOOKSHOP_ART,
    accentColor: '#0284C7',
    capacity: 16,
  },
  {
    id: 'flower_shop',
    name: 'Florist',
    category: 'commercial',
    iconGrid: FLOWER_SHOP_ART,
    accentColor: '#EC4899',
    capacity: 16,
  },
  {
    id: 'tackle_shop',
    name: 'Tackle Shop',
    category: 'commercial',
    iconGrid: TACKLE_SHOP_ART,
    accentColor: '#0EA5E9',
    capacity: 14,
  },
  {
    id: 'electronics_shop',
    name: 'Electronics Shop',
    category: 'commercial',
    iconGrid: ELECTRONICS_SHOP_ART,
    accentColor: '#0284C7',
    capacity: 18,
  },
  {
    id: 'park',
    name: 'City Park',
    category: 'park',
    iconGrid: PARK_ART,
    accentColor: '#16A34A',
    capacity: 24,
  },
];

export const CUSTOM_PLOT_BEHAVIORS: BuildingBlueprint['category'][] = [
  'road_path',
  'landmark',
  'workplace',
  'visit_spot',
];

export const CIVIC_PLOT_BEHAVIORS: BuildingBlueprint['category'][] = [
  'residential',
  'city_hall',
  'school',
  'hospital',
  'police',
  'jail',
  'fire_station',
  'cemetery',
  'factory',
  'crops',
  'commercial',
  'park',
];

export const CATEGORY_LABELS: Record<BuildingBlueprint['category'], string> = {
  road_path: 'Path for Cars (Driveable Road Tile)',
  landmark: 'Not for Cars (Scenic / No Car Trips)',
  workplace: 'Job Opportunities (Commuter Workplace)',
  factory: 'Factory (Goods, Delivery Vans & Smokestacks)',
  crops: 'Crops Plot (Harvest, Food Supply & Farm Vans)',
  visit_spot: 'Go & Leave (Library, Cafe, Venue)',
  residential: 'Residential (Forms Neighbourhoods)',
  city_hall: 'City Hall (Mayor Speeches & Protests)',
  school: 'School (Classes & Field Trips)',
  hospital: 'Hospital (24/7 + Ambulances)',
  police: 'Police Station (Patrols, Robberies & Raids)',
  jail: 'City Jail (Holds Arrested Citizens & Releases)',
  fire_station: 'Fire Station (Dispatches Fire Trucks)',
  cemetery: 'Cemetery (Memorials & Hearses)',
  commercial: 'Commercial (Shops & Errands)',
  park: 'Park (Weekend & Leisure)',
};

export function clampBiomeSize(cols?: number, rows?: number): { cols: number; rows: number } {
  const c = Math.round(cols ?? GRID_COLS);
  const r = Math.round(rows ?? GRID_ROWS);
  return {
    cols: Math.max(MIN_BIOME_COLS, Math.min(MAX_BIOME_COLS, Number.isFinite(c) ? c : GRID_COLS)),
    rows: Math.max(MIN_BIOME_ROWS, Math.min(MAX_BIOME_ROWS, Number.isFinite(r) ? r : GRID_ROWS)),
  };
}

function createEmptyTiles(
  cols = GRID_COLS,
  rows = GRID_ROWS,
  baseTerrain: TerrainType = 'grass'
): SavedMapData['tiles'] {
  const tiles: SavedMapData['tiles'] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      tiles.push({
        x,
        y,
        terrain: baseTerrain,
        isDefaultLand: true,
        hasRoad: false,
        building: null,
      });
    }
  }
  return tiles;
}

function makeBuilding(blueprintId: string, x: number, y: number, customName?: string): PlacedBuilding {
  const bp = DEFAULT_BLUEPRINTS.find((b) => b.id === blueprintId) || DEFAULT_BLUEPRINTS[0];
  return {
    id: `bld_${blueprintId}_${x}_${y}`,
    blueprintId: bp.id,
    name: customName || bp.name,
    category: bp.category,
    iconGrid: [...bp.iconGrid],
    accentColor: bp.accentColor,
    x,
    y,
    capacity: bp.capacity,
    activeTripsOut: 0,
    activeTripsIn: 0,
    totalVisits: 0,
  };
}

function buildOakridgePreset(): SavedMapData {
  const tiles = createEmptyTiles();
  const idx = (x: number, y: number) => y * GRID_COLS + x;

  // River winding vertically around x = 16..18
  for (let y = 0; y < GRID_ROWS; y++) {
    const shift = Math.round(Math.sin(y * 0.35) * 1.5);
    const rx = 16 + shift;
    for (let dx = 0; dx <= 1; dx++) {
      const tx = rx + dx;
      if (tx >= 0 && tx < GRID_COLS) {
        tiles[idx(tx, y)].terrain = 'water';
      }
    }
  }

  // Decorative forest clusters
  const forestCoords: [number, number][] = [
    [2, 2], [3, 2], [2, 3], [30, 2], [31, 2], [31, 3],
    [2, 19], [3, 19], [29, 19], [30, 19], [31, 18],
    [13, 3], [14, 3], [20, 18], [21, 18],
  ];
  for (const [fx, fy] of forestCoords) {
    if (tiles[idx(fx, fy)].terrain === 'grass') {
      tiles[idx(fx, fy)].terrain = 'forest';
    }
  }

  // Horizontal avenues
  const setRoad = (x: number, y: number, offset = 0) => {
    const t = tiles[idx(x, y)];
    t.hasRoad = true;
    t.intersection = { controlType: 'signal', cycleDuration: 18, phaseOffset: offset };
  };

  for (let x = 4; x <= 29; x++) {
    setRoad(x, 7, 0);
    setRoad(x, 14, 9);
  }
  // West neighborhood loop
  for (let x = 4; x <= 13; x++) {
    setRoad(x, 4, 4);
    setRoad(x, 17, 6);
  }
  for (let y = 4; y <= 17; y++) {
    setRoad(4, y, 2);
    setRoad(9, y, 6);
    setRoad(13, y, 10);
  }
  // East downtown grid
  for (let x = 20; x <= 29; x++) {
    setRoad(x, 4, 3);
    setRoad(x, 17, 7);
  }
  for (let y = 4; y <= 17; y++) {
    setRoad(20, y, 4);
    setRoad(24, y, 8);
    setRoad(29, y, 12);
  }

  const place = (bpId: string, x: number, y: number, name?: string) => {
    const t = tiles[idx(x, y)];
    if (!t.hasRoad && t.terrain !== 'water') {
      t.terrain = 'grass';
      t.building = makeBuilding(bpId, x, y, name);
    }
  };

  // West suburban houses
  const houseSpots: [number, number][] = [
    [5, 5], [6, 5], [7, 5], [8, 5],
    [5, 6], [7, 6], [10, 5], [11, 5], [12, 5],
    [5, 8], [6, 8], [8, 8], [10, 8], [11, 8], [12, 8],
    [5, 11], [6, 11], [7, 11], [10, 12], [11, 12], [12, 12],
    [5, 15], [6, 15], [8, 15], [10, 16], [11, 16],
  ];
  houseSpots.forEach(([hx, hy], i) => place('house', hx, hy, `Elm House #${i + 1}`));

  // Central Civic & Education
  place('school', 10, 10, 'Oakridge Academy');
  place('park', 11, 10, 'Willow Green');
  place('cemetery', 12, 16, 'Oakridge Memorial');
  place('hospital', 21, 10, 'St. Jude General');
  place('police', 21, 8, 'Oakridge Precinct');
  place('jail', 23, 9, 'Oakridge Jail');
  place('fire_station', 12, 10, 'Oakridge Firehouse');
  place('school', 25, 15, 'Eastside High');

  // East Downtown Offices & Markets
  place('office', 21, 5, 'Civic Tower');
  place('office', 22, 5, 'Northgate Plaza');
  place('office', 25, 6, 'Metro Tech Hub');
  place('office', 26, 6, 'Apex Logistics');
  place('office', 27, 8, 'Harbor Finance');
  place('factory', 28, 8, 'Oakridge Works');
  place('market', 22, 8, 'Central Market');
  place('cafe', 25, 11, 'Riverfront Cafe');
  place('bakery', 12, 13, 'Corner Bakery');
  place('flower_shop', 10, 13, 'Blossom Florist');
  place('bookshop', 22, 11, 'Maple Bookshop');
  place('tackle_shop', 19, 11, 'Riverbank Tackle');
  place('crops', 8, 11, 'Oakridge Farm');
  place('park', 22, 13, 'Founders Square');
  place('city_hall', 23, 13, 'Oakridge City Hall');
  place('house', 26, 16, 'Loft Terrace');
  place('house', 27, 16, 'Maple Flats');

  // Zebra crossings in front of School, Hospital, Small Businesses, Forests & City Hall
  const oakridgeCrossings: [number, number][] = [
    [9, 10],
    [20, 10],
    [22, 7],
    [23, 14],
    [25, 14],
    [7, 7],
    [11, 14],
    [13, 12],
    [20, 12],
  ];
  for (const [cx, cy] of oakridgeCrossings) {
    const t = tiles[idx(cx, cy)];
    if (t.hasRoad) t.hasZebraCrossing = true;
  }

  // Walking footbridge across the river at y=11 (connecting Willow Green & Riverbank Tackle)
  for (let x = 14; x <= 18; x++) {
    const t = tiles[idx(x, 11)];
    if (t.terrain === 'water' && !t.hasRoad) {
      t.hasFootbridge = true;
    }
  }

  return {
    id: 'preset_oakridge',
    name: 'Oakridge Valley',
    subtitle: 'Balanced river town with school zone, hospital & commuter bridges',
    updatedAt: Date.now(),
    tiles,
    customBlueprints: [],
  };
}

function buildTwinBridgesPreset(): SavedMapData {
  const tiles = createEmptyTiles();
  const idx = (x: number, y: number) => y * GRID_COLS + x;

  // Wide river splitting map in half
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 15; x <= 18; x++) {
      tiles[idx(x, y)].terrain = 'water';
    }
  }

  const setRoad = (x: number, y: number, offset = 0) => {
    const t = tiles[idx(x, y)];
    t.hasRoad = true;
    t.intersection = { controlType: 'signal', cycleDuration: 20, phaseOffset: offset };
  };

  // Only two narrow bridges at y=6 and y=15!
  for (let x = 4; x <= 29; x++) {
    setRoad(x, 6, 0);
    setRoad(x, 15, 10);
  }
  for (let y = 3; y <= 18; y++) {
    setRoad(4, y, 2);
    setRoad(9, y, 5);
    setRoad(13, y, 8);
    setRoad(20, y, 3);
    setRoad(25, y, 7);
    setRoad(29, y, 11);
  }
  for (let x = 4; x <= 13; x++) {
    setRoad(x, 3, 0);
    setRoad(x, 10, 4);
    setRoad(x, 18, 8);
  }
  for (let x = 20; x <= 29; x++) {
    setRoad(x, 3, 2);
    setRoad(x, 10, 6);
    setRoad(x, 18, 10);
  }

  const place = (bpId: string, x: number, y: number, name?: string) => {
    const t = tiles[idx(x, y)];
    if (!t.hasRoad && t.terrain !== 'water') {
      t.building = makeBuilding(bpId, x, y, name);
    }
  };

  // Dense housing west of the river
  const westHouses: [number, number][] = [
    [5, 4], [6, 4], [7, 4], [8, 4], [10, 4], [11, 4], [12, 4],
    [5, 5], [6, 5], [8, 5], [10, 5], [11, 5], [12, 5],
    [5, 7], [6, 7], [7, 7], [10, 8], [11, 8], [12, 8],
    [5, 11], [6, 11], [7, 11], [8, 11], [10, 12], [11, 12], [12, 12],
    [5, 16], [6, 16], [7, 16], [10, 16], [11, 16], [12, 16],
  ];
  westHouses.forEach(([x, y], i) => place('house', x, y, `Westbrook Home #${i + 1}`));

  // Decorative forest clusters for woodcutters
  const twinForests: [number, number][] = [
    [2, 5], [3, 5], [2, 6], [3, 12], [2, 13],
    [30, 8], [31, 8], [30, 9], [30, 14], [31, 14],
  ];
  for (const [fx, fy] of twinForests) {
    if (tiles[idx(fx, fy)].terrain === 'grass' && !tiles[idx(fx, fy)].hasRoad && !tiles[idx(fx, fy)].building) {
      tiles[idx(fx, fy)].terrain = 'forest';
    }
  }

  // Dense offices, schools & hospital east of the river
  place('office', 21, 5, 'Commerce Tower 1');
  place('office', 22, 5, 'Commerce Tower 2');
  place('office', 23, 5, 'Commerce Tower 3');
  place('office', 26, 5, 'Tech Park A');
  place('office', 27, 5, 'Tech Park B');
  place('factory', 28, 13, 'Riverbend Factory');
  place('school', 21, 8, 'Central Prep');
  place('school', 26, 11, 'Bridgeview School');
  place('hospital', 22, 13, 'Riverbend Medical');
  place('police', 21, 13, 'Eastside Precinct');
  place('jail', 21, 11, 'Eastside Jail');
  place('fire_station', 12, 8, 'Westbrook Firehouse');
  place('cemetery', 23, 17, 'Riverbend Cemetery');
  place('market', 24, 9, 'Grand Arcade');
  place('market', 27, 14, 'East Market');
  place('cafe', 23, 9, 'Pier Espresso');
  place('bakery', 11, 13, 'Westbrook Bakery');
  place('tackle_shop', 19, 12, 'Bridge Bait & Tackle');
  place('flower_shop', 10, 13, 'River Florist');
  place('crops', 8, 12, 'Westbrook Farm');
  place('park', 22, 17, 'Riverside Park');
  place('city_hall', 24, 14, 'Twin Bridges City Hall');

  // Zebra crossings near schools, hospital, homes & City Hall
  const twinCrossings: [number, number][] = [
    [7, 6],
    [11, 6],
    [20, 8],
    [24, 15],
    [26, 10],
    [13, 13],
    [20, 12],
  ];
  for (const [cx, cy] of twinCrossings) {
    const t = tiles[idx(cx, cy)];
    if (t.hasRoad) t.hasZebraCrossing = true;
  }

  // Walking footbridge across the river at y=12 (connecting Westbrook shops & Bridge Bait & Tackle)
  for (let x = 15; x <= 18; x++) {
    const t = tiles[idx(x, 12)];
    if (t.terrain === 'water' && !t.hasRoad) {
      t.hasFootbridge = true;
    }
  }

  return {
    id: 'preset_twin_bridges',
    name: 'Twin Bridges',
    subtitle: 'Heavy commuter bottleneck across two river bridges',
    updatedAt: Date.now(),
    tiles,
    customBlueprints: [],
  };
}

function buildHarborMetroPreset(): SavedMapData {
  const tiles = createEmptyTiles();
  const idx = (x: number, y: number) => y * GRID_COLS + x;

  // Scenic southern harbor bay + sandy shoreline
  for (let y = 17; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const cove = Math.sin(x * 0.28) * 1.1;
      if (y + cove >= 18.2) {
        tiles[idx(x, y)].terrain = 'water';
      } else if (y + cove >= 17.0) {
        tiles[idx(x, y)].terrain = 'sand';
      }
    }
  }

  // Harbor forest groves on the northwest & northeast hills
  const forestSpots: [number, number][] = [
    [1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [3, 2], [2, 3],
    [30, 1], [31, 1], [32, 1], [30, 2], [31, 2], [32, 2], [31, 3],
    [15, 2], [16, 2], [17, 2], [18, 2],
    [2, 14], [3, 14], [30, 14], [31, 14],
  ];
  for (const [fx, fy] of forestSpots) {
    if (tiles[idx(fx, fy)].terrain === 'grass') {
      tiles[idx(fx, fy)].terrain = 'forest';
    }
  }

  const setRoad = (x: number, y: number, offset = 0) => {
    const t = tiles[idx(x, y)];
    if (t.terrain === 'forest') t.terrain = 'grass';
    t.hasRoad = true;
    t.intersection = { controlType: 'signal', cycleDuration: 18, phaseOffset: offset };
  };

  // Two main east-west boulevards & coastal promenade
  for (let x = 4; x <= 29; x++) {
    setRoad(x, 5, 0);
    setRoad(x, 10, 6);
    setRoad(x, 15, 11);
  }
  // North-south avenues creating neat city blocks
  for (let y = 5; y <= 15; y++) {
    setRoad(4, y, 2);
    setRoad(10, y, 5);
    setRoad(16, y, 8);
    setRoad(22, y, 4);
    setRoad(29, y, 10);
  }

  const place = (bpId: string, x: number, y: number, name?: string) => {
    const t = tiles[idx(x, y)];
    if (!t.hasRoad && t.terrain !== 'water') {
      if (t.terrain === 'forest') t.terrain = 'grass';
      t.building = makeBuilding(bpId, x, y, name);
    }
  };

  // Residential Bayside & Hilltop Neighborhoods
  const homes: [number, number][] = [
    [5, 6], [6, 6], [7, 6], [8, 6], [9, 6],
    [5, 8], [6, 8], [8, 8], [9, 8],
    [5, 11], [6, 11], [7, 11], [9, 11],
    [5, 13], [6, 13], [8, 13],
    [24, 12], [25, 12], [26, 12], [27, 12],
    [24, 14], [25, 14], [27, 14],
  ];
  homes.forEach(([hx, hy], i) => place('house', hx, hy, `Harbor Home #${i + 1}`));

  // Schools, Parks & Civic District
  place('school', 12, 7, 'Harbor Elementary');
  place('park', 13, 7, 'Bayside Playground');
  place('city_hall', 18, 7, 'Harbor City Hall');
  place('park', 19, 7, 'Civic Commons');
  place('hospital', 12, 12, 'Harbor General Hospital');
  place('police', 14, 12, 'Harbor Police HQ');
  place('jail', 15, 12, 'Harbor Detention');
  place('fire_station', 11, 8, 'Pier Firehouse');
  place('cemetery', 2, 10, 'Hillside Memorial');
  place('school', 26, 7, 'Metro High School');

  // Commercial Downtown & Job District
  place('office', 18, 6, 'Bayfront Tower');
  place('office', 20, 6, 'Commerce Plaza');
  place('office', 24, 6, 'Oceanic Tech');
  place('office', 25, 6, 'Portside Trade');
  place('factory', 28, 7, 'Harbor Cannery');
  place('crops', 7, 13, 'Sunvale Crops');
  place('market', 18, 11, 'Harbor Grand Market');
  place('bakery', 20, 11, 'Sea Breeze Bakery');
  place('cafe', 19, 13, 'Boardwalk Cafe');
  place('bookshop', 21, 13, 'Lighthouse Books');
  place('flower_shop', 17, 13, 'Coral Florist');
  place('tackle_shop', 14, 16, 'Harbor Bait & Tackle');

  // Zebra crossings & coastal footbridge
  const crossings: [number, number][] = [
    [12, 5], [18, 5], [12, 10], [18, 10], [7, 10], [26, 5], [14, 15], [20, 15],
  ];
  for (const [cx, cy] of crossings) {
    const t = tiles[idx(cx, cy)];
    if (t.hasRoad) t.hasZebraCrossing = true;
  }

  for (let x = 16; x <= 20; x++) {
    const t = tiles[idx(x, 19)];
    if (t && t.terrain === 'water' && !t.hasRoad) {
      t.hasFootbridge = true;
    }
  }

  return {
    id: 'preset_harbor_metro',
    name: 'Harbor Metro',
    subtitle: 'Coastal city with bayfront promenade, downtown shops & districts',
    updatedAt: Date.now(),
    tiles,
    customBlueprints: [],
  };
}

export const BIOME_TEMPLATES: {
  id: MapTemplateKind;
  name: string;
  description: string;
  accent: string;
}[] = [
  {
    id: 'valley',
    name: 'Grass Valley',
    description: 'Open green countryside with light tree groves',
    accent: '#22C55E',
  },
  {
    id: 'island',
    name: 'Sandy Island',
    description: 'Lush island ringed by golden beaches & ocean water',
    accent: '#F59E0B',
  },
  {
    id: 'archipelago',
    name: 'Isolated Islands',
    description: 'Cluster of sunny sandy islands connected by bridges',
    accent: '#0EA5E9',
  },
  {
    id: 'jungle',
    name: 'Dense Jungle',
    description: 'Thick forest canopy clumps teeming with wildlife',
    accent: '#15803D',
  },
  {
    id: 'river',
    name: 'Central River',
    description: 'Twin grassy banks divided by a winding blue river',
    accent: '#0284C7',
  },
  {
    id: 'pond',
    name: 'Pond Meadow',
    description: 'Scenic meadow centered around a peaceful freshwater pond',
    accent: '#10B981',
  },
];

function seededNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function smoothBiomeNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = seededNoise(x0, y0, seed);
  const b = seededNoise(x0 + 1, y0, seed);
  const c = seededNoise(x0, y0 + 1, seed);
  const d = seededNoise(x0 + 1, y0 + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function createCustomBiomePreset(config: CustomBiomeConfig): SavedMapData {
  const { cols, rows } = clampBiomeSize(config.cols, config.rows);
  const baseLand: TerrainType = config.baseGround === 'sand' ? 'sand' : 'grass';
  const tiles = createEmptyTiles(cols, rows, baseLand);
  const idx = (x: number, y: number) => y * cols + x;
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const seed = Math.abs(Math.floor(config.seed || 1)) || 1;
  const waterRatio = Math.max(0, Math.min(100, config.waterAmount)) / 100;
  const forestRatio = Math.max(0, Math.min(100, config.forestDensity)) / 100;
  const sandRatio = Math.max(0, Math.min(100, config.sandAmount)) / 100;

  const isHorizontalRiver = seed % 2 === 1;
  const pondOffsetX = (seededNoise(seed, 3, seed) - 0.5) * cols * 0.16;
  const pondOffsetY = (seededNoise(7, seed, seed) - 0.5) * rows * 0.16;

  const islandCount = Math.max(4, Math.min(7, Math.round((cols * rows) / 140) + (seed % 2)));
  const archIsles: { ix: number; iy: number; r: number }[] = [];
  if (config.waterStyle === 'archipelago') {
    const gridColsCount = islandCount >= 6 ? 3 : 2;
    const gridRowsCount = Math.ceil(islandCount / gridColsCount);
    let created = 0;
    for (let gy = 0; gy < gridRowsCount && created < islandCount; gy++) {
      for (let gx = 0; gx < gridColsCount && created < islandCount; gx++) {
        const jx = (seededNoise(gx + 1, gy + 5, seed) - 0.5) * (cols / gridColsCount) * 0.35;
        const jy = (seededNoise(gx + 9, gy + 2, seed) - 0.5) * (rows / gridRowsCount) * 0.35;
        const ix = ((gx + 0.5) / gridColsCount) * cols + jx;
        const iy = ((gy + 0.5) / gridRowsCount) * rows + jy;
        const baseR = Math.min(cols / gridColsCount, rows / gridRowsCount) * (0.58 - waterRatio * 0.24);
        archIsles.push({ ix, iy, r: Math.max(2.6, baseR) });
        created++;
      }
    }
  }

  // 1. Sculpt Water & Land
  if (config.waterStyle !== 'none' && waterRatio > 0.02) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let isWater = false;
        if (config.waterStyle === 'river') {
          if (isHorizontalRiver) {
            const wave =
              Math.sin((x + seed) * 0.28) * (rows * 0.08) +
              Math.cos((x + seed * 0.5) * 0.14) * (rows * 0.05);
            const riverY = cy + wave;
            const halfW = 0.45 + waterRatio * 2.1;
            if (Math.abs(y - riverY) <= halfW) isWater = true;
          } else {
            const wave =
              Math.sin((y + seed) * 0.32) * (cols * 0.08) +
              Math.cos((y + seed * 0.5) * 0.16) * (cols * 0.05);
            const riverX = cx + wave;
            const halfW = 0.45 + waterRatio * 2.4;
            if (Math.abs(x - riverX) <= halfW) isWater = true;
          }
        } else if (config.waterStyle === 'pond') {
          const rx = Math.max(2.2, cols * (0.12 + waterRatio * 0.24));
          const ry = Math.max(2.0, rows * (0.14 + waterRatio * 0.26));
          const wobble = (smoothBiomeNoise(x * 0.35, y * 0.35, seed + 11) - 0.5) * 0.28;
          const dist = Math.hypot((x - (cx + pondOffsetX)) / rx, (y - (cy + pondOffsetY)) / ry) + wobble;
          if (dist < 0.95) isWater = true;
        } else if (config.waterStyle === 'island') {
          const landScale = Math.max(0.24, 0.48 - waterRatio * 0.22);
          const nx = (x - cx) / (cols * landScale);
          const ny = (y - cy) / (rows * landScale);
          const wobble = (smoothBiomeNoise(x * 0.28, y * 0.28, seed + 7) - 0.5) * 0.36;
          if (Math.hypot(nx, ny) + wobble > 1.0) isWater = true;
        } else if (config.waterStyle === 'archipelago') {
          let bestRatio = 99;
          for (const isle of archIsles) {
            const wobble = (smoothBiomeNoise(x * 0.4, y * 0.4, seed + 13) - 0.5) * 0.26;
            const ratio = Math.hypot((x - isle.ix) / isle.r, (y - isle.iy) / (isle.r * 0.85)) + wobble;
            if (ratio < bestRatio) bestRatio = ratio;
          }
          if (bestRatio > 1.0) isWater = true;
        }

        if (isWater) {
          tiles[idx(x, y)].terrain = 'water';
        }
      }
    }
  }

  // 2. Apply Shoreline Sand & Inland Sand Patches
  if (baseLand === 'grass' && sandRatio > 0.02) {
    const shoreDepth = sandRatio >= 0.65 ? 2 : 1;
    const isNearWater = (tx: number, ty: number, depth: number) => {
      for (let dy = -depth; dy <= depth; dy++) {
        for (let dx = -depth; dx <= depth; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = tx + dx;
          const ny = ty + dy;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          if (tiles[idx(nx, ny)].terrain === 'water') return Math.max(Math.abs(dx), Math.abs(dy));
        }
      }
      return 0;
    };

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const t = tiles[idx(x, y)];
        if (t.terrain !== 'grass') continue;
        const nearDist = isNearWater(x, y, shoreDepth);
        if (nearDist === 1 && seededNoise(x, y, seed + 23) < 0.25 + sandRatio * 0.75) {
          t.terrain = 'sand';
        } else if (nearDist === 2 && seededNoise(x, y, seed + 29) < (sandRatio - 0.45) * 1.1) {
          t.terrain = 'sand';
        } else if (sandRatio > 0.35) {
          const dune = smoothBiomeNoise(x * 0.26, y * 0.26, seed + 31);
          if (dune > 0.92 - (sandRatio - 0.35) * 0.55) {
            t.terrain = 'sand';
          }
        }
      }
    }
  }

  // 3. Apply Forest Groves
  if (forestRatio > 0.02) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const t = tiles[idx(x, y)];
        if (t.terrain === 'water') continue;
        if (t.terrain === 'sand' && baseLand === 'grass' && forestRatio < 0.75) continue;
        if (t.terrain === 'sand' && baseLand === 'sand' && forestRatio < 0.4) continue;
        const fNoise =
          smoothBiomeNoise(x * 0.3, y * 0.3, seed + 41) * 0.7 +
          seededNoise(x, y, seed + 53) * 0.3;
        const threshold = 0.94 - forestRatio * 0.62;
        if (fNoise > threshold) {
          t.terrain = 'forest';
        }
      }
    }
  }

  // 4. Guarantee playable open buildable land tiles
  const buildableCount = tiles.filter((t) => t.terrain === 'grass' || t.terrain === 'sand').length;
  if (buildableCount < 16) {
    const midX = Math.floor(cx);
    const midY = Math.floor(cy);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = Math.max(0, Math.min(cols - 1, midX + dx));
        const ty = Math.max(0, Math.min(rows - 1, midY + dy));
        tiles[idx(tx, ty)].terrain = baseLand;
      }
    }
  }

  const waterLabels: Record<CustomBiomeConfig['waterStyle'], string> = {
    none: baseLand === 'sand' ? 'Desert Plains' : 'Open Plains',
    river: 'Winding River',
    pond: 'Freshwater Pond',
    island: 'Ocean Island',
    archipelago: 'Island Chain',
  };

  return {
    id: `biome_custom_${Date.now()}`,
    name: config.name?.trim() || `${waterLabels[config.waterStyle]} (${cols}×${rows})`,
    subtitle: `${cols}×${rows} custom biome · ${waterLabels[config.waterStyle]}`,
    updatedAt: Date.now(),
    gridCols: cols,
    gridRows: rows,
    template: 'custom',
    tiles,
    customBlueprints: [],
  };
}

export function createBiomePreset(
  template: MapTemplateKind,
  customName?: string,
  size?: { cols?: number; rows?: number }
): SavedMapData {
  if (template === 'custom') {
    return createCustomBiomePreset({
      name: customName,
      cols: size?.cols ?? GRID_COLS,
      rows: size?.rows ?? GRID_ROWS,
      baseGround: 'grass',
      waterStyle: 'river',
      waterAmount: 45,
      forestDensity: 35,
      sandAmount: 30,
      seed: Math.floor(Math.random() * 9000) + 100,
    });
  }

  const { cols, rows } = clampBiomeSize(size?.cols, size?.rows);
  const tiles = createEmptyTiles(cols, rows);
  const idx = (x: number, y: number) => y * cols + x;
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;

  const noise = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  };

  let defaultName = 'Grass Valley';
  let subtitle = 'Custom blank grass valley ready to build';

  if (template === 'valley') {
    defaultName = 'Grass Valley';
    subtitle = 'Open green terrain with gentle tree groves';
    const marginX = Math.max(3, Math.round(cols * 0.18));
    const marginY = Math.max(2, Math.round(rows * 0.18));
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (
          noise(x * 0.7, y * 0.7) > 0.88 &&
          (x < marginX || x >= cols - marginX || y < marginY || y >= rows - marginY)
        ) {
          tiles[idx(x, y)].terrain = 'forest';
        }
      }
    }
  } else if (template === 'island') {
    defaultName = 'Coral Island';
    subtitle = 'Sandy-shored tropical island surrounded by deep sea';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const nx = (x - cx) / (cols * 0.36);
        const ny = (y - cy) / (rows * 0.36);
        const wobble = Math.sin(x * 0.45) * 0.08 + Math.cos(y * 0.55) * 0.08;
        const dist = Math.hypot(nx, ny) + wobble;
        if (dist > 1.02) {
          tiles[idx(x, y)].terrain = 'water';
        } else if (dist > 0.84) {
          tiles[idx(x, y)].terrain = 'sand';
        } else if (dist < 0.45 && noise(x, y) > 0.78) {
          tiles[idx(x, y)].terrain = 'forest';
        } else {
          tiles[idx(x, y)].terrain = 'grass';
        }
      }
    }
  } else if (template === 'archipelago') {
    defaultName = 'Sunlit Archipelago';
    subtitle = 'Lots of isolated sandy islands separated by ocean channels';
    const scaleR = Math.min(cols / GRID_COLS, rows / GRID_ROWS);
    const isles = [
      { ix: cols * 0.21, iy: rows * 0.27, r: Math.max(2.6, 4.5 * scaleR) },
      { ix: cols * 0.5, iy: rows * 0.23, r: Math.max(2.4, 3.8 * scaleR) },
      { ix: cols * 0.77, iy: rows * 0.32, r: Math.max(2.6, 4.6 * scaleR) },
      { ix: cols * 0.24, iy: rows * 0.68, r: Math.max(2.5, 4.4 * scaleR) },
      { ix: cols * 0.53, iy: rows * 0.68, r: Math.max(2.7, 4.8 * scaleR) },
      { ix: cols * 0.79, iy: rows * 0.73, r: Math.max(2.4, 3.9 * scaleR) },
    ];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let bestRatio = 99;
        for (const isle of isles) {
          const ratio = Math.hypot((x - isle.ix) / isle.r, (y - isle.iy) / (isle.r * 0.85));
          if (ratio < bestRatio) bestRatio = ratio;
        }
        if (bestRatio > 1.02) {
          tiles[idx(x, y)].terrain = 'water';
        } else if (bestRatio > 0.74) {
          tiles[idx(x, y)].terrain = 'sand';
        } else if (bestRatio < 0.42 && noise(x, y) > 0.76) {
          tiles[idx(x, y)].terrain = 'forest';
        } else {
          tiles[idx(x, y)].terrain = 'grass';
        }
      }
    }
  } else if (template === 'jungle') {
    defaultName = 'Emerald Jungle';
    subtitle = 'Lush tropical forest clusters rich with wild animals';
    const midStream = Math.round(cols * 0.47);
    const clearR = Math.max(3.2, Math.min(cols, rows) * 0.2);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const wave = Math.sin(x * 0.42 + y * 0.28) + Math.cos(x * 0.23 - y * 0.48);
        const centerClear = Math.hypot(x - cx, y - cy) < clearR;
        if (!centerClear && (wave > 0.35 || noise(x, y) > 0.7)) {
          tiles[idx(x, y)].terrain = 'forest';
        } else if (
          Math.abs(x - (midStream + Math.round(Math.sin(y * 0.4) * 1.5))) === 0 &&
          y > 1 &&
          y < rows - 2 &&
          noise(x, y) > 0.85
        ) {
          tiles[idx(x, y)].terrain = 'water';
        } else {
          tiles[idx(x, y)].terrain = 'grass';
        }
      }
    }
    const creekX = Math.round(cols * 0.71);
    for (let y = 0; y < rows; y++) {
      const rx = creekX + Math.round(Math.sin(y * 0.45) * 1.4);
      if (rx >= 0 && rx < cols) {
        tiles[idx(rx, y)].terrain = 'water';
      }
    }
  } else if (template === 'river') {
    defaultName = 'Twin Banks River';
    subtitle = 'Grassy valley split down the middle by a winding river';
    for (let y = 0; y < rows; y++) {
      const rx = Math.round(cx + Math.sin(y * 0.36) * Math.max(1.5, cols * 0.065));
      for (let dx = -1; dx <= 1; dx++) {
        const tx = rx + dx;
        if (tx >= 0 && tx < cols) {
          tiles[idx(tx, y)].terrain = 'water';
        }
      }
      const bankLeft = rx - 2;
      const bankRight = rx + 2;
      if (bankLeft >= 0 && noise(bankLeft, y) > 0.65) tiles[idx(bankLeft, y)].terrain = 'sand';
      if (bankRight < cols && noise(bankRight, y) > 0.65) tiles[idx(bankRight, y)].terrain = 'sand';
    }
    const edgeMargin = Math.max(3, Math.round(cols * 0.16));
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (
          tiles[idx(x, y)].terrain === 'grass' &&
          (x <= edgeMargin || x >= cols - 1 - edgeMargin) &&
          noise(x, y) > 0.62
        ) {
          tiles[idx(x, y)].terrain = 'forest';
        }
      }
    }
  } else if (template === 'pond') {
    defaultName = 'Willow Pond';
    subtitle = 'Peaceful pond surrounded by trees and wildlife glades';
    const rx = Math.max(3.2, cols * 0.16);
    const ry = Math.max(2.4, rows * 0.17);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dist = Math.hypot((x - cx) / rx, (y - cy) / ry) + Math.sin(x * 0.6 + y * 0.5) * 0.1;
        if (dist < 0.88) {
          tiles[idx(x, y)].terrain = 'water';
        } else if (dist < 1.08 && noise(x, y) > 0.5) {
          tiles[idx(x, y)].terrain = 'sand';
        } else if (dist > 1.35 && dist < 2.1 && noise(x, y) > 0.6) {
          tiles[idx(x, y)].terrain = 'forest';
        }
      }
    }
  }

  return {
    id: `biome_${template}_${Date.now()}`,
    name: customName?.trim() || defaultName,
    subtitle: `${cols}×${rows} · ${subtitle}`,
    updatedAt: Date.now(),
    gridCols: cols,
    gridRows: rows,
    template,
    tiles,
    customBlueprints: [],
  };
}

export function createTutorialPreset(): SavedMapData {
  const tiles = createEmptyTiles();
  const idx = (x: number, y: number) => y * GRID_COLS + x;

  // Scenic creek & sandy bank on the east side
  for (let y = 3; y <= 18; y++) {
    const rx = 26 + Math.round(Math.sin(y * 0.45));
    for (let dx = 0; dx <= 1; dx++) {
      const tx = rx + dx;
      if (tx >= 0 && tx < GRID_COLS) {
        tiles[idx(tx, y)].terrain = 'water';
      }
    }
    if (rx - 1 >= 0 && tiles[idx(rx - 1, y)].terrain === 'grass') {
      tiles[idx(rx - 1, y)].terrain = 'sand';
    }
  }

  // Forest groves on the west and far-east hills
  const groveCoords: [number, number][] = [
    [3, 4], [4, 4], [3, 5], [4, 5], [3, 16], [4, 16], [4, 17],
    [29, 5], [30, 5], [30, 6], [29, 15], [30, 15], [30, 16],
  ];
  for (const [fx, fy] of groveCoords) {
    if (tiles[idx(fx, fy)].terrain === 'grass') {
      tiles[idx(fx, fy)].terrain = 'forest';
    }
  }

  const setRoad = (x: number, y: number, offset = 0) => {
    const t = tiles[idx(x, y)];
    t.hasRoad = true;
    t.intersection = { controlType: 'signal', cycleDuration: 18, phaseOffset: offset };
  };

  for (let x = 7; x <= 23; x++) {
    setRoad(x, 6, 0);
    setRoad(x, 10, 6);
    setRoad(x, 14, 12);
  }
  for (let y = 6; y <= 14; y++) {
    setRoad(7, y, 2);
    setRoad(12, y, 5);
    setRoad(18, y, 8);
    setRoad(23, y, 11);
  }

  const place = (bpId: string, x: number, y: number, name?: string) => {
    const t = tiles[idx(x, y)];
    if (!t.hasRoad && t.terrain !== 'water') {
      t.terrain = 'grass';
      t.building = makeBuilding(bpId, x, y, name);
    }
  };

  const homes: [number, number][] = [
    [8, 7], [9, 7], [10, 7],
    [8, 8], [9, 8],
    [8, 12], [9, 12], [10, 12],
    [20, 7], [21, 7],
    [20, 12], [21, 12],
  ];
  homes.forEach(([hx, hy], i) => place('house', hx, hy, `House ${i + 1}`));

  place('school', 14, 8, 'Tutorial School');
  place('park', 15, 8, 'Central Park');
  place('market', 14, 12, 'Corner Market');
  place('electronics_shop', 15, 12, 'Pixel Electronics');
  place('bakery', 19, 8, 'Morning Bakery');
  place('hospital', 21, 8, 'Town Clinic');
  place('police', 19, 13, 'Town Police');
  place('fire_station', 20, 13, 'Town Firehouse');
  place('office', 14, 13, 'Town Offices');
  place('crops', 10, 13, 'Starter Farm');

  // Leave (16, 11) and nearby central tiles open for the player's first City Hall!
  const crossings: [number, number][] = [
    [14, 10],
    [16, 10],
    [12, 8],
    [18, 8],
  ];
  for (const [cx, cy] of crossings) {
    const t = tiles[idx(cx, cy)];
    if (t.hasRoad) t.hasZebraCrossing = true;
  }

  return {
    id: 'tutorial_town',
    name: 'Tutorial Town',
    subtitle: 'Step-by-step guided town — place City Hall & learn the controls',
    updatedAt: Date.now(),
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,
    tiles,
    customBlueprints: [],
  };
}

export const PRESET_MAPS: SavedMapData[] = [
  buildOakridgePreset(),
  buildTwinBridgesPreset(),
  buildHarborMetroPreset(),
];

