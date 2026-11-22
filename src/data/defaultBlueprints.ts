import {
  BuildingBlueprint,
  GRID_COLS,
  GRID_ROWS,
  ICON_SIZE,
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

export const DEFAULT_BLUEPRINTS: BuildingBlueprint[] = [
  {
    id: 'house',
    name: 'House',
    category: 'residential',
    iconGrid: HOUSE_ART,
    accentColor: '#C2410C',
    capacity: 12,
  },
  {
    id: 'city_hall',
    name: 'City Hall',
    category: 'city_hall',
    iconGrid: CITY_HALL_ART,
    accentColor: '#7C3AED',
    capacity: 32,
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
    capacity: 60,
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
    capacity: 25,
  },
  {
    id: 'fire_station',
    name: 'Firehouse',
    category: 'fire_station',
    iconGrid: FIRE_STATION_ART,
    accentColor: '#DC2626',
    capacity: 25,
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
    capacity: 50,
  },
  {
    id: 'factory',
    name: 'Factory',
    category: 'factory',
    iconGrid: FACTORY_ART,
    accentColor: '#D97706',
    capacity: 60,
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
    capacity: 35,
  },
  {
    id: 'bakery',
    name: 'Bakery',
    category: 'commercial',
    iconGrid: BAKERY_ART,
    accentColor: '#EA580C',
    capacity: 20,
  },
  {
    id: 'cafe',
    name: 'Cafe',
    category: 'visit_spot',
    iconGrid: CAFE_ART,
    accentColor: '#92400E',
    capacity: 25,
  },
  {
    id: 'bookshop',
    name: 'Bookshop',
    category: 'visit_spot',
    iconGrid: BOOKSHOP_ART,
    accentColor: '#0284C7',
    capacity: 20,
  },
  {
    id: 'flower_shop',
    name: 'Florist',
    category: 'commercial',
    iconGrid: FLOWER_SHOP_ART,
    accentColor: '#EC4899',
    capacity: 18,
  },
  {
    id: 'tackle_shop',
    name: 'Tackle Shop',
    category: 'commercial',
    iconGrid: TACKLE_SHOP_ART,
    accentColor: '#0EA5E9',
    capacity: 18,
  },
  {
    id: 'park',
    name: 'City Park',
    category: 'park',
    iconGrid: PARK_ART,
    accentColor: '#16A34A',
    capacity: 30,
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
  factory: 'Factory (Goods, Economy & Smokestacks)',
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

function createEmptyTiles(): SavedMapData['tiles'] {
  const tiles: SavedMapData['tiles'] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      tiles.push({
        x,
        y,
        terrain: 'grass',
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

function buildBlankPreset(): SavedMapData {
  const tiles = createEmptyTiles();
  return {
    id: 'preset_blank',
    name: 'Blank Valley',
    subtitle: 'Open grassy terrain ready for your custom roads & icons',
    updatedAt: Date.now(),
    tiles,
    customBlueprints: [],
  };
}

export type MapBiomeType = 'valley' | 'islands' | 'jungle' | 'river' | 'pond';

export const MAP_BIOME_INFO: { id: MapBiomeType; label: string; desc: string }[] = [
  { id: 'valley', label: 'Green Valley', desc: 'Lush meadows, forest groves & gentle farmland' },
  { id: 'islands', label: 'Isolated Sand Islands', desc: 'Sandy coral islands across turquoise bays' },
  { id: 'jungle', label: 'Tropical Jungle', desc: 'Dense canopy clumps teeming with wildlife' },
  { id: 'river', label: 'Central River', desc: 'Wide river down the middle with twin crossings' },
  { id: 'pond', label: 'Meadow & Pond', desc: 'Tranquil central pond ringed by parklands' },
];

export function generateCustomBiomeMap(name: string, biome: MapBiomeType): SavedMapData {
  const tiles = createEmptyTiles();
  const idx = (x: number, y: number) => y * GRID_COLS + x;
  let seq = 1;

  const setT = (x: number, y: number, terrain: TerrainType) => {
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;
    tiles[idx(x, y)].terrain = terrain;
  };

  const setRoad = (x: number, y: number) => {
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;
    const t = tiles[idx(x, y)];
    t.hasRoad = true;
    t.intersection = { controlType: 'signal', cycleDuration: 18, phaseOffset: (x + y) % 8 };
  };

  const place = (bpId: string, x: number, y: number, customName?: string) => {
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;
    const t = tiles[idx(x, y)];
    if (t.terrain === 'water') t.terrain = 'grass';
    t.hasRoad = false;
    t.building = makeBuilding(bpId, x, y, seq++, customName);
  };

  const clumpTrees = (cx: number, cy: number, radius: number, treeType: 'forest' | 'jungle') => {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius + 0.5) {
          const tx = cx + dx;
          const ty = cy + dy;
          if (tx >= 0 && tx < GRID_COLS && ty >= 0 && ty < GRID_ROWS) {
            const t = tiles[idx(tx, ty)];
            if (!t.hasRoad && !t.building && t.terrain !== 'water') {
              t.terrain = treeType;
            }
          }
        }
      }
    }
  };

  if (biome === 'islands') {
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        setT(x, y, 'water');
      }
    }
    const islands: { cx: number; cy: number; rx: number; ry: number; lush?: boolean }[] = [
      { cx: 7, cy: 6, rx: 4.4, ry: 3.6, lush: true },
      { cx: 18, cy: 11, rx: 5.4, ry: 4.3, lush: true },
      { cx: 28, cy: 5, rx: 3.8, ry: 3.1 },
      { cx: 7, cy: 16, rx: 3.9, ry: 3.1 },
      { cx: 27, cy: 16, rx: 4.2, ry: 3.4, lush: true },
    ];
    for (const isl of islands) {
      for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
          const norm = ((x - isl.cx) / isl.rx) ** 2 + ((y - isl.cy) / isl.ry) ** 2;
          if (norm <= 1.0) {
            setT(x, y, norm > 0.62 ? 'sand' : 'grass');
          }
        }
      }
    }
    // Starter main town on central island + sandy cove footbridge
    for (let x = 15; x <= 21; x++) setRoad(x, 11);
    for (let y = 9; y <= 13; y++) setRoad(18, y);
    // Bridge linking NW island to central island
    for (let x = 10; x <= 15; x++) {
      if (tiles[idx(x, 9)].terrain === 'water') {
        tiles[idx(x, 9)].hasFootbridge = true;
      }
    }
    clumpTrees(6, 5, 1, 'jungle');
    clumpTrees(27, 15, 1, 'jungle');
    place('city_hall', 18, 8, 'Atoll City Hall');
    place('house', 16, 10, 'Lagoon Cottage');
    place('house', 17, 10, 'Palm Villa');
    place('house', 19, 10, 'Coral Home');
    place('market', 20, 10, 'Harbor Market');
    place('tackle_shop', 15, 12, 'Reef Tackle Shop');
    place('school', 19, 12, 'Island Academy');
    place('park', 17, 12, 'Shell Playground');
    place('house', 7, 6, 'West Cay Cottage');
    place('house', 27, 16, 'South Cay Bungalow');
  } else if (biome === 'jungle') {
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const riverCurve = 25 + Math.round(Math.sin(y * 0.4) * 2);
        if (Math.abs(x - riverCurve) <= 1) {
          setT(x, y, 'water');
        } else if (Math.abs(x - riverCurve) === 2 && (x + y) % 3 === 0) {
          setT(x, y, 'sand');
        }
      }
    }
    // Dense overlapping jungle clumps
    const jungleClumps: [number, number, number][] = [
      [4, 4, 3],
      [9, 3, 2],
      [4, 15, 3],
      [11, 17, 2],
      [20, 4, 2],
      [30, 5, 2],
      [30, 16, 3],
      [18, 17, 2],
    ];
    for (const [cx, cy, r] of jungleClumps) {
      clumpTrees(cx, cy, r, 'jungle');
    }
    // Clearing road loop
    for (let x = 11; x <= 21; x++) {
      setRoad(x, 9);
      setRoad(x, 13);
    }
    for (let y = 9; y <= 13; y++) {
      setRoad(11, y);
      setRoad(21, y);
    }
    place('city_hall', 16, 8, 'Rainforest Hall');
    place('house', 12, 8, 'Canopy Cottage');
    place('house', 13, 8, 'Fern Villa');
    place('house', 14, 8, 'Toucan House');
    place('school', 18, 8, 'Jungle School');
    place('market', 13, 10, 'Mango Market');
    place('park', 15, 10, 'Treetop Park');
    place('crops', 18, 10, 'Cocoa Farm');
    place('hospital', 19, 12, 'Canopy Clinic');
    place('police', 13, 12, 'Ranger Station');
  } else if (biome === 'river') {
    // Wide central river running N-S right down x = 15..18 with twin sandy banks & bridges
    for (let y = 0; y < GRID_ROWS; y++) {
      const meander = Math.round(Math.sin(y * 0.35) * 1.2);
      for (let x = 15 + meander; x <= 18 + meander; x++) {
        setT(x, y, 'water');
      }
      if ((14 + meander) >= 0) setT(14 + meander, y, (y % 2 === 0 ? 'sand' : 'grass'));
      if ((19 + meander) < GRID_COLS) setT(19 + meander, y, (y % 2 === 1 ? 'sand' : 'grass'));
    }
    for (let x = 6; x <= 27; x++) {
      setRoad(x, 7);
      setRoad(x, 14);
    }
    for (let y = 5; y <= 16; y++) {
      setRoad(9, y);
      setRoad(24, y);
    }
    clumpTrees(4, 4, 2, 'forest');
    clumpTrees(5, 17, 2, 'forest');
    clumpTrees(29, 4, 2, 'forest');
    clumpTrees(29, 17, 2, 'forest');
    place('city_hall', 23, 6, 'Riverfront Hall');
    place('house', 7, 6);
    place('house', 8, 6);
    place('house', 10, 6);
    place('house', 7, 13);
    place('school', 10, 13, 'Westbank School');
    place('market', 22, 13, 'River Market');
    place('office', 25, 6, 'Pier Office');
    place('hospital', 25, 13, 'Riverbend Medical');
    place('park', 22, 8, 'Riverwalk Park');
    place('crops', 6, 10, 'Valley Farm');
  } else if (biome === 'pond') {
    // Tranquil central oval pond
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const d = ((x - 16.5) / 4.2) ** 2 + ((y - 10.5) / 2.8) ** 2;
        if (d <= 1.0) {
          setT(x, y, 'water');
        } else if (d <= 1.35 && (x + y) % 2 === 0) {
          setT(x, y, 'sand');
        }
      }
    }
    for (let x = 10; x <= 23; x++) {
      setRoad(x, 6);
      setRoad(x, 15);
    }
    for (let y = 6; y <= 15; y++) {
      setRoad(10, y);
      setRoad(23, y);
    }
    clumpTrees(5, 5, 2, 'forest');
    clumpTrees(28, 5, 2, 'forest');
    clumpTrees(5, 16, 2, 'forest');
    clumpTrees(28, 16, 2, 'forest');
    place('city_hall', 16, 5, 'Lakeside Hall');
    place('house', 12, 5);
    place('house', 13, 5);
    place('house', 14, 5);
    place('house', 12, 16);
    place('school', 19, 5, 'Pondview School');
    place('park', 16, 16, 'Duck Pond Park');
    place('tackle_shop', 21, 10, 'Pond Bait Shop');
    place('market', 14, 16, 'Meadow Market');
    place('crops', 7, 10, 'Clover Farm');
  } else {
    // Classic customizable green valley with starter town & dense forest clumps
    for (let x = 8; x <= 25; x++) {
      setRoad(x, 10);
      setRoad(x, 14);
    }
    for (let y = 7; y <= 16; y++) {
      setRoad(12, y);
      setRoad(21, y);
    }
    clumpTrees(5, 5, 2, 'forest');
    clumpTrees(28, 5, 2, 'forest');
    clumpTrees(5, 17, 2, 'forest');
    clumpTrees(28, 17, 2, 'forest');
    place('city_hall', 16, 9, `${name.trim() || 'Valley'} City Hall`);
    place('house', 10, 9);
    place('house', 11, 9);
    place('house', 13, 9);
    place('house', 10, 13);
    place('school', 18, 9, 'Valley School');
    place('market', 15, 13, 'Town Market');
    place('park', 17, 13, 'Meadow Park');
    place('crops', 23, 13, 'Sunlit Farm');
    place('hospital', 22, 9, 'Valley Clinic');
  }

  return {
    id: `custom_${biome}_${Date.now().toString(36)}`,
    name: name.trim() || 'Custom City',
    subtitle: `${MAP_BIOME_INFO.find((b) => b.id === biome)?.label || 'Custom'} · Ready to grow`,
    updatedAt: Date.now(),
    tiles,
    customBlueprints: [],
  };
}

export const PRESET_MAPS: SavedMapData[] = [
  buildOakridgePreset(),
  buildTwinBridgesPreset(),
  buildBlankPreset(),
];
