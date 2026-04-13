// Utility helpers shared by the game runtime.
// Keep this file side-effect free except for short-lived audio playback.

import { GridCell, WordConfig } from './types';

// Build a deterministic avatar from the stable user id.
export const generateAvatarUrl = (id: string, name: string): string => {
  const palette = [
    'FF0080', '1E90FF', 'FFD700', '8A2BE2', 'FF4500',
    '32CD32', '00CED1', 'FF1493', 'FF6347', '4169E1',
    '9400D3', '00FA9A', 'DC143C', '1ABC9C', 'F39C12',
  ];
  const hue = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % palette.length;
  const bg = palette[hue];
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="${initial}">
      <rect width="128" height="128" rx="28" fill="#${bg}" />
      <circle cx="64" cy="64" r="52" fill="rgba(255,255,255,0.12)" />
      <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="56" font-weight="800">${initial}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

// Lightweight synthesized UI sounds.
let audioCtx: AudioContext | null = null;

export const playSfx = (type: 'tap' | 'found' | 'win') => {
  try {
    if (!audioCtx) {
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      audioCtx = new AudioContextCtor();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'tap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'found') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'win') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.setValueAtTime(600, now + 0.1);
      osc.frequency.setValueAtTime(800, now + 0.2);
      osc.frequency.setValueAtTime(1200, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch {
    // Ignore autoplay and unsupported-browser audio errors.
  }
};

// Format milliseconds as MM:SS.CC.
export const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

// Convert an ISO country code to a flag emoji.
export const getCountryFlag = (code: string) => {
  const OFFSET = 127397;
  return code
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(char.charCodeAt(0) + OFFSET))
    .join('');
};

// Four directions are enough for the puzzle: horizontal, vertical, and two diagonals.
const DIRECTIONS = [
  { r: 0, c: 1 },
  { r: 1, c: 0 },
  { r: 1, c: 1 },
  { r: 1, c: -1 },
];

interface PlacedWord {
  word: string;
  row: number;
  col: number;
  dir: { r: number; c: number };
}

const canPlaceWord = (
  board: string[][],
  word: string,
  row: number,
  col: number,
  dir: { r: number; c: number },
  size: number,
): boolean => {
  for (let i = 0; i < word.length; i++) {
    const r = row + dir.r * i;
    const c = col + dir.c * i;

    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (board[r][c] !== '' && board[r][c] !== word[i]) return false;
  }
  return true;
};

const placeWord = (
  board: string[][],
  word: string,
  row: number,
  col: number,
  dir: { r: number; c: number },
): PlacedWord => {
  for (let i = 0; i < word.length; i++) {
    board[row + dir.r * i][col + dir.c * i] = word[i];
  }
  return { word, row, col, dir };
};

// Generate a valid word-search grid.
// Retry randomized placement first, then fall back to deterministic scanning.
export const generateGrid = (size: number, words: string[]) => {
  type GeneratedGrid = { board: string[][]; placedWords: WordConfig[]; placement: PlacedWord[]; emptyRows: number };
  let bestGrid: GeneratedGrid | null = null;
  let minEmptyRows = size;
  const wordsByLength = [...words].sort((a, b) => b.length - a.length);

  for (let attempt = 0; attempt < 40; attempt++) {
    const board: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
    const placement: PlacedWord[] = [];
    let placedAllWords = true;

    for (const word of wordsByLength) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 300) {
        const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);
        if (canPlaceWord(board, word, row, col, dir, size)) {
          placement.push(placeWord(board, word, row, col, dir));
          placed = true;
        }
        attempts++;
      }

      if (!placed) {
        placedAllWords = false;
        break;
      }
    }

    if (!placedAllWords) {
      continue;
    }

    const emptyRows = board.filter(r => r.every(c => c === '')).length;
    const currentGrid: GeneratedGrid = {
      board,
      placedWords: words.map((word) => ({ word, found: false })),
      placement,
      emptyRows,
    };

    if (!bestGrid || emptyRows < minEmptyRows) {
      bestGrid = currentGrid;
      minEmptyRows = emptyRows;
    }

    if (emptyRows <= 1) break;
  }

  if (!bestGrid) {
    const board: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
    const placement: PlacedWord[] = [];

    for (const word of wordsByLength) {
      let placed = false;

      for (const dir of DIRECTIONS) {
        if (placed) break;
        for (let row = 0; row < size && !placed; row++) {
          for (let col = 0; col < size; col++) {
            if (!canPlaceWord(board, word, row, col, dir, size)) continue;
            placement.push(placeWord(board, word, row, col, dir));
            placed = true;
            break;
          }
        }
      }

      if (!placed) {
        throw new Error(`Failed to generate a valid grid for word "${word}"`);
      }
    }

    bestGrid = {
      board,
      placedWords: words.map((word) => ({ word, found: false })),
      placement,
      emptyRows: board.filter((row) => row.every((cell) => cell === '')).length,
    };
  }

  const { board, placedWords, placement } = bestGrid;

  const cellWordMap: Map<string, string> = new Map();
  placement.forEach(({ word, row, col, dir }: PlacedWord) => {
    for (let i = 0; i < word.length; i++) {
      cellWordMap.set(`${row + dir.r * i}-${col + dir.c * i}`, word);
    }
  });

  const grid: GridCell[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === '') {
        board[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      }
      grid.push({
        id: `${r}-${c}`,
        row: r,
        col: c,
        letter: board[r][c],
        selected: false,
        found: false,
      });
    }
  }

  return { grid, wordList: placedWords, placement };
};

// Cells count as adjacent in all eight directions.
export const isAdjacent = (id1: string, id2: string): boolean => {
  const [r1, c1] = id1.split('-').map(Number);
  const [r2, c2] = id2.split('-').map(Number);

  const rDiff = Math.abs(r1 - r2);
  const cDiff = Math.abs(c1 - c2);

  return rDiff <= 1 && cDiff <= 1 && !(rDiff === 0 && cDiff === 0);
};

// Return the vector from id1 to id2.
export const getDirection = (id1: string, id2: string): { r: number, c: number } => {
  const [r1, c1] = id1.split('-').map(Number);
  const [r2, c2] = id2.split('-').map(Number);

  return { r: r2 - r1, c: c2 - c1 };
};

// Build a map of solution word -> cell ids.
export const getSolutionCells = (
  placement: { word: string; row: number; col: number; dir: { r: number; c: number } }[],
): Map<string, string[]> => {
  const map = new Map<string, string[]>();

  placement.forEach(({ word, row, col, dir }) => {
    const cells: string[] = [];

    for (let i = 0; i < word.length; i++) {
      cells.push(`${row + dir.r * i}-${col + dir.c * i}`);
    }

    map.set(word, cells);
  });

  return map;
};
