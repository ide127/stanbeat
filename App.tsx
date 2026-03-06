import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Clipboard, ClipboardCheck, DollarSign, Play, RefreshCw, Settings, Share2, ShieldAlert, Trash2, ToggleLeft, ToggleRight, Users, Video } from 'lucide-react';
import { Layout, Modal } from './components/Layout';
import { languageOptions, t } from './i18n';
import { useStore, detectLanguageFromIP, type AdConfig } from './store';
import { GridCell, WordConfig, HistoryEvent } from './types';
import confetti from 'canvas-confetti';
import { formatTime, generateGrid, getCountryFlag, getSolutionCells, playSfx } from './utils';
import { getCurrentSeasonNumber, generateGuestShowcase } from './league';

const TARGET_WORDS = ['RM', 'JIN', 'SUGA', 'HOPE', 'JIMIN', 'V', 'JK'];

const vibrate = () => { navigator.vibrate?.(15); playSfx('tap'); };

// GA4 event tracking utility
const trackEvent = (eventName: string, params?: Record<string, string | number>) => {
  try { (window as any).gtag?.('event', eventName, params); } catch { /* no-op */ }
};

// ─── Home Screen ───────────────────────────────────────────────────
// ─── 홈 화면 컴포넌트 ─────────────────────────────────────────────
// 앱을 처음 열었을 때 보이는 메인 화면으로, 현재 시즌/시계 이벤트 정보,
// 게임 시작 버튼, 그리고 광고/오퍼월을 통해 하트를 얻을 수 있는 UI를 제공합니다.
const HomeScreen = ({ onShowHearts }: { onShowHearts: () => void }) => {
  const { setView, consumeHeart, currentUser, login, language, termsAccepted, acceptTerms, seasonEndsAt, notice, showNoticePopup, setShowNoticePopup } = useStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsChecked, setTermsChecked] = useState(true);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [rewardIndex, setRewardIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [remainingParts, setRemainingParts] = useState({ h: 0, m: 0, s: 0, ms: 0 });

  // Show notice popup on mount if enabled
  useEffect(() => {
    if (showNoticePopup && notice) {
      setShowNoticeModal(true);
    }
  }, [showNoticePopup, notice]);

  useEffect(() => {
    if (showTermsModal) {
      setTermsChecked(true);
    }
  }, [showTermsModal]);

  useEffect(() => {
    const interval = setInterval(() => setRewardIndex((prev) => (prev + 1) % 3), 1800);
    return () => clearInterval(interval);
  }, []);

  // Real-time countdown with decimal seconds
  useEffect(() => {
    const update = () => {
      const remainMs = Math.max(0, seasonEndsAt - Date.now());
      const totalSec = Math.floor(remainMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const ms = Math.floor((remainMs % 1000) / 10);
      setRemainingParts({ h, m, s, ms });
    };
    update();
    const timer = setInterval(update, 50);
    return () => clearInterval(timer);
  }, [seasonEndsAt]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handlePlay = () => {
    vibrate();
    if (!currentUser) { setShowLoginModal(true); return; }
    if (!termsAccepted) { setShowTermsModal(true); return; }
    const consumed = consumeHeart();
    if (!consumed) { onShowHearts(); return; }
    // Heart break + zoom transition
    setTransitioning(true);
    trackEvent('game_start', { user_id: currentUser?.id || 'guest' });
    timerRef.current = setTimeout(() => { setView('GAME'); setTransitioning(false); }, 900);
  };

  const rewardImages = [
    '/images/reward-seoul.webp',
    '/images/reward-flight.webp',
    '/images/reward-merch.webp',
  ];

  // Winner testimonials data (30+ accumulated, showing 5 at a time)
  const TOTAL_TESTIMONIALS = 32;
  const SHOWN_TESTIMONIALS = 5;
  const testimonials = [
    { name: 'ShinyCookie_42', flag: '🇺🇸', text: t(language, 'testimonial1'), avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=ShinyCookie42&backgroundColor=b6e3f4' },
    { name: 'LovelyHobi_77', flag: '🇧🇷', text: t(language, 'testimonial2'), avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=LovelyHobi77&backgroundColor=ffd5dc' },
    { name: 'NeonJimin_03', flag: '🇵🇭', text: t(language, 'testimonial3'), avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=NeonJimin03&backgroundColor=c0aede' },
    { name: 'BrightARMY_91', flag: '🇲🇽', text: t(language, 'testimonial4'), avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=BrightArmy91&backgroundColor=d1d4f9' },
    { name: 'DrYoongi_500', flag: '🇯🇵', text: t(language, 'testimonial5'), avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=DrYoongi500&backgroundColor=ffdfbf' },
  ];
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTestimonialIdx((i) => (i + 1) % SHOWN_TESTIMONIALS), 5000);
    return () => clearInterval(timer);
  }, []);
  const seasonNum = getCurrentSeasonNumber();

  return (
    <div className={`flex-1 flex flex-col p-6 text-center ${transitioning ? 'zoom-in' : ''}`}>
      {transitioning && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60">
          <span className="text-6xl heart-break">💔</span>
        </div>
      )}

      <h1 className="text-4xl text-white font-black tracking-tight mt-4 glitch">{t(language, 'homeTitle')}</h1>

      <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 relative h-48">
        <img src="/images/hero-concert.webp" alt="Concert Crowd" className="w-full h-full object-cover opacity-85" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <p className="absolute left-3 bottom-3 text-[#00FFFF] text-xs font-bold uppercase">{t(language, 'homeTarget')}</p>
      </div>

      {/* Prize urgency banner */}
      <div className="mt-4 rounded-xl border border-[#FFD700]/40 bg-gradient-to-r from-[#FFD700]/10 via-[#FF6B00]/10 to-[#FF0080]/10 p-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_3s_linear_infinite]" />
        <p className="text-[#FFD700] font-black text-base tracking-wide">{t(language, 'prizeOverallBanner')}</p>
        <p className="text-white/60 text-[11px] mt-0.5">{t(language, 'prizeLeagueBanner')}</p>
      </div>

      <div className="mt-4">
        <p className="text-white/60 text-xs uppercase tracking-widest">{t(language, 'seasonLabel', { seasonNum: String(seasonNum) })}</p>
        <div className="flex items-end justify-center gap-1 mt-1">
          {remainingParts.h > 0 && <><span className="text-red-400 text-3xl font-black font-mono">{remainingParts.h}</span><span className="text-white/50 text-lg mb-1">{t(language, 'hoursUnit')}</span></>}
          <span className="text-red-400 text-3xl font-black font-mono">{String(remainingParts.m).padStart(2, '0')}</span><span className="text-white/50 text-lg mb-1">{t(language, 'minutesUnit')}</span>
          <span className="text-red-400 text-3xl font-black font-mono">{String(remainingParts.s).padStart(2, '0')}</span>
          <span className="text-red-400 text-xl font-black font-mono">.{String(remainingParts.ms).padStart(2, '0')}</span>
          <span className="text-white/50 text-lg mb-1">{t(language, 'secondsUnit')}</span>
        </div>
      </div>

      <p className="text-white/70 text-sm mt-4">
        {t(language, 'description')}
        <span className="text-[10px] text-white/40 align-top ml-1">{t(language, 'termsApply')}</span>
      </p>

      <button onClick={handlePlay} className="w-full mt-5 relative overflow-hidden bg-[#FF0080] text-white font-black text-2xl py-5 rounded-2xl btn-squishy pulse-ring">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_linear_infinite]" />
        <div className="relative flex items-center justify-center gap-3">
          <Play fill="white" />
          <span>{t(language, 'playNow')}</span>
        </div>
      </button>

      {useStore.getState().deferredPrompt && (
        <button onClick={() => {
          vibrate();
          const promptEvent = useStore.getState().deferredPrompt;
          promptEvent.prompt();
          promptEvent.userChoice.then(() => useStore.setState({ deferredPrompt: null }));
        }} className="w-full mt-3 bg-[#00FFFF]/20 border border-[#00FFFF]/50 text-[#00FFFF] font-bold py-3 rounded-xl btn-squishy flex items-center justify-center gap-2">
          📱 Install App for Best Experience
        </button>
      )}

      <div className="mt-4 rounded-xl overflow-hidden border border-white/10 bg-black/30">
        <img src={rewardImages[rewardIndex]} alt="reward" className="w-full h-24 object-cover" />
        <p className="text-white/80 text-xs py-2">{t(language, 'rewardText')}</p>
      </div>

      {/* Winner Testimonials (30+ accumulated, showing 5) */}
      <div className="mt-4 rounded-xl border border-[#FF0080]/30 bg-gradient-to-br from-[#FF0080]/10 to-[#1A0B2E] p-4">
        <h3 className="text-white font-bold text-sm mb-1">{t(language, 'winnersTitle')}</h3>
        <p className="text-white/40 text-[10px] mb-3">{t(language, 'winnersSubtitle', { total: String(TOTAL_TESTIMONIALS), shown: String(SHOWN_TESTIMONIALS) })}</p>
        <div className="relative overflow-hidden" style={{ minHeight: '80px' }}>
          {testimonials.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 transition-all duration-500 ${idx === testimonialIdx ? 'opacity-100 translate-y-0' : 'opacity-0 absolute inset-0 translate-y-4'}`}
            >
              <div className="w-10 h-10 rounded-full border border-[#00FFFF]/50 flex-shrink-0 bg-white/10 overflow-hidden">
                <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-xs">👤</div>'; }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white/80 text-xs italic">"{item.text}"</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[#00FFFF] text-[10px] font-semibold">— {item.name}</span>
                  <span>{item.flag}</span>
                  <span className="text-yellow-400 text-[10px]">★★★★★</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-1 mt-2">
          {Array.from({ length: SHOWN_TESTIMONIALS }, (_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === testimonialIdx ? 'bg-[#FF0080] w-4' : 'bg-white/20'}`} />
          ))}
        </div>
      </div>

      {/* Login Modal */}
      <Modal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} title={t(language, 'loginRequired')}>
        <p className="text-white/70 text-sm mb-4">{t(language, 'loginPrompt')}</p>
        <button
          disabled={isLoggingIn}
          onClick={async () => {
            if (isLoggingIn) return;
            setIsLoggingIn(true);
            vibrate();
            try {
              await login();
              trackEvent('login', { method: 'google' });
              setShowLoginModal(false);
            } finally {
              setIsLoggingIn(false);
            }
          }}
          className="w-full bg-white text-black font-bold py-3 rounded-xl btn-squishy disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {isLoggingIn ? <span className="animate-spin text-xl">↻</span> : null}
          {t(language, 'continueGoogle')}
        </button>
      </Modal>

      {/* Terms Modal */}
      <Modal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} title={t(language, 'termsTitle')}>
        <div className="max-h-48 overflow-y-auto bg-black/30 rounded-lg p-3 mb-4 text-left">
          <pre className="text-white/60 text-[11px] whitespace-pre-wrap font-sans leading-relaxed">{t(language, 'termsFullText')}</pre>
        </div>
        <label className="flex items-start text-white/80 text-sm gap-2 mb-4 text-left">
          <input type="checkbox" checked={termsChecked} onChange={(e) => setTermsChecked(e.target.checked)} />
          {t(language, 'termsAgree')}
        </label>
        <button
          onClick={() => { vibrate(); acceptTerms(); setShowTermsModal(false); }}
          disabled={!termsChecked}
          className="w-full bg-[#00FFFF] text-black font-bold py-2 rounded-lg btn-squishy disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t(language, 'termsAccept')}
        </button>
      </Modal>

      {/* Notice Popup */}
      <Modal isOpen={showNoticeModal} onClose={() => setShowNoticeModal(false)} title={t(language, 'noticeTitle')}>
        <p className="text-white/70 text-sm whitespace-pre-wrap">{notice}</p>
      </Modal>
    </div>
  );
};

