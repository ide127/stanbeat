export type FandomId =
  | 'bts'
  | 'blackpink'
  | 'newjeans'
  | 'seventeen'
  | 'stray-kids'
  | 'ive'
  | 'twice'
  | 'enhypen'
  | 'aespa'
  | 'le-sserafim'
  | 'gidle'
  | 'ateez'
  | 'k-culture';

export interface FandomPack {
  id: FandomId;
  displayName: string;
  fandomName: string;
  targetLabel: string;
  words: readonly string[];
  heroTitle: string;
  shareTitle: string;
  accent: string;
  heroImage: string;
  imageCredit: string;
}

type FandomPackInit = Omit<FandomPack, 'heroTitle' | 'shareTitle'>;

const FANDOM_STORAGE_KEY = 'stanbeat_active_fandom';

abstract class BaseFandomPack implements FandomPack {
  readonly id: FandomId;
  readonly displayName: string;
  readonly fandomName: string;
  readonly targetLabel: string;
  readonly words: readonly string[];
  readonly accent: string;
  readonly heroImage: string;
  readonly imageCredit: string;

  protected constructor(init: FandomPackInit) {
    this.id = init.id;
    this.displayName = init.displayName;
    this.fandomName = init.fandomName;
    this.targetLabel = init.targetLabel;
    this.words = init.words;
    this.accent = init.accent;
    this.heroImage = init.heroImage;
    this.imageCredit = init.imageCredit;
  }

  get heroTitle(): string {
    return `Find ${this.targetLabel}, Fly to Korea`;
  }

  get shareTitle(): string {
    return `Can you beat my ${this.targetLabel} challenge?`;
  }
}

class GroupFandomPack extends BaseFandomPack {
  constructor(init: FandomPackInit) {
    super(init);
  }
}

class CultureMixFandomPack extends BaseFandomPack {
  constructor(init: FandomPackInit) {
    super(init);
  }

  override get shareTitle(): string {
    return 'Can you beat my K-culture challenge?';
  }
}

export const defaultFandomId = 'k-culture';

