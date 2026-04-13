import React, { useEffect, useState } from 'react';
import { Menu, Heart, X, Trophy, History, Globe, LogOut, RefreshCw, XCircle, ShieldAlert, Play, HeartHandshake, MessageSquare } from 'lucide-react';
import { useStore } from '../store';
import { languageOptions, t } from '../i18n';

const vibrate = () => navigator.vibrate?.(15);

export const Ticker = () => {
  const { activityFeed, refreshActivityFeed } = useStore();
  const tickerText = activityFeed.map((item) => item.message).join('   ✦   ');

  useEffect(() => {
    const interval = setInterval(() => {
      refreshActivityFeed();
    }, 20000);
    return () => clearInterval(interval);
  }, [refreshActivityFeed]);

  return (
    <div className="bg-black/80 text-[#00FFFF] text-xs py-1 overflow-hidden whitespace-nowrap border-b border-[#1A0B2E] z-40 relative">
      <div className="inline-block animate-[marquee_22s_linear_infinite] pl-full ticker-text">{tickerText}</div>
    </div>
  );
};
// ─── 상단 헤더 컴포넌트 (로고, 햄버거 메뉴, 하트 개수 표시) ───
export const Header = ({ onOpenLanguage }: { onOpenLanguage: () => void }) => {
  const { currentUser, currentView, isGameFinished, toggleMenu, setView, requestGameExit, language } = useStore();
  const [pulse, setPulse] = useState(false);
  const [delta, setDelta] = useState<number | null>(null);
  const [prevHearts, setPrevHearts] = useState<number>(currentUser?.hearts ?? 0);

  // Language flag lookup from languageOptions
  const currentFlag = languageOptions.find((option) => option.code === language)?.flag ?? '🌐';

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

  return (
    <header className="sticky top-0 z-50 grid grid-cols-[44px_1fr_auto] items-center gap-2 bg-[#1A0B2E]/90 backdrop-blur-md border-b border-[#FF0080]/30 px-3 py-3 shadow-[0_4px_20px_rgba(255,0,128,0.2)]">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => { vibrate(); toggleMenu(); }}
          aria-label={t(language, 'openMenu')}
          title={t(language, 'openMenu')}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-[#00FFFF] shadow-[inset_0_0_0_1px_rgba(0,255,255,0.35)] btn-squishy neon-glow-icon focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00FFFF]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A0B2E]"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          if (currentView === 'GAME' && !isGameFinished) {
            requestGameExit();
            return;
          }
          vibrate();
          setView('HOME');
        }}
        className="justify-self-center px-2 font-display text-xl tracking-tighter text-white cursor-pointer hover:scale-105 active:scale-95 transition-transform select-none bg-transparent border-0 p-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF8FD0] focus-visible:outline-offset-4"
      >
        <span className="neon-text text-[#FF0080]">STAN</span>BEAT
      </button>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => { vibrate(); onOpenLanguage(); }}
          aria-label={t(language, 'changeLanguage')}
          title={t(language, 'changeLanguage')}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white shadow-[inset_0_0_0_1px_rgba(0,255,255,0.35)] btn-squishy transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00FFFF]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A0B2E]"
        >
          <span className="text-base leading-none">{currentFlag}</span>
        </button>
        <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full border border-[#FF0080]/50 relative">
          <Heart size={16} className={`text-[#FF0080] fill-[#FF0080] transition-all duration-300 ${pulse ? 'scale-150 drop-shadow-[0_0_15px_rgba(255,0,128,1)]' : 'scale-100'}`} />
          <span className="text-white font-bold text-sm">{currentUser?.hearts ?? 0}</span>
          {delta !== null && (
            <span className="absolute -top-3 -right-1 text-[10px] text-[#00FFFF] font-bold bounce-up">{delta > 0 ? `+${delta}` : delta}</span>
          )}
        </div>
      </div>
    </header>
  );
};

