import { GridCell, WordConfig } from './types';

export const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

export const getCountryFlag = (code: string) => {
  const OFFSET = 127397;
  return code
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(char.charCodeAt(0) + OFFSET))
    .join('');
};

// Direction vectors: H, V, Diagonal ↘, Diagonal ↙
const DIRECTIONS = [
  { r: 0, c: 1 }, // Horizontal →
  { r: 1, c: 0 }, // Vertical ↓
  { r: 1, c: 1 }, // Diagonal ↘
  { r: 1, c: -1 }, // Diagonal ↙
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

// Word Search Generator with diagonal support
export const generateGrid = (size: number, words: string[]) => {
  const board: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
  const placedWords: WordConfig[] = words.map(w => ({ word: w, found: false }));
  const placement: PlacedWord[] = [];

  // Place each word
  words.forEach(word => {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 200) {
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);
      if (canPlaceWord(board, word, row, col, dir, size)) {
        placement.push(placeWord(board, word, row, col, dir));
        placed = true;
      }
      attempts++;
    }
  });

  // Build cell → word membership map for found highlighting
  const cellWordMap: Map<string, string> = new Map();
  placement.forEach(({ word, row, col, dir }) => {
    for (let i = 0; i < word.length; i++) {
      cellWordMap.set(`${row + dir.r * i}-${col + dir.c * i}`, word);
    }
  });

  // Fill empty spots with random letters
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

// Check if a cell is adjacent to another cell (including diagonals)
export const isAdjacent = (id1: string, id2: string): boolean => {
  const [r1, c1] = id1.split('-').map(Number);
  const [r2, c2] = id2.split('-').map(Number);

  const rDiff = Math.abs(r1 - r2);
  const cDiff = Math.abs(c1 - c2);

  // Must be within 1 unit distance and not the same cell
  return rDiff <= 1 && cDiff <= 1 && !(rDiff === 0 && cDiff === 0);
};

// Check direction consistency
export const getDirection = (id1: string, id2: string): { r: number, c: number } => {
  const [r1, c1] = id1.split('-').map(Number);
  const [r2, c2] = id2.split('-').map(Number);
  return { r: r2 - r1, c: c2 - c1 };
};

// Get all cell IDs for a placed word (used for auto-solve dev tool)
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
