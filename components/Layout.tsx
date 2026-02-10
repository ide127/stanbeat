import React, { useEffect, useMemo, useState } from 'react';
import { Menu, Heart, X, Zap, Trophy, History, Globe, LogOut, XCircle, ShieldAlert } from 'lucide-react';
import { useStore } from '../store';

export const Ticker = () => {
  const { activityFeed, notice } = useStore();
  const tickerText = useMemo(() => {
    return [...activityFeed.map((item) => item.message), `[NOTICE] ${notice}`].join('   ✦   ');
  }, [activityFeed, notice]);

  return (
    <div className="bg-black/80 text-[#00FFFF] text-xs py-1 overflow-hidden whitespace-nowrap border-b border-[#1A0B2E] z-40 relative">
      <div className="inline-block animate-[marquee_22s_linear_infinite] pl-full">{tickerText}</div>
      <style>{`@keyframes marquee {0%{transform:translateX(100%);}100%{transform:translateX(-100%);}}`}</style>
    </div>
  );
};

export const Header = () => {
  const { currentUser, toggleMenu } = useStore();
  const [pulse, setPulse] = useState(false);
  const [delta, setDelta] = useState<number | null>(null);
  const [prevHearts, setPrevHearts] = useState<number>(currentUser?.hearts ?? 0);

  useEffect(() => {
    const hearts = currentUser?.hearts ?? 0;
    const changed = hearts - prevHearts;
    if (changed !== 0) {
      setPulse(true);
      setDelta(changed);
      const t = setTimeout(() => {
        setPulse(false);
        setDelta(null);
      }, 800);
      setPrevHearts(hearts);
      return () => clearTimeout(t);
    }
  }, [currentUser?.hearts, prevHearts]);

  return (
    <header className="sticky top-0 z-50 bg-[#1A0B2E]/90 backdrop-blur-md border-b border-[#FF0080]/30 px-4 py-3 flex justify-between items-center shadow-[0_4px_20px_rgba(255,0,128,0.2)]">
      <button onClick={toggleMenu} className="text-[#00FFFF] active:scale-95 transition-transform duration-150">
        <Menu size={24} />
      </button>
      <div className="font-display text-xl tracking-tighter text-white"><span className="text-[#FF0080]">STAN</span>BEAT</div>
      <div className="flex items-center gap-1 bg-black/40 px-3 py-1 rounded-full border border-[#FF0080]/50 relative">
        <Heart size={16} className={`text-[#FF0080] fill-[#FF0080] ${pulse ? 'animate-pulse' : ''}`} />
        <span className="text-white font-bold text-sm">{currentUser?.hearts ?? 0}</span>
        {delta !== null && (
          <span className="absolute -top-3 -right-1 text-[10px] text-[#00FFFF] font-bold">{delta > 0 ? `+${delta}` : delta}</span>
        )}
      </div>
    </header>
  );
};

export const SideMenu = ({ onOpenLanguage, onOpenHearts }: { onOpenLanguage: () => void; onOpenHearts: () => void }) => {
  const { isMenuOpen, toggleMenu, currentUser, logout, login, setView } = useStore();
  if (!isMenuOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={toggleMenu} />
      <div className="relative w-[80%] max-w-[300px] h-full bg-[#1A0B2E]/90 backdrop-blur-md border-r border-[#FF0080]/30 flex flex-col animate-[slideIn_0.3s_ease-out]">
        <div className="p-6 border-b border-white/10 bg-gradient-to-br from-[#FF0080]/20 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#00FFFF] font-display text-xl">PROFILE</h2>
            <button onClick={toggleMenu}><X className="text-white/70" /></button>
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
              onClick={() => {
                login();
                toggleMenu();
              }}
              className="w-full bg-[#FF0080] text-white py-2 rounded font-bold"
            >
              Login with Google
            </button>
          )}
        </div>
        <div className="flex-1 p-4 space-y-2">
          <MenuItem icon={<Zap size={20} />} label="❤️ Get Free Hearts" color="text-[#FF0080]" onClick={() => { toggleMenu(); onOpenHearts(); }} />
          <MenuItem icon={<Trophy size={20} />} label="🏆 Ranking" onClick={() => { toggleMenu(); setView('LEADERBOARD'); }} />
          <MenuItem icon={<History size={20} />} label="📜 History" onClick={() => { toggleMenu(); setView('LEADERBOARD'); }} />
          <MenuItem icon={<Globe size={20} />} label="🌍 Language" onClick={() => { toggleMenu(); onOpenLanguage(); }} />
          {currentUser?.role === 'ADMIN' && (
            <MenuItem icon={<ShieldAlert size={20} />} label="Admin Dashboard" color="text-red-400" onClick={() => { toggleMenu(); setView('ADMIN'); }} />
          )}
        </div>
        {currentUser && (
          <div className="p-4 border-t border-white/10">
            <button onClick={() => { logout(); toggleMenu(); }} className="flex items-center gap-3 text-white/60 hover:text-white w-full">
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(-100%);} to { transform: translateX(0);} }`}</style>
    </div>
  );
};

const MenuItem = ({ icon, label, color = 'text-white', onClick }: { icon: React.ReactNode; label: string; color?: string; onClick?: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-4 w-full p-3 hover:bg-white/5 active:scale-95 rounded-lg transition-all">
    <div className={color}>{icon}</div>
    <span className="text-white/90 font-medium">{label}</span>
  </button>
);

export const Layout = ({ children, onOpenLanguage, onOpenHearts }: { children?: React.ReactNode; onOpenLanguage: () => void; onOpenHearts: () => void }) => (
  <div className="min-h-screen bg-[#1A0B2E] flex justify-center items-start relative overflow-hidden">
    <video className="fixed inset-0 w-full h-full object-cover opacity-30 blur-sm" autoPlay muted loop playsInline src="https://cdn.coverr.co/videos/coverr-concert-lights-1579/1080p.mp4" />
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
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white"><XCircle /></button>
        <h3 className="text-2xl font-display text-white mb-4 text-center">{title}</h3>
        {children}
      </div>
    </div>
  );
};