export const fandomPacks = [
  new GroupFandomPack({
    id: 'bts',
    displayName: 'BTS',
    fandomName: 'ARMY',
    targetLabel: 'BTS',
    words: ['RM', 'JIN', 'SUGA', 'HOPE', 'JIMIN', 'V', 'JK'],
    accent: '#A855F7',
    heroImage: '/images/fandom/bts.jpg',
    imageCredit: 'The White House / Public domain',
  }),
  new GroupFandomPack({
    id: 'blackpink',
    displayName: 'BLACKPINK',
    fandomName: 'BLINK',
    targetLabel: 'BLACKPINK',
    words: ['JISOO', 'JENNIE', 'ROSE', 'LISA', 'PINK', 'VENOM', 'BLINK'],
    accent: '#FF5CA8',
    heroImage: '/images/fandom/blackpink.png',
    imageCredit: 'TV10 / CC BY 3.0',
  }),
  new GroupFandomPack({
    id: 'newjeans',
    displayName: 'NewJeans',
    fandomName: 'Bunnies',
    targetLabel: 'NewJeans',
    words: ['MINJI', 'HANNI', 'DANIELLE', 'HAERIN', 'HYEIN', 'BUNNY', 'JEANS'],
    accent: '#67E8F9',
    heroImage: '/images/fandom/newjeans.jpg',
    imageCredit: 'TenAsia / CC BY 3.0',
  }),
  new GroupFandomPack({
    id: 'seventeen',
    displayName: 'SEVENTEEN',
    fandomName: 'CARAT',
    targetLabel: 'SEVENTEEN',
    words: ['SCOUPS', 'JEONGHAN', 'HOSHI', 'WOOZI', 'MINGYU', 'DK', 'CARAT'],
    accent: '#93C5FD',
    heroImage: '/images/fandom/seventeen.jpg',
    imageCredit: 'Seventeen / CC BY 3.0',
  }),
  new GroupFandomPack({
    id: 'stray-kids',
    displayName: 'Stray Kids',
    fandomName: 'STAY',
    targetLabel: 'Stray Kids',
    words: ['BANGCHAN', 'LEEKNOW', 'CHANGBIN', 'HYUNJIN', 'HAN', 'FELIX', 'STAY'],
    accent: '#EF4444',
    heroImage: '/images/fandom/stray-kids.png',
    imageCredit: 'TV10 / CC BY 4.0',
  }),
  new GroupFandomPack({
    id: 'ive',
    displayName: 'IVE',
    fandomName: 'DIVE',
    targetLabel: 'IVE',
    words: ['YUJIN', 'GAEUL', 'REI', 'WONYOUNG', 'LIZ', 'LEESEO', 'DIVE'],
    accent: '#F9A8D4',
    heroImage: '/images/fandom/ive.png',
    imageCredit: 'TV10 / CC BY 4.0',
  }),
  new GroupFandomPack({
    id: 'twice',
    displayName: 'TWICE',
    fandomName: 'ONCE',
    targetLabel: 'TWICE',
    words: ['NAYEON', 'JEONGYEON', 'MOMO', 'SANA', 'JIHYO', 'MINA', 'ONCE'],
    accent: '#FB7185',
    heroImage: '/images/fandom/twice.jpg',
    imageCredit: 'Steven Anthony Hammock / CC BY-SA 4.0',
  }),
  new GroupFandomPack({
    id: 'enhypen',
    displayName: 'ENHYPEN',
    fandomName: 'ENGENE',
    targetLabel: 'ENHYPEN',
    words: ['JUNGWON', 'HEESEUNG', 'JAY', 'JAKE', 'SUNGHOON', 'SUNOO', 'NIKI'],
    accent: '#C084FC',
    heroImage: '/images/fandom/enhypen.png',
    imageCredit: 'TV10 / CC BY 3.0',
  }),
  new GroupFandomPack({
    id: 'aespa',
    displayName: 'aespa',
    fandomName: 'MY',
    targetLabel: 'aespa',
    words: ['KARINA', 'GISELLE', 'WINTER', 'NINGNING', 'AESPA', 'MY', 'SAVAGE'],
    accent: '#22D3EE',
    heroImage: '/images/fandom/aespa.jpg',
    imageCredit: 'plumflower snow / CC BY-SA 2.0',
  }),
  new GroupFandomPack({
    id: 'le-sserafim',
    displayName: 'LE SSERAFIM',
    fandomName: 'FEARNOT',
    targetLabel: 'LE SSERAFIM',
    words: ['SAKURA', 'CHAEWON', 'YUNJIN', 'KAZUHA', 'EUNCHAE', 'FEARNOT', 'FEARLESS'],
    accent: '#F97316',
    heroImage: '/images/fandom/le-sserafim.png',
    imageCredit: 'TV10 / CC BY 4.0',
  }),
  new GroupFandomPack({
    id: 'gidle',
    displayName: '(G)I-DLE',
    fandomName: 'Neverland',
    targetLabel: '(G)I-DLE',
    words: ['MIYEON', 'MINNIE', 'SOYEON', 'YUQI', 'SHUHUA', 'NEVERLAND', 'QUEENCARD'],
    accent: '#EC4899',
    heroImage: '/images/fandom/gidle.jpg',
    imageCredit: 'TV10 / CC BY 3.0',
  }),
  new GroupFandomPack({
    id: 'ateez',
    displayName: 'ATEEZ',
    fandomName: 'ATINY',
    targetLabel: 'ATEEZ',
    words: ['HONGJOONG', 'SEONGHWA', 'YUNHO', 'YEOSANG', 'SAN', 'MINGI', 'ATINY'],
    accent: '#FACC15',
    heroImage: '/images/fandom/ateez.jpg',
    imageCredit: 'pinkllamanade / CC BY-SA 2.0',
  }),
  new CultureMixFandomPack({
    id: 'k-culture',
    displayName: 'K-culture Mix',
    fandomName: 'K-culture fans',
    targetLabel: 'K-culture',
    words: ['KPOP', 'IDOL', 'DANCE', 'SEOUL', 'DRAMA', 'KIMCHI', 'BEAUTY'],
    accent: '#00FFFF',
    heroImage: '/images/hero-concert.webp',
    imageCredit: 'StanBeat visual asset',
  }),
] as const;

const fandomById = new Map<string, FandomPack>(fandomPacks.map((pack) => [pack.id, pack]));

export const isFandomId = (value: string | null | undefined): value is FandomId => {
  return typeof value === 'string' && fandomById.has(value);
};

export const resolveFandomId = (value: string | null | undefined): FandomId => {
  return isFandomId(value) ? value : defaultFandomId;
};

export const getFandomPack = (value: string | null | undefined): FandomPack => {
  return fandomById.get(resolveFandomId(value)) ?? fandomById.get(defaultFandomId)!;
};

export const readStoredFandomId = (): FandomId => {
  if (typeof window === 'undefined') return defaultFandomId;
  try {
    const queryValue = new URLSearchParams(window.location.search).get('fandom');
    if (isFandomId(queryValue)) return queryValue;

    const raw = window.localStorage.getItem(FANDOM_STORAGE_KEY);
    const storedValue = raw ? JSON.parse(raw) : null;
    return resolveFandomId(typeof storedValue === 'string' ? storedValue : null);
  } catch {
    return defaultFandomId;
  }
};

export const persistFandomId = (id: FandomId): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FANDOM_STORAGE_KEY, JSON.stringify(id));
    const url = new URL(window.location.href);
    url.searchParams.set('fandom', id);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Ignore storage and history failures in restricted browsers.
  }
};

export const buildFandomUrl = (baseUrl: string, fandomId: FandomId, params: Record<string, string | null | undefined> = {}): string => {
  const url = new URL(baseUrl || '/', typeof window !== 'undefined' ? window.location.origin : 'https://stanbeat.example');
  url.searchParams.set('fandom', fandomId);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
};
