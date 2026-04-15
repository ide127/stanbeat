import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, DollarSign, Mail, MessageSquare, Play, RefreshCw, Settings, Share2, ShieldAlert, Trash2, ToggleLeft, ToggleRight, Trophy, Users, Video } from 'lucide-react';
import { Layout, Modal } from './components/Layout';
import { languageOptions, t } from './i18n';
import { useStore, detectLanguageFromIP, isAuthBootstrapPending, isRewardedVideoWaitActive, type AdConfig } from './store';
import { AdminUserRow, DeferredInstallPrompt, GridCell, WordConfig, HistoryEvent, SupportTicket } from './types';
import { formatTime, generateAvatarUrl, generateGrid, getCountryFlag, getSolutionCells, playSfx } from './utils';
import { getCurrentSeasonNumber, generateGuestShowcase, getLeagueFocus, getMsUntilNextUtcMidnight, getProjectedRankForTime } from './league';
import { listenForApplixirRewards } from './services/rewards/applixirRewards';
import { getSupportTickets, onAuthStateChanged, submitSupportTicket } from './firebase';
import { runtimeConfig } from './runtimeConfig';
import { trackEvent } from './services/analytics';
import { fandomPacks, getFandomPack } from './features/fandom';

const vibrate = () => { navigator.vibrate?.(15); playSfx('tap'); };

const stableUnit = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return (Math.abs(hash) % 10000) / 10000;
};

const copyTextToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to manual copy fallback.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
};

const launchConfetti = async (options: Record<string, unknown>) => {
  const module = await import('canvas-confetti');
  module.default(options);
};

const requestGameStart = async (onNoHearts?: () => void) => {
  const result = await useStore.getState().startGame();
  if (result === 'needs_hearts') {
    onNoHearts?.();
  }
  return result;
};

