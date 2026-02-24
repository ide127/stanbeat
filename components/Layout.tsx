import React, { useEffect, useRef, useState } from 'react';
import { Menu, Heart, X, Zap, Trophy, History, Globe, LogOut, XCircle, ShieldAlert, Play, HeartHandshake } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';

const vibrate = () => navigator.vibrate?.(15);

const TICKER_NAMES = [
  'ShinyCookie', 'GoldenArmy', 'HobiSunshine', 'TaeBear', 'JiminStar', 'CosmicJK',
  'MoonChild', 'DynamiteQueen', 'ButterArmy', 'PurpleHeart', 'SeokjinLover', 'YoongiFire',
  'NamjoonWise', 'BTSForever', 'ARMYPower', 'SpringDay', 'MikrokosmosFan', 'BangtanSoul',
];
const randName = () => `${TICKER_NAMES[Math.floor(Math.random() * TICKER_NAMES.length)]}_${Math.floor(Math.random() * 9000) + 1000}`;
const randTime = () => (28 + Math.random() * 14).toFixed(1);
const randLeague = () => { const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; return `${L[Math.floor(Math.random() * 26)]}${L[Math.floor(Math.random() * 26)]}${Math.floor(Math.random() * 90) + 10}`; };

// 전광판(Ticker)에 표시할 메시지 목록 생성 함수
const buildTickerText = (notice: string, lang: import('../i18n').LanguageCode) => {
  const msgs: string[] = [];
  for (let i = 0; i < 3; i++) {
    msgs.push(t(lang, 'tickerLeague', { league: randLeague(), name: randName(), time: randTime() }));
  }
  msgs.push(t(lang, 'tickerEvent'));
  if (notice) msgs.push(`${t(lang, 'tickerNoticePrefix')} ${notice}`);
  return msgs.join('   ✦   ');
};

// ─── 상단 전광판 컴포넌트 (가짜 1등 달성 메시지 및 공지사항 롤링) ───
export const Ticker = () => {
  const { notice, language } = useStore();
  const [tickerText, setTickerText] = useState(() => buildTickerText(notice, language));

  useEffect(() => {
    // 즉시 업데이트하여 언어 변경 시 전광판이 바로 번역되도록 함
    setTickerText(buildTickerText(notice, language));

    const interval = setInterval(() => {
      const { notice: n, language: l } = useStore.getState();
      setTickerText(buildTickerText(n, l));
    }, 20000);
    return () => clearInterval(interval);
  }, [notice, language]);

  return (
    <div className="bg-black/80 text-[#00FFFF] text-xs py-1 overflow-hidden whitespace-nowrap border-b border-[#1A0B2E] z-40 relative">
      <div className="inline-block animate-[marquee_22s_linear_infinite] pl-full ticker-text">{tickerText}</div>
    </div>
  );
};

// ─── 상단 헤더 컴포넌트 (로고, 햄버거 메뉴, 하트 개수 표시) ───
export const Header = () => {
  const { currentUser, toggleMenu, setView, toggleAdminRole } = useStore();
  const [pulse, setPulse] = useState(false);
  const [delta, setDelta] = useState<number | null>(null);
  const [prevHearts, setPrevHearts] = useState<number>(currentUser?.hearts ?? 0);
  const [adminFlash, setAdminFlash] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hearts = currentUser?.hearts ?? 0;
    const changed = hearts - prevHearts;
    if (changed !== 0) {
      setPulse(true);
      setDelta(changed);
      const t = setTimeout(() => { setPulse(false); setDelta(null); }, 800);
      setPrevHearts(hearts);
      return () => clearTimeout(t);
    }
  }, [currentUser?.hearts, prevHearts]);

  const handleLogoPointerDown = () => {
    longPressTimer.current = setTimeout(() => {
      vibrate();
      toggleAdminRole();
      setAdminFlash(true);
      setTimeout(() => setAdminFlash(false), 600);
    }, 3000);
  };

  const handleLogoPointerUp = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#1A0B2E]/90 backdrop-blur-md border-b border-[#FF0080]/30 px-4 py-3 flex justify-between items-center shadow-[0_4px_20px_rgba(255,0,128,0.2)]">
      <button onClick={() => { vibrate(); toggleMenu(); }} className="text-[#00FFFF] btn-squishy neon-glow-icon">
        <Menu size={24} />
      </button>
      {/* 5초(현재 3초) 롱프레스 시 관리자 모드(ADMIN) 토글 활성화 */}
      <div
        onClick={() => { vibrate(); setView('HOME'); }}
        onPointerDown={handleLogoPointerDown}
        onPointerUp={handleLogoPointerUp}
        onPointerCancel={handleLogoPointerUp}
        onPointerLeave={handleLogoPointerUp}
        onContextMenu={(e) => { e.preventDefault(); }}
        className={`font-display text-xl tracking-tighter text-white cursor-pointer hover:scale-105 transition-transform select-none ${adminFlash ? 'animate-pulse' : ''}`}
      >
        <span className={`neon-text ${adminFlash ? 'text-yellow-400' : 'text-[#FF0080]'}`}>STAN</span>BEAT
      </div>
      <div className="flex items-center gap-1 bg-black/40 px-3 py-1 rounded-full border border-[#FF0080]/50 relative">
        <Heart size={16} className={`text-[#FF0080] fill-[#FF0080] transition-all duration-300 ${pulse ? 'scale-150 drop-shadow-[0_0_15px_rgba(255,0,128,1)]' : 'scale-100'}`} />
        <span className="text-white font-bold text-sm">{currentUser?.hearts ?? 0}</span>
        {delta !== null && (
          <span className="absolute -top-3 -right-1 text-[10px] text-[#00FFFF] font-bold bounce-up">{delta > 0 ? `+${delta}` : delta}</span>
        )}
      </div>
    </header>
  );
};

