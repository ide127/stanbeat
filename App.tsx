import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Clipboard, ClipboardCheck, DollarSign, Play, RefreshCw, Settings, Share2, ShieldAlert, Trash2, ToggleLeft, ToggleRight, Users, Video } from 'lucide-react';
import { Layout, Modal } from './components/Layout';
import { languageOptions, t } from './i18n';
import { useStore, type AdConfig } from './store';
import { GridCell, WordConfig } from './types';
import { formatTime, generateGrid, getCountryFlag, getSolutionCells } from './utils';
import { getCurrentSeasonNumber, generateGuestShowcase } from './league';

const TARGET_WORDS = ['RM', 'JIN', 'SUGA', 'HOPE', 'JIMIN', 'V', 'JK'];

const vibrate = () => navigator.vibrate?.(15);

// ─── Home Screen ───────────────────────────────────────────────────
const HomeScreen = ({ onShowHearts }: { onShowHearts: () => void }) => {
  const { setView, consumeHeart, currentUser, login, language, termsAccepted, acceptTerms, seasonEndsAt, notice, showNoticePopup, setShowNoticePopup } = useStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [rewardIndex, setRewardIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [remainingParts, setRemainingParts] = useState({ h: 0, m: 0, s: 0, ms: 0 });

  // Show notice popup on mount if enabled
  useEffect(() => {
    if (showNoticePopup && notice) {
      setShowNoticeModal(true);
    }
  }, [showNoticePopup, notice]);

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

  const handlePlay = () => {
    vibrate();
    if (!currentUser) { setShowLoginModal(true); return; }
    if (!termsAccepted) { setShowTermsModal(true); return; }
    const consumed = consumeHeart();
    if (!consumed) { onShowHearts(); return; }
    // Heart break + zoom transition
    setTransitioning(true);
    setTimeout(() => { setView('GAME'); setTransitioning(false); }, 900);
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
        <p className="text-[#FFD700] font-black text-base tracking-wide">✈️ 전체 1위 → 서울행 왕복 항공권</p>
        <p className="text-white/60 text-[11px] mt-0.5">🎁 각 리그 1위 → BTS 공식 굿즈 · 매일 자정 리셋</p>
      </div>

      <div className="mt-4">
        <p className="text-white/60 text-xs uppercase tracking-widest">{t(language, 'seasonLabel', { seasonNum: String(seasonNum) })}</p>
        <div className="flex items-end justify-center gap-1 mt-1">
          {remainingParts.h > 0 && <><span className="text-red-400 text-3xl font-black font-mono">{remainingParts.h}</span><span className="text-white/50 text-lg mb-1">시간</span></>}
          <span className="text-red-400 text-3xl font-black font-mono">{String(remainingParts.m).padStart(2, '0')}</span><span className="text-white/50 text-lg mb-1">분</span>
          <span className="text-red-400 text-3xl font-black font-mono">{String(remainingParts.s).padStart(2, '0')}</span>
          <span className="text-red-400 text-xl font-black font-mono">.{String(remainingParts.ms).padStart(2, '0')}</span>
          <span className="text-white/50 text-lg mb-1">초</span>
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
              <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full border border-[#00FFFF]/50 flex-shrink-0" />
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
          onClick={() => { vibrate(); login().then(() => setShowLoginModal(false)); }}
          className="w-full bg-white text-black font-bold py-3 rounded-xl btn-squishy"
        >
          {t(language, 'continueGoogle')}
        </button>
      </Modal>

      {/* Terms Modal */}
      <Modal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} title={t(language, 'termsTitle')}>
        <div className="max-h-48 overflow-y-auto bg-black/30 rounded-lg p-3 mb-4 text-left">
          <pre className="text-white/60 text-[11px] whitespace-pre-wrap font-sans leading-relaxed">{t(language, 'termsFullText')}</pre>
        </div>
        <label className="flex items-start text-white/80 text-sm gap-2 mb-4 text-left">
          <input type="checkbox" defaultChecked />
          {t(language, 'termsAgree')}
        </label>
        <button
          onClick={() => { vibrate(); acceptTerms(); setShowTermsModal(false); }}
          className="w-full bg-[#00FFFF] text-black font-bold py-2 rounded-lg btn-squishy"
        >
          {t(language, 'termsAccept')}
        </button>
      </Modal>

      {/* Notice Popup */}
      <Modal isOpen={showNoticeModal} onClose={() => setShowNoticeModal(false)} title={t(language, 'noticeTitle')}>
        <p className="text-white/70 text-sm">{notice}</p>
      </Modal>
    </div>
  );
};

// ─── Game Screen ──────────────────────────────────────────────────
const GameScreen = ({ onShowHearts }: { onShowHearts: () => void }) => {
  const { setView, updateBestTime, addGameRecord, language, editUserHeart, currentUser } = useStore();
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [words, setWords] = useState<WordConfig[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startId, setStartId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const startMs = useState(Date.now())[0];
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
    if (won) return;
    const timer = setInterval(() => setElapsed(Date.now() - startMs), 10);
    return () => clearInterval(timer);
  }, [won, startMs]);

  useEffect(() => {
    if (words.length > 0 && words.every((word) => word.found)) {
      setWon(true);
      updateBestTime(elapsed);
      addGameRecord(elapsed);
    }
  }, [elapsed, updateBestTime, addGameRecord, words]);

  const commitSelection = (ids: string[]) => {
    const text = ids.map((id) => grid.find((cell) => cell.id === id)?.letter ?? '').join('');
    const reverse = text.split('').reverse().join('');
    const matched = words.find((word) => !word.found && (word.word === text || word.word === reverse));
    if (!matched) return;
    vibrate();
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

  const handlePointerDown = (id: string) => { setStartId(id); setSelectedIds([id]); };

  const handlePointerEnter = (id: string) => {
    if (!startId) return;
    const [r1, c1] = startId.split('-').map(Number);
    const [r2, c2] = id.split('-').map(Number);
    const rowDiff = r2 - r1;
    const colDiff = c2 - c1;
    const sameRow = rowDiff === 0;
    const sameCol = colDiff === 0;
    const diagonal = Math.abs(rowDiff) === Math.abs(colDiff);
    if (!sameRow && !sameCol && !diagonal) return;
    const steps = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
    const rs = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
    const cs = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);
    const line = Array.from({ length: steps + 1 }, (_, idx) => `${r1 + rs * idx}-${c1 + cs * idx}`);
    setSelectedIds(line);
  };

  const handlePointerUp = () => {
    if (selectedIds.length) commitSelection(selectedIds);
    setSelectedIds([]);
    setStartId(null);
  };

  if (won) return <ResultScreen elapsed={elapsed} onShowHearts={onShowHearts} />;

  return (
    <div className="flex-1 p-4" onPointerUp={handlePointerUp}>
      <div className="flex items-center justify-between mb-4">
        <div className="bg-[#FF0080]/20 border border-[#FF0080] rounded-full px-3 py-1 text-[#FF0080] font-mono font-bold">{formatTime(elapsed)}</div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button onClick={() => setShowDevPanel((v) => !v)} className="text-[10px] text-yellow-400/70 border border-yellow-400/30 rounded px-2 py-0.5 btn-squishy">DEV</button>
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

      <div className="grid grid-cols-10 gap-1 bg-black/40 p-2 rounded-xl border border-white/10 select-none">
        {grid.map((cell) => {
          const selected = selectedIds.includes(cell.id);
          return (
            <div
              key={cell.id}
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

// ─── Result Screen ────────────────────────────────────────────────
const ResultScreen = ({ elapsed, onShowHearts }: { elapsed: number; onShowHearts: () => void }) => {
  const { setView, leaderboard, currentUser, language, getReferralLink, consumeHeart } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cardGenerated, setCardGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  const myEntry = leaderboard.find((e) => e.isCurrentUser);
  const rank = myEntry?.rank ?? Math.floor(Math.random() * 200) + 10;
  const percentile = leaderboard.length > 0 ? Math.ceil((rank / leaderboard.length) * 100) : 1;
  const titleText = percentile <= 10 ? 'TOP 1% ARMY' : `Rank #${rank}`;

  // Generate share card on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1920;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1920);
    grad.addColorStop(0, '#1A0B2E');
    grad.addColorStop(0.5, '#0D0518');
    grad.addColorStop(1, '#1A0B2E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Decorative circles
    ctx.beginPath();
    ctx.arc(540, 400, 300, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 0, 128, 0.08)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(540, 1400, 250, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.06)';
    ctx.fill();

    // STANBEAT title
    ctx.fillStyle = '#FF0080';
    ctx.font = 'bold 72px Oswald, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STANBEAT', 540, 200);

    // Result title
    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 120px Oswald, sans-serif';
    ctx.fillText(titleText, 540, 800);

    // Clear time
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px Inter, sans-serif';
    ctx.fillText(`⏱ ${formatTime(elapsed)}`, 540, 950);

    // Nickname
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '36px Inter, sans-serif';
    ctx.fillText(currentUser?.nickname ?? 'ARMY', 540, 1100);

    // Invite link
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '28px Inter, sans-serif';
    ctx.fillText(getReferralLink(), 540, 1500);

    // Footer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '24px Inter, sans-serif';
    ctx.fillText('stanbeat.app', 540, 1800);

    setCardGenerated(true);
  }, [elapsed, titleText, currentUser, getReferralLink]);

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
      if (!blob) return;

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'stanbeat-result.png', { type: 'image/png' });
        const shareData = { title: 'StanBeat Result', text: `I got ${titleText} in ${formatTime(elapsed)}! Can you beat me?`, url: getReferralLink(), files: [file] };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      }
      // Fallback: copy link
      await navigator.clipboard.writeText(`${titleText} - ${formatTime(elapsed)} | ${getReferralLink()}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // User cancelled share
    }
  };

  const handleCopyLink = async () => {
    vibrate();
    try {
      await navigator.clipboard.writeText(getReferralLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

      <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
        <button onClick={handleSaveImage} className="bg-white text-black rounded-lg py-2 text-sm font-bold btn-squishy">
          {t(language, 'saveImage')}
        </button>
        <button onClick={handleShare} className="bg-[#FF0080] text-white rounded-lg py-2 text-sm font-bold btn-squishy">
          {t(language, 'share')}
        </button>
        <button onClick={handleCopyLink} className="bg-white/10 text-white rounded-lg py-2 text-sm font-bold btn-squishy flex items-center justify-center gap-1">
          {copied ? <ClipboardCheck size={14} /> : <Clipboard size={14} />}
          {copied ? '✓' : t(language, 'copyLink')}
        </button>
      </div>

      <button onClick={() => { vibrate(); const ok = consumeHeart(); if (ok) { setView('GAME'); } else { onShowHearts(); setView('HOME'); } }} className="mt-3 text-white/80 underline btn-squishy">{t(language, 'retryGame')}</button>
    </div>
  );
};

// ─── History Screen ───────────────────────────────────────────────
const HistoryScreen = () => {
  const { setView, currentUser, language } = useStore();
  const history = currentUser?.gameHistory ?? [];
  const best = history.length > 0 ? Math.min(...history.map((h) => h.time)) : null;
  const maxTime = history.length > 0 ? Math.max(...history.map((h) => h.time)) : 1;

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
              <p className="text-[#FF0080] text-2xl font-black">{history.length}</p>
              <p className="text-white/40 text-xs">{t(language, 'gameCount', { count: String(history.length) })}</p>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10">
            <p className="text-white font-semibold text-sm mb-3">{t(language, 'history')}</p>
            <div className="space-y-2">
              {history.slice(-15).map((record, idx) => {
                const pct = Math.max(10, (record.time / maxTime) * 100);
                const date = new Date(record.date);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-white/40 text-[10px] w-8 text-right">{dateStr}</span>
                    <div className="flex-1 h-5 bg-black/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#FF0080] to-[#00FFFF] flex items-center justify-end pr-2"
                        style={{ width: `${pct}%`, transition: 'width 0.5s ease-out' }}
                      >
                        <span className="text-[9px] text-black font-bold">{formatTime(record.time)}</span>
                      </div>
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

// ─── Leaderboard Screen ───────────────────────────────────────────
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
        {leaderboard.filter((entry) => !entry.banned).map((entry, index) => (
          <div key={entry.id} className={`flex items-center p-3 rounded-lg border transition-all ${entry.isCurrentUser ? 'bg-[#FF0080]/20 border-[#FF0080] shadow-[0_0_15px_rgba(255,0,128,0.3)]' : 'bg-white/5 border-transparent hover:bg-white/8'}`}>
            <div className="w-8 text-lg text-center font-bold">{index < 3 ? ['🥇', '🥈', '🥉'][index] : <span className="text-white/50 text-sm">{entry.rank}</span>}</div>
            <img src={entry.avatarUrl} alt={entry.nickname} className="w-8 h-8 rounded-full mr-2 border border-white/20" />
            <div className="mr-2 text-xl" title={entry.country}>{getCountryFlag(entry.country)}</div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm truncate ${entry.isCurrentUser ? 'text-[#FF0080]' : 'text-white'}`}>{entry.nickname}</p>
            </div>
            <p className="font-mono text-[#00FFFF] text-sm">{formatTime(entry.time)}</p>
          </div>
        ))}
      </div>

      {currentUser && myEntry && (
        <div className="sticky bottom-0 p-4 bg-[#1A0B2E] border-t border-[#FF0080]/30">
          <div className="flex justify-between text-sm text-white/70 mb-2">
            <span>{t(language, 'currentRank', { rank: String(myEntry.rank) })}</span>
            <span>{t(language, 'gapToFirst', { gap: gapFormatted })}</span>
          </div>
          <button onClick={() => { vibrate(); const ok = consumeHeart(); if (ok) { setView('GAME'); } else { onShowHearts(); } }} className="w-full bg-[#00FFFF] text-black font-bold py-3 rounded-lg btn-squishy">
            {t(language, 'retry')}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Admin Screen ─────────────────────────────────────────────────
const AdminScreen = () => {
  const {
    setView, leaderboard, heartsUsedToday, adRevenue, notice, setNotice,
    resetSeason, generateDummyBots, banUser, currentUser, editUserHeart,
    showNoticePopup, setShowNoticePopup, language,
  } = useStore();

  const [noticeDraft, setNoticeDraft] = useState(notice);
  const [heartDraft, setHeartDraft] = useState(3);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const riskWarning = leaderboard.some((entry) => entry.time <= 1000);
  const dau = leaderboard.filter((entry) => !entry.banned).length;

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => { vibrate(); setView('HOME'); }} className="text-white/70 btn-squishy"><ArrowLeft /></button>
        <h2 className="text-white font-black text-xl">{t(language, 'adminTitle')}</h2>
        <div className="w-5" />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="DAU" value={String(dau)} icon={<Users />} color="text-[#00FFFF]" />
        <MetricCard label="Ad Revenue" value={`$${adRevenue.toFixed(2)}`} icon={<DollarSign />} color="text-green-400" />
        <MetricCard label="Total Hearts Used" value={String(heartsUsedToday)} icon={<Play />} color="text-[#FF0080]" />
        <MetricCard label="Risk Meter" value={riskWarning ? 'Warning' : 'Normal'} icon={<ShieldAlert />} color={riskWarning ? 'text-red-400' : 'text-[#00FFFF]'} />
      </div>

      {/* Season + Bots */}
      <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10 space-y-3">
        <button onClick={() => { vibrate(); resetSeason(); }} className="w-full bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg py-2 flex items-center justify-center gap-2 btn-squishy">
          <Trash2 size={16} /> {t(language, 'resetSeasonBtn')}
        </button>
        <button onClick={() => { vibrate(); generateDummyBots(50); }} className="w-full bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-lg py-2 flex items-center justify-center gap-2 btn-squishy">
          <RefreshCw size={16} /> {t(language, 'botGenerate', { count: '50' })}
        </button>
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
        <p className="text-white font-semibold mb-2">{t(language, 'userManagement')}</p>
        {leaderboard.filter((entry) => !entry.banned).slice(0, 10).map((entry) => (
          <div key={entry.id} className={`flex items-center justify-between bg-black/20 p-2 rounded ${selectedUserId === entry.id ? 'ring-1 ring-[#00FFFF]' : ''}`}>
            <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => setSelectedUserId(entry.id === selectedUserId ? null : entry.id)}>
              <img src={entry.avatarUrl} className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-white text-sm truncate">{entry.nickname}</p>
                <div className="flex items-center gap-2 text-white/50 text-[10px]">
                  <span>{getCountryFlag(entry.country)}</span>
                  <span>{formatTime(entry.time)}</span>
                  {entry.hearts !== undefined && <span>❤️{entry.hearts}</span>}
                  {entry.email && <span className="truncate">{entry.email}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!entry.isCurrentUser && (
                <button onClick={() => { vibrate(); banUser(entry.id); }} className="bg-red-500 text-white text-xs px-2 py-1 rounded btn-squishy">BAN</button>
              )}
            </div>
          </div>
        ))}

        {/* Heart editing for selected user or self */}
        <div className="pt-2 border-t border-white/10">
          <p className="text-white/70 text-xs mb-1">{t(language, 'heartForceGive')} {selectedUserId ? `(${selectedUserId})` : ''}</p>
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} max={3} value={heartDraft}
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
      } else {
        await navigator.clipboard.writeText(link);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
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

// ─── Main App ─────────────────────────────────────────────────────
export default function App() {
  const { currentView, language, currentUser, initAdscendListener } = useStore();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showHeartsModal, setShowHeartsModal] = useState(false);

  // Initialize ad rewards listener when logged in
  useEffect(() => {
    if (currentUser) {
      initAdscendListener();
    }
  }, [currentUser, initAdscendListener]);

  return (
    <Layout onOpenLanguage={() => setShowLanguageModal(true)} onOpenHearts={() => setShowHeartsModal(true)}>
      {currentView === 'HOME' && <HomeScreen onShowHearts={() => setShowHeartsModal(true)} />}
      {currentView === 'GAME' && <GameScreen onShowHearts={() => setShowHeartsModal(true)} />}
      {currentView === 'LEADERBOARD' && <LeaderboardScreen onShowHearts={() => setShowHeartsModal(true)} />}
      {currentView === 'HISTORY' && <HistoryScreen />}
      {currentView === 'ADMIN' && <AdminScreen />}

      <LanguageModal isOpen={showLanguageModal} onClose={() => setShowLanguageModal(false)} />
      <HeartsModal isOpen={showHeartsModal} onClose={() => setShowHeartsModal(false)} />

      {(currentView === 'HOME' || currentView === 'LEADERBOARD') && (
        <footer className="bg-[#050208] p-4 text-center border-t border-white/10">
          <p className="text-[10px] text-[#4d4d4d] leading-tight">{t(language, 'legal')}</p>
        </footer>
      )}
    </Layout>
  );
}
