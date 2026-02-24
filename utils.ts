// ─── 유틸리티 함수 모음 ──────────────────────────────────────────────────────
// 게임 로직, UI 표시, 단어 찾기 그리드 생성에 필요한 순수 함수들
// 부작용(side-effect) 없는 순수 함수로만 구성되어 테스트가 용이

// 그리드 셀/단어 설정 타입 임포트 (types.ts에서 정의됨)
import { GridCell, WordConfig } from './types';

// ─── 오디오 합성기 (SFX) ───────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
export const playSfx = (type: 'tap' | 'found' | 'win') => {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  } catch (e) {
    // Ignore audio errors on unsupported browsers or strict autoplay rules
  }
};

// ─── 시간 포맷터 ─────────────────────────────────────────────────────────────
// 밀리초 정수를 "MM:SS.CC" 형식의 문자열로 변환
// 예: 75432ms → "01:15.43"
export const formatTime = (ms: number): string => {
  // 전체 시간에서 분(minutes) 단위 추출 (소수점 버림)
  const minutes = Math.floor(ms / 60000);

  // 분을 제외한 나머지에서 초(seconds) 단위 추출
  const seconds = Math.floor((ms % 60000) / 1000);

  // 초를 제외한 나머지에서 센티초(1/100초) 단위 추출
  const centiseconds = Math.floor((ms % 1000) / 10);

  // padStart(2, '0'): 한 자리 숫자 앞에 '0'을 붙여 두 자리로 맞춤 (예: 5 → "05")
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

// ─── 국가 코드 → 국기 이모지 변환 ────────────────────────────────────────────
// ISO 3166-1 알파-2 국가 코드를 유니코드 국기 이모지로 변환
// 예: 'KR' → '🇰🇷', 'US' → '🇺🇸'
// 원리: 알파벳 A~Z의 코드포인트에 127397(OFFSET)을 더하면 국기 문자 리전 인디케이터가 됨
export const getCountryFlag = (code: string) => {
  const OFFSET = 127397; // 유니코드 리전 인디케이터 시작 오프셋 (🇦 = 'A'.charCodeAt(0) + OFFSET)
  return code
    .toUpperCase()   // 입력이 소문자여도 대문자로 정규화 ('kr' → 'KR')
    .split('')       // 두 글자를 각각의 문자로 분리 ('KR' → ['K', 'R'])
    .map(char => String.fromCodePoint(char.charCodeAt(0) + OFFSET)) // 각 글자를 리전 인디케이터로 변환
    .join('');       // 두 리전 인디케이터를 합쳐 국기 이모지 완성
};

// ─── 방향 벡터 상수 ──────────────────────────────────────────────────────────
// 단어 찾기 보드에서 단어를 배치할 수 있는 4가지 방향을 정의
// r: 행 변화량, c: 열 변화량
const DIRECTIONS = [
  { r: 0, c: 1 },  // 수평 오른쪽 →
  { r: 1, c: 0 },  // 수직 아래쪽 ↓
  { r: 1, c: 1 },  // 대각선 오른쪽 아래 ↘
  { r: 1, c: -1 }, // 대각선 왼쪽 아래 ↙
];

// ─── 배치된 단어 정보 타입 ───────────────────────────────────────────────────
// 보드에 배치된 각 단어의 위치·방향 정보 (정답 확인에 사용)
interface PlacedWord {
  word: string;                  // 배치된 단어 (예: 'JUNGKOOK')
  row: number;                   // 단어 시작 행 인덱스
  col: number;                   // 단어 시작 열 인덱스
  dir: { r: number; c: number }; // 단어가 놓인 방향 벡터
}

// ─── 단어 배치 가능 여부 검사 ────────────────────────────────────────────────
// 주어진 위치와 방향으로 단어를 배치했을 때 보드 경계를 벗어나지 않고
// 다른 단어와 충돌하지 않는지(같은 문자는 겹침 허용) 확인하는 순수 함수
const canPlaceWord = (
  board: string[][],             // 현재 보드 상태 (빈 칸은 '')
  word: string,                  // 배치할 단어
  row: number,                   // 시작 행
  col: number,                   // 시작 열
  dir: { r: number; c: number }, // 배치 방향 벡터
  size: number,                  // 보드 크기 (size × size)
): boolean => {
  // 단어의 각 글자를 순서대로 검사
  for (let i = 0; i < word.length; i++) {
    const r = row + dir.r * i; // 현재 글자가 놓일 행 인덱스
    const c = col + dir.c * i; // 현재 글자가 놓일 열 인덱스

    // 보드 경계 밖으로 벗어나면 배치 불가
    if (r < 0 || r >= size || c < 0 || c >= size) return false;

    // 이미 다른 글자가 있는데 현재 글자와 다르면 충돌 → 배치 불가
    // 같은 글자면 겹쳐 놓기 허용 (예: SUGA와 RM이 A를 공유)
    if (board[r][c] !== '' && board[r][c] !== word[i]) return false;
  }
  return true; // 모든 검사 통과 → 배치 가능
};

// ─── 단어 실제 배치 ──────────────────────────────────────────────────────────
// 보드 배열에 단어를 실제로 기록하고 배치 정보 객체를 반환
const placeWord = (
  board: string[][],             // 수정할 보드 배열 (참조로 전달되어 직접 수정됨)
  word: string,                  // 배치할 단어
  row: number,                   // 시작 행
  col: number,                   // 시작 열
  dir: { r: number; c: number }, // 배치 방향
): PlacedWord => {
  // 단어의 각 글자를 해당 셀에 기록
  for (let i = 0; i < word.length; i++) {
    board[row + dir.r * i][col + dir.c * i] = word[i]; // 셀에 글자 저장
  }
  return { word, row, col, dir }; // 배치 완료된 단어 정보 반환
};

// ─── 단어 찾기 그리드 생성기 ─────────────────────────────────────────────────
// 주어진 크기와 단어 목록으로 단어 찾기 보드를 생성하는 핵심 함수
// 빈 칸이 너무 한쪽으로 쏠리지 않도록 최소 3번까지 재시도하는 엔트로피 패스 적용
export const generateGrid = (size: number, words: string[]) => {
  let bestGrid: any = null;
  let minEmptyRows = size;

  for (let attempt = 0; attempt < 3; attempt++) {
    const board: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
    const placedWords: WordConfig[] = words.map(w => ({ word: w, found: false }));
    const placement: PlacedWord[] = [];

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

    const emptyRows = board.filter(r => r.every(c => c === '')).length;
    const currentGrid = { board, placedWords, placement, emptyRows };

    if (!bestGrid || emptyRows < minEmptyRows) {
      bestGrid = currentGrid;
      minEmptyRows = emptyRows;
    }

    if (emptyRows <= 1) break; // Perfect spread, stop rolling
  }

  const { board, placedWords, placement } = bestGrid;

  // ─── 셀 → 단어 매핑 구축 ──────────────────────────────────────────
  const cellWordMap: Map<string, string> = new Map();
  placement.forEach(({ word, row, col, dir }: PlacedWord) => {
    for (let i = 0; i < word.length; i++) {
      cellWordMap.set(`${row + dir.r * i}-${col + dir.c * i}`, word);
    }
  });

  // ─── 빈 셀 랜덤 알파벳으로 채우기 + GridCell 배열 생성 ─────────────
  const grid: GridCell[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // 단어가 배치되지 않은 빈 셀에 랜덤 대문자 알파벳 채우기
      if (board[r][c] === '') {
        // charCodeAt(0)을 이용해 'A'(65)~'Z'(90) 범위에서 랜덤 선택
        board[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      }
      // 각 셀의 GridCell 객체 생성 및 배열에 추가
      grid.push({
        id: `${r}-${c}`,        // 셀 고유 ID (행-열 형식)
        row: r,                  // 행 인덱스
        col: c,                  // 열 인덱스
        letter: board[r][c],     // 셀에 표시될 문자
        selected: false,         // 초기 선택 상태: 미선택
        found: false,            // 초기 발견 상태: 미발견
      });
    }
  }

  // 생성된 그리드, 단어 목록(found 추적용), 배치 정보 반환
  return { grid, wordList: placedWords, placement };
};

// ─── 인접 셀 여부 확인 ──────────────────────────────────────────────────────
// 드래그 선택 시 두 셀이 인접한지(상하좌우+대각선) 확인
// 이미 선택된 방향으로만 드래그가 연속되도록 제한하는 데 사용
export const isAdjacent = (id1: string, id2: string): boolean => {
  // "행-열" 형식의 ID를 숫자로 파싱
  const [r1, c1] = id1.split('-').map(Number);
  const [r2, c2] = id2.split('-').map(Number);

  // 행과 열 각각의 절대 차이 계산
  const rDiff = Math.abs(r1 - r2);
  const cDiff = Math.abs(c1 - c2);

  // 인접 조건: 행·열 차이가 모두 1 이하 AND 같은 셀이 아닌 경우
  // 대각선도 인접으로 처리 (체스의 킹 이동 범위와 동일)
  return rDiff <= 1 && cDiff <= 1 && !(rDiff === 0 && cDiff === 0);
};

// ─── 두 셀 간의 방향 벡터 계산 ──────────────────────────────────────────────
// 드래그 방향이 일관성 있는지 확인하기 위해 사용
// 선택된 첫 두 셀로부터 드래그 방향을 결정하고 이후 셀들이 같은 방향인지 체크
export const getDirection = (id1: string, id2: string): { r: number, c: number } => {
  // 두 셀의 행·열 인덱스 추출
  const [r1, c1] = id1.split('-').map(Number);
  const [r2, c2] = id2.split('-').map(Number);

  // id2 - id1의 방향 벡터 반환 (예: { r: 0, c: 1 }은 오른쪽 수평 방향)
  return { r: r2 - r1, c: c2 - c1 };
};

// ─── 정답 셀 ID 맵 생성 ──────────────────────────────────────────────────────
// 관리자 도구의 "자동 풀기(Auto-Solve)" 기능에서 모든 단어의 셀 위치를 한번에 얻기 위해 사용
// 반환값: 단어 → 해당 단어를 구성하는 셀 ID 배열의 Map
export const getSolutionCells = (
  placement: { word: string; row: number; col: number; dir: { r: number; c: number } }[],
): Map<string, string[]> => {
  const map = new Map<string, string[]>(); // 단어 → 셀ID 배열 매핑

  placement.forEach(({ word, row, col, dir }) => {
    const cells: string[] = []; // 이 단어를 구성하는 모든 셀 ID 목록

    // 단어의 각 글자가 위치하는 셀 ID를 순서대로 수집
    for (let i = 0; i < word.length; i++) {
      cells.push(`${row + dir.r * i}-${col + dir.c * i}`); // "행-열" 형식의 셀 ID
    }

    map.set(word, cells); // 단어를 키로 셀 ID 배열 저장
  });

  return map; // { 'JIMIN': ['0-0', '0-1', '0-2', '0-3', '0-4'], ... }
};
