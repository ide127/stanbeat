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

// Simple Word Search Generator
export const generateGrid = (size: number, words: string[]) => {
  const grid: GridCell[] = [];
  const placedWords: WordConfig[] = words.map(w => ({ word: w, found: false }));
  
  // Initialize empty grid
  const board: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));

  // Place words
  placedWords.forEach(({ word }) => {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      const direction = Math.random() > 0.5 ? 'H' : 'V'; // Simplified to H/V for easier mobile gameplay
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);
      
      if (canPlace(board, word, row, col, direction, size)) {
        place(board, word, row, col, direction);
        placed = true;
      }
      attempts++;
    }
  });

  // Fill empty spots
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

  return { grid, wordList: placedWords };
};

const canPlace = (board: string[][], word: string, row: number, col: number, dir: string, size: number) => {
  if (dir === 'H') {
    if (col + word.length > size) return false;
    for (let i = 0; i < word.length; i++) {
      if (board[row][col + i] !== '' && board[row][col + i] !== word[i]) return false;
    }
  } else {
    if (row + word.length > size) return false;
    for (let i = 0; i < word.length; i++) {
      if (board[row + i][col] !== '' && board[row + i][col] !== word[i]) return false;
    }
  }
  return true;
};

const place = (board: string[][], word: string, row: number, col: number, dir: string) => {
  for (let i = 0; i < word.length; i++) {
    if (dir === 'H') board[row][col + i] = word[i];
    else board[row + i][col] = word[i];
  }
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