// ─── 사이드 메뉴 컴포넌트 (로그인/로그아웃, 홈, 리더보드, 히스토리 등) ───
export const SideMenu = ({ onOpenLanguage, onOpenHearts }: { onOpenLanguage: () => void; onOpenHearts: () => void }) => {
  const { isMenuOpen, toggleMenu, currentUser, logout, login, setView, currentView, isGameFinished, requestGameExit, language, startGame } = useStore();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isMenuOpen) return null;
  const navigate = (view: Parameters<typeof setView>[0]) => {
    toggleMenu();
    if (currentView === 'GAME' && !isGameFinished && view !== 'GAME') {
      requestGameExit();
      return;
    }
    setView(view);
  };

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={toggleMenu} />
      <div className="relative w-[80%] max-w-[300px] h-full bg-[#1A0B2E]/90 backdrop-blur-md border-r border-[#FF0080]/30 flex flex-col animate-[slideIn_0.3s_ease-out] side-menu">
        <div className="p-6 border-b border-white/10 bg-gradient-to-br from-[#FF0080]/20 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#00FFFF] font-display text-xl neon-cyan">{t(language, 'profile')}</h2>
            <button onClick={toggleMenu} className="btn-squishy" aria-label={t(language, 'closeMenu')}><X className="text-white/70" /></button>
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
              disabled={isLoggingIn}
              onClick={async () => {
                if (isLoggingIn) return;
                setIsLoggingIn(true);
                vibrate();
                try {
                  const success = await login();
                  if (success) toggleMenu();
                } finally {
                  setIsLoggingIn(false);
                }
              }}
              className="w-full bg-[#FF0080] text-white py-2 rounded font-bold btn-squishy disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? <RefreshCw size={18} className="animate-spin" /> : null}
              {t(language, 'loginWithGoogle')}
            </button>
          )}
        </div>
        <div className="flex-1 p-4 space-y-2">
          {currentUser && (
          <MenuItem icon={<Play size={20} />} label={t(language, 'playGame')} color="text-[#00FFFF]" onClick={async () => {
              toggleMenu();
              if (!currentUser) {
                void login();
                return;
              }
              const result = await startGame();
              if (result === 'started') {
                setView('GAME');
              } else if (result === 'needs_hearts') {
                onOpenHearts();
              }
            }} />
          )}
          <MenuItem icon={<HeartHandshake size={20} />} label={t(language, 'chargeHearts')} color="text-[#FF0080]" onClick={() => { toggleMenu(); onOpenHearts(); }} />
          <MenuItem icon={<Trophy size={20} />} label={t(language, 'rankingBoardTitle')} onClick={() => navigate('LEADERBOARD')} />
          <MenuItem icon={<History size={20} />} label={t(language, 'history')} onClick={() => navigate('HISTORY')} />
          <MenuItem icon={<MessageSquare size={20} />} label={t(language, 'supportInquiryTitle')} color="text-[#00FFFF]" onClick={() => navigate('SUPPORT')} />
          <MenuItem icon={<Globe size={20} />} label={t(language, 'languageTitle')} onClick={() => { toggleMenu(); onOpenLanguage(); }} />
          {currentUser?.role === 'ADMIN' && (
            <MenuItem icon={<ShieldAlert size={20} />} label={t(language, 'adminTitle')} color="text-red-400" onClick={() => navigate('ADMIN')} />
          )}
        </div>
        {currentUser && (
          <div className="p-4 border-t border-white/10">
            <button onClick={() => { vibrate(); logout(); toggleMenu(); }} className="flex items-center gap-3 text-white/60 hover:text-white w-full btn-squishy" aria-label={t(language, 'logout')}>
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
    <div className="fixed inset-0 bg-gradient-to-br from-[#1A0B2E] via-[#0D0518] to-[#1A0B2E] animate-[bgShift_12s_ease-in-out_infinite_alternate] opacity-60" style={{ willChange: 'background-position' }} />
    <div className="fixed inset-0 bg-black/70 z-0" />
    <div className="w-full max-w-[430px] min-h-screen bg-[#0D0518]/85 relative z-10 shadow-2xl flex flex-col">
      <Header onOpenLanguage={onOpenLanguage} />
      <Ticker />
      <main className="flex-1 flex flex-col relative">{children}</main>
      <SideMenu onOpenLanguage={onOpenLanguage} onOpenHearts={onOpenHearts} />
    </div>
  </div>
);

export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode }) => {
  const { language } = useStore();
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-[#1A0B2E] w-full max-w-sm rounded-2xl border border-[#FF0080]/40 shadow-[0_0_30px_rgba(255,0,128,0.4)] relative p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white btn-squishy" aria-label={t(language, 'closeModal')}><XCircle /></button>
        <h3 className="text-2xl font-display text-white mb-4 text-center">{title}</h3>
        {children}
      </div>
    </div>
  );
};
