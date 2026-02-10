import React, { useEffect, useState } from 'react';
import { Menu, Heart, X, Zap, Trophy, History, Globe, LogOut, XCircle, ShieldAlert } from 'lucide-react';
import { useStore } from '../store';

// --- Ticker Component ---
export const Ticker = () => {
  return (
    <div className="bg-black/80 text-[#00FFFF] text-xs py-1 overflow-hidden whitespace-nowrap border-b border-[#1A0B2E] z-40 relative">
      <div className="inline-block animate-[marquee_20s_linear_infinite]">
        <span className="mx-4">[LIVE] cuteTiger_4819 just reached TOP 1% 🔥</span>
        <span className="mx-4 text-[#FF0080]">[ALERT] Season 1 ends in 4 hours!</span>
        <span className="mx-4">[LIVE] army_love_7 charged 3 hearts ❤️</span>
        <span className="mx-4">[RANK] New record! 00:34.12 by shiny_v_1234 🏆</span>
        <span className="mx-4 text-yellow-400">[EVENT] Invite a friend, get +1 Heart immediately!</span>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};

// --- Header Component ---
export const Header = () => {
  const { currentUser, toggleMenu } = useStore();
  const [animateHeart, setAnimateHeart] = useState(false);

  useEffect(() => {
    if (currentUser?.hearts) {
      setAnimateHeart(true);
      const timer = setTimeout(() => setAnimateHeart(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [currentUser?.hearts]);

  return (
    <header className="sticky top-0 z-50 bg-[#1A0B2E]/90 backdrop-blur-md border-b border-[#FF0080]/30 px-4 py-3 flex justify-between items-center shadow-[0_4px_20px_rgba(255,0,128,0.2)]">
      <button onClick={toggleMenu} className="text-[#00FFFF] hover:scale-110 transition-transform duration-200">
        <Menu size={24} />
      </button>
      
      <div className="font-display text-xl tracking-tighter text-white">
        <span className="text-[#FF0080]">STAN</span>BEAT
      </div>

      <div className="flex items-center gap-1 bg-black/40 px-3 py-1 rounded-full border border-[#FF0080]/50">
        <Heart 
          size={16} 
          className={`text-[#FF0080] fill-[#FF0080] ${animateHeart ? 'animate-ping' : ''}`} 
        />
        <span className="text-white font-bold text-sm">{currentUser?.hearts || 0}</span>
      </div>
    </header>
  );
};

// --- Side Menu Component ---
export const SideMenu = ({ 
  onOpenLanguage, 
  onOpenHearts 
}: { 
  onOpenLanguage: () => void, 
  onOpenHearts: () => void 
}) => {
  const { isMenuOpen, toggleMenu, currentUser, logout, login, setView } = useStore();

  if (!isMenuOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={toggleMenu} />
      <div className="relative w-[80%] max-w-[300px] h-full bg-[#1A0B2E] border-r border-[#FF0080]/30 shadow-[0_0_50px_rgba(255,0,128,0.3)] flex flex-col animate-[slideIn_0.3s_ease-out]">
        
        {/* Profile Section */}
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
                <p className="text-xs text-white/50">Best: {currentUser.bestTime ? (currentUser.bestTime/1000).toFixed(2)+'s' : 'N/A'}</p>
              </div>
            </div>
          ) : (
            <button onClick={() => { login(); toggleMenu(); }} className="w-full bg-[#FF0080] text-white py-2 rounded font-bold hover:bg-[#FF0080]/80">
              Login to Save Progress
            </button>
          )}
        </div>

        {/* Menu Items */}
        <div className="flex-1 p-4 space-y-2">
            <MenuItem 
                icon={<Zap size={20} />} 
                label="Get Free Hearts" 
                color="text-[#FF0080]" 
                onClick={() => { toggleMenu(); onOpenHearts(); }}
            />
            <MenuItem 
                icon={<Trophy size={20} />} 
                label="Ranking" 
                onClick={() => { toggleMenu(); setView('LEADERBOARD'); }}
            />
            {/* History not implemented fully, redirect to Leaderboard for now or Home */}
            <MenuItem 
                icon={<History size={20} />} 
                label="History" 
                onClick={() => { toggleMenu(); }} // Placeholder
            />
            <MenuItem 
                icon={<Globe size={20} />} 
                label="Language" 
                onClick={() => { toggleMenu(); onOpenLanguage(); }}
            />
            
            {/* Admin Link Mockup */}
            {currentUser && (
                <MenuItem 
                    icon={<ShieldAlert size={20} />} 
                    label="Admin (Dev)" 
                    color="text-red-500"
                    onClick={() => { toggleMenu(); setView('ADMIN'); }}
                />
            )}
        </div>

        {/* Logout */}
        {currentUser && (
          <div className="p-4 border-t border-white/10">
            <button onClick={() => { logout(); toggleMenu(); }} className="flex items-center gap-3 text-white/60 hover:text-white w-full">
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
       <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

const MenuItem = ({ icon, label, color = "text-white", onClick }: { icon: React.ReactNode, label: string, color?: string, onClick?: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-4 w-full p-3 hover:bg-white/5 rounded-lg transition-colors group">
    <div className={`${color} group-hover:scale-110 transition-transform`}>{icon}</div>
    <span className="text-white/90 font-medium">{label}</span>
  </button>
);

// --- Layout Wrapper ---
export const Layout = ({ children, onOpenLanguage, onOpenHearts }: { children?: React.ReactNode, onOpenLanguage: () => void, onOpenHearts: () => void }) => {
  return (
    <div className="min-h-screen bg-black flex justify-center items-start bg-[url('https://picsum.photos/seed/kpopbg/1000/1000')] bg-cover bg-fixed">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-0" />
      
      <div className="w-full max-w-[430px] min-h-screen bg-[#0D0518] relative z-10 shadow-2xl flex flex-col">
        <Header />
        <Ticker />
        <main className="flex-1 flex flex-col relative">
          {children}
        </main>
        <SideMenu onOpenLanguage={onOpenLanguage} onOpenHearts={onOpenHearts} />
      </div>
    </div>
  );
};

// --- Modal ---
export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-[#1A0B2E] w-full max-w-sm rounded-2xl border border-[#FF0080]/40 shadow-[0_0_30px_rgba(255,0,128,0.4)] relative p-6 animate-[popIn_0.2s_ease-out]">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
            <XCircle />
        </button>
        <h3 className="text-2xl font-display text-white mb-4 text-center">{title}</h3>
        {children}
      </div>
      <style>{`
        @keyframes popIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}