const resolveAdminUpdatedAt = (value: AdminUserRow['updatedAt']): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if ('toDate' in value && typeof value.toDate === 'function') {
      return value.toDate();
    }
    if ('toMillis' in value && typeof value.toMillis === 'function') {
      return new Date(value.toMillis());
    }
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// ─── 홈 화면 컴포넌트 ─────────────────────────────────────────────
// 앱을 처음 열었을 때 보이는 메인 화면으로, 현재 시즌/시계 이벤트 정보,
// 게임 시작 버튼, 그리고 광고/오퍼월을 통해 하트를 얻을 수 있는 UI를 제공합니다.
const HomeScreen = ({ onShowHearts }: { onShowHearts: () => void }) => {
  const {
    setView,
    currentUser,
    login,
    language,
    termsAccepted,
    acceptTerms,
    seasonEndsAt,
    notice,
    showNoticePopup,
    league,
    fetchLeaderboard,
    getLeagueCountdown,
    loginPromptRequested,
    termsPromptRequested,
    clearActionPrompts,
    activeFandomId,
    setActiveFandom,
    deferredPrompt,
    gameStartPending,
  } = useStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsChecked, setTermsChecked] = useState(true);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [rewardIndex, setRewardIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [remainingParts, setRemainingParts] = useState({ h: 0, m: 0, s: 0, ms: 0 });
  const [leagueCountdown, setLeagueCountdown] = useState('10:00');
  const playRequestPendingRef = useRef(false);

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
    if (loginPromptRequested) {
      setShowLoginModal(true);
      clearActionPrompts();
    }
  }, [clearActionPrompts, loginPromptRequested]);

  useEffect(() => {
    if (termsPromptRequested) {
      setShowTermsModal(true);
      clearActionPrompts();
    }
  }, [clearActionPrompts, termsPromptRequested]);

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

  useEffect(() => {
    if (currentUser && !league) {
      void fetchLeaderboard();
    }
  }, [currentUser, league, fetchLeaderboard]);

  useEffect(() => {
    if (!league) {
      setLeagueCountdown('10:00');
      return;
    }

    const updateCountdown = () => {
      setLeagueCountdown(getLeagueCountdown());
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [league, getLeagueCountdown]);

  const leagueEntry = league?.entries.find((entry) => entry.isCurrentUser);
  const leagueFocus = league ? getLeagueFocus(league) : null;
  const leagueFocusText = (() => {
    if (!leagueFocus) return null;
    if (leagueFocus.mode === 'defend') {
      return t(language, 'leagueFocusDefend', { gap: formatTime(leagueFocus.gapMs) });
    }
    if (leagueFocus.mode === 'summit') {
      return t(language, 'leagueFocusFirst', { gap: formatTime(leagueFocus.gapMs) });
    }
    return t(language, 'leagueFocusRival', {
      name: leagueFocus.rivalName ?? t(language, 'unknownUser'),
      rank: String(leagueFocus.targetRank),
      gap: formatTime(leagueFocus.gapMs),
    });
  })();

  const handlePlay = async () => {
    if (transitioning || gameStartPending || playRequestPendingRef.current) return;
    playRequestPendingRef.current = true;
    vibrate();
    const result = await requestGameStart(onShowHearts);
    if (result !== 'started') {
      playRequestPendingRef.current = false;
      return;
    }
    // Heart break + zoom transition
    setTransitioning(true);
    trackEvent('game_start', { user_id: currentUser?.id || 'guest' });
    timerRef.current = setTimeout(() => {
      setView('GAME');
      setTransitioning(false);
      playRequestPendingRef.current = false;
    }, 180);
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
    { name: 'ShinyCookie_42', country: 'US', text: t(language, 'testimonial1'), avatar: generateAvatarUrl('testimonial-1', 'ShinyCookie_42') },
    { name: 'LovelyHobi_77', country: 'BR', text: t(language, 'testimonial2'), avatar: generateAvatarUrl('testimonial-2', 'LovelyHobi_77') },
    { name: 'NeonJimin_03', country: 'PH', text: t(language, 'testimonial3'), avatar: generateAvatarUrl('testimonial-3', 'NeonJimin_03') },
    { name: 'BrightARMY_91', country: 'MX', text: t(language, 'testimonial4'), avatar: generateAvatarUrl('testimonial-4', 'BrightARMY_91') },
    { name: 'DrYoongi_500', country: 'JP', text: t(language, 'testimonial5'), avatar: generateAvatarUrl('testimonial-5', 'DrYoongi_500') },
  ];
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const activeTestimonial = testimonials[testimonialIdx];
  const fandomCarouselRefs = useRef<Array<HTMLDivElement | null>>([]);
  const fandomCarouselSlowRef = useRef(false);
  useEffect(() => {
    const timer = setInterval(() => setTestimonialIdx((i) => (i + 1) % SHOWN_TESTIMONIALS), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let releaseTimer: number | null = null;
    const slowDown = () => {
      if (releaseTimer !== null) window.clearTimeout(releaseTimer);
      document.body.classList.add('fandom-touch-slow');
    };
    const restore = () => {
      if (releaseTimer !== null) window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(() => {
        document.body.classList.remove('fandom-touch-slow');
        releaseTimer = null;
      }, 220);
    };

    window.addEventListener('pointerdown', slowDown, { passive: true });
    window.addEventListener('pointerup', restore, { passive: true });
    window.addEventListener('pointercancel', restore, { passive: true });
    window.addEventListener('blur', restore);

    return () => {
      if (releaseTimer !== null) window.clearTimeout(releaseTimer);
      document.body.classList.remove('fandom-touch-slow');
      window.removeEventListener('pointerdown', slowDown);
      window.removeEventListener('pointerup', restore);
      window.removeEventListener('pointercancel', restore);
      window.removeEventListener('blur', restore);
    };
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const positions = [0, 0];
    const baseSpeeds = [45.6, 40.8];
    let lastFrame = performance.now();
    let frameId = 0;

    const update = (now: number) => {
      const deltaSeconds = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      const slowFactor = fandomCarouselSlowRef.current || document.body.classList.contains('fandom-touch-slow') ? 0.14 : 1;

      fandomCarouselRefs.current.forEach((rowElement, index) => {
        if (!rowElement) return;
        const loopWidth = rowElement.scrollWidth / 2;
        if (loopWidth <= 0) return;
        positions[index] = (positions[index] + baseSpeeds[index] * slowFactor * deltaSeconds) % loopWidth;
        rowElement.style.transform = `translate3d(${positions[index] - loopWidth}px, 0, 0)`;
      });

      frameId = window.requestAnimationFrame(update);
    };

    frameId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const seasonNum = getCurrentSeasonNumber();
  const legalText = t(language, 'legal').replace(/^\*\s*/, '');
  const activeFandom = getFandomPack(activeFandomId);
  const fandomRows = [
    fandomPacks.filter((_, index) => index % 2 === 0),
    fandomPacks.filter((_, index) => index % 2 === 1),
  ];

  return (
    <div className={`flex-1 flex flex-col px-4 pb-5 pt-3 text-center ${transitioning ? 'zoom-in' : ''}`}>
      {transitioning && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60">
          <span className="text-6xl heart-break">💔</span>
        </div>
      )}

      <h1 className="text-[2rem] leading-[0.95] text-white font-black tracking-tight glitch">
        {t(language, 'homeTitleFandom', { fandom: activeFandom.targetLabel })}
      </h1>

      <div className="mt-3 rounded-2xl overflow-hidden border border-white/10 relative h-40">
        <img src={activeFandom.heroImage} alt={activeFandom.displayName} className="w-full h-full object-cover opacity-85" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <h2 className="absolute left-3 bottom-3 text-[#8CF8FF] text-sm font-black uppercase tracking-[0.18em]">
          {t(language, 'homeTargetFandom', { target: activeFandom.targetLabel })}
        </h2>
        <span aria-hidden="true" className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white/80">
          {activeFandom.fandomName}
        </span>
      </div>

      <button
        onClick={() => { void handlePlay(); }}
        disabled={gameStartPending || transitioning}
        className="sticky bottom-3 z-30 w-full mt-3 relative overflow-hidden bg-[#FF0080] text-white font-black text-xl py-4 rounded-2xl btn-squishy pulse-ring shadow-[0_10px_30px_rgba(255,0,128,0.35)] disabled:cursor-wait disabled:opacity-75"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_linear_infinite]" />
        <div className="relative flex items-center justify-center gap-3">
          {gameStartPending || transitioning ? <RefreshCw size={22} className="animate-spin" /> : <Play fill="white" />}
          <span>{gameStartPending || transitioning ? t(language, 'startingGame') : t(language, 'playNowFandom', { fandom: activeFandom.displayName })}</span>
        </div>
      </button>

      <section className="mt-3 rounded-xl border border-white/15 bg-black/35 p-3 text-left">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-white text-sm font-black">{t(language, 'fandomChooserTitle')}</h2>
          <span className="rounded-full px-2 py-1 text-[10px] font-black text-black" style={{ backgroundColor: activeFandom.accent }}>
            {activeFandom.displayName}
          </span>
        </div>
        <p className="text-white/65 text-[11px] mt-1">{t(language, 'fandomChooserSubtitle')}</p>
        <p className="mt-2 text-[10px] text-white/60">{t(language, 'fandomScrollHint', { count: String(fandomPacks.length) })}</p>
        <div
          className="fandom-carousel relative mt-3 overflow-hidden rounded-xl py-1"
          aria-label={t(language, 'fandomChooserTitle')}
          onPointerEnter={() => { fandomCarouselSlowRef.current = true; }}
          onPointerLeave={() => { fandomCarouselSlowRef.current = false; }}
          onFocus={() => { fandomCarouselSlowRef.current = true; }}
          onBlur={() => { fandomCarouselSlowRef.current = false; }}
        >
          {fandomRows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none]"
              style={{ touchAction: 'pan-x' }}
            >
              <div
                ref={(element) => { fandomCarouselRefs.current[rowIndex] = element; }}
                className={`fandom-carousel-row flex w-max gap-2 py-1 will-change-transform ${rowIndex === 0 ? 'fandom-carousel-row-left pr-2' : 'fandom-carousel-row-right pl-10'}`}
              >
                {[...row, ...row].map((pack, index) => {
                  const isClone = rowIndex === 0 ? index >= row.length : index < row.length;
                  const isSelected = activeFandomId === pack.id;
                  return (
                  <button
                    key={`${pack.id}-${rowIndex}-${index}`}
                    type="button"
                    aria-hidden={isClone ? 'true' : undefined}
                    tabIndex={isClone ? -1 : 0}
                    aria-pressed={!isClone ? isSelected : undefined}
                    onClick={() => { vibrate(); setActiveFandom(pack.id); }}
                    className={`min-w-[150px] rounded-full px-4 py-2.5 text-left btn-squishy transition-all ${isSelected ? 'text-black' : 'text-white hover:bg-white/10'}`}
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, ${pack.accent}, #ffffff)`
                        : `linear-gradient(135deg, ${pack.accent}24, rgba(255,255,255,0.05))`,
                      boxShadow: isSelected
                        ? `0 0 0 2px ${pack.accent}, 0 0 18px ${pack.accent}80`
                        : `inset 0 0 0 1px ${pack.accent}70`,
                    }}
                  >
                    <span className="flex items-center justify-between gap-2 text-sm font-black">
                      <span>{pack.displayName}</span>
                      {isSelected && <span aria-hidden="true">✓</span>}
                    </span>
                    <span className={`block text-[11px] ${isSelected ? 'text-black/65' : 'text-white/75'}`}>{pack.fandomName}</span>
                  </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#12081c] via-[#12081c]/80 to-transparent" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#12081c] via-[#12081c]/80 to-transparent" />
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-white/60">{t(language, 'fandomDisclaimer')}</p>
      </section>

      <section className="mt-4 rounded-2xl border border-[#FFD700]/70 bg-[radial-gradient(circle_at_top_left,rgba(255,215,0,0.28),transparent_38%),linear-gradient(135deg,rgba(255,0,128,0.26),rgba(0,255,255,0.12)_45%,rgba(255,107,0,0.25))] p-4 relative overflow-hidden text-left shadow-[0_0_30px_rgba(255,215,0,0.18)]">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_linear_infinite]" />
        <p className="relative text-[#FFE082] text-[11px] font-black tracking-[0.24em]">{t(language, 'rewardText')}</p>
        <div className="relative grid grid-cols-2 gap-3 mt-3">
          <div className="rounded-xl bg-black/45 border border-[#FFD700]/50 p-3">
            <div className="text-2xl mb-1">✈️</div>
            <p className="text-white text-xs font-bold">{t(language, 'overallPrize')}</p>
            <p className="text-[#FFE082] text-lg font-black mt-1">Korea trip</p>
          </div>
          <div className="rounded-xl bg-black/45 border border-[#00FFFF]/40 p-3">
            <div className="text-2xl mb-1">🎁</div>
            <p className="text-white text-xs font-bold">{t(language, 'leaguePrize')}</p>
            <p className="text-[#00FFFF] text-lg font-black mt-1">K-culture box</p>
          </div>
        </div>
      </section>

      <div className="mt-4 rounded-2xl overflow-hidden border border-[#FFD700]/30 bg-black/30 shadow-[0_0_24px_rgba(255,215,0,0.16)]">
        <img src={rewardImages[rewardIndex]} alt={t(language, 'rewardText')} className="w-full h-32 object-cover" />
      </div>

      {/* Winner Testimonials (30+ accumulated, showing 5) */}
      <div className="mt-4 rounded-xl border border-[#FF0080]/30 bg-gradient-to-br from-[#FF0080]/10 to-[#1A0B2E] p-4">
        <h3 className="text-white font-bold text-sm mb-1">{t(language, 'winnersTitle')}</h3>
        <p className="text-white/70 text-xs mb-3">{t(language, 'winnersSubtitle', { total: String(TOTAL_TESTIMONIALS), shown: String(SHOWN_TESTIMONIALS) })}</p>
        <div className="relative overflow-hidden min-h-[96px]">
          <div
            key={testimonialIdx}
            className="flex items-start gap-3 rounded-xl border border-white/20 bg-[#14091F] p-3 animate-[fadeIn_0.35s_ease-out]"
          >
            <div className="w-10 h-10 rounded-full border border-[#00FFFF]/50 flex-shrink-0 bg-white/10 overflow-hidden">
              <img
                src={activeTestimonial.avatar}
                alt={activeTestimonial.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-xs font-bold">${activeTestimonial.name.charAt(0).toUpperCase()}</div>`;
                }}
              />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white text-base leading-relaxed italic">"{activeTestimonial.text}"</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-white text-base font-bold">- {activeTestimonial.name}</span>
                <span className="text-sm" aria-label={activeTestimonial.country}>{getCountryFlag(activeTestimonial.country)}</span>
                <span className="text-[#FFE082] text-base">★★★★★</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-1 mt-2">
          {Array.from({ length: SHOWN_TESTIMONIALS }, (_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === testimonialIdx ? 'bg-[#FF0080] w-4' : 'bg-white/20'}`} />
          ))}
        </div>
      </div>

      {currentUser && league && (
        <div className="mt-4 rounded-xl border border-[#00FFFF]/20 bg-gradient-to-br from-[#00FFFF]/10 via-[#1A0B2E] to-[#FF0080]/10 p-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[#00FFFF] text-[11px] font-black tracking-[0.2em]">{t(language, 'homeLeagueTitle')}</p>
            <p className="text-white/45 text-[10px]">{t(language, 'nextSync', { time: leagueCountdown })}</p>
          </div>
          <p className="text-white text-lg font-black mt-2">{league.displayName}</p>
          <p className="text-white/55 text-[11px] mt-1">
            {t(language, 'homeLeagueMeta', { players: String(league.leagueSize), totalLeagues: String(league.totalLeagues) })}
          </p>
          <div className="mt-3 rounded-lg bg-black/25 border border-white/10 p-3 space-y-2">
            <p className="text-white text-sm font-semibold">
              {leagueEntry
                ? t(language, 'homeLeagueStanding', { rank: String(leagueEntry.rank), time: formatTime(currentUser.bestTime ?? leagueEntry.time) })
                : t(language, 'homeLeaguePreview', { league: league.displayName })}
            </p>
            {leagueFocusText && (
              <p className="text-[#00FFFF] text-xs font-semibold">{leagueFocusText}</p>
            )}
            {!leagueEntry && (
              <p className="text-white/50 text-[11px]">{t(language, 'noRecordYet')}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="text-white/60 text-xs uppercase tracking-widest">{t(language, 'seasonLabel', { seasonNum: String(seasonNum) })}</p>
        <h2 className="flex items-end justify-center gap-1 mt-1">
          {remainingParts.h > 0 && <><span className="text-red-400 text-3xl font-black font-mono">{remainingParts.h}</span><span className="text-white/50 text-lg mb-1">{t(language, 'hoursUnit')}</span></>}
          <span className="text-red-400 text-3xl font-black font-mono">{String(remainingParts.m).padStart(2, '0')}</span><span className="text-white/50 text-lg mb-1">{t(language, 'minutesUnit')}</span>
          <span className="text-red-400 text-3xl font-black font-mono">{String(remainingParts.s).padStart(2, '0')}</span>
          <span className="text-red-400 text-xl font-black font-mono">.{String(remainingParts.ms).padStart(2, '0')}</span>
          <span className="text-white/50 text-lg mb-1">{t(language, 'secondsUnit')}</span>
        </h2>
      </div>

      {deferredPrompt && (
        <button onClick={() => {
          vibrate();
          const promptEvent = useStore.getState().deferredPrompt;
          if (!promptEvent) return;
          promptEvent.prompt();
          promptEvent.userChoice.then(() => useStore.setState({ deferredPrompt: null }));
        }} className="w-full mt-3 bg-[#00FFFF]/20 border border-[#00FFFF]/50 text-[#00FFFF] font-bold py-3 rounded-xl btn-squishy flex items-center justify-center gap-2">
          {t(language, 'installAppCta')}
        </button>
      )}

      <p className="mt-5 px-2 text-[7px] leading-tight text-white/25">
        {legalText} {t(language, 'termsApply')}
      </p>

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
              const success = await login();
              if (success) {
                trackEvent('login', { method: 'google' });
                setShowLoginModal(false);
              }
            } finally {
              setIsLoggingIn(false);
            }
          }}
          className="w-full bg-white text-black font-bold py-3 rounded-xl btn-squishy disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {isLoggingIn ? <RefreshCw size={18} className="animate-spin" /> : null}
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
  const { setView, recordCompletedPlay, addHistoryEvent, language, editUserHeart, currentUser, setGameFinished, gameExitRequested, clearGameExitRequest, showAlertDialog, activeFandomId } = useStore();
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [words, setWords] = useState<WordConfig[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startId, setStartId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const [completionSyncPending, setCompletionSyncPending] = useState(false);
  const startMsRef = useRef(Date.now());
  const placementRef = useRef<{ word: string; row: number; col: number; dir: { r: number; c: number } }[]>([]);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [heartDelta, setHeartDelta] = useState(1);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const exitIntentRef = useRef(false);
  const completionCommittedRef = useRef(false);
  const getRunElapsed = () => Math.max(0, Date.now() - startMsRef.current);

  const isAdmin = currentUser?.role === 'ADMIN';
  const canUseGameDevTools = import.meta.env.DEV && isAdmin;
  const activeFandom = getFandomPack(activeFandomId);

  useEffect(() => {
    const { grid: generated, wordList, placement } = generateGrid(10, [...activeFandom.words]);
    setGrid(generated);
    setWords(wordList);
    placementRef.current = placement;
    setGameFinished(false);
    completionCommittedRef.current = false;
  }, [activeFandom.words, setGameFinished]);

  useEffect(() => {
    if (won || completionSyncPending) return;
    const updateElapsed = () => setElapsed(Date.now() - startMsRef.current);
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 10);
    return () => window.clearInterval(timer);
  }, [completionSyncPending, won]);

  useEffect(() => {
    if (!canUseGameDevTools && showDevPanel) {
      setShowDevPanel(false);
    }
  }, [canUseGameDevTools, showDevPanel]);

  useEffect(() => {
    if (won || completionSyncPending || completionCommittedRef.current || words.length === 0 || !words.every((word) => word.found)) return;

    const commitCompletion = async () => {
      const finalElapsed = getRunElapsed();
      completionCommittedRef.current = true;
      setElapsed(finalElapsed);
      setGameFinished(true);
      setCompletionSyncPending(true);
      const saved = await recordCompletedPlay(finalElapsed);
      setCompletionSyncPending(false);
      if (!saved) {
        completionCommittedRef.current = false;
        setGameFinished(false);
        return;
      }
      setWon(true);
    };

    void commitCompletion();
  }, [completionSyncPending, won, recordCompletedPlay, words, setGameFinished]);

  // Tab Visibility Anti-Cheat
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !won && !completionSyncPending && !exitIntentRef.current) {
        addHistoryEvent('CANCELLED', getRunElapsed());
        showAlertDialog({
          title: t(language, 'browserNotSupported'),
          message: t(language, 'gameCancelledTabSwitch'),
          tone: 'warning',
        });
        setView('HOME');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [completionSyncPending, won, language, setView, addHistoryEvent, showAlertDialog]);

  // Listen for exit requests from Layout header logo
  useEffect(() => {
    if (gameExitRequested && !won && !completionSyncPending) {
      clearGameExitRequest();
      handleExitGame();
    } else if (gameExitRequested) {
      clearGameExitRequest();
    }
  }, [clearGameExitRequest, completionSyncPending, gameExitRequested, won]);

  const handleExitGame = () => {
    exitIntentRef.current = true;
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    vibrate();
    if (!won) {
      addHistoryEvent('CANCELLED', getRunElapsed());
    }
    setView('HOME');
  };

  const cancelExit = () => {
    exitIntentRef.current = false;
    setShowExitConfirm(false);
  };

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
    if (!startId || won || completionSyncPending) return;
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
    <>
    <div className="flex-1 p-4 relative">
      <div className="flex items-center justify-between mb-4">
        <div className="bg-[#FF0080]/20 border border-[#FF0080] rounded-full px-3 py-1 text-[#FF0080] font-mono font-bold">{formatTime(elapsed)}</div>
        <div className="flex items-center gap-2">
          {canUseGameDevTools && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#FF0080] font-bold border border-[#FF0080] rounded px-2 py-0.5 bg-[#FF0080]/20">GOD MODE</span>
              <button onClick={() => setShowDevPanel((v) => !v)} className="text-[10px] text-yellow-400/70 border border-yellow-400/30 rounded px-2 py-0.5 btn-squishy">DEV</button>
            </div>
          )}
          <button onClick={handleExitGame} className="text-white/70 hover:text-white btn-squishy">{t(language, 'exitGame')}</button>
        </div>
      </div>

      {/* Dev Tools Panel */}
      {canUseGameDevTools && showDevPanel && (
        <div className="mb-3 p-3 rounded-xl border border-yellow-400/30 bg-yellow-400/5 space-y-2">
          <p className="text-yellow-400 text-[10px] font-bold uppercase tracking-widest">🛠 Dev Tools</p>
          <button onClick={handleDevSolve} className="w-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs rounded-lg py-1.5 btn-squishy font-bold">
            ⚡ Auto-Solve All Words
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => { if (currentUser) editUserHeart(currentUser.id, -heartDelta, 'DELTA'); }} className="flex-1 bg-red-500/20 border border-red-500/30 text-red-300 text-xs rounded py-1 btn-squishy">-{heartDelta} ❤️</button>
            <input type="number" min={1} max={99} value={heartDelta} onChange={(e) => setHeartDelta(Math.max(1, parseInt(e.target.value) || 1))} className="w-14 bg-black/40 border border-white/20 text-white text-xs rounded text-center py-1" />
            <button onClick={() => { if (currentUser) editUserHeart(currentUser.id, heartDelta, 'DELTA'); }} className="flex-1 bg-green-500/20 border border-green-500/30 text-green-300 text-xs rounded py-1 btn-squishy">+{heartDelta} ❤️</button>
          </div>
        </div>
      )}

      <div
        className="grid grid-cols-10 gap-1 bg-black/40 p-2 rounded-xl border border-white/10 select-none touch-none"
        style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
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

      {completionSyncPending && (
        <div className="absolute inset-4 rounded-2xl bg-black/75 backdrop-blur-sm border border-[#00FFFF]/20 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="inline-block w-10 h-10 border-4 border-[#00FFFF] border-t-transparent rounded-full animate-spin" />
            <p className="text-white/80 text-sm font-semibold">{formatTime(elapsed)}</p>
            <p className="text-white/55 text-xs">{t(language, 'save')}</p>
          </div>
        </div>
      )}
    </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={cancelExit} />
          <div className="bg-[#1A0B2E] w-full max-w-xs rounded-2xl border border-[#FF0080]/40 shadow-[0_0_30px_rgba(255,0,128,0.4)] relative p-6 text-center">
            <p className="text-white text-lg font-bold mb-2">
              {t(language, 'leaveGameTitle')}
            </p>
            <p className="text-white/70 text-sm mb-6">
              {t(language, 'leaveGameMessage')}
            </p>
            <div className="flex gap-3">
              <button onClick={cancelExit} className="flex-1 bg-white/10 border border-white/20 text-white py-2.5 rounded-lg font-bold btn-squishy">
                {t(language, 'cancelAction')}
              </button>
              <button onClick={confirmExit} className="flex-1 bg-[#FF0080] text-white py-2.5 rounded-lg font-bold btn-squishy">
                {t(language, 'leaveAction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── 결과 화면 컴포넌트 ─────────────────────────────────────────────
// 게임 클리어 후 표시되는 화면으로, 소요 시간과 현재 리그에서의 예상 등수,
// 그리고 완성된 워드서치 그리드 및 친구 초대(공유) 링크 표시 기능을 합니다.
const ResultScreen = ({ elapsed, onShowHearts, grid, words }: { elapsed: number; onShowHearts: () => void; grid: GridCell[]; words: WordConfig[]; }) => {
  const { setView, leaderboard, currentUser, language, getReferralLink, league, showRewardToast, activeFandomId } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const celebrationTriggeredRef = useRef(false);

  const visibleLeaderboard = leaderboard.filter((entry) => !entry.banned);
  const myEntry = visibleLeaderboard.find((e) => e.isCurrentUser);
  const playHistory = currentUser?.gameHistory?.filter((h) => h.type === 'PLAY') || [];
  const historicalBest = playHistory.length > 1 ? Math.min(...playHistory.slice(0, -1).map((h) => h.value)) : Infinity;
  const isNewBest = playHistory.length === 1 || elapsed < historicalBest;
  const rank = myEntry?.rank ?? (league ? getProjectedRankForTime(league, elapsed) : (visibleLeaderboard.filter((e) => e.time < elapsed).length + 1));
  const previousRank = Number.isFinite(historicalBest) && league ? getProjectedRankForTime(league, historicalBest) : null;
  const rankGain = previousRank !== null ? Math.max(0, previousRank - rank) : 0;
  const percentile = visibleLeaderboard.length > 0 ? Math.ceil((rank / visibleLeaderboard.length) * 100) : 1;
  const top1Title = t(language, 'resultTitle');
  const top10Title = top1Title.replace('1%', '10%');
  const rankTitle = t(language, 'currentRank').replace('{rank}', String(rank));
  const titleText = percentile <= 1 ? top1Title : percentile <= 10 ? top10Title : rankTitle;
  const focus = league ? getLeagueFocus(league) : null;
  const activeFandom = getFandomPack(activeFandomId);
  const referralLink = getReferralLink();
  const ctaHost = (() => {
    try {
      return new URL(referralLink).host;
    } catch {
      return typeof window !== 'undefined' ? window.location.host : '';
    }
  })();
  const resultShareText = `${activeFandom.shareTitle} ${titleText} - ${formatTime(elapsed)} | ${referralLink}`;

  useEffect(() => {
    if (celebrationTriggeredRef.current) return;
    celebrationTriggeredRef.current = true;

    if (isNewBest) {
      void launchConfetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.4 },
        colors: ['#00FFFF', '#FF0080', '#FFD700', '#FFFFFF'],
        zIndex: 50
      });
      playSfx('win');
      trackEvent('game_complete', { time_ms: elapsed, rank, is_new_best: 'true' });
    } else {
      void launchConfetti({
        particleCount: 40,
        spread: 40,
        origin: { y: 0.6 },
        colors: ['#FFFFFF', '#FF0080'],
        zIndex: 50
      });
      trackEvent('game_complete', { time_ms: elapsed, rank, is_new_best: 'false' });
    }
  }, [elapsed, isNewBest, rank]);

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
      ctx.fillText(currentUser?.nickname ?? t(language, 'unknownUser'), 540, 1140);

      // Appeal / Event Text
      ctx.fillStyle = '#00FFFF'; // Neon Cyan
      ctx.font = 'bold 50px Inter, sans-serif';
      ctx.fillText(t(language, 'resultAppealText'), 540, 1300);

      ctx.fillStyle = '#FF0080'; // Neon Pink
      ctx.font = 'bold 44px Inter, sans-serif';
      ctx.fillText(t(language, 'resultCtaText', { host: ctaHost }), 540, 1400);
    });
  }, [ctaHost, elapsed, titleText, currentUser, grid, language]);

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
        const shareData = {
          title: t(language, 'shareChallengeTitleFandom', { fandom: activeFandom.targetLabel }),
          text: t(language, 'shareChallengeTextFandom', { challenge: activeFandom.shareTitle, title: titleText, time: formatTime(elapsed) }),
          url: referralLink,
          files: [file],
        };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          trackEvent('share', { method: 'native', time_ms: elapsed });
          return;
        }
      }
      if (await copyTextToClipboard(resultShareText)) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showRewardToast(t(language, 'resultShareCopied'));
        trackEvent('share', { method: 'copy', time_ms: elapsed });
        return;
      }
      showRewardToast(t(language, 'copyFailed'));
    } catch (e: unknown) {
      const errorName = e instanceof Error ? e.name : '';
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorName !== 'AbortError') {
        console.warn('Share failed:', errorMessage);
        const copiedText = await copyTextToClipboard(resultShareText);
        if (copiedText) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          showRewardToast(t(language, 'resultShareCopied'));
        } else {
          showRewardToast(t(language, 'copyFailed'));
        }
      }
    }
  };

  const handleCopyLink = async () => {
    vibrate();
    const copiedLink = await copyTextToClipboard(referralLink);
    if (copiedLink) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showRewardToast(t(language, 'inviteShareCopied'));
    } else {
      showRewardToast(t(language, 'copyFailed'));
    }
  };

  const focusText = (() => {
    if (!focus) return null;
    if (focus.mode === 'defend') {
      return t(language, 'leagueFocusDefend', { gap: formatTime(focus.gapMs) });
    }
    if (focus.mode === 'summit') {
      return t(language, 'leagueFocusFirst', { gap: formatTime(focus.gapMs) });
    }
    return t(language, 'leagueFocusRival', {
      name: focus.rivalName ?? t(language, 'unknownUser'),
      rank: String(focus.targetRank),
      gap: formatTime(focus.gapMs),
    });
  })();

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
          {copied ? t(language, 'linkCopied') : t(language, 'share')}
        </button>
      </div>

      {currentUser && (
        <div className="w-full max-w-[280px] bg-gradient-to-r from-[#00FFFF]/10 to-[#FF0080]/10 border border-[#00FFFF]/30 p-4 rounded-xl mt-4 space-y-2">
          <p className="text-white font-bold text-sm">
            {isNewBest
              ? t(language, 'resultLeagueImproved', { rank: String(rank) })
              : t(language, 'resultLeagueUnchanged', { time: formatTime(currentUser.bestTime ?? elapsed) })}
          </p>
          {focusText && (
            <p className="text-[#00FFFF] text-xs font-semibold">{focusText}</p>
          )}
          {focus?.mode === 'rival' && focus.milestoneGapMs !== undefined && focus.milestoneRank !== undefined && (
            <p className="text-white/60 text-[11px]">
              {t(language, 'leagueFocusMilestone', { rank: String(focus.milestoneRank), gap: formatTime(focus.milestoneGapMs) })}
            </p>
          )}
          {isNewBest && rankGain > 0 && (
            <p className="text-[#FFE082] text-xs font-black">
              {t(language, 'resultRankGain', { count: String(rankGain) })}
            </p>
          )}
          <button onClick={() => { vibrate(); setView('LEADERBOARD'); }} className="w-full mt-2 rounded-lg border border-[#00FFFF]/40 bg-[#00FFFF]/10 text-[#00FFFF] py-2 text-xs font-bold btn-squishy">
            {t(language, 'goToLeague')}
          </button>
        </div>
      )}

      <button onClick={async () => {
        vibrate();
        const result = await requestGameStart(onShowHearts);
        if (result === 'started') {
          setView('GAME');
        }
      }} className="mt-3 text-white/80 underline btn-squishy">{t(language, 'retryGame')}</button>

      {rank > 1 && (
        <div className="mt-8 bg-black/40 border border-[#00FFFF]/30 rounded-xl p-4 w-full max-w-[280px]">
          <p className="text-[#00FFFF] font-bold text-sm mb-2 text-center">{t(language, 'supportProjectTitle')}</p>
          <p className="text-white/70 text-xs mb-3 text-center leading-relaxed">
            {t(language, 'supportProjectDesc')}
          </p>
          {runtimeConfig.projectSupportUrl ? (
            <a
              href={runtimeConfig.projectSupportUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => vibrate()}
              className="flex items-center justify-center gap-2 w-full bg-[#1DB954]/20 border border-[#1DB954]/50 text-[#1DB954] rounded-lg py-2 text-xs font-bold btn-squishy"
            >
              {t(language, 'supportProjectCta')}
            </a>
          ) : null}
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
                  label = t(language, 'adRewardLabel');
                  valueDisplay = `+${record.value} ❤️`;
                } else if (record.type === 'INVITE') {
                  icon = '🤝';
                  label = t(language, 'friendInviteLabel');
                  valueDisplay = `+${record.value} ❤️`;
                } else if (record.type === 'DAILY') {
                  icon = '🎁';
                  label = t(language, 'dailyBonusLabel');
                  valueDisplay = `+${record.value} ❤️`;
                } else if (record.type === 'CANCELLED') {
                  icon = '⛔';
                  label = t(language, 'cancelledRunLabel');
                  valueDisplay = formatTime(record.value);
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
  const { setView, leaderboard, fetchLeaderboard, currentUser, language, league, initLeague, getLeagueGap, getLeagueCountdown, login, randConfig, gameStartPending } = useStore();
  const [countdown, setCountdown] = useState('10:00');
  const [guestData, setGuestData] = useState<{ winners: import('./types').LeaderboardEntry[]; totalLeagues: number } | null>(null);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  useEffect(() => {
    const timer = setInterval(() => {
      initLeague(); // auto-refresh league records when the 10 minute window rolls over
      setCountdown(getLeagueCountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, [initLeague, getLeagueCountdown]);

  // Generate guest showcase data on mount if not logged in
  useEffect(() => {
    if (!currentUser) {
      setGuestData(generateGuestShowcase(randConfig));
    }
  }, [currentUser, randConfig]);

  const myEntry = leaderboard.find((entry) => entry.isCurrentUser);
  const gapMs = getLeagueGap();
  const gapFormatted = formatTime(gapMs);
  const focus = league ? getLeagueFocus(league) : null;
  const playHistory = currentUser?.gameHistory?.filter((entry) => entry.type === 'PLAY') ?? [];
  const latestPlay = playHistory[playHistory.length - 1] ?? null;
  const previousBest = playHistory.length > 1 ? Math.min(...playHistory.slice(0, -1).map((entry) => entry.value)) : null;
  const bestTime = currentUser?.bestTime ?? myEntry?.time ?? null;
  const leagueFirstTime = leaderboard.find((entry) => !entry.banned)?.time ?? league?.entries.find((entry) => !entry.banned)?.time ?? null;
  const latestIsCurrentBest = Boolean(latestPlay && bestTime !== null && latestPlay.value === bestTime);
  const improvementMs = latestIsCurrentBest && previousBest !== null ? Math.max(0, previousBest - latestPlay!.value) : 0;
  const improvementRate = previousBest ? improvementMs / Math.max(previousBest, 1) : 0;
  const globalWinChance = Math.min(0.9, Math.max(0.05, improvementRate * 3.2));
  const globalWindowActive = Boolean(league && latestPlay && Date.parse(latestPlay.date) > league.lastRefresh);
  const userCanLeadGlobal = Boolean(bestTime !== null && leagueFirstTime !== null && bestTime <= leagueFirstTime);
  const userIsGlobalChampion = Boolean(
    currentUser &&
    bestTime !== null &&
    userCanLeadGlobal &&
    latestIsCurrentBest &&
    globalWindowActive &&
    stableUnit(`${currentUser.id}:${latestPlay?.date}:${bestTime}`) < globalWinChance,
  );
  const globalBaseline = leagueFirstTime ?? bestTime;
  const globalChampion = userIsGlobalChampion && currentUser && bestTime !== null
    ? {
      nickname: currentUser.nickname,
      country: currentUser.country,
      avatarUrl: currentUser.avatarUrl,
      time: bestTime,
      isCurrentUser: true,
    }
    : {
      nickname: 'GlobalStage_001',
      country: 'KR',
      avatarUrl: generateAvatarUrl('global-stage-001', 'GlobalStage_001'),
      time: globalBaseline ? Math.max(1000, globalBaseline - Math.min(3000, Math.max(600, Math.round(globalBaseline * 0.12)))) : 22800,
      isCurrentUser: false,
    };

  // Guest view
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
                <p className="text-white/40 text-[10px]">{t(language, 'guestLeagueLabel')} · {entry.leagueLabel}</p>
              </div>
              <p className="font-mono text-[#00FFFF] text-sm">{formatTime(entry.time)}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="sticky bottom-0 p-4 bg-[#1A0B2E] border-t border-[#FF0080]/30 text-center space-y-3">
          <p className="text-white/70 text-sm">{t(language, 'guestLeagueCta')}</p>
          <button
            onClick={() => { vibrate(); login().then((success) => { if (success) setView('HOME'); }); }}
            className="w-full bg-gradient-to-r from-[#FF0080] to-[#FF6B00] text-white font-bold py-3 rounded-lg btn-squishy text-lg"
          >
            {t(language, 'guestLeagueBtn')}
          </button>
        </div>
      </div>
    );
  }

  // Logged-in view
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
              {t(language, 'leagueInfo', { leagueNum: league.displayName || league.leagueId, players: String(league.leagueSize), totalLeagues: String(league.totalLeagues) })}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-white/50 text-[10px]">{t(language, 'leagueSyncNotice')}</span>
            <span className="text-white/30 text-[10px]">·</span>
            <span className="text-white/50 text-[10px]">{t(language, 'nextSync', { time: countdown })}</span>
          </div>
        </div>
      )}

      <div className="mx-4 mt-3 rounded-2xl border border-[#FFD700]/60 bg-gradient-to-br from-[#FFD700]/20 via-[#FF0080]/15 to-[#00FFFF]/10 p-4 shadow-[0_0_24px_rgba(255,215,0,0.15)]">
        <p className="text-[#FFE082] text-[11px] font-black tracking-[0.2em] mb-3">{t(language, 'globalChampionTitle')}</p>
        <div className="flex items-center gap-3">
          <div className="text-2xl">🏆</div>
          <img src={globalChampion.avatarUrl} alt={globalChampion.nickname} className="w-10 h-10 rounded-full border border-[#FFD700]/70" />
          <div className="flex-1 text-left min-w-0">
            <p className={`font-black truncate ${globalChampion.isCurrentUser ? 'text-[#FFD700]' : 'text-white'}`}>{globalChampion.nickname}</p>
            <p className="text-white/45 text-xs">{getCountryFlag(globalChampion.country)} {globalChampion.isCurrentUser ? t(language, 'globalChampionYou') : t(language, 'globalChampionHint')}</p>
          </div>
          <p className="font-mono text-[#00FFFF] text-sm font-bold">{formatTime(globalChampion.time)}</p>
        </div>
      </div>

      {/* No record state - show CTA */}
      {myEntry === undefined && (
        <div className="mx-4 mt-3 rounded-lg bg-gradient-to-r from-[#00FFFF]/20 to-[#FF0080]/20 border border-[#00FFFF]/30 p-4 text-center space-y-3">
          <p className="text-white text-lg font-bold">{t(language, 'noRecordYet')}</p>
          <p className="text-white/50 text-xs">{t(language, 'overallPrize')} · {t(language, 'leaguePrize')}</p>
          <button onClick={async () => {
            vibrate();
            const result = await requestGameStart(onShowHearts);
            if (result === 'started') {
              setView('GAME');
            }
          }} disabled={gameStartPending} className="w-full bg-gradient-to-r from-[#FF0080] to-[#FF6B00] text-white font-bold py-3 rounded-lg btn-squishy text-lg disabled:cursor-wait disabled:opacity-70">
            {gameStartPending ? t(language, 'startingGame') : t(language, 'startGameCta')}
          </button>
        </div>
      )}

      {myEntry && focus && (
        <div className={`mx-4 mt-3 rounded-lg border p-3 text-center ${focus.mode === 'defend' ? 'bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border-emerald-400/30' : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30'}`}>
          <p className="text-white text-sm font-bold">
            {focus.mode === 'defend'
              ? t(language, 'leagueFocusDefend', { gap: formatTime(focus.gapMs) })
              : focus.mode === 'summit'
                ? t(language, 'leagueFocusFirst', { gap: gapFormatted })
                : t(language, 'leagueFocusRival', { name: focus.rivalName ?? t(language, 'unknownUser'), rank: String(focus.targetRank), gap: formatTime(focus.gapMs) })}
          </p>
          {focus.mode === 'rival' && focus.milestoneGapMs !== undefined && focus.milestoneRank !== undefined && (
            <p className="text-white/60 text-[11px] mt-1">
              {t(language, 'leagueFocusMilestone', { rank: String(focus.milestoneRank), gap: formatTime(focus.milestoneGapMs) })}
            </p>
          )}
          <div className="w-full bg-white/10 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${focus.mode === 'defend' ? 'bg-gradient-to-r from-emerald-300 to-cyan-400' : 'bg-gradient-to-r from-yellow-400 to-[#FF0080]'}`}
              style={{ width: `${focus.mode === 'defend' ? Math.min(100, Math.max(12, focus.gapMs / 40)) : Math.min(100, Math.max(12, 100 - (focus.gapMs / 180)))}%` }}
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
          <button onClick={async () => {
            vibrate();
            const result = await requestGameStart(onShowHearts);
            if (result === 'started') {
              setView('GAME');
            }
          }} disabled={gameStartPending} className="w-full bg-[#00FFFF] text-black font-bold py-3 rounded-lg btn-squishy disabled:cursor-wait disabled:opacity-70">
            {gameStartPending ? t(language, 'startingGame') : t(language, 'retry')}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── 관리자(Admin) 화면 컴포넌트 ──────────────────────────────────
// 로고를 3초 이상 길게 누르면 접근 가능한 숨겨진 화면.
// 통계 확인, 강제 데이터 초기화, 가짜 봇 생성, 공지사항 작성 등의 운영 기능을 담당합니다.
const SupportScreen = () => {
  const { setView, currentUser, language, login, showRewardToast } = useStore();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setEmail(currentUser?.email ?? '');
  }, [currentUser?.email]);

  const canSubmit = Boolean(currentUser && subject.trim() && message.trim() && /\S+@\S+\.\S+/.test(email.trim()));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) {
      void login();
      return;
    }
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await submitSupportTicket({ userId: currentUser.id, email, subject, message });
      setSubject('');
      setMessage('');
      showRewardToast(t(language, 'supportInquirySubmitted'));
    } catch (error) {
      console.error('[SupportScreen] Failed to submit support ticket:', error);
      showRewardToast(t(language, 'supportInquiryFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0D0518]">
      <div className="p-4 flex items-center gap-4 border-b border-white/10 bg-[#1A0B2E]">
        <button onClick={() => { vibrate(); setView('HOME'); }} className="text-white/70 hover:text-white btn-squishy"><ArrowLeft /></button>
        <h2 className="text-xl font-black text-white">{t(language, 'supportInquiryTitle')}</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 p-4 space-y-4">
        <p className="text-white/60 text-sm leading-relaxed">{t(language, 'supportInquiryDesc')}</p>
        {!currentUser && (
          <button type="button" onClick={() => { void login(); }} className="w-full rounded-xl bg-white text-black font-bold py-3 btn-squishy">
            {t(language, 'loginWithGoogle')}
          </button>
        )}
        <label className="block text-left">
          <span className="text-white/70 text-xs font-bold">{t(language, 'supportInquirySubject')}</span>
          <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} className="mt-1 w-full rounded-xl bg-white/5 border border-white/15 p-3 text-white outline-none focus:border-[#00FFFF]" />
        </label>
        <label className="block text-left">
          <span className="text-white/70 text-xs font-bold">{t(language, 'supportInquiryEmail')}</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} className="mt-1 w-full rounded-xl bg-white/5 border border-white/15 p-3 text-white outline-none focus:border-[#00FFFF]" />
        </label>
        <label className="block text-left">
          <span className="text-white/70 text-xs font-bold">{t(language, 'supportInquiryMessage')}</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} rows={8} className="mt-1 w-full rounded-xl bg-white/5 border border-white/15 p-3 text-white outline-none focus:border-[#00FFFF] resize-none" />
        </label>
        <button disabled={!canSubmit || submitting} className="w-full rounded-xl bg-[#00FFFF] text-black font-black py-3 btn-squishy disabled:opacity-40">
          {submitting ? t(language, 'loadingAdmin') : t(language, 'supportInquirySubmit')}
        </button>
      </form>
    </div>
  );
};

const AdminScreen = () => {
  const {
    setView, notice, setNotice,
    resetSeason, banUser, unbanUser, currentUser, editUserHeart,
    showNoticePopup, setShowNoticePopup, language,
    adminStats, adminUsers, fetchAdminData,
    botConfig, setBotConfig,
    adminLoading, adminShowAll, setAdminShowAll,
    adminLog, startAdminLiveStats, stopAdminLiveStats, showRewardToast, showConfirmDialog,
  } = useStore();

  useEffect(() => {
    if (currentUser?.role !== 'ADMIN') return undefined;
    fetchAdminData();
    startAdminLiveStats();
    return () => stopAdminLiveStats();
  }, [currentUser?.role, fetchAdminData, startAdminLiveStats, stopAdminLiveStats]);

  const [noticeDraft, setNoticeDraft] = useState(notice);
  const [heartDraft, setHeartDraft] = useState(3);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminSortBy, setAdminSortBy] = useState<'TIME' | 'HEARTS' | 'NEWEST'>('NEWEST');
  const [showBanned, setShowBanned] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportTicketsLoading, setSupportTicketsLoading] = useState(false);

  const [botMean, setBotMean] = useState(botConfig.mean / 1000);
  const [botStd, setBotStd] = useState(botConfig.stdDev / 1000);

  useEffect(() => {
    setBotMean(botConfig.mean / 1000);
    setBotStd(botConfig.stdDev / 1000);
  }, [botConfig.mean, botConfig.stdDev]);

  useEffect(() => {
    if (currentUser?.role !== 'ADMIN') return;
    setSupportTicketsLoading(true);
    getSupportTickets()
      .then(setSupportTickets)
      .catch((error) => console.error('[AdminScreen] Failed to fetch support tickets:', error))
      .finally(() => setSupportTicketsLoading(false));
  }, [currentUser?.role]);

  if (currentUser?.role !== 'ADMIN') {
    return <div className="flex-1 p-4 flex items-center justify-center text-white/50">{t(language, 'unauthorizedAccess')}</div>;
  }

  const riskWarning = adminUsers.some((entry) => typeof entry.time === 'number' && entry.time <= 1000);

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
        const d = resolveAdminUpdatedAt(u.updatedAt);
        if (!d) return false;
        return d.toISOString().slice(0, 10) === todayStr;
      } catch { return false; }
    }).length
    : 0;

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
          <span className="text-[10px] bg-[#FF0080]/20 text-[#FF0080] border border-[#FF0080] px-3 py-0.5 rounded-full font-bold shadow-[0_0_10px_rgba(255,0,128,0.3)] tracking-widest">{t(language, 'adminGodMode')}</span>
        </div>
        <button onClick={() => { vibrate(); fetchAdminData(); }} className="text-[#00FFFF] btn-squishy" aria-label={t(language, 'refreshData')} title={t(language, 'refreshData')}>
          <RefreshCw size={20} className={adminLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Loading Indicator (#8) */}
      {adminLoading && (
        <div className="flex items-center justify-center py-2">
          <div className="w-5 h-5 border-2 border-[#00FFFF] border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-white/50 text-xs">{t(language, 'loadingAdmin')}</span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label={t(language, 'dau')} value={String(dau)} icon={<Users />} color="text-[#00FFFF]" />
        <MetricCard label={t(language, 'adRevenueLabel')} value={`$${(adminStats?.adRevenue || 0).toFixed(2)}`} icon={<DollarSign />} color="text-green-400" />
        <MetricCard label={t(language, 'globalHearts')} value={String(adminStats?.totalHeartsUsed || 0)} icon={<Play />} color="text-[#FF0080]" />
        <MetricCard label={t(language, 'riskMeter')} value={riskWarning ? t(language, 'warning') : t(language, 'normal')} icon={<ShieldAlert />} color={riskWarning ? 'text-red-400' : 'text-[#00FFFF]'} />
      </div>

      {/* User Stats Summary (#9) */}
      <div className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2 text-xs text-white/70 border border-white/5">
        <span>{t(language, 'totalLabel')} <strong className="text-white">{totalUsers}</strong></span>
        <span>{t(language, 'activeLabel')} <strong className="text-green-400">{activeUsers}</strong></span>
        <span>{t(language, 'bannedLabel')} <strong className="text-red-400">{bannedUsers}</strong></span>
      </div>

      <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-white font-semibold flex items-center gap-2"><MessageSquare size={16} /> {t(language, 'supportTicketsTitle')}</p>
          <button
            onClick={() => {
              setSupportTicketsLoading(true);
              getSupportTickets()
                .then(setSupportTickets)
                .catch((error) => console.error('[AdminScreen] Failed to fetch support tickets:', error))
                .finally(() => setSupportTicketsLoading(false));
            }}
            className="text-[#00FFFF] text-xs btn-squishy"
          >
            {supportTicketsLoading ? t(language, 'loadingAdmin') : t(language, 'refresh')}
          </button>
        </div>
        {supportTickets.length === 0 ? (
          <p className="text-white/40 text-xs">{t(language, 'supportTicketsEmpty')}</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {supportTickets.slice(0, 20).map((ticket) => {
              const created = resolveAdminUpdatedAt(ticket.createdAt);
              return (
                <div key={ticket.id} className="rounded-lg border border-white/10 bg-black/25 p-3 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-white font-bold text-sm">{ticket.subject}</p>
                    <span className="text-[10px] text-[#00FFFF]">{created ? created.toLocaleString() : '-'}</span>
                  </div>
                  <a href={`mailto:${ticket.email}`} className="mt-1 inline-flex items-center gap-1 text-[#FFE082] text-xs underline">
                    <Mail size={12} /> {ticket.email}
                  </a>
                  <p className="mt-2 text-white/65 text-xs whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Season + Bots */}
      <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10 space-y-3">
        <button
          onClick={() => {
            vibrate();
            showConfirmDialog({
              title: t(language, 'resetSeasonBtn'),
              message: t(language, 'resetSeasonConfirm'),
              confirmLabel: t(language, 'resetSeasonBtn'),
              cancelLabel: t(language, 'closeModal'),
              tone: 'danger',
              onConfirm: () => resetSeason(),
            });
          }}
          className="w-full bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg py-2 flex items-center justify-center gap-2 btn-squishy"
        >
          <Trash2 size={16} /> {t(language, 'resetSeasonBtn')}
        </button>

        <div className="pt-2 border-t border-white/10">
          <p className="text-[#00FFFF] font-semibold mb-2 text-sm flex items-center gap-1">{t(language, 'botSettingsTitle')}</p>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-white/70 text-xs w-20">{t(language, 'meanTimeLabel')}</label>
            <input type="number" min="10" max="180" step="1" value={botMean} onChange={e => setBotMean(Number(e.target.value))} className="flex-1 bg-black/30 border border-white/20 text-white rounded px-2 py-1 text-sm outline-none focus:border-[#00FFFF]" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-white/70 text-xs w-20">{t(language, 'stdDevLabel')}</label>
            <input type="number" min="1" max="100" step="1" value={botStd} onChange={e => setBotStd(Number(e.target.value))} className="flex-1 bg-black/30 border border-white/20 text-white rounded px-2 py-1 text-sm outline-none focus:border-[#00FFFF]" />
          </div>
          <button onClick={() => { vibrate(); setBotConfig({ mean: botMean * 1000, stdDev: botStd * 1000 }); showRewardToast(t(language, 'botConfigSaved')); }} className="w-full bg-[#00FFFF]/20 border border-[#00FFFF]/40 text-[#00FFFF] rounded py-1.5 text-sm font-bold btn-squishy mt-1 hover:bg-[#00FFFF]/30">
            {t(language, 'applyBtn')}
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
              placeholder={t(language, 'searchPlaceholder')}
              value={adminSearchQuery}
              onChange={e => setAdminSearchQuery(e.target.value)}
              className="w-24 bg-black/30 border border-white/20 text-white/70 text-xs rounded px-2 outline-none"
            />
            <select value={adminSortBy} onChange={(e) => setAdminSortBy(e.target.value as 'TIME' | 'HEARTS' | 'NEWEST')} className="bg-black/30 border border-white/20 text-white/70 text-xs rounded p-1 outline-none">
              <option value="NEWEST">{t(language, 'sortNewest')}</option>
              <option value="TIME">{t(language, 'sortBestTime')}</option>
              <option value="HEARTS">{t(language, 'sortMostHearts')}</option>
            </select>
          </div>
        </div>

        {/* Filter toggles + Export */}
        <div className="flex items-center gap-3 text-[10px]">
          <label className="flex items-center gap-1 text-white/50 cursor-pointer">
            <input type="checkbox" checked={showBanned} onChange={e => setShowBanned(e.target.checked)} className="accent-red-500" />
            {t(language, 'showBanned')}
          </label>
          <button onClick={() => { vibrate(); handleExportCSV(); }} className="ml-auto text-[#00FFFF] border border-[#00FFFF]/30 px-2 py-0.5 rounded btn-squishy hover:bg-[#00FFFF]/10">
            {t(language, 'exportCsv')}
          </button>
        </div>

        {(() => {
          type AdminListEntry = {
            id: string;
            banned?: boolean;
            time?: number;
            hearts?: number;
            updatedAt?: { toMillis?: () => number; toDate?: () => Date } | string | number | Date;
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

          const sortedUsers = [...adminUsers as AdminListEntry[]].filter(u => {
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
                <p className="text-sm">{t(language, 'noUsersFound')}</p>
              </div>
            );
          }

          const displayLimit = adminShowAll ? sortedUsers.length : 20;

          return (
            <>
              {sortedUsers.slice(0, displayLimit).map((entry) => {
                const isSelected = selectedUserId === entry.id;
                const lastLoginMs = getUpdatedAtMs(entry.updatedAt);
                const lastLogin = lastLoginMs > 0 ? new Date(lastLoginMs).toLocaleString() : '-';
                const history = Array.isArray(entry.gameHistory) ? entry.gameHistory : [];
                const playHistoryCount = history.filter((h) => h.type === 'PLAY').length;
                const adRevenueApprox = history.filter((h) => h.type === 'AD').reduce((acc, val) => acc + (val.value > 0 ? 0.35 : 0), 0).toFixed(2);

                return (
                  <div key={entry.id} className={`flex flex-col bg-black/20 p-2 rounded transition-all ${isSelected ? 'ring-1 ring-[#00FFFF]' : ''} ${entry.banned ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setSelectedUserId(isSelected ? null : entry.id)}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <img src={entry.avatarUrl || generateAvatarUrl(entry.id, entry.nickname || '?')} width="40" height="40" className="w-8 h-8 rounded-full flex-shrink-0 border border-white/10" />
                        <div className="min-w-0">
                          <p className="text-white text-sm truncate font-bold">{entry.nickname || t(language, 'unknownUser')}</p>
                          <div className="flex items-center gap-2 text-white/50 text-[10px]">
                            <span>{getCountryFlag(entry.country || 'ZZ')}</span>
                            {entry.time && <span className="text-[#00FFFF] font-mono">{formatTime(entry.time)}</span>}
                            {entry.hearts !== undefined && <span className="text-[#FF0080]">❤️ {entry.hearts}</span>}
                            <span className="text-yellow-500">{entry.role === 'ADMIN' ? t(language, 'adminRole') : ''}</span>
                            {entry.banned && <span className="text-red-400">{t(language, 'bannedRole')}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {currentUser?.id !== entry.id && !entry.banned && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              vibrate();
                              showConfirmDialog({
                                title: t(language, 'banBtn'),
                                message: t(language, 'banConfirm', { name: entry.nickname || entry.id }),
                                confirmLabel: t(language, 'banBtn'),
                                cancelLabel: t(language, 'closeModal'),
                                tone: 'danger',
                                onConfirm: () => banUser(entry.id),
                              });
                            }}
                            className="bg-red-500/20 text-red-500 border border-red-500/50 text-xs px-2 py-1 rounded btn-squishy"
                          >
                            {t(language, 'banBtn')}
                          </button>
                        )}
                        {currentUser?.id !== entry.id && entry.banned && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              vibrate();
                              showConfirmDialog({
                                title: t(language, 'unbanBtn'),
                                message: t(language, 'unbanConfirm', { name: entry.nickname || entry.id }),
                                confirmLabel: t(language, 'unbanBtn'),
                                cancelLabel: t(language, 'closeModal'),
                                tone: 'default',
                                onConfirm: () => unbanUser(entry.id),
                              });
                            }}
                            className="bg-green-500/20 text-green-400 border border-green-500/50 text-xs px-2 py-1 rounded btn-squishy"
                          >
                            {t(language, 'unbanBtn')}
                          </button>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/70 space-y-1 bg-black/40 p-3 rounded-lg">
                        <p><strong className="text-white/90">{t(language, 'emailLabel')}</strong> {entry.email || '-'}</p>
                        <p><strong className="text-white/90">{t(language, 'lastLoginLabel')}</strong> {lastLogin}</p>
                        <p><strong className="text-white/90">{t(language, 'countryRegionLabel')}</strong> {entry.country || '-'} {getCountryFlag(entry.country || 'ZZ')}</p>
                        <p><strong className="text-white/90">{t(language, 'totalGamesPlayed')}</strong> {playHistoryCount} {t(language, 'timesUnit')}</p>
                        <p><strong className="text-white/90">{t(language, 'estAdRevenue')}</strong> ${adRevenueApprox}</p>
                        <p><strong className="text-white/90">{t(language, 'referralCodeLabel')}</strong> {entry.referralCode || '-'}</p>
                        {entry.referredBy && <p><strong className="text-white/90">{t(language, 'referredByLabel')}</strong> {entry.referredBy}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
              {sortedUsers.length > 20 && (
                <button onClick={() => { vibrate(); setAdminShowAll(!adminShowAll); }} className="w-full text-center text-[#00FFFF] text-xs py-2 border border-[#00FFFF]/20 rounded mt-2 btn-squishy hover:bg-[#00FFFF]/10">
                  {adminShowAll ? t(language, 'showLess', { count: '20' }) : t(language, 'loadAll', { count: String(sortedUsers.length) })}
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
          {t(language, 'adminLogTitle', { count: String(adminLog.length) })}
          <span className="text-white/40 text-xs">{showLog ? '▲' : '▼'}</span>
        </button>
        {showLog && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {adminLog.length === 0 ? (
              <p className="text-white/30 text-xs">{t(language, 'noAdminActions')}</p>
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

      {/* Game Play Records Section */}
      <GameplayRecordsPanel adminUsers={adminUsers} />

      {/* Ad Config Section */}
      <AdConfigPanel />

      {/* Random Algorithm Control Panel */}
      <RandomAlgorithmPanel />
    </div>
  );
};


// Game play records admin panel
const GameplayRecordsPanel = ({ adminUsers }: { adminUsers: AdminUserRow[] }) => {
  const { language } = useStore();
  const [gpOpen, setGpOpen] = useState(true);
  const [gpSearch, setGpSearch] = useState('');
  const [gpSort, setGpSort] = useState<'BEST_TIME' | 'MOST_GAMES' | 'RECENT'>('RECENT');
  const [gpExpandedUser, setGpExpandedUser] = useState<string | null>(null);

  // Filter to real users with actual gameHistory entries (bots don't have real game history)
  const realUsers = adminUsers.filter(u => {
    if (!Array.isArray(u.gameHistory) || u.gameHistory.length === 0) return false;
    // Must have at least 1 PLAY entry to be considered a real player
    return u.gameHistory.some(h => h.type === 'PLAY');
  });

  const filtered = realUsers.filter(u => {
    if (!gpSearch) return true;
    const q = gpSearch.toLowerCase();
    return (u.nickname || '').toLowerCase().includes(q)
      || (u.email || '').toLowerCase().includes(q)
      || u.id.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (gpSort === 'BEST_TIME') {
      return (a.time ?? Infinity) - (b.time ?? Infinity);
    }
    if (gpSort === 'MOST_GAMES') {
      const aGames = (a.gameHistory || []).filter(h => h.type === 'PLAY').length;
      const bGames = (b.gameHistory || []).filter(h => h.type === 'PLAY').length;
      return bGames - aGames;
    }
    // RECENT
    const getMs = (u: AdminUserRow) => {
      const h = (u.gameHistory || []);
      if (h.length === 0) return 0;
      const lastDate = h[h.length - 1].date;
      return lastDate ? new Date(lastDate).getTime() : 0;
    };
    return getMs(b) - getMs(a);
  });

  const eventIcon = (type: string) => {
    switch (type) {
      case 'PLAY': return '🎮';
      case 'AD': return '📺';
      case 'DAILY': return '🎁';
      case 'REFERRAL': return '🤝';
      case 'PENALTY': return '⚠️';
      case 'CANCELLED': return '⛔';
      default: return '📝';
    }
  };

  const eventColor = (type: string) => {
    switch (type) {
      case 'PLAY': return 'text-[#00FFFF]';
      case 'AD': return 'text-green-400';
      case 'DAILY': return 'text-yellow-400';
      case 'REFERRAL': return 'text-purple-400';
      case 'PENALTY': return 'text-red-400';
      default: return 'text-white/50';
    }
  };

  return (
    <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10 space-y-3">
      <button onClick={() => setGpOpen(!gpOpen)} className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎮</span>
          <div>
            <h3 className="text-white font-bold text-sm text-left">{t(language, 'gamePlayRecords')}</h3>
            <p className="text-white/40 text-[10px] text-left">{t(language, 'realUserRecords', { count: String(sorted.length) })}</p>
          </div>
        </div>
        <span className="text-white/40 text-xs">{gpOpen ? '▲' : '▼'}</span>
      </button>

      {gpOpen && (
        <div className="space-y-3 pt-2 border-t border-white/10">
          {/* Controls */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t(language, 'searchPlaceholder')}
              value={gpSearch}
              onChange={e => setGpSearch(e.target.value)}
              className="flex-1 bg-black/30 border border-white/20 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-[#00FFFF]"
            />
            <select
              value={gpSort}
              onChange={e => setGpSort(e.target.value as typeof gpSort)}
              className="bg-black/30 border border-white/20 text-white/70 text-xs rounded px-2 py-1.5 outline-none"
            >
              <option value="RECENT">{t(language, 'recentActivity')}</option>
              <option value="BEST_TIME">{t(language, 'bestTimeSort')}</option>
              <option value="MOST_GAMES">{t(language, 'gamesSort')}</option>
            </select>
          </div>

          {sorted.length === 0 ? (
            <div className="text-center py-6 text-white/30 text-sm">
              <p>{t(language, 'noRealUserRecords')}</p>
              <p className="text-[10px] mt-1">{t(language, 'realUserRecordsDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {sorted.map(user => {
                const history = user.gameHistory || [];
                const playEvents = history.filter(h => h.type === 'PLAY');
                const adEvents = history.filter(h => h.type === 'AD');
                const bestPlayTime = playEvents.length > 0
                  ? Math.min(...playEvents.map(h => h.value))
                  : null;
                const isExpanded = gpExpandedUser === user.id;

                return (
                  <div key={user.id} className={`bg-black/30 rounded-lg border ${isExpanded ? 'border-[#00FFFF]/40' : 'border-white/5'} overflow-hidden`}>
                    {/* Summary Row */}
                    <div
                      className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => setGpExpandedUser(isExpanded ? null : user.id)}
                    >
                      <img
                        src={user.avatarUrl || generateAvatarUrl(user.id, user.nickname || '?')}
                        className="w-8 h-8 rounded-full border border-white/10 flex-shrink-0"
                        alt=""
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold truncate">{user.nickname || t(language, 'unknownUser')}</p>
                        <div className="flex items-center gap-2 text-[10px] text-white/50">
                          <span>{getCountryFlag(user.country || 'ZZ')}</span>
                          {bestPlayTime && <span className="text-[#00FFFF] font-mono">{formatTime(bestPlayTime)}</span>}
                          <span>🎮 {playEvents.length}</span>
                          <span>📺 {adEvents.length}</span>
                          {user.banned && <span className="text-red-400">{t(language, 'bannedRole')}</span>}
                        </div>
                      </div>
                      <span className="text-white/30 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    {/* Expanded: Full Game History Timeline */}
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-white/5">
                        {/* Stats Summary */}
                        <div className="grid grid-cols-3 gap-2 py-2 text-center">
                          <div className="bg-black/40 rounded-lg p-2">
                            <p className="text-[#00FFFF] font-mono text-sm font-bold">{bestPlayTime ? formatTime(bestPlayTime) : '-'}</p>
                            <p className="text-white/40 text-[9px]">{t(language, 'bestTimeLabel')}</p>
                          </div>
                          <div className="bg-black/40 rounded-lg p-2">
                            <p className="text-white font-bold text-sm">{playEvents.length}</p>
                            <p className="text-white/40 text-[9px]">{t(language, 'gamesLabel')}</p>
                          </div>
                          <div className="bg-black/40 rounded-lg p-2">
                            <p className="text-green-400 font-bold text-sm">${(adEvents.length * 0.35).toFixed(2)}</p>
                            <p className="text-white/40 text-[9px]">{t(language, 'adRevEst')}</p>
                          </div>
                        </div>

                        {/* Email + Info */}
                        <p className="text-white/40 text-[10px] mb-2">
                          📧 {user.email || 'N/A'} &nbsp;|&nbsp; ❤️ {user.hearts ?? 0} hearts
                        </p>

                        {/* Timeline */}
                        <div className="space-y-0.5 max-h-52 overflow-y-auto">
                          <p className="text-white/50 text-[10px] font-bold mb-1 sticky top-0 bg-[#1A0B2E] py-1">{t(language, 'gameHistoryTitle', { count: String(history.length) })}</p>
                          {[...history].reverse().slice(0, 50).map((event, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] py-0.5">
                              <span>{eventIcon(event.type)}</span>
                              <span className={`font-bold w-14 ${eventColor(event.type)}`}>{event.type}</span>
                              <span className="text-white/70 font-mono">
                                {event.type === 'PLAY' ? formatTime(event.value) : `+${event.value} ❤️`}
                              </span>
                              <span className="text-white/30 ml-auto text-[9px]">
                                {event.date ? new Date(event.date).toLocaleString() : '-'}
                              </span>
                            </div>
                          ))}
                          {history.length > 50 && (
                            <p className="text-white/30 text-[9px] text-center py-1">{t(language, 'moreEvents', { count: String(history.length - 50) })}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Ad config admin panel

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
        <p className="text-white font-semibold">{t(language, 'adConfigTitle')}</p>
      </div>

      <Toggle
        label={t(language, 'rewardedVideoToggle')}
        enabled={adConfig.rewardedVideo}
        onToggle={() => setAdConfig({ rewardedVideo: !adConfig.rewardedVideo })}
      />
      {adConfig.rewardedVideo && (
        <div className="space-y-2 pl-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-xs">{t(language, 'heartPerVideo')}</span>
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
            <span className="text-white/50 text-xs">{t(language, 'videosPerHeartLabel')}</span>
            <select
              value={adConfig.videosPerHeart}
              onChange={(e) => setAdConfig({ videosPerHeart: Number(e.target.value) })}
              className="bg-black/30 text-white rounded px-2 py-1 text-xs"
            >
              <option value={1}>{t(language, 'videosCount1')}</option>
              <option value={2}>{t(language, 'videosCount2')}</option>
              <option value={3}>{t(language, 'videosCount3')}</option>
              <option value={4}>{t(language, 'videosCount4')}</option>
              <option value={5}>{t(language, 'videosCount5')}</option>
            </select>
          </div>
        </div>
      )}

      <Toggle
        label={t(language, 'interstitialToggle')}
        enabled={adConfig.interstitial}
        onToggle={() => setAdConfig({ interstitial: !adConfig.interstitial })}
      />

      <div className="pt-2 border-t border-white/10">
        <p className="text-white/40 text-[10px]">{t(language, 'applixirRewardFlowTip')}</p>
      </div>
    </div>
  );
};

// Random algorithm admin panel
// 앱 전체의 난수 생성 로직을 관리자가 실시간으로 조정할 수 있는 통합 패널.
// 리그 봇 성능, 리그 크기, 총 리그 수 표시, 추월 타이밍, 게스트 쇼케이스 기록,
// 활동 티커 기록 범위, 피드 갱신 항목 수 등 모든 핵심 파라미터를 제어합니다.
const RandomAlgorithmPanel = () => {
  const { randConfig, setRandConfig, language } = useStore();
  const [draft, setDraft] = React.useState(randConfig);
  const [saved, setSaved] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<string | null>('BOT');

  // Sync draft if external change
  React.useEffect(() => { setDraft(randConfig); }, [randConfig]);

  const patch = (partial: Partial<typeof draft>) => setDraft(prev => ({ ...prev, ...partial }));

  const handleSave = () => {
    setRandConfig(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    vibrate();
  };

  const handleReset = () => {
    const defaults = {
      botTimeMean: 50000, botTimeStdDev: 15000,
      leagueSizeMin: 60, leagueSizeMax: 99,
      totalLeaguesMean: 3624, totalLeaguesStdDev: 15,
      overtakeGapMin: 100, overtakeGapMax: 500,
      showcaseTimeMean: 8000, showcaseTimeStdDev: 2000,
      tickerTimeMin: 24.0, tickerTimeMax: 42.0,
      feedBatchSize: 3, totalLeaguesFloor: 3500,
    };
    setDraft(defaults as typeof draft);
    vibrate();
  };

  // Gaussian bell curve mini preview via CSS gradient
  const bellWidth = (std: number, maxStd: number) => Math.max(15, Math.min(95, (std / maxStd) * 95));

  const SectionHeader = ({ id, icon, label, sub }: { id: string; icon: string; label: string; sub: string }) => (
    <button
      onClick={() => { vibrate(); setActiveSection(prev => prev === id ? null : id); }}
      className="w-full flex items-center justify-between py-2 text-left"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="text-white font-semibold text-sm">{label}</p>
          <p className="text-white/40 text-[10px]">{sub}</p>
        </div>
      </div>
      <span className="text-white/40 text-xs">{activeSection === id ? '▲' : '▼'}</span>
    </button>
  );

  const FieldRow = ({ label, unit, value, min, max, step, onChange, desc }: {
    label: string; unit: string; value: number; min: number; max: number; step: number;
    onChange: (v: number) => void; desc?: string;
  }) => (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white/70 text-xs">{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number" min={min} max={max} step={step} value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="w-20 bg-black/40 border border-white/20 text-white text-xs rounded px-2 py-1 outline-none focus:border-[#00FFFF] text-right"
          />
          <span className="text-white/40 text-[10px]">{unit}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full accent-[#00FFFF] cursor-pointer"
      />
      {desc && <p className="text-white/25 text-[9px] mt-0.5 leading-tight">{desc}</p>}
    </div>
  );

  const GaussianPreview = ({ mean, std, unit, minVal, maxVal }: { mean: number; std: number; unit: string; minVal: number; maxVal: number }) => {
    const range = maxVal - minVal;
    const meanPct = ((mean - minVal) / range) * 100;
    const stdPct = (std / range) * 100;
    const left = Math.max(0, meanPct - stdPct);
    const right = Math.max(0, 100 - (meanPct + stdPct));
    return (
      <div className="mt-2 mb-4">
        <div className="flex justify-between text-[9px] text-white/30 mb-1">
          <span>{(minVal).toFixed(0)}{unit}</span>
          <span className="text-[#00FFFF]">μ={mean}{unit} σ={std}{unit}</span>
          <span>{(maxVal).toFixed(0)}{unit}</span>
        </div>
        <div className="relative h-6 bg-white/5 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 bg-gradient-to-r from-transparent via-[#00FFFF]/40 to-transparent rounded-full transition-all duration-300"
            style={{ left: `${left}%`, right: `${Math.max(0, right)}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#FF0080]"
            style={{ left: `${Math.max(1, Math.min(99, meanPct))}%` }}
          />
        </div>
        <p className="text-white/30 text-[9px] mt-0.5 text-center">{t(language, 'bellCurveDesc')}</p>
      </div>
    );
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(randConfig);

  return (
    <div className="bg-[#1A0B2E] rounded-xl p-4 border border-[#00FFFF]/20 space-y-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[#FF0080]">🎲</span>
          <div>
            <p className="text-white font-bold text-sm">{t(language, 'randomAlgorithmTitle')}</p>
            <p className="text-white/40 text-[10px]">{t(language, 'randomAlgorithmDesc')}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={handleReset} className="text-[10px] text-white/40 border border-white/10 rounded px-2 py-1 hover:text-white btn-squishy">{t(language, 'resetBtn')}</button>
          <button
            onClick={handleSave}
            className={`text-[10px] font-bold rounded px-3 py-1 btn-squishy transition-all ${saved ? 'bg-green-500/30 text-green-400 border border-green-500/40' : isDirty ? 'bg-[#00FFFF]/20 text-[#00FFFF] border border-[#00FFFF]/40 animate-pulse' : 'bg-white/5 text-white/30 border border-white/10'}`}
          >
            {saved ? t(language, 'savedToast') : isDirty ? t(language, 'applyBtnStore') : t(language, 'savedToast').replace(/^✓\s*/, '')}
          </button>
        </div>
      </div>

      {isDirty && (
        <div className="text-[10px] text-yellow-400/80 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1 mb-2">
          {t(language, 'unsavedChanges')}
        </div>
      )}

      {/* Section 1: Bot performance distribution */}
      <div className="border-b border-white/10 pb-2">
        <SectionHeader id="BOT" icon="🤖" label={t(language, 'botPerformanceDist')} sub={t(language, 'botPerformanceDistDesc')} />
        {activeSection === 'BOT' && (
          <div className="pt-2">
            <GaussianPreview mean={Math.round(draft.botTimeMean / 1000)} std={Math.round(draft.botTimeStdDev / 1000)} unit="s" minVal={5} maxVal={180} />
            <FieldRow
              label={t(language, 'meanTimeGaussian')} unit="ms"
              value={draft.botTimeMean} min={5000} max={180000} step={1000}
              onChange={v => patch({ botTimeMean: v })}
              desc={t(language, 'meanTimeGaussianDesc')}
            />
            <FieldRow
              label={t(language, 'stdDevGaussian')} unit="ms"
              value={draft.botTimeStdDev} min={500} max={60000} step={500}
              onChange={v => patch({ botTimeStdDev: v })}
              desc={t(language, 'stdDevGaussianDesc')}
            />
            <div className="text-[10px] text-white/30 bg-black/20 rounded p-2 mt-1">
              <p>{t(language, 'hardCapDesc')}</p>
              <p>{t(language, 'competitionIntensity', { min: String(Math.max(5, Math.round((draft.botTimeMean - 2 * draft.botTimeStdDev) / 100) / 10)), max: String(Math.round((draft.botTimeMean + 2 * draft.botTimeStdDev) / 100) / 10) })}</p>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: League size */}
      <div className="border-b border-white/10 pb-2">
        <SectionHeader id="LEAGUE_SIZE" icon="👥" label={t(language, 'leagueSizeRange')} sub={t(language, 'leagueSizeRangeDesc')} />
        {activeSection === 'LEAGUE_SIZE' && (
          <div className="pt-2">
            <FieldRow
              label="최소 인원 (Min Players)" unit="명"
              value={draft.leagueSizeMin} min={10} max={98} step={1}
              onChange={v => patch({ leagueSizeMin: Math.min(v, draft.leagueSizeMax - 1) })}
              desc="이 수 이상의 합성 플레이어가 항상 배정됩니다. 너무 낮으면 과소 경쟁, 너무 높으면 밀집 경쟁이 됩니다."
            />
            <FieldRow
              label="최대 인원 (Max Players)" unit="명"
              value={draft.leagueSizeMax} min={draft.leagueSizeMin + 1} max={200} step={1}
              onChange={v => patch({ leagueSizeMax: Math.max(v, draft.leagueSizeMin + 1) })}
              desc="해시 기반으로 사용자마다 고정 인원이 배정됩니다. 새로고침해도 구성원 수는 바뀌지 않습니다."
            />
            <div className="text-[10px] text-white/30 bg-black/20 rounded p-2 mt-1">
              <p>{t(language, 'currentRangeDesc', { min: String(draft.leagueSizeMin), max: String(draft.leagueSizeMax), count: String(draft.leagueSizeMax - draft.leagueSizeMin + 1) })}</p>
              <p>{t(language, 'baselineDesc')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Total leagues display */}
      <div className="border-b border-white/10 pb-2">
        <SectionHeader id="TOTAL_LEAGUES" icon="🌐" label={t(language, 'totalLeaguesCounter')} sub={t(language, 'totalLeaguesCounterDesc')} />
        {activeSection === 'TOTAL_LEAGUES' && (
          <div className="pt-2">
            <GaussianPreview mean={draft.totalLeaguesMean} std={draft.totalLeaguesStdDev} unit="" minVal={draft.totalLeaguesMean - 100} maxVal={draft.totalLeaguesMean + 100} />
            <FieldRow
              label="평균 리그 수 μ" unit="개"
              value={draft.totalLeaguesMean} min={100} max={99999} step={100}
              onChange={v => patch({ totalLeaguesMean: v })}
              desc="UI에 표시되는 '전 세계 X개 리그' 숫자의 평균값입니다. 높을수록 규모감이 커집니다."
            />
            <FieldRow
              label="표준편차 σ" unit="개"
              value={draft.totalLeaguesStdDev} min={1} max={500} step={5}
              onChange={v => patch({ totalLeaguesStdDev: v })}
              desc="접속할 때마다 보이는 숫자에 랜덤 변동을 줍니다. 너무 크면 신뢰를 해칠 수 있습니다."
            />
            <FieldRow
              label="최소 표시 하한선 (Floor)" unit="개"
              value={draft.totalLeaguesFloor} min={100} max={draft.totalLeaguesMean} step={100}
              onChange={v => patch({ totalLeaguesFloor: v })}
              desc="분포 하단에서도 최소 이 숫자 이상은 표시됩니다. 너무 적어 보이는 인상을 막습니다."
            />
            <div className="text-[10px] text-white/30 bg-black/20 rounded p-2 mt-1">
              <p>{t(language, 'expectedRangeDesc', { min: String(Math.max(draft.totalLeaguesFloor, draft.totalLeaguesMean - 2 * draft.totalLeaguesStdDev)), max: String(draft.totalLeaguesMean + 2 * draft.totalLeaguesStdDev) })}</p>
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Overtake timing */}
      <div className="border-b border-white/10 pb-2">
        <SectionHeader id="OVERTAKE" icon="🏁" label={t(language, 'botOvertakeTiming')} sub={t(language, 'botOvertakeTimingDesc')} />
        {activeSection === 'OVERTAKE' && (
          <div className="pt-2">
            <FieldRow
              label="추월 간격 최솟값" unit="ms"
              value={draft.overtakeGapMin} min={10} max={draft.overtakeGapMax - 10} step={10}
              onChange={v => patch({ overtakeGapMin: Math.min(v, draft.overtakeGapMax - 10) })}
              desc="봇이 유저보다 최소 이만큼 앞서며 1위를 빼앗는 간격입니다."
            />
            <FieldRow
              label="추월 간격 최댓값" unit="ms"
              value={draft.overtakeGapMax} min={draft.overtakeGapMin + 10} max={10000} step={50}
              onChange={v => patch({ overtakeGapMax: Math.max(v, draft.overtakeGapMin + 10) })}
              desc="봇이 최대 이만큼까지 앞서며 추월합니다. 너무 크면 박탈감이 커질 수 있습니다."
            />
            <div className="text-[10px] text-white/30 bg-black/20 rounded p-2 mt-1">
              <p>{t(language, 'overtakeGapUniformDesc', { min: String(draft.overtakeGapMin), max: String(draft.overtakeGapMax) })}</p>
              <p>{t(language, 'timeConversionDesc', { min: (draft.overtakeGapMin / 1000).toFixed(2), max: (draft.overtakeGapMax / 1000).toFixed(2) })}</p>
              <p>{t(language, 'overtakeTargetDesc')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Section 5: Guest showcase */}
      <div className="border-b border-white/10 pb-2">
        <SectionHeader id="SHOWCASE" icon="🎪" label={t(language, 'guestShowcaseWinners')} sub={t(language, 'guestShowcaseWinnersDesc')} />
        {activeSection === 'SHOWCASE' && (
          <div className="pt-2">
            <GaussianPreview mean={Math.round((draft.showcaseTimeMean + 4000) / 100) / 10} std={Math.round(draft.showcaseTimeStdDev / 100) / 10} unit="s" minVal={5} maxVal={30} />
            <FieldRow
              label="기본 오프셋 (Base Offset)" unit="ms"
              value={draft.showcaseTimeMean} min={3000} max={60000} step={500}
              onChange={v => patch({ showcaseTimeMean: v })}
              desc="게스트 쇼케이스 우승 기록의 기준 오프셋입니다. 실제 평균은 offset + 4000ms입니다."
            />
            <FieldRow
              label="분포 표준편차 σ" unit="ms"
              value={draft.showcaseTimeStdDev} min={100} max={10000} step={100}
              onChange={v => patch({ showcaseTimeStdDev: v })}
              desc="게스트 쇼케이스 기록의 퍼짐 정도입니다. 높을수록 실력 분산이 커 보입니다."
            />
            <div className="text-[10px] text-white/30 bg-black/20 rounded p-2 mt-1">
              <p>{t(language, 'expectedShowcaseRange', { min: String(((draft.showcaseTimeMean + 4000 - 2 * draft.showcaseTimeStdDev) / 1000).toFixed(1)), max: String(((draft.showcaseTimeMean + 4000 + 2 * draft.showcaseTimeStdDev) / 1000).toFixed(1)) })}</p>
              <p>{t(language, 'showcaseLogicDesc')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Section 6: Live ticker times */}
      <div className="border-b border-white/10 pb-2">
        <SectionHeader id="TICKER" icon="📢" label={t(language, 'liveTickerRange')} sub={t(language, 'liveTickerRangeDesc')} />
        {activeSection === 'TICKER' && (
          <div className="pt-2">
            <FieldRow
              label="최소 기록 (가장 빠름)" unit="초"
              value={draft.tickerTimeMin} min={5} max={draft.tickerTimeMax - 0.5} step={0.5}
              onChange={v => patch({ tickerTimeMin: Math.min(v, draft.tickerTimeMax - 0.5) })}
              desc="티커에 표시되는 가장 빠른 가상 기록입니다. 너무 빠르면 현실감이 떨어집니다."
            />
            <FieldRow
              label="최대 기록 (가장 느림)" unit="초"
              value={draft.tickerTimeMax} min={draft.tickerTimeMin + 0.5} max={300} step={0.5}
              onChange={v => patch({ tickerTimeMax: Math.max(v, draft.tickerTimeMin + 0.5) })}
              desc="티커에 표시되는 가장 느린 가상 기록입니다. 범위가 넓을수록 다양한 실력대가 있는 것처럼 보입니다."
            />
            <div className="text-[10px] text-white/30 bg-black/20 rounded p-2 mt-1">
              <p>{t(language, 'tickerRangeUniform', { min: String(draft.tickerTimeMin), max: String(draft.tickerTimeMax) })}</p>
              <p>{t(language, 'tickerFormatDesc')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Section 7: Activity feed */}
      <div className="border-b border-white/10 pb-2">
        <SectionHeader id="FEED" icon="🔔" label={t(language, 'activityFeedBatchSize')} sub={t(language, 'activityFeedBatchSizeDesc')} />
        {activeSection === 'FEED' && (
          <div className="pt-2">
            <FieldRow
              label="갱신당 생성 항목 수" unit="개"
              value={draft.feedBatchSize} min={1} max={10} step={1}
              onChange={v => patch({ feedBatchSize: v })}
              desc="Activity Feed가 갱신될 때 한 번에 생성하는 항목 수입니다. 높을수록 피드가 더 빠르게 도는 인상을 줍니다."
            />
            <div className="text-[10px] text-white/30 bg-black/20 rounded p-2 mt-1">
              <p>{t(language, 'feedFormatDesc')}</p>
              <p>{t(language, 'feedLastItemDesc')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Section 8: Live curve comparator */}
      <div>
        <SectionHeader id="COMPARE" icon="📊" label={t(language, 'distributionComparator')} sub={t(language, 'distributionComparatorDesc')} />
        {activeSection === 'COMPARE' && (
          <div className="pt-2 space-y-3">
            {[
              { label: 'Bot Time', mean: draft.botTimeMean / 1000, std: draft.botTimeStdDev / 1000, unit: 's', min: 5, max: 180 },
              { label: 'Total Leagues', mean: draft.totalLeaguesMean, std: draft.totalLeaguesStdDev, unit: '', min: draft.totalLeaguesMean - 200, max: draft.totalLeaguesMean + 200 },
              { label: 'Showcase', mean: (draft.showcaseTimeMean + 4000) / 1000, std: draft.showcaseTimeStdDev / 1000, unit: 's', min: 3, max: 25 },
            ].map(({ label, mean, std, unit, min, max }) => (
              <div key={label}>
                <p className="text-white/50 text-[10px] mb-1">{label}</p>
                <GaussianPreview mean={Math.round(mean * 10) / 10} std={Math.round(std * 10) / 10} unit={unit} minVal={min} maxVal={max} />
              </div>
            ))}
            <div className="text-[10px] text-white/30 bg-black/20 rounded p-2">
              <p>• League Size: {draft.leagueSizeMin}~{draft.leagueSizeMax} players (hash-deterministic)</p>
              <p>• Overtake Gap: {draft.overtakeGapMin}~{draft.overtakeGapMax}ms (uniform)</p>
              <p>• Ticker: {draft.tickerTimeMin}~{draft.tickerTimeMax}s (uniform)</p>
              <p>• Feed batch: {draft.feedBatchSize} items/refresh</p>
            </div>
          </div>
        )}
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


// Language modal
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

// Quiz modal (anti-bot)
const QuizModal = ({ isOpen, onClose, onSolve }: { isOpen: boolean; onClose: () => void; onSolve: () => void }) => {
  const { language, currentUser } = useStore();
  const [num1] = useState(Math.floor(Math.random() * 10) + 1);
  const [num2] = useState(Math.floor(Math.random() * 10) + 1);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (parseInt(answer) === num1 + num2) {
      vibrate();
      onSolve();
    } else {
      setError(true);
      vibrate();
      setTimeout(() => setError(false), 500);
    }
  };

  const handleAdminSolve = () => {
    vibrate();
    onSolve();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t(language, 'verificationTitle')}>
      <div className="space-y-4 py-2">
        <p className="text-white/70 text-sm text-center">{t(language, 'areYouHuman')}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-black/40 rounded-2xl p-6 border border-white/10 text-center">
            <span className="text-3xl font-black text-white">{num1} + {num2} = ?</span>
          </div>
          <input
            autoFocus
            type="number"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className={`w-full bg-white/5 border ${error ? 'border-red-500 animate-shake' : 'border-white/20'} text-white text-2xl font-black text-center py-4 rounded-xl outline-none focus:border-[#00FFFF] transition-all`}
            placeholder="?"
          />
          <button
            type="submit"
            className="w-full bg-[#FF0080] text-white font-bold py-4 rounded-xl btn-squishy shadow-[0_0_20px_rgba(255,0,128,0.3)]"
          >
            {t(language, 'verifyBtn')}
          </button>
        </form>

        {isAdmin && (
          <button
            onClick={handleAdminSolve}
            className="w-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 font-bold py-3 rounded-xl btn-squishy flex items-center justify-center gap-2"
          >
            <span>⚡</span> {t(language, 'adminAutoSolve')}
          </button>
        )}
      </div>
    </Modal>
  );
};

// Hearts modal
const AdFlowIndicator = ({ phase, text }: { phase: 'loading' | 'watching' | 'validating'; text: string }) => {
  const palette = phase === 'validating'
    ? {
      ringA: 'border-t-[#FFE082] border-r-[#FF0080]',
      ringB: 'border-b-[#00FFFF] border-l-[#FFE082]',
      core: 'from-[#FFE082] via-white to-[#FF0080]',
      label: 'text-[#FFE082]',
    }
    : phase === 'watching'
      ? {
        ringA: 'border-t-[#00FFFF] border-r-[#8CF8FF]',
        ringB: 'border-b-[#FF0080] border-l-[#00FFFF]',
        core: 'from-[#00FFFF] via-white to-[#8CF8FF]',
        label: 'text-[#8CF8FF]',
      }
      : {
        ringA: 'border-t-[#00FFFF] border-r-[#FF0080]',
        ringB: 'border-b-[#8CF8FF] border-l-[#00FFFF]',
        core: 'from-[#00FFFF] via-white to-[#FF0080]',
        label: 'text-[#00FFFF]',
      };

  return (
    <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-center">
      <div className="relative h-12 w-12" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border border-white/10" />
        <span className={`absolute inset-0 rounded-full border-2 border-transparent ${palette.ringA} animate-spin`} />
        <span className="absolute inset-[6px] rounded-full border border-white/10" />
        <span className={`absolute inset-[6px] rounded-full border-2 border-transparent ${palette.ringB} animate-[spin_1.35s_linear_infinite_reverse]`} />
        <span className={`absolute inset-[15px] rounded-full bg-gradient-to-br ${palette.core} shadow-[0_0_18px_rgba(255,255,255,0.45)]`} />
      </div>
      <p className={`text-sm font-semibold ${palette.label}`}>{text}</p>
    </div>
  );
};

const HeartsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const {
    currentUser, claimDailyHeart, language, getReferralLink, showRewardToast,
    adConfig, watchRewardedAd, videoWatchCount, activeFandomId
  } = useStore();
  const [seconds, setSeconds] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const [adFlowPhase, setAdFlowPhase] = useState<'idle' | 'loading' | 'watching' | 'validating'>('idle');
  const [showQuiz, setShowQuiz] = useState(false);
  const previousHeartsRef = useRef(currentUser?.hearts ?? 0);

  useEffect(() => {
    if (!isOpen) return;
    const updateCountdown = () => {
      const nextFreeHeartMs = currentUser?.nextFreeHeartAt ? Date.parse(currentUser.nextFreeHeartAt) : 0;
      setSeconds(Math.max(0, Math.floor((nextFreeHeartMs - Date.now()) / 1000)));
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [currentUser?.nextFreeHeartAt, isOpen]);

  const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const nextFreeHeartMs = currentUser?.nextFreeHeartAt ? Date.parse(currentUser.nextFreeHeartAt) : 0;
  const isDailyHeartReady = Boolean(currentUser && currentUser.hearts < 3 && (!nextFreeHeartMs || Date.now() >= nextFreeHeartMs));
  const activeFandom = getFandomPack(activeFandomId);
  const isAdBusy = adFlowPhase !== 'idle';
  const adStatusText = adFlowPhase === 'validating'
    ? t(language, 'rewardValidationPending')
    : adFlowPhase === 'watching'
      ? t(language, 'adVideoHint')
      : adFlowPhase === 'loading'
        ? t(language, 'loadingAd')
        : null;
  const adButtonLabel = adFlowPhase === 'validating'
    ? t(language, 'rewardValidationPending')
    : adFlowPhase === 'watching'
      ? t(language, 'watchingAd')
      : adFlowPhase === 'loading'
        ? t(language, 'loadingAd')
        : t(language, 'watchAd');

  useEffect(() => {
    if (!isOpen) {
      setAdFlowPhase('idle');
      setShowQuiz(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const hearts = currentUser?.hearts ?? 0;
    if (!isOpen) {
      previousHeartsRef.current = hearts;
      return;
    }

    const hadRewardedHeartIncrease = adFlowPhase !== 'idle' && hearts > previousHeartsRef.current;
    previousHeartsRef.current = hearts;

    if (!hadRewardedHeartIncrease) return;

    setAdFlowPhase('idle');
    onClose();
  }, [adFlowPhase, currentUser?.hearts, isOpen, onClose]);

  const finalizeAdFlow = (closeModal: boolean = false) => {
    setAdFlowPhase('idle');
    if (!closeModal) return;
    window.setTimeout(() => onClose(), 120);
  };

  const startAdFlow = async () => {
    if (isAdBusy) return;
    setAdFlowPhase('loading');
    try {
      const rewardState = await watchRewardedAd({ onPhase: setAdFlowPhase });
      if (rewardState === 'rewarded') {
        useStore.getState().showRewardToast(t(language, 'heartEarned'));
        finalizeAdFlow(true);
      } else if (rewardState === 'capped') {
        useStore.getState().showRewardToast(t(language, 'maxHeartsReached'));
        finalizeAdFlow(false);
      } else if (rewardState === 'progressed') {
        const { videoWatchCount: nextWatchCount, adConfig: nextAdConfig } = useStore.getState();
        useStore.getState().showRewardToast(t(language, 'videoProgress', {
          current: String(Math.min(nextWatchCount, nextAdConfig.videosPerHeart)),
          total: String(nextAdConfig.videosPerHeart),
          reward: String(nextAdConfig.rewardedVideoRewardHearts),
        }));
        finalizeAdFlow(false);
      } else {
        finalizeAdFlow(false);
      }
    } catch (err) {
      console.error('[HeartsModal] Ad error:', err);
      finalizeAdFlow(false);
    }
  };

  const handleWatchAd = () => {
    vibrate();
    // 20% chance to show anti-bot quiz
    if (isAdBusy) return;
    if (Math.random() < 0.2) {
      setShowQuiz(true);
    } else {
      startAdFlow();
    }
  };

  const handleQuizSolve = () => {
    setShowQuiz(false);
    startAdFlow();
  };

  const handleInvite = async () => {
    vibrate();
    const link = getReferralLink();
    try {
      if (navigator.share) {
        await navigator.share({
          title: t(language, 'shareInviteTitleFandom', { fandom: activeFandom.targetLabel }),
          text: t(language, 'shareInviteTextFandom', { challenge: activeFandom.shareTitle }),
          url: link,
        });
      } else if (await copyTextToClipboard(link)) {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
        showRewardToast(t(language, 'inviteShareCopied'));
      } else {
        showRewardToast(t(language, 'copyFailed'));
      }
    } catch {
      showRewardToast(t(language, 'copyFailed'));
    }
  };

  const handleClaimDailyHeart = async () => {
    vibrate();
    try {
      const claimed = await claimDailyHeart();
      showRewardToast(t(language, claimed === 'claimed'
        ? 'dailyHeartClaimed'
        : claimed === 'max_hearts'
          ? 'maxHeartsReached'
          : 'dailyHeartAlreadyClaimed'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t(language, 'serverTimeError');
      showRewardToast(message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!isAdBusy) onClose(); }} title={t(language, 'heartsTitle')}>
      <div className="space-y-3">
        <p className="text-white/70 text-xs">
          {isDailyHeartReady
            ? t(language, 'dailyHeartReady')
            : currentUser && currentUser.hearts >= 3
              ? t(language, 'maxHeartsReached')
              : t(language, 'loginHeartCountdown', { time: `${hh}:${mm}:${ss}` })}
        </p>

        {adConfig.rewardedVideo && (
          <div className="space-y-1">
            <button
              onClick={handleWatchAd}
              disabled={isAdBusy}
              className="w-full rounded-xl p-3 bg-[#00FFFF] text-black font-bold flex items-center justify-center gap-2 btn-squishy disabled:opacity-50"
            >
              {isAdBusy ? (
                <RefreshCw size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <Video size={18} />
              )}
              {adButtonLabel}
            </button>
            <div className="flex flex-col items-center">
              {adStatusText && (
                <AdFlowIndicator phase={adFlowPhase === 'idle' ? 'loading' : adFlowPhase} text={adStatusText} />
              )}
              <p className="text-[12px] text-[#00FFFF] mt-1 font-semibold">
                {t(language, 'videoProgress', {
                  current: String(Math.min(videoWatchCount, adConfig.videosPerHeart)),
                  total: String(adConfig.videosPerHeart),
                  reward: String(adConfig.rewardedVideoRewardHearts),
                })}
              </p>
            </div>
          </div>

        )}

        <button onClick={handleInvite} className="w-full rounded-xl p-3 bg-[#FF0080] text-white font-bold flex items-center justify-center gap-2 btn-squishy">
          <Share2 size={18} /> {linkCopied ? t(language, 'linkCopied') : t(language, 'inviteFriend')}
        </button>

        <button onClick={handleClaimDailyHeart} className="w-full rounded-xl p-3 bg-white/10 text-white text-sm btn-squishy">
          {t(language, 'dailyHeart')}
        </button>

        <p className="text-[11px] text-white/50">{t(language, 'missionGet')}</p>
        <p className="text-[11px] text-white/50">{t(language, 'maxHearts')}</p>
      </div>

      <QuizModal
        isOpen={showQuiz}
        onClose={() => setShowQuiz(false)}
        onSolve={handleQuizSolve}
      />
    </Modal>
  );
};

// Offline toast
const OfflineToast = () => {
  const { language } = useStore();
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
        <span>{t(language, 'noInternet')}</span>
      </div>
    </div>
  );
};

// ─── 메인 앱 컨테이너 컴포넌트 ────────────────────────────────────
// 전체 앱의 상태(라우팅/뷰)를 관리하고, 언어 자동 감지,
// 하트 충전 모달, 모바일 레이아웃(하단 정보) 등을 통합 렌더링합니다.
export default function App() {
  const {
    currentView,
    language,
    currentUser,
    setLanguage,
    showBrowserBlocker,
    setShowBrowserBlocker,
    rewardMessage,
    alertDialog,
    confirmDialog,
    showAlertDialog,
    showConfirmDialog,
    hydrateOperationalState,
    syncSeasonClock,
    initLeague,
    showRewardToast,
    claimPendingAdReward,
  } = useStore();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showHeartsModal, setShowHeartsModal] = useState(false);

  // Global BeforeInstallPrompt listener
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      useStore.setState({ deferredPrompt: e as DeferredInstallPrompt });
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // IP 기반 언어 자동 감지
  useEffect(() => {
    if (language === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.removeAttribute('dir');
    }
  }, [language]);

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

  useEffect(() => {
    void hydrateOperationalState();
  }, [hydrateOperationalState]);

  useEffect(() => {
    if (!runtimeConfig.capabilities.login) return undefined;
    return onAuthStateChanged((authUser) => {
      const state = useStore.getState();
      if (isAuthBootstrapPending()) {
        return;
      }
      if (!authUser) {
        if (state.currentUser) {
          state.logout();
        }
        return;
      }
      void state.restoreSessionFromAuth(authUser);
    });
  }, []);

  useEffect(() => {
    syncSeasonClock();
    initLeague();
    const timer = setInterval(() => {
      syncSeasonClock();
      initLeague();
    }, 15000);
    return () => clearInterval(timer);
  }, [syncSeasonClock, initLeague]);

  // Initialize ad rewards listener when logged in
  useEffect(() => {
    if (!currentUser?.id) return;

    return listenForApplixirRewards(currentUser.id, async (reward) => {
      if (reward.type === 'rewarded_video_applixir' && isRewardedVideoWaitActive(currentUser.id)) {
        return;
      }
      const { language: currentLanguage } = useStore.getState();
      const rewardResult = await claimPendingAdReward(reward.id);
      if (rewardResult.grantedHearts > 0) {
        showRewardToast(t(currentLanguage, 'heartEarned'));
      }
    });
  }, [claimPendingAdReward, currentUser?.id, showRewardToast]);

  // Handle browser back button (popstate mapping to SetView)
  useEffect(() => {
    type BrowserHistoryState = { view?: 'HOME' | 'GAME' | 'LEADERBOARD' | 'ADMIN' | 'HISTORY' | 'SUPPORT' };
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as BrowserHistoryState | null;
      const store = useStore.getState();
      if (state && state.view) {
        if (state.view === 'GAME' && !store.gameSessionActive) {
          window.history.replaceState({ view: 'HOME' }, '', `${window.location.pathname}${window.location.search}${window.location.hash}`);
          useStore.setState({ currentView: 'HOME', gameSessionActive: false, gameRunStartedAt: null, isGameFinished: false });
          return;
        }
        if (store.currentView === 'GAME' && state.view !== 'GAME' && store.gameSessionActive && !store.isGameFinished) {
          store.markGameSessionCancelled();
        }
        useStore.setState({
          currentView: state.view,
          ...(state.view !== 'GAME' ? { gameSessionActive: false, gameRunStartedAt: null } : {}),
        });
      } else {
        if (store.currentView === 'GAME' && store.gameSessionActive && !store.isGameFinished) {
          store.markGameSessionCancelled();
        }
        useStore.setState({ currentView: 'HOME', gameSessionActive: false, gameRunStartedAt: null });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <Layout onOpenLanguage={() => setShowLanguageModal(true)} onOpenHearts={() => setShowHeartsModal(true)}>
      <OfflineToast />
      {rewardMessage && (
        <div className="fixed top-safe z-[4000] w-full flex justify-center py-2 animate-slide-down pointer-events-none">
          <div className="bg-[#FF0080] text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(255,0,128,0.6)] flex items-center gap-2 border-2 border-[#FF0080]/50 text-sm">
            <span>🎁</span>
            <span>{rewardMessage}</span>
          </div>
        </div>
      )}
      {currentView === 'HOME' && <HomeScreen onShowHearts={() => setShowHeartsModal(true)} />}
      {currentView === 'GAME' && <GameScreen onShowHearts={() => setShowHeartsModal(true)} />}
      {currentView === 'LEADERBOARD' && <LeaderboardScreen onShowHearts={() => setShowHeartsModal(true)} />}
      {currentView === 'HISTORY' && <HistoryScreen />}
      {currentView === 'SUPPORT' && <SupportScreen />}
      {currentView === 'ADMIN' && <AdminScreen />}

      <LanguageModal isOpen={showLanguageModal} onClose={() => setShowLanguageModal(false)} />
      <HeartsModal isOpen={showHeartsModal} onClose={() => setShowHeartsModal(false)} />

      <Modal
        isOpen={Boolean(alertDialog)}
        onClose={() => showAlertDialog(null)}
        title={alertDialog?.title ?? ''}
      >
        <div className="space-y-4">
          <p className={`text-sm text-center ${alertDialog?.tone === 'error' ? 'text-red-300' : alertDialog?.tone === 'warning' ? 'text-yellow-200' : 'text-white/80'}`}>
            {alertDialog?.message}
          </p>
          <button
            onClick={() => {
              vibrate();
              showAlertDialog(null);
            }}
            className="w-full bg-[#FF0080] text-white font-bold py-3 rounded-lg btn-squishy"
          >
            {t(language, 'closeModal')}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(confirmDialog)}
        onClose={() => showConfirmDialog(null)}
        title={confirmDialog?.title ?? ''}
      >
        <div className="space-y-4">
          <p className={`text-sm text-center ${confirmDialog?.tone === 'danger' ? 'text-red-200' : 'text-white/80'}`}>
            {confirmDialog?.message}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                vibrate();
                showConfirmDialog(null);
              }}
              className="flex-1 bg-white/10 text-white font-bold py-3 rounded-lg btn-squishy"
            >
              {confirmDialog?.cancelLabel ?? t(language, 'closeModal')}
            </button>
            <button
              onClick={async () => {
                const callback = confirmDialog?.onConfirm;
                showConfirmDialog(null);
                if (!callback) return;
                vibrate();
                try {
                  await callback();
                } catch (error) {
                  console.error('[ConfirmDialog] Action failed:', error);
                  showAlertDialog({
                    title: t(language, 'adminTitle'),
                    message: error instanceof Error ? error.message : t(language, 'loginFailed'),
                    tone: 'error',
                  });
                }
              }}
              className={`flex-1 font-bold py-3 rounded-lg btn-squishy ${confirmDialog?.tone === 'danger' ? 'bg-red-500 text-white' : 'bg-[#00FFFF] text-black'}`}
            >
              {confirmDialog?.confirmLabel ?? t(language, 'save')}
            </button>
          </div>
        </div>
      </Modal>

      {/* In-App Browser Blocker Modal */}
      <Modal isOpen={showBrowserBlocker} onClose={() => setShowBrowserBlocker(false)} title={t(language, 'browserNotSupported')}>
        <p className="text-white/80 text-sm mb-4 text-center">{t(language, 'inAppBrowserWarning')}</p>
        <button onClick={async () => {
          vibrate();
          const copied = await copyTextToClipboard(window.location.origin);
          showRewardToast(copied ? t(language, 'linkCopiedAlert') : t(language, 'copyFailed'));
        }} className="w-full bg-[#00FFFF] text-black font-bold py-3 rounded-lg btn-squishy text-lg">
          {t(language, 'copyLinkUrl')}
        </button>
      </Modal>

      {(currentView === 'HOME' || currentView === 'LEADERBOARD') && (
        <footer className="bg-[#050208] p-4 text-center border-t border-white/10 space-y-1">
          <small className="block text-sm text-white/80 leading-relaxed">{t(language, 'legal').replace(/^\*\s*/, '')}</small>
          <p className="text-xs text-white/75">
            © {new Date().getFullYear()} StanBeat
            {runtimeConfig.supportEmail ? (
              <>
                {' · '}
                <a href={`mailto:${runtimeConfig.supportEmail}`} className="underline text-white/90 hover:text-white">{runtimeConfig.supportEmail}</a>
              </>
            ) : null}
          </p>
        </footer>
      )}
    </Layout>
  );
}