// ─── 사이드 메뉴 컴포넌트 (로그인/로그아웃, 홈, 리더보드, 히스토리 등) ───
export const SideMenu = ({ onOpenLanguage, onOpenHearts }: { onOpenLanguage: () => void; onOpenHearts: () => void }) => {
  const { isMenuOpen, toggleMenu, currentUser, logout, login, setView, language, consumeHeart } = useStore();
  if (!isMenuOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={toggleMenu} />
      <div className="relative w-[80%] max-w-[300px] h-full bg-[#1A0B2E]/90 backdrop-blur-md border-r border-[#FF0080]/30 flex flex-col animate-[slideIn_0.3s_ease-out] side-menu">
        <div className="p-6 border-b border-white/10 bg-gradient-to-br from-[#FF0080]/20 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#00FFFF] font-display text-xl neon-cyan">{t(language, 'profile')}</h2>
            <button onClick={toggleMenu} className="btn-squishy"><X className="text-white/70" /></button>
          </div>
          {currentUser ? (
            <div className="flex items-center gap-3">
              <img src={currentUser.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-[#00FFFF]" />
              <div>
                <p className="text-white font-bold">{currentUser.nickname}</p>
                <p className="text-white/40 text-xs">{currentUser.email}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { vibrate(); login(); toggleMenu(); }}
              className="w-full bg-[#FF0080] text-white py-2 rounded font-bold btn-squishy"
            >
              {t(language, 'loginWithGoogle')}
            </button>
          )}
        </div>
        <div className="flex-1 p-4 space-y-2">
          {currentUser && (
            <MenuItem icon={<Play size={20} />} label={t(language, 'playGame')} color="text-[#00FFFF]" onClick={() => {
              toggleMenu();
              if (!currentUser) { login(); return; }
              const ok = consumeHeart();
              if (ok) { setView('GAME'); } else { onOpenHearts(); }
            }} />
          )}
          <MenuItem icon={<HeartHandshake size={20} />} label={t(language, 'chargeHearts')} color="text-[#FF0080]" onClick={() => { toggleMenu(); onOpenHearts(); }} />
          <MenuItem icon={<Trophy size={20} />} label={t(language, 'rankingBoardTitle')} onClick={() => { toggleMenu(); setView('LEADERBOARD'); }} />
          <MenuItem icon={<History size={20} />} label={`📜 ${t(language, 'history')}`} onClick={() => { toggleMenu(); setView('HISTORY'); }} />
          <MenuItem icon={<Globe size={20} />} label={`🌍 ${t(language, 'languageTitle')}`} onClick={() => { toggleMenu(); onOpenLanguage(); }} />
          {currentUser?.role === 'ADMIN' && (
            <MenuItem icon={<ShieldAlert size={20} />} label={t(language, 'adminTitle')} color="text-red-400" onClick={() => { toggleMenu(); setView('ADMIN'); }} />
          )}
        </div>
        {currentUser && (
          <div className="p-4 border-t border-white/10">
            <button onClick={() => { vibrate(); logout(); toggleMenu(); }} className="flex items-center gap-3 text-white/60 hover:text-white w-full btn-squishy">
              <LogOut size={20} />
              <span>{t(language, 'logout')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const MenuItem = ({ icon, label, color = 'text-white', onClick }: { icon: React.ReactNode; label: string; color?: string; onClick?: () => void }) => (
  <button onClick={() => { vibrate(); onClick?.(); }} className="flex items-center gap-4 w-full p-3 hover:bg-white/5 btn-squishy rounded-lg transition-all">
    <div className={color}>{icon}</div>
    <span className="text-white/90 font-medium">{label}</span>
  </button>
);

export const Layout = ({ children, onOpenLanguage, onOpenHearts }: { children?: React.ReactNode; onOpenLanguage: () => void; onOpenHearts: () => void }) => (
  <div className="min-h-screen bg-[#1A0B2E] flex justify-center items-start relative overflow-hidden">
    <div className="fixed inset-0 bg-gradient-to-br from-[#1A0B2E] via-[#0D0518] to-[#1A0B2E] animate-[bgShift_12s_ease-in-out_infinite_alternate] opacity-60" />
    <div className="fixed inset-0 bg-black/70 z-0" />
    <div className="w-full max-w-[430px] min-h-screen bg-[#0D0518]/85 relative z-10 shadow-2xl flex flex-col">
      <Header />
      <Ticker />
      <main className="flex-1 flex flex-col relative">{children}</main>
      <SideMenu onOpenLanguage={onOpenLanguage} onOpenHearts={onOpenHearts} />
    </div>
  </div>
);

export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-[#1A0B2E] w-full max-w-sm rounded-2xl border border-[#FF0080]/40 shadow-[0_0_30px_rgba(255,0,128,0.4)] relative p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white btn-squishy"><XCircle /></button>
        <h3 className="text-2xl font-display text-white mb-4 text-center">{title}</h3>
        {children}
      </div>
    </div>
  );
};
