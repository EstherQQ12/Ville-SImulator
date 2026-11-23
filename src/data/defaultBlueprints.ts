import {
  BuildingBlueprint,
  GRID_COLS,
  GRID_ROWS,
  ICON_SIZE,
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

export function createBiomePreset(template: MapTemplateKind, customName?: string): SavedMapData {
  const tiles = createEmptyTiles();
  const idx = (x: number, y: number) => y * GRID_COLS + x;
  const cx = (GRID_COLS - 1) / 2;
  const cy = (GRID_ROWS - 1) / 2;

  const noise = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  };

  let defaultName = 'Grass Valley';
  let subtitle = 'Custom blank grass valley ready to build';

  if (template === 'valley') {
    defaultName = 'Grass Valley';
    subtitle = 'Open green terrain with gentle tree groves';
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (noise(x * 0.7, y * 0.7) > 0.88 && (x < 6 || x > GRID_COLS - 7 || y < 4 || y > GRID_ROWS - 5)) {
          tiles[idx(x, y)].terrain = 'forest';
        }
      }
    }
  } else if (template === 'island') {
    defaultName = 'Coral Island';
    subtitle = 'Sandy-shored tropical island surrounded by deep sea';
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const nx = (x - cx) / (GRID_COLS * 0.36);
        const ny = (y - cy) / (GRID_ROWS * 0.36);
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
    const isles = [
      { ix: 7, iy: 6, r: 4.5 },
      { ix: 17, iy: 5, r: 3.8 },
      { ix: 26, iy: 7, r: 4.6 },
      { ix: 8, iy: 15, r: 4.4 },
      { ix: 18, iy: 15, r: 4.8 },
      { ix: 27, iy: 16, r: 3.9 },
    ];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
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
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const wave = Math.sin(x * 0.42 + y * 0.28) + Math.cos(x * 0.23 - y * 0.48);
        const centerClear = Math.hypot(x - cx, y - cy) < 4.5;
        if (!centerClear && (wave > 0.35 || noise(x, y) > 0.7)) {
          tiles[idx(x, y)].terrain = 'forest';
        } else if (Math.abs(x - (16 + Math.round(Math.sin(y * 0.4) * 1.5))) === 0 && y > 1 && y < GRID_ROWS - 2 && noise(x, y) > 0.85) {
          tiles[idx(x, y)].terrain = 'water';
        } else {
          tiles[idx(x, y)].terrain = 'grass';
        }
      }
    }
    // Small jungle creek
    for (let y = 0; y < GRID_ROWS; y++) {
      const rx = 24 + Math.round(Math.sin(y * 0.45) * 1.4);
      if (rx >= 0 && rx < GRID_COLS) {
        tiles[idx(rx, y)].terrain = 'water';
      }
    }
  } else if (template === 'river') {
    defaultName = 'Twin Banks River';
    subtitle = 'Grassy valley split down the middle by a winding river';
    for (let y = 0; y < GRID_ROWS; y++) {
      const rx = Math.round(cx + Math.sin(y * 0.36) * 2.2);
      for (let dx = -1; dx <= 1; dx++) {
        const tx = rx + dx;
        if (tx >= 0 && tx < GRID_COLS) {
          tiles[idx(tx, y)].terrain = 'water';
        }
      }
      const bankLeft = rx - 2;
      const bankRight = rx + 2;
      if (bankLeft >= 0 && noise(bankLeft, y) > 0.65) tiles[idx(bankLeft, y)].terrain = 'sand';
      if (bankRight < GRID_COLS && noise(bankRight, y) > 0.65) tiles[idx(bankRight, y)].terrain = 'sand';
    }
    // Forest clumps near outer edges
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (tiles[idx(x, y)].terrain === 'grass' && (x <= 5 || x >= GRID_COLS - 6) && noise(x, y) > 0.62) {
          tiles[idx(x, y)].terrain = 'forest';
        }
      }
    }
  } else if (template === 'pond') {
    defaultName = 'Willow Pond';
    subtitle = 'Peaceful pond surrounded by trees and wildlife glades';
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const dist = Math.hypot((x - cx) / 5.4, (y - cy) / 3.8) + Math.sin(x * 0.6 + y * 0.5) * 0.1;
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
    subtitle,
    updatedAt: Date.now(),
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,
    template,
    tiles,
    customBlueprints: [],
  };
}

export const PRESET_MAPS: SavedMapData[] = [
  buildOakridgePreset(),
  buildTwinBridgesPreset(),
  buildHarborMetroPreset(),
];