// ─── 타이머 분리 컴포넌트 (Re-render 최적화) ──────────────────────────
const TimerDisplay = ({ startMs, won, setElapsedState }: { startMs: number; won: boolean; setElapsedState: (val: number) => void }) => {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (won) return;
    const update = () => {
      const current = Date.now() - startMs;
      setVal(current);
      setElapsedState(current);
    };
    const timer = setInterval(update, 10);
    return () => clearInterval(timer);
  }, [won, startMs, setElapsedState]);

  return (
    <div className="absolute top-2 right-2 text-[#00FFFF] font-mono font-bold text-lg bg-black/60 px-2 py-0.5 rounded border border-[#00FFFF]/30">
      {formatTime(val)}
    </div>
  );
};

// ─── 게임 화면 컴포넌트 ─────────────────────────────────────────────
// 실제 워드서치 게임 플레이 화면. 타이머가 작동하며,
// 사용자가 그리드에서 단어를 드래그하여 찾는 로직이 포함되어 있습니다.
const GameScreen = ({ onShowHearts }: { onShowHearts: () => void }) => {
  const { setView, updateBestTime, addHistoryEvent, language, editUserHeart, currentUser } = useStore();
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [words, setWords] = useState<WordConfig[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startId, setStartId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const startMsRef = useRef(Date.now());
  const placementRef = useRef<{ word: string; row: number; col: number; dir: { r: number; c: number } }[]>([]);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [heartDelta, setHeartDelta] = useState(1);

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    const { grid: generated, wordList, placement } = generateGrid(10, TARGET_WORDS);
    setGrid(generated);
    setWords(wordList);
    placementRef.current = placement;
  }, []);

  useEffect(() => {
    if (words.length > 0 && words.every((word) => word.found)) {
      setWon(true);
      updateBestTime(elapsed);
      addHistoryEvent('PLAY', elapsed);
    }
  }, [won, elapsed, updateBestTime, addHistoryEvent, words]);

  const commitSelection = (ids: string[]) => {
    const text = ids.map((id) => grid.find((cell) => cell.id === id)?.letter ?? '').join('');
    const reverse = text.split('').reverse().join('');
    const matched = words.find((word) => !word.found && (word.word === text || word.word === reverse));
    if (!matched) return;
    vibrate(); // plays 'tap'

    // Check if this was the last word needed to win
    const remainingWords = words.filter((w) => !w.found).length;
    if (remainingWords === 1) {
      playSfx('win');
    } else {
      playSfx('found');
    }

    setWords((prev) => prev.map((word) => (word.word === matched.word ? { ...word, found: true } : word)));
    setGrid((prev) => prev.map((cell) => (ids.includes(cell.id) ? { ...cell, found: true } : cell)));
  };

  // Dev: auto-solve all remaining words
  const handleDevSolve = () => {
    const solutionMap = getSolutionCells(placementRef.current);
    const allFoundIds = new Set<string>();
    solutionMap.forEach((cellIds) => cellIds.forEach((id) => allFoundIds.add(id)));
    setWords((prev) => prev.map((w) => ({ ...w, found: true })));
    setGrid((prev) => prev.map((cell) => ({ ...cell, found: allFoundIds.has(cell.id) ? true : cell.found })));
  };

  // 유저가 처음 그리드의 특정 셀(알파벳)을 터치(또는 클릭)했을 때 호출되는 함수
  const handlePointerDown = (id: string) => {
    setStartId(id); // 드래그가 시작된 셀의 고유 ID를 상태에 저장하여 기준점으로 삼음
    setSelectedIds([id]); // 현재 선택된 셀들의 목록을 나타내는 배열에 첫 셀 ID를 넣고 초기화
  };

  // 유저가 터치(또는 클릭)한 상태로 화면 위를 드래그할 때(마우스를 이동하거나 손가락을 움직일 때) 계속 호출됨
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startId || won) return;
    // prevent touch scrolling default action manually if touch-action CSS isn't enough
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;

    const id = el.getAttribute('data-id');
    if (!id) return;// 만약 유효한 그리드 셀 위를 지나가고 있고, 그 셀이 방금 전에 추가된 마지막 셀과 다르다면
    // (즉, 손가락이 새로운 인접 셀 위로 이동했다면)
    if (id && id !== selectedIds[selectedIds.length - 1]) {
      // 해당 셀로 진입(Enter)했다는 로직을 처리하는 함수를 호출
      handlePointerEnter(id);
    }
  };

  // 손가락(포인터)이 새로운 그리드 셀 위로 올라왔을 때 선 연결(선택)을 처리하는 함수
  const handlePointerEnter = (id: string) => {
    // 만약 시작 셀이 없다면 잘못된 호출이므로 무시
    if (!startId) return;

    // 시작 셀의 ID(예: "0-0")를 하이픈(-) 기준으로 잘라 행(r1)과 열(c1) 숫자로 변환
    const [r1, c1] = startId.split('-').map(Number);
    // 현재 진입한 셀의 ID(예: "2-2")를 잘라 행(r2)과 열(c2) 숫자로 변환
    const [r2, c2] = id.split('-').map(Number);

    // 시작점과 현재 점 사이의 행(row) 및 열(col) 좌표 차이를 계산
    const rowDiff = r2 - r1;
    const colDiff = c2 - c1;

    // 두 점의 행이 같다면 가로로 드래그 중임을 의미
    const sameRow = rowDiff === 0;
    // 두 점의 열이 같다면 세로로 드래그 중임을 의미
    const sameCol = colDiff === 0;
    // 두 점의 행 차이값(절댓값)과 열 차이값(절댓값)이 같다면 완벽한 대각선 드래그 중임을 의미
    const diagonal = Math.abs(rowDiff) === Math.abs(colDiff);

    // 만약 가로, 세로, 대각선 중 어느 방향도 아니라면(예: 체스의 나이트 같은 'ㄱ'자 이동)
    // 올바른 단어 선택 방향이 아니므로 무시하고 함수 종료
    if (!sameRow && !sameCol && !diagonal) return;

    // 시작점부터 현재 지점까지 총 몇 칸(steps) 떨어져 있는지 계산 (행, 열 차이 중 큰 값 기준)
    const steps = Math.max(Math.abs(rowDiff), Math.abs(colDiff));

    // 1칸 이동할 때마다 행(row) 방향으로 더해줄 변화량 선출 (예: 위로 가면 -1, 아래면 1, 가로면 0)
    const rs = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
    // 1칸 이동할 때마다 열(col) 방향으로 더해줄 변화량 선출 (예: 좌로 가면 -1, 우면 1, 세로면 0)
    const cs = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);

    // 시작점부터 끝점까지의 거리에 따라, 그 사이에 있는 모든 셀들의 ID를 순서대로 계산해 배열로 만듦
    // 예: "0-0"에서 "0-2"로 간다면 ["0-0", "0-1", "0-2"] 형태의 배열 생성
    const line = Array.from({ length: steps + 1 }, (_, idx) => `${r1 + rs * idx}-${c1 + cs * idx}`);

    // 계산된 직선 경로상의 모든 셀 ID 배열을 현재 '선택된 셀들(selectedIds)' 상태로 업데이트하여 화면 색상 변경
    setSelectedIds(line);
  };

  // 드래그(터치/클릭)를 끝내고 손가락이나 마우스를 뗐을 때 호출되는 함수
  const handlePointerUp = () => {
    // 만약 1개 이상의 셀이 드래그 선택되어 있다면, 찾은 단어가 정답인지 확인하는 함수(commitSelection) 실행
    if (selectedIds.length) commitSelection(selectedIds);
    // 검사가 끝났으므로 다음 선택을 위해 선택된 셀 상태 배열 초기화
    setSelectedIds([]);
    // 시작 기준점도 다음 드래그 시작 시를 위해 null로 리셋
    setStartId(null);
  };

  if (won) return <ResultScreen elapsed={elapsed} onShowHearts={onShowHearts} grid={grid} words={words} />;

  return (
    <div className="flex-1 p-4" onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onPointerCancel={handlePointerUp}>
      <div className="flex items-center justify-between mb-4">
        <div className="bg-[#FF0080]/20 border border-[#FF0080] rounded-full px-3 py-1 text-[#FF0080] font-mono font-bold">{formatTime(elapsed)}</div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#FF0080] font-bold border border-[#FF0080] rounded px-2 py-0.5 bg-[#FF0080]/20">GOD MODE</span>
              <button onClick={() => setShowDevPanel((v) => !v)} className="text-[10px] text-yellow-400/70 border border-yellow-400/30 rounded px-2 py-0.5 btn-squishy">DEV</button>
            </div>
          )}
          <button onClick={() => { vibrate(); setView('HOME'); }} className="text-white/70 hover:text-white btn-squishy">{t(language, 'exitGame')}</button>
        </div>
      </div>

      {/* Dev Tools Panel */}
      {isAdmin && showDevPanel && (
        <div className="mb-3 p-3 rounded-xl border border-yellow-400/30 bg-yellow-400/5 space-y-2">
          <p className="text-yellow-400 text-[10px] font-bold uppercase tracking-widest">🛠 Dev Tools</p>
          <button onClick={handleDevSolve} className="w-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs rounded-lg py-1.5 btn-squishy font-bold">
            ⚡ Auto-Solve All Words
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => { if (currentUser) editUserHeart(currentUser.id, -heartDelta); }} className="flex-1 bg-red-500/20 border border-red-500/30 text-red-300 text-xs rounded py-1 btn-squishy">−{heartDelta} 💔</button>
            <input type="number" min={1} max={99} value={heartDelta} onChange={(e) => setHeartDelta(Math.max(1, parseInt(e.target.value) || 1))} className="w-14 bg-black/40 border border-white/20 text-white text-xs rounded text-center py-1" />
            <button onClick={() => { if (currentUser) editUserHeart(currentUser.id, heartDelta); }} className="flex-1 bg-green-500/20 border border-green-500/30 text-green-300 text-xs rounded py-1 btn-squishy">+{heartDelta} 💚</button>
          </div>
        </div>
      )}

      <div
        className="grid grid-cols-10 gap-1 bg-black/40 p-2 rounded-xl border border-white/10 select-none touch-none"
        style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
        onPointerMove={handlePointerMove}
      >
        {grid.map((cell) => {
          const selected = selectedIds.includes(cell.id);
          return (
            <div
              key={cell.id}
              data-id={cell.id}
              onPointerDown={() => handlePointerDown(cell.id)}
              onPointerEnter={() => handlePointerEnter(cell.id)}
              className={`aspect-square rounded flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${cell.found ? 'bg-[#00FFFF] text-black' : selected ? 'bg-[#FF0080] text-white' : 'bg-white/5 text-white/80 hover:bg-white/15'
                }`}
            >
              {cell.letter}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {words.map((word) => (
          <span key={word.word} className={`text-xs px-2 py-1 rounded transition-all ${word.found ? 'bg-[#00FFFF]/20 text-[#00FFFF] line-through' : 'bg-[#1A0B2E] text-white border border-white/20'}`}>
            {word.word}
          </span>
        ))}
      </div>
    </div>
  );
};

// ─── 결과 화면 컴포넌트 ─────────────────────────────────────────────
// 게임 클리어 후 표시되는 화면으로, 소요 시간과 현재 리그에서의 예상 등수,
// 그리고 완성된 워드서치 그리드 및 친구 초대(공유) 링크 표시 기능을 합니다.
const ResultScreen = ({ elapsed, onShowHearts, grid, words }: { elapsed: number; onShowHearts: () => void; grid: GridCell[]; words: WordConfig[]; }) => {
  const { setView, leaderboard, currentUser, language, getReferralLink, consumeHeart, login } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cardGenerated, setCardGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  const visibleLeaderboard = leaderboard.filter((entry) => !entry.banned);
  const myEntry = visibleLeaderboard.find((e) => e.isCurrentUser);
  const rank = myEntry?.rank ?? (visibleLeaderboard.filter((e) => e.time < elapsed).length + 1);
  const percentile = visibleLeaderboard.length > 0 ? Math.ceil((rank / visibleLeaderboard.length) * 100) : 1;
  const titleText = percentile <= 1 ? 'TOP 1% ARMY' : percentile <= 10 ? 'TOP 10% ARMY' : `Rank #${rank}`;

  useEffect(() => {
    // Check if this was a new best time
    const playHistory = currentUser?.gameHistory?.filter((h) => h.type === 'PLAY') || [];
    const historicalBest = playHistory.length > 1 ? Math.min(...playHistory.slice(0, -1).map((h) => h.value)) : Infinity;
    const isNewBest = playHistory.length === 1 || elapsed < historicalBest;

    if (isNewBest) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.4 },
        colors: ['#00FFFF', '#FF0080', '#FFD700', '#FFFFFF'],
        zIndex: 50
      });
      playSfx('win');
      trackEvent('game_complete', { time_ms: elapsed, rank, is_new_best: 'true' });
    } else {
      confetti({
        particleCount: 40,
        spread: 40,
        origin: { y: 0.6 },
        colors: ['#FFFFFF', '#FF0080'],
        zIndex: 50
      });
      trackEvent('game_complete', { time_ms: elapsed, rank, is_new_best: 'false' });
    }
  }, [elapsed, currentUser?.gameHistory]);

  // Generate share card on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    document.fonts.ready.then(() => {
      canvas.width = 1080;
      canvas.height = 1920;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 1920);
      grad.addColorStop(0, '#1A0B2E');
      grad.addColorStop(0.5, '#0D0518');
      grad.addColorStop(1, '#1A0B2E');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // STANBEAT title
      ctx.fillStyle = '#FF0080';
      ctx.font = 'bold 72px Oswald, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STANBEAT', 540, 160);

      // Render Miniaturized Grid (10x10)
      // 10 cells * 54px + gap = approx 540px width. Center = 540, left = 270. y = 220
      const startX = 270;
      const startY = 220;
      const cellSize = 50;
      const gap = 4;
      grid.forEach((cell) => {
        const [r, c] = cell.id.split('-').map(Number);
        const cx = startX + c * (cellSize + gap);
        const cy = startY + r * (cellSize + gap);

        // Cell background
        ctx.fillStyle = cell.found ? '#00FFFF' : 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.roundRect(cx, cy, cellSize, cellSize, 8);
        ctx.fill();

        // Cell text
        ctx.fillStyle = cell.found ? '#000000' : 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cell.letter, cx + cellSize / 2, cy + cellSize / 2);
      });

      // Result title (Rank)
      ctx.fillStyle = '#00FFFF';
      ctx.font = 'bold 110px Oswald, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(titleText, 540, 880);

      // Clear time
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 64px Inter, sans-serif';
      ctx.fillText(`⏱ ${formatTime(elapsed)}`, 540, 1010);

      // Nickname
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '36px Inter, sans-serif';
      ctx.fillText(currentUser?.nickname ?? 'ARMY', 540, 1140);

      // Appeal / Event Text
      ctx.fillStyle = '#00FFFF'; // Neon Cyan
      ctx.font = 'bold 56px Inter, sans-serif';
      ctx.fillText("🔍 Visit stanbeat.org", 540, 1300);

      ctx.fillStyle = '#FF0080'; // Neon Pink
      ctx.font = 'bold 48px Inter, sans-serif';
      ctx.fillText("1st place gets a trip to Seoul!", 540, 1400);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 40px Inter, sans-serif';
      ctx.fillText("Challenge now! Join the ARMY leaderboard", 540, 1500);

      setCardGenerated(true);
    });
  }, [elapsed, titleText, currentUser, getReferralLink, grid]);

  const handleSaveImage = () => {
    vibrate();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stanbeat-result-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleShare = async () => {
    vibrate();
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Canvas toBlob failed");

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'stanbeat-result.png', { type: 'image/png' });
        const shareData = { title: 'StanBeat Result', text: `I got ${titleText} in ${formatTime(elapsed)}! Can you beat me?`, url: getReferralLink(), files: [file] };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          trackEvent('share', { method: 'native', time_ms: elapsed });
          return;
        }
      }
      // Fallback: copy link
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${titleText} - ${formatTime(elapsed)} | ${getReferralLink()}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        window.prompt('Copy this result link:', `${titleText} - ${formatTime(elapsed)} | ${getReferralLink()}`);
      }
    } catch (e: unknown) {
      const errorName = e instanceof Error ? e.name : '';
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorName !== 'AbortError') {
        console.warn('Share failed:', errorMessage);
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(`${titleText} - ${formatTime(elapsed)} | ${getReferralLink()}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } else {
            window.prompt('Copy this result link:', `${titleText} - ${formatTime(elapsed)} | ${getReferralLink()}`);
          }
        } catch { }
      }
    }
  };

  const handleCopyLink = async () => {
    vibrate();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(getReferralLink());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        window.prompt('Copy this invite link:', getReferralLink());
      }
    } catch {
      // no-op
    }
  };

  return (
    <div className="flex-1 p-6 flex flex-col items-center text-center">
      <h2 className="text-[#00FFFF] text-4xl font-black mb-2 neon-cyan">{titleText}</h2>
      <p className="text-white/70 mb-4">{t(language, 'clearTime')}: {formatTime(elapsed)}</p>

      <div className="w-full max-w-[280px] rounded-2xl overflow-hidden border border-white/20 shadow-[0_0_30px_rgba(255,0,128,0.3)] mb-4">
        <canvas ref={canvasRef} className="w-full" style={{ aspectRatio: '9/16' }} />
      </div>

      <div className="grid grid-cols-2 gap-2 w-full max-w-[280px]">
        <button onClick={handleSaveImage} className="bg-white text-black rounded-lg py-2 text-sm font-bold btn-squishy">
          {t(language, 'saveImage')}
        </button>
        <button onClick={handleShare} className="bg-[#FF0080] text-white rounded-lg py-2 text-sm font-bold btn-squishy">
          {t(language, 'share')}
        </button>
      </div>

      {(!currentUser && elapsed < 120000) && (
        <div className="w-full max-w-[280px] bg-gradient-to-r from-[#00FFFF]/10 to-[#FF0080]/10 border border-[#00FFFF]/30 p-4 rounded-xl mt-4 animate-pulse">
          <p className="text-white font-bold mb-2">🔥 Amazing Time!</p>
          <p className="text-white/80 text-xs mb-3">Save your score to the global leaderboard and win genuine prizes!</p>
          <button onClick={() => { vibrate(); login().then(() => setView('HOME')); }} className="w-full bg-[#00FFFF] text-black font-bold py-2 rounded-lg btn-squishy">
            Save My Score
          </button>
        </div>
      )}

      <button onClick={() => { vibrate(); const ok = consumeHeart(); if (ok) { setView('GAME'); } else { onShowHearts(); setView('HOME'); } }} className="mt-3 text-white/80 underline btn-squishy">{t(language, 'retryGame')}</button>

      {rank > 1 && (
        <div className="mt-8 bg-black/40 border border-[#00FFFF]/30 rounded-xl p-4 w-full max-w-[280px]">
          <p className="text-[#00FFFF] font-bold text-sm mb-2 text-center">Support the Project</p>
          <p className="text-white/70 text-xs mb-3 text-center leading-relaxed">
            Support the Development of the Project through App Ratings & Links
          </p>
          <a
            href="https://open.spotify.com/artist/3Nrfpe0tUJi4K4DXYWgMUX"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => vibrate()}
            className="flex items-center justify-center gap-2 w-full bg-[#1DB954]/20 border border-[#1DB954]/50 text-[#1DB954] rounded-lg py-2 text-xs font-bold btn-squishy"
          >
            Stream on Spotify
          </a>
        </div>
      )}
    </div>
  );
};

// ─── 히스토리 화면 컴포넌트 ───────────────────────────────────────
// 사용자가 과거에 플레이했던 기록(클리어 타임)들을 표시하고
// 최고 기록 등 통계를 가시적으로 보여줍니다.
const HistoryScreen = () => {
  const { setView, currentUser, language } = useStore();
  const history = currentUser?.gameHistory ?? [];
  const playHistory = history.filter((h) => h.type === 'PLAY');
  const best = playHistory.length > 0 ? Math.min(...playHistory.map((h) => h.value)) : null;
  const maxTime = playHistory.length > 0 ? Math.max(...playHistory.map((h) => h.value)) : 1;

  return (
    <div className="flex-1 flex flex-col bg-[#0D0518]">
      <div className="p-4 flex items-center gap-4 border-b border-white/10 bg-[#1A0B2E]">
        <button onClick={() => { vibrate(); setView('HOME'); }} className="text-white/70 hover:text-white btn-squishy"><ArrowLeft /></button>
        <h2 className="text-xl font-black text-white">📜 {t(language, 'history')}</h2>
      </div>

      {history.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/40 text-sm">{t(language, 'noHistory')}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10 text-center">
              <p className="text-[#00FFFF] text-2xl font-black">{best !== null ? formatTime(best) : '--'}</p>
              <p className="text-white/40 text-xs">{t(language, 'bestRecord')}</p>
            </div>
            <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10 text-center">
              <p className="text-[#FF0080] text-2xl font-black">{playHistory.length}</p>
              <p className="text-white/40 text-xs">{t(language, 'gameCount', { count: String(playHistory.length) })}</p>
            </div>
          </div>

          {/* History List */}
          <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10">
            <p className="text-white font-semibold text-sm mb-3">{t(language, 'history')}</p>
            <div className="space-y-3">
              {[...history].reverse().slice(0, 30).map((record, idx) => {
                const date = new Date(record.date);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

                let icon = '📜';
                let label = '';
                let valueDisplay = '';

                if (record.type === 'PLAY') {
                  icon = '🎮';
                  label = t(language, 'clearTime') || 'Game Play';
                  valueDisplay = formatTime(record.value);
                } else if (record.type === 'AD') {
                  icon = '📺';
                  label = 'Ad Reward';
                  valueDisplay = `+${record.value} 💚`;
                } else if (record.type === 'INVITE') {
                  icon = '🤝';
                  label = 'Friend Invite';
                  valueDisplay = `+${record.value} 💚`;
                } else if (record.type === 'DAILY') {
                  icon = '🎁';
                  label = 'Daily Bonus';
                  valueDisplay = `+${record.value} 💚`;
                }

                return (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/10">
                    <div className="text-xl">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">{label}</p>
                      <p className="text-white/40 text-[10px]">{dateStr}</p>
                    </div>
                    <div className="text-[#00FFFF] font-mono font-bold text-sm">
                      {valueDisplay}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 리더보드/랭킹 화면 컴포넌트 ──────────────────────────────────
// 현재 속한 리그의 다른 유저 기록(가짜+진짜)을 동기화하여 보여주며,
// 내 랭킹과 1등과의 격차 등을 제공합니다. 비로그인 유저에게는 샘플(게스트) 리그를 보여줍니다.
const LeaderboardScreen = ({ onShowHearts }: { onShowHearts: () => void }) => {
  const { setView, leaderboard, fetchLeaderboard, currentUser, language, consumeHeart, league, initLeague, getLeagueGap, getLeagueCountdown, login } = useStore();
  const [countdown, setCountdown] = useState('30:00');
  const [guestData, setGuestData] = useState<{ winners: import('./types').LeaderboardEntry[]; totalLeagues: number } | null>(null);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  useEffect(() => {
    const timer = setInterval(() => {
      initLeague(); // auto-refresh when 30 min expire
      setCountdown(getLeagueCountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, [initLeague, getLeagueCountdown]);

  // Generate guest showcase data on mount if not logged in
  useEffect(() => {
    if (!currentUser) {
      setGuestData(generateGuestShowcase());
    }
  }, [currentUser]);

  const myEntry = leaderboard.find((entry) => entry.isCurrentUser);
  const gapMs = getLeagueGap();
  const gapFormatted = formatTime(gapMs);

  // ─── GUEST VIEW (Not Logged In) ───
  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col bg-[#0D0518]">
        <div className="p-4 flex items-center gap-4 border-b border-white/10 bg-[#1A0B2E]">
          <button onClick={() => { vibrate(); setView('HOME'); }} className="text-white/70 hover:text-white btn-squishy"><ArrowLeft /></button>
          <h2 className="text-xl font-black text-white">{t(language, 'guestLeagueTitle')}</h2>
        </div>

        {/* Active Leagues Count */}
        {guestData && (
          <div className="px-4 py-3 bg-gradient-to-r from-[#FF0080]/20 to-[#0D0518] border-b border-[#FF0080]/20">
            <p className="text-[#00FFFF] font-bold text-sm">
              {t(language, 'guestLeagueSubtitle', { count: String(guestData.totalLeagues) })}
            </p>
          </div>
        )}

        {/* Random League #1 Winners */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {guestData?.winners.map((entry, index) => (
            <div key={entry.id} className="flex items-center p-3 rounded-lg border bg-white/5 border-transparent hover:bg-white/8">
              <div className="w-8 text-lg text-center font-bold">🥇</div>
              <img src={entry.avatarUrl} alt={entry.nickname} className="w-8 h-8 rounded-full mr-2 border border-white/20" />
              <div className="mr-2 text-xl" title={entry.country}>{getCountryFlag(entry.country)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-white">{entry.nickname}</p>
                <p className="text-white/40 text-[10px]">{t(language, 'guestLeagueLabel')} #{entry.leagueLabel}</p>
              </div>
              <p className="font-mono text-[#00FFFF] text-sm">{formatTime(entry.time)}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="sticky bottom-0 p-4 bg-[#1A0B2E] border-t border-[#FF0080]/30 text-center space-y-3">
          <p className="text-white/70 text-sm">{t(language, 'guestLeagueCta')}</p>
          <button
            onClick={() => { vibrate(); login().then(() => setView('HOME')); }}
            className="w-full bg-gradient-to-r from-[#FF0080] to-[#FF6B00] text-white font-bold py-3 rounded-lg btn-squishy text-lg"
          >
            {t(language, 'guestLeagueBtn')}
          </button>
        </div>
      </div>
    );
  }

  // ─── LOGGED-IN VIEW ───
  return (
    <div className="flex-1 flex flex-col bg-[#0D0518]">
      <div className="p-4 flex items-center gap-4 border-b border-white/10 bg-[#1A0B2E]">
        <button onClick={() => { vibrate(); setView('HOME'); }} className="text-white/70 hover:text-white btn-squishy"><ArrowLeft /></button>
        <h2 className="text-xl font-black text-white">{t(language, 'rankingBoardTitle')}</h2>
      </div>

      {/* League Info Banner */}
      {league && (
        <div className="px-4 py-3 bg-gradient-to-r from-[#FF0080]/20 to-[#0D0518] border-b border-[#FF0080]/20">
          <div className="flex items-center justify-between text-xs">
            <p className="text-[#00FFFF] font-bold text-sm">
              {t(language, 'leagueInfo', { leagueNum: String(league.leagueId), players: String(league.leagueSize), totalLeagues: String(league.totalLeagues) })}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-white/50 text-[10px]">{t(language, 'leagueSyncNotice')}</span>
            <span className="text-[#00FFFF] text-[10px] font-mono">{countdown}</span>
          </div>
        </div>
      )}

      {/* No Record State — show CTA */}
      {myEntry === undefined && (
        <div className="mx-4 mt-3 rounded-lg bg-gradient-to-r from-[#00FFFF]/20 to-[#FF0080]/20 border border-[#00FFFF]/30 p-4 text-center space-y-3">
          <p className="text-white text-lg font-bold">{t(language, 'noRecordYet')}</p>
          <p className="text-white/50 text-xs">{t(language, 'overallPrize')} · {t(language, 'leaguePrize')}</p>
          <button onClick={() => { vibrate(); const ok = consumeHeart(); if (ok) { setView('GAME'); } else { onShowHearts(); } }} className="w-full bg-gradient-to-r from-[#FF0080] to-[#FF6B00] text-white font-bold py-3 rounded-lg btn-squishy text-lg">
            {t(language, 'startGameCta')}
          </button>
        </div>
      )}

      {/* Almost #1 Motivational Banner — only show when user HAS a record */}
      {myEntry && myEntry.rank > 1 && (
        <div className="mx-4 mt-3 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 p-3 text-center">
          <p className="text-white text-sm font-bold">
            {t(language, 'almostFirst', { gap: gapFormatted })}
          </p>
          <div className="w-full bg-white/10 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-[#FF0080] rounded-full transition-all duration-700"
              style={{ width: `${Math.max(10, 100 - (gapMs / 150))}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {leaderboard.filter((entry) => !entry.banned).length === 0 ? (
          <div className="py-10 text-center text-white/40 text-sm">{t(language, 'noRecordYet')}</div>
        ) : (
          leaderboard.filter((entry) => !entry.banned).slice(0, 100).map((entry, index) => (
            <div key={entry.id} className={`flex items-center p-3 rounded-lg border transition-all ${entry.isCurrentUser ? 'bg-[#FF0080]/20 border-[#FF0080] shadow-[0_0_15px_rgba(255,0,128,0.3)]' : 'bg-white/5 border-transparent hover:bg-white/8'}`}>
              <div className="w-8 text-lg text-center font-bold">{index < 3 ? ['🥇', '🥈', '🥉'][index] : <span className="text-white/50 text-sm">{entry.rank}</span>}</div>
              <img src={entry.avatarUrl} alt={entry.nickname} width="40" height="40" className="w-8 h-8 rounded-full mr-2 border border-white/20" />
              <div className="mr-2 text-xl" title={entry.country}>{getCountryFlag(entry.country)}</div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${entry.isCurrentUser ? 'text-[#FF0080]' : 'text-white'}`}>{entry.nickname}</p>
              </div>
              <p className="font-mono text-[#00FFFF] text-sm">{formatTime(entry.time)}</p>
            </div>
          ))
        )}
      </div>

      {currentUser && myEntry && (
        <div className="sticky bottom-0 p-4 bg-[#1A0B2E] border-t border-[#FF0080]/30">
          <button onClick={() => { vibrate(); const ok = consumeHeart(); if (ok) { setView('GAME'); } else { onShowHearts(); } }} className="w-full bg-[#00FFFF] text-black font-bold py-3 rounded-lg btn-squishy">
            {t(language, 'retry')}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── 관리자(Admin) 화면 컴포넌트 ──────────────────────────────────
// 로고를 3초 이상 길게 누르면 접근 가능한 숨겨진 화면.
// 통계 확인, 강제 데이터 초기화, 가짜 봇 생성, 공지사항 작성 등의 운영 기능을 담당합니다.
const AdminScreen = () => {
  const {
    setView, leaderboard, notice, setNotice,
    resetSeason, banUser, unbanUser, currentUser, editUserHeart,
    showNoticePopup, setShowNoticePopup, language,
    adminStats, adminUsers, fetchAdminData,
    botConfig, setBotConfig, generateDummyBots,
    adminLoading, adminShowAll, setAdminShowAll,
    adminLog, startAdminLiveStats, stopAdminLiveStats,
  } = useStore();

  useEffect(() => {
    fetchAdminData();
    startAdminLiveStats();
    return () => stopAdminLiveStats();
  }, []);

  const [noticeDraft, setNoticeDraft] = useState(notice);
  const [heartDraft, setHeartDraft] = useState(3);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminSortBy, setAdminSortBy] = useState<'TIME' | 'HEARTS' | 'NEWEST'>('NEWEST');
  const [showBanned, setShowBanned] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [botCount, setBotCount] = useState(5);

  if (currentUser?.role !== 'ADMIN') return <div className="flex-1 p-4 flex items-center justify-center text-white/50">Unauthorized Access</div>;

  const [botMean, setBotMean] = useState(botConfig.mean / 1000);
  const [botStd, setBotStd] = useState(botConfig.stdDev / 1000);

  useEffect(() => {
    setBotMean(botConfig.mean / 1000);
    setBotStd(botConfig.stdDev / 1000);
  }, [botConfig.mean, botConfig.stdDev]);

  const riskWarning = leaderboard.some((entry) => entry.time <= 1000);

  // DAU Calculation + User stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const totalUsers = adminUsers.length;
  const bannedUsers = adminUsers.filter(u => u.banned).length;
  const activeUsers = totalUsers - bannedUsers;
  const dau = adminUsers.length > 0
    ? adminUsers.filter(u => {
      if (u.banned) return false;
      if (!u.updatedAt) return false;
      try {
        const d = u.updatedAt.toDate ? u.updatedAt.toDate() : new Date(u.updatedAt);
        return d.toISOString().slice(0, 10) === todayStr;
      } catch { return false; }
    }).length
    : leaderboard.filter((entry) => !entry.banned).length;

  // CSV Export (#12)
  const handleExportCSV = () => {
    const headers = ['ID', 'Nickname', 'Email', 'Country', 'Hearts', 'Best Time', 'Banned', 'Referral Code'];
    const rows = adminUsers.map(u => [
      u.id, u.nickname || '', u.email || '', u.country || '',
      u.hearts ?? '', u.time ?? '', u.banned ? 'YES' : 'NO', u.referralCode || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: string) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `stanbeat-users-${todayStr}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => { vibrate(); setView('HOME'); }} className="text-white/70 btn-squishy"><ArrowLeft /></button>
        <div className="flex items-center gap-2 flex-col">
          <h2 className="text-white font-black text-xl">{t(language, 'adminTitle')}</h2>
          <span className="text-[10px] bg-[#FF0080]/20 text-[#FF0080] border border-[#FF0080] px-3 py-0.5 rounded-full font-bold shadow-[0_0_10px_rgba(255,0,128,0.3)] tracking-widest">👑 GOD MODE ACTIVE</span>
        </div>
        <button onClick={() => { vibrate(); fetchAdminData(); }} className="text-[#00FFFF] btn-squishy" aria-label="Refresh" title="Refresh Data">
          <RefreshCw size={20} className={adminLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Loading Indicator (#8) */}
      {adminLoading && (
        <div className="flex items-center justify-center py-2">
          <div className="w-5 h-5 border-2 border-[#00FFFF] border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-white/50 text-xs">Loading admin data...</span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="DAU" value={String(dau)} icon={<Users />} color="text-[#00FFFF]" />
        <MetricCard label="Ad Revenue" value={`$${(adminStats?.adRevenue || 0).toFixed(2)}`} icon={<DollarSign />} color="text-green-400" />
        <MetricCard label="Global Hearts" value={String(adminStats?.totalHeartsUsed || 0)} icon={<Play />} color="text-[#FF0080]" />
        <MetricCard label="Risk Meter" value={riskWarning ? 'Warning' : 'Normal'} icon={<ShieldAlert />} color={riskWarning ? 'text-red-400' : 'text-[#00FFFF]'} />
      </div>

      {/* User Stats Summary (#9) */}
      <div className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2 text-xs text-white/70 border border-white/5">
        <span>👥 Total: <strong className="text-white">{totalUsers}</strong></span>
        <span>✅ Active: <strong className="text-green-400">{activeUsers}</strong></span>
        <span>🚫 Banned: <strong className="text-red-400">{bannedUsers}</strong></span>
      </div>

      {/* Season + Bots */}
      <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10 space-y-3">
        <button onClick={() => { vibrate(); if (confirm('⚠️ Are you sure you want to reset the season? This will DELETE all leaderboard data.')) { resetSeason(); } }} className="w-full bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg py-2 flex items-center justify-center gap-2 btn-squishy">
          <Trash2 size={16} /> {t(language, 'resetSeasonBtn')}
        </button>

        {/* Bot Generation (#10) */}
        <div className="flex items-center gap-2">
          <input type="number" min={1} max={50} value={botCount} onChange={e => setBotCount(Math.max(1, Math.min(50, Number(e.target.value))))} className="w-16 bg-black/30 border border-white/20 text-white rounded px-2 py-1 text-sm outline-none" />
          <button onClick={() => { vibrate(); if (confirm(`Generate ${botCount} dummy bots?`)) { generateDummyBots(botCount); } }} className="flex-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-lg py-2 text-sm font-bold btn-squishy">
            🤖 Generate {botCount} Bots
          </button>
        </div>

        <div className="pt-2 border-t border-white/10">
          <p className="text-[#00FFFF] font-semibold mb-2 text-sm flex items-center gap-1">🤖 봇 설정 (Bot Settings)</p>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-white/70 text-xs w-20">평균 시간(초)</label>
            <input type="number" min="10" max="180" step="1" value={botMean} onChange={e => setBotMean(Number(e.target.value))} className="flex-1 bg-black/30 border border-white/20 text-white rounded px-2 py-1 text-sm outline-none focus:border-[#00FFFF]" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-white/70 text-xs w-20">표준편차(초)</label>
            <input type="number" min="1" max="100" step="1" value={botStd} onChange={e => setBotStd(Number(e.target.value))} className="flex-1 bg-black/30 border border-white/20 text-white rounded px-2 py-1 text-sm outline-none focus:border-[#00FFFF]" />
          </div>
          <button onClick={() => { vibrate(); setBotConfig({ mean: botMean * 1000, stdDev: botStd * 1000 }); alert('봇 설정이 저장되었습니다.'); }} className="w-full bg-[#00FFFF]/20 border border-[#00FFFF]/40 text-[#00FFFF] rounded py-1.5 text-sm font-bold btn-squishy mt-1 hover:bg-[#00FFFF]/30">
            Apply Config
          </button>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10">
        <p className="text-white font-semibold mb-2">{t(language, 'noticeSettings')}</p>
        <textarea className="w-full h-20 bg-black/30 rounded p-2 text-white text-sm" value={noticeDraft} onChange={(e) => setNoticeDraft(e.target.value)} />
        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-2 text-white/70 text-xs">
            <input type="checkbox" checked={showNoticePopup} onChange={(e) => setShowNoticePopup(e.target.checked)} />
            {t(language, 'noticePopupLabel')}
          </label>
          <button onClick={() => { vibrate(); setNotice(noticeDraft); }} className="bg-[#00FFFF] text-black font-bold px-3 py-1 rounded btn-squishy">{t(language, 'save')}</button>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white font-semibold">{t(language, 'userManagement')} (Total: {adminUsers.length})</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search..."
              value={adminSearchQuery}
              onChange={e => setAdminSearchQuery(e.target.value)}
              className="w-24 bg-black/30 border border-white/20 text-white/70 text-xs rounded px-2 outline-none"
            />
            <select value={adminSortBy} onChange={(e) => setAdminSortBy(e.target.value as 'TIME' | 'HEARTS' | 'NEWEST')} className="bg-black/30 border border-white/20 text-white/70 text-xs rounded p-1 outline-none">
              <option value="NEWEST">최신순 (Newest)</option>
              <option value="TIME">최고기록순 (Best Time)</option>
              <option value="HEARTS">하트보유순 (Most Hearts)</option>
            </select>
          </div>
        </div>

        {/* Filter toggles + Export */}
        <div className="flex items-center gap-3 text-[10px]">
          <label className="flex items-center gap-1 text-white/50 cursor-pointer">
            <input type="checkbox" checked={showBanned} onChange={e => setShowBanned(e.target.checked)} className="accent-red-500" />
            Show Banned
          </label>
          <button onClick={() => { vibrate(); handleExportCSV(); }} className="ml-auto text-[#00FFFF] border border-[#00FFFF]/30 px-2 py-0.5 rounded btn-squishy hover:bg-[#00FFFF]/10">
            📥 Export CSV
          </button>
        </div>

        {(() => {
          type AdminListEntry = {
            id: string;
            banned?: boolean;
            time?: number;
            hearts?: number;
            updatedAt?: { toMillis?: () => number } | string | number | Date;
            gameHistory?: HistoryEvent[];
            avatarUrl?: string;
            nickname?: string;
            country?: string;
            role?: 'USER' | 'ADMIN';
            email?: string;
            referralCode?: string;
            referredBy?: string;
          };
          const getUpdatedAtMs = (value: AdminListEntry['updatedAt']) => {
            if (!value) return 0;
            if (typeof value === 'object' && value !== null && 'toMillis' in value && typeof value.toMillis === 'function') {
              return value.toMillis();
            }
            return new Date(value as string | number | Date).getTime();
          };

          const sortedUsers = [...(adminUsers.length > 0 ? adminUsers : leaderboard) as AdminListEntry[]].filter(u => {
            if (!showBanned && u.banned) return false;
            // Fuzzy search (#6 includes email)
            if (adminSearchQuery) {
              const q = adminSearchQuery.toLowerCase();
              const nn = (u.nickname || '').toLowerCase();
              const id = (u.id || '').toLowerCase();
              const email = (u.email || '').toLowerCase();
              if (!nn.includes(q) && !id.includes(q) && !email.includes(q)) return false;
            }
            return true;
          }).sort((a, b) => {
            if (adminSortBy === 'TIME') return (a.time ?? Infinity) - (b.time ?? Infinity);
            if (adminSortBy === 'HEARTS') return (b.hearts ?? 0) - (a.hearts ?? 0);
            const timeA = getUpdatedAtMs(a.updatedAt);
            const timeB = getUpdatedAtMs(b.updatedAt);
            return timeB - timeA;
          });

          if (sortedUsers.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-8 text-white/40">
                <p className="text-sm">No users found</p>
              </div>
            );
          }

          const displayLimit = adminShowAll ? sortedUsers.length : 20;

          return (
            <>
              {sortedUsers.slice(0, displayLimit).map((entry) => {
                const isSelected = selectedUserId === entry.id;
                const lastLoginMs = getUpdatedAtMs(entry.updatedAt);
                const lastLogin = lastLoginMs > 0 ? new Date(lastLoginMs).toLocaleString() : 'Unknown';
                const history = Array.isArray(entry.gameHistory) ? entry.gameHistory : [];
                const playHistoryCount = history.filter((h) => h.type === 'PLAY').length;
                const adRevenueApprox = history.filter((h) => h.type === 'AD').reduce((acc, val) => acc + (val.value > 0 ? 0.35 : 0), 0).toFixed(2);

                return (
                  <div key={entry.id} className={`flex flex-col bg-black/20 p-2 rounded transition-all ${isSelected ? 'ring-1 ring-[#00FFFF]' : ''} ${entry.banned ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setSelectedUserId(isSelected ? null : entry.id)}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <img src={entry.avatarUrl || `https://picsum.photos/seed/${entry.id}/80/80`} width="40" height="40" className="w-8 h-8 rounded-full flex-shrink-0 border border-white/10" />
                        <div className="min-w-0">
                          <p className="text-white text-sm truncate font-bold">{entry.nickname || 'Unknown User'}</p>
                          <div className="flex items-center gap-2 text-white/50 text-[10px]">
                            <span>{getCountryFlag(entry.country || 'ZZ')}</span>
                            {entry.time && <span className="text-[#00FFFF] font-mono">{formatTime(entry.time)}</span>}
                            {entry.hearts !== undefined && <span className="text-[#FF0080]">❤️{entry.hearts}</span>}
                            <span className="text-yellow-500">{entry.role === 'ADMIN' ? '[ADMIN]' : ''}</span>
                            {entry.banned && <span className="text-red-400">[BANNED]</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {currentUser?.id !== entry.id && !entry.banned && (
                          <button onClick={(e) => { e.stopPropagation(); vibrate(); if (confirm(`Ban user "${entry.nickname || entry.id}"?`)) banUser(entry.id); }} className="bg-red-500/20 text-red-500 border border-red-500/50 text-xs px-2 py-1 rounded btn-squishy">🚫 Ban</button>
                        )}
                        {currentUser?.id !== entry.id && entry.banned && (
                          <button onClick={(e) => { e.stopPropagation(); vibrate(); if (confirm(`Unban user "${entry.nickname || entry.id}"?`)) unbanUser(entry.id); }} className="bg-green-500/20 text-green-400 border border-green-500/50 text-xs px-2 py-1 rounded btn-squishy">✅ Unban</button>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/70 space-y-1 bg-black/40 p-3 rounded-lg">
                        <p><strong className="text-white/90">Email:</strong> {entry.email || 'N/A'}</p>
                        <p><strong className="text-white/90">Last Login:</strong> {lastLogin}</p>
                        <p><strong className="text-white/90">Country/Region:</strong> {entry.country} {getCountryFlag(entry.country)}</p>
                        <p><strong className="text-white/90">Total Games Played:</strong> {playHistoryCount} times</p>
                        <p><strong className="text-white/90">Est. Ad Revenue:</strong> ${adRevenueApprox}</p>
                        <p><strong className="text-white/90">Referral Code:</strong> {entry.referralCode || 'N/A'}</p>
                        {entry.referredBy && <p><strong className="text-white/90">Referred By:</strong> {entry.referredBy}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
              {sortedUsers.length > 20 && (
                <button onClick={() => { vibrate(); setAdminShowAll(!adminShowAll); }} className="w-full text-center text-[#00FFFF] text-xs py-2 border border-[#00FFFF]/20 rounded mt-2 btn-squishy hover:bg-[#00FFFF]/10">
                  {adminShowAll ? 'Show Less (20)' : `Load All (${sortedUsers.length})`}
                </button>
              )}
            </>
          );
        })()}
      </div>

      {/* Heart editing for selected user or self */}
      <div className="pt-2 border-t border-white/10">
        <p className="text-white/70 text-xs mb-1">{t(language, 'heartForceGive')} {selectedUserId ? `(${selectedUserId})` : ''}</p>
        <div className="flex items-center gap-2">
          <input
            type="number" min={0} max={99} value={heartDraft}
            onChange={(e) => setHeartDraft(Number(e.target.value))}
            className="w-16 bg-black/30 text-white rounded px-2 py-1"
          />
          <button
            onClick={() => { vibrate(); editUserHeart(selectedUserId ?? currentUser?.id ?? '', heartDraft); }}
            className="bg-white/10 text-white px-3 py-1 rounded text-xs btn-squishy"
          >
            {t(language, 'applyBtn')}
          </button>
        </div>
      </div>

      {/* Admin Activity Log (#11) */}
      <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10">
        <button onClick={() => setShowLog(!showLog)} className="flex items-center justify-between w-full text-white font-semibold text-sm">
          📋 Admin Activity Log ({adminLog.length})
          <span className="text-white/40 text-xs">{showLog ? '▲' : '▼'}</span>
        </button>
        {showLog && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {adminLog.length === 0 ? (
              <p className="text-white/30 text-xs">No admin actions recorded this session.</p>
            ) : (
              [...adminLog].reverse().map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] text-white/60 bg-black/20 rounded px-2 py-1">
                  <span className={`font-bold ${entry.action === 'BAN' ? 'text-red-400' : entry.action === 'UNBAN' ? 'text-green-400' : 'text-[#00FFFF]'}`}>{entry.action}</span>
                  <span className="truncate flex-1">{entry.target}</span>
                  <span className="text-white/30 flex-shrink-0">{new Date(entry.time).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Ad Config Section */}
      <AdConfigPanel />
    </div>
  );
};

// ─── Ad Config Admin Panel ────────────────────────────────────────
const AdConfigPanel = () => {
  const { adConfig, setAdConfig, language } = useStore();

  const Toggle = ({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-white/80 text-sm">{label}</span>
      <button onClick={() => { vibrate(); onToggle(); }} className="btn-squishy">
        {enabled ? <ToggleRight size={28} className="text-[#00FFFF]" /> : <ToggleLeft size={28} className="text-white/30" />}
      </button>
    </div>
  );

  return (
    <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Settings size={16} className="text-[#00FFFF]" />
        <p className="text-white font-semibold">광고 설정 (Ad Config)</p>
      </div>

      <Toggle
        label="🎬 리워드 동영상 (Rewarded Video)"
        enabled={adConfig.rewardedVideo}
        onToggle={() => setAdConfig({ rewardedVideo: !adConfig.rewardedVideo })}
      />
      {adConfig.rewardedVideo && (
        <div className="space-y-2 pl-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-xs">동영상 당 하트 보상:</span>
            <select
              value={adConfig.rewardedVideoRewardHearts}
              onChange={(e) => setAdConfig({ rewardedVideoRewardHearts: Number(e.target.value) })}
              className="bg-black/30 text-white rounded px-2 py-1 text-xs"
            >
              <option value={1}>+1 ❤️</option>
              <option value={2}>+2 ❤️</option>
              <option value={3}>+3 ❤️</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-xs">하트 1개당 시청 횟수:</span>
            <select
              value={adConfig.videosPerHeart}
              onChange={(e) => setAdConfig({ videosPerHeart: Number(e.target.value) })}
              className="bg-black/30 text-white rounded px-2 py-1 text-xs"
            >
              <option value={1}>1회 (테스트용)</option>
              <option value={2}>2회</option>
              <option value={3}>3회 (추천)</option>
              <option value={4}>4회 (기본)</option>
              <option value={5}>5회 (수익 최적화)</option>
            </select>
          </div>
        </div>
      )}

      <Toggle
        label="📋 참여형 광고 (Offerwall)"
        enabled={adConfig.offerwall}
        onToggle={() => setAdConfig({ offerwall: !adConfig.offerwall })}
      />
      {adConfig.offerwall && (
        <div className="flex items-center gap-2 pl-4 pb-2">
          <span className="text-white/50 text-xs">참여 보상:</span>
          <select
            value={adConfig.offerwallRewardHearts}
            onChange={(e) => setAdConfig({ offerwallRewardHearts: Number(e.target.value) })}
            className="bg-black/30 text-white rounded px-2 py-1 text-xs"
          >
            <option value={1}>+1 ❤️</option>
            <option value={2}>+2 ❤️</option>
            <option value={3}>+3 ❤️</option>
          </select>
        </div>
      )}

      <Toggle
        label="📺 전면 광고 (Interstitial)"
        enabled={adConfig.interstitial}
        onToggle={() => setAdConfig({ interstitial: !adConfig.interstitial })}
      />

      <div className="pt-2 border-t border-white/10">
        <p className="text-white/40 text-[10px]">* 실제 광고 SDK 연동 전까지는 시뮬레이션 모드로 동작합니다.</p>
        <p className="text-white/40 text-[10px]">* 긴 동영상 + 참여형 = 높은 CPM (단가)</p>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) => (
  <div className="bg-[#1A0B2E] p-4 rounded-xl border border-white/10">
    <div className={`mb-2 ${color}`}>{icon}</div>
    <p className="text-white text-2xl font-black">{value}</p>
    <p className="text-white/40 text-xs">{label}</p>
  </div>
);

// ─── Language Modal ───────────────────────────────────────────────
const LanguageModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { setLanguage, language } = useStore();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t(language, 'languageTitle')}>
      <div className="grid grid-cols-3 gap-2">
        {languageOptions.map((option) => (
          <button
            key={option.code}
            onClick={() => { vibrate(); setLanguage(option.code); }}
            className={`rounded-lg p-2 border btn-squishy ${language === option.code ? 'bg-[#00FFFF]/20 border-[#00FFFF]' : 'bg-white/5 border-transparent'}`}
          >
            <p className="text-2xl">{option.flag}</p>
            <p className="text-[10px] text-white/80">{option.name}</p>
          </button>
        ))}
      </div>
    </Modal>
  );
};

// ─── Hearts Modal ─────────────────────────────────────────────────
const HeartsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const {
    addHeart, claimDailyHeart, language, getReferralLink,
    adConfig, watchRewardedAd, getOfferUrls, videoWatchCount
  } = useStore();
  const [seconds, setSeconds] = useState(3 * 60 * 60);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showIframe, setShowIframe] = useState(false);
  const [iframeUrl, setIframeUrl] = useState('');
  const [iframeType, setIframeType] = useState<'video' | 'offerwall' | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setSeconds((prev) => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const handleWatchAd = () => {
    vibrate();
    const urls = getOfferUrls();
    setIframeUrl(urls.video);
    setIframeType('video');
    setShowIframe(true);
  };

  const handleOfferwall = () => {
    vibrate();
    const urls = getOfferUrls();
    setIframeUrl(urls.offerwall);
    setIframeType('offerwall');
    setShowIframe(true);
  };

  const handleCloseIframe = async () => {
    if (iframeType === 'video') {
      // For video, we increment watch count when iframe closes
      // (Simplified: in production, one would use postMessage or API check)
      const earned = await watchRewardedAd();
      if (earned) {
        onClose(); // Close the modal if heart was granted
      }
    }
    setShowIframe(false);
    setIframeType(null);
  };

  const handleInvite = async () => {
    vibrate();
    const link = getReferralLink();
    try {
      if (navigator.share) {
        await navigator.share({ title: 'StanBeat', text: 'Can you beat my record? Play StanBeat!', url: link });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      } else {
        window.prompt('Copy this invite link:', link);
      }
    } catch { }
  };

  if (showIframe) {
    return (
      <Modal isOpen={isOpen} onClose={handleCloseIframe} title={iframeType === 'video' ? '📺 Video Ad' : '📋 Mission Wall'}>
        <div className="w-full aspect-[9/16] max-h-[70vh] relative bg-black rounded-lg overflow-hidden border border-white/20">
          <iframe
            src={iframeUrl}
            className="w-full h-full border-none"
            title="Adscend Media"
            sandbox="allow-scripts allow-same-origin allow-popups"
            allow="autoplay"
          />
        </div>
        <p className="text-white/40 text-[10px] mt-2 text-center">
          {iframeType === 'video'
            ? t(language, 'adVideoHint')
            : t(language, 'adMissionHint')}
        </p>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t(language, 'heartsTitle')}>
      <div className="space-y-3">
        <p className="text-white/70 text-xs">{t(language, 'nextHeart')}: {hh}:{mm}:{ss}</p>

        {adConfig.rewardedVideo && (
          <div className="space-y-1">
            <button onClick={handleWatchAd} className="w-full rounded-xl p-3 bg-[#00FFFF] text-black font-bold flex items-center justify-center gap-2 btn-squishy">
              <Video size={18} /> {t(language, 'watchAd')}
            </button>
            <div className="flex flex-col items-center">
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden max-w-[80%]">
                <div
                  className="h-full bg-[#00FFFF] transition-all duration-300"
                  style={{ width: `${(videoWatchCount / adConfig.videosPerHeart) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-white/50 mt-1">
                {t(language, 'videoProgress', { current: String(videoWatchCount), total: String(adConfig.videosPerHeart), reward: String(adConfig.rewardedVideoRewardHearts) })}
              </p>
            </div>
          </div>
        )}

        {adConfig.offerwall && (
          <button onClick={handleOfferwall} className="w-full rounded-xl p-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold flex items-center justify-center gap-2 btn-squishy">
            {t(language, 'offerwallButton', { reward: String(adConfig.offerwallRewardHearts) })}
          </button>
        )}

        <button onClick={handleInvite} className="w-full rounded-xl p-3 bg-[#FF0080] text-white font-bold flex items-center justify-center gap-2 btn-squishy">
          <Share2 size={18} /> {linkCopied ? t(language, 'linkCopied') : t(language, 'inviteFriend')}
        </button>

        <button onClick={() => { vibrate(); claimDailyHeart(); }} className="w-full rounded-xl p-3 bg-white/10 text-white text-sm btn-squishy">
          {t(language, 'dailyHeart')}
        </button>

        <p className="text-[11px] text-white/50">{t(language, 'missionGet')}</p>
        <p className="text-[11px] text-white/50">{t(language, 'maxHearts')}</p>
      </div>
    </Modal>
  );
};

// ─── Offline Toast ────────────────────────────────────────────────
const OfflineToast = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-safe z-[3000] w-full flex justify-center py-2 animate-slide-down pointer-events-none">
      <div className="bg-red-500 text-white px-4 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(239,68,68,0.5)] flex items-center gap-2 text-sm border-2 border-red-400">
        <span>⚠️ No Internet Connection</span>
      </div>
    </div>
  );
};

// ─── 메인 앱 컨테이너 컴포넌트 ────────────────────────────────────
// 전체 앱의 상태(라우팅/뷰)를 관리하고, 언어 자동 감지,
// 하트 충전 모달, 모바일 레이아웃(하단 정보) 등을 통합 렌더링합니다.
export default function App() {
  const { currentView, language, currentUser, initAdscendListener, setLanguage, showBrowserBlocker, setShowBrowserBlocker } = useStore();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showHeartsModal, setShowHeartsModal] = useState(false);

  // Global BeforeInstallPrompt listener
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      useStore.setState({ deferredPrompt: e });
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // IP 기반 언어 자동 감지
  useEffect(() => {
    let cancelled = false;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('stanbeat_lang');
    } catch {
      saved = null;
    }

    if (!saved) {
      detectLanguageFromIP().then((lang) => {
        if (!cancelled && lang) setLanguage(lang);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [setLanguage]);

  // Initialize ad rewards listener when logged in
  useEffect(() => {
    if (currentUser) {
      initAdscendListener();
    }
  }, [currentUser, initAdscendListener]);

  // Handle browser back button (popstate mapping to SetView)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as { view?: any };
      if (state && state.view) {
        useStore.setState({ currentView: state.view });
      } else {
        useStore.setState({ currentView: 'HOME' });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <Layout onOpenLanguage={() => setShowLanguageModal(true)} onOpenHearts={() => setShowHeartsModal(true)}>
      <OfflineToast />
      {currentView === 'HOME' && <HomeScreen onShowHearts={() => setShowHeartsModal(true)} />}
      {currentView === 'GAME' && <GameScreen onShowHearts={() => setShowHeartsModal(true)} />}
      {currentView === 'LEADERBOARD' && <LeaderboardScreen onShowHearts={() => setShowHeartsModal(true)} />}
      {currentView === 'HISTORY' && <HistoryScreen />}
      {currentView === 'ADMIN' && <AdminScreen />}

      <LanguageModal isOpen={showLanguageModal} onClose={() => setShowLanguageModal(false)} />
      <HeartsModal isOpen={showHeartsModal} onClose={() => setShowHeartsModal(false)} />

      {/* In-App Browser Blocker Modal */}
      <Modal isOpen={showBrowserBlocker} onClose={() => setShowBrowserBlocker(false)} title="Browser Not Supported">
        <p className="text-white/80 text-sm mb-4 text-center">Google Login is blocked in in-app browsers (Instagram, Facebook, etc). Please copy the link and open it in Safari or Chrome.</p>
        <button onClick={() => { vibrate(); navigator.clipboard.writeText('https://stanbeat.org').then(() => alert('Link copied! Paste in Chrome/Safari.')); }} className="w-full bg-[#00FFFF] text-black font-bold py-3 rounded-lg btn-squishy text-lg">
          Copy Link URL
        </button>
      </Modal>

      {(currentView === 'HOME' || currentView === 'LEADERBOARD') && (
        <footer className="bg-[#050208] p-4 text-center border-t border-white/10 space-y-1">
          <p className="text-[10px] text-[#4d4d4d] leading-tight">{t(language, 'legal')}</p>
          <p className="text-[9px] text-[#3a3a3a]">© {new Date().getFullYear()} StanBeat · <a href="mailto:marketing@stanbeat.org" className="underline hover:text-white/40">marketing@stanbeat.org</a></p>
        </footer>
      )}
    </Layout>
  );
}
