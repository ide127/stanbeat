import React, { useState, useEffect, useRef } from 'react';
import { useStore } from './store';
import { Layout, Modal } from './components/Layout';
import { generateGrid, formatTime, getCountryFlag } from './utils';
import { GridCell, WordConfig } from './types';
import { Share2, Award, Zap, Video, ArrowLeft, RefreshCw, Trash2, Users, DollarSign, Lock, Play } from 'lucide-react';

// --- Helper: Calculate cells between two points for drag selection ---
const getCellsBetween = (startId: string, endId: string, grid: GridCell[]): string[] => {
  const [r1, c1] = startId.split('-').map(Number);
  const [r2, c2] = endId.split('-').map(Number);
  
  const cells: string[] = [];
  
  // Check valid lines
  const isHorz = r1 === r2;
  const isVert = c1 === c2;
  const isDiag = Math.abs(r1 - r2) === Math.abs(c1 - c2);

  if (!isHorz && !isVert && !isDiag) return [startId]; // Invalid drag, just return start

  const steps = Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));
  const rStep = r2 === r1 ? 0 : (r2 > r1 ? 1 : -1);
  const cStep = c2 === c1 ? 0 : (c2 > c1 ? 1 : -1);

  for (let i = 0; i <= steps; i++) {
    const r = r1 + (i * rStep);
    const c = c1 + (i * cStep);
    cells.push(`${r}-${c}`);
  }
  return cells;
};

// --- Screen: Home ---
const HomeScreen = ({ onShowHearts }: { onShowHearts: () => void }) => {
  const { setView, consumeHeart, currentUser, login } = useStore();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handlePlay = () => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    const success = consumeHeart();
    if (success) {
      setView('GAME');
    } else {
      onShowHearts(); // Trigger parent modal
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-6 text-center relative overflow-hidden animate-[fadeIn_0.5s_ease-out]">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#FF0080]/20 to-transparent pointer-events-none" />
      
      <div className="mt-8 mb-6 relative z-10">
        <h1 className="text-5xl font-display text-white mb-2 tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
          FIND <span className="text-[#00FFFF]">BTS</span>
        </h1>
        <h2 className="text-3xl font-display text-[#FF0080] italic glitch">
          FLY TO KOREA ✈️
        </h2>
      </div>

      <div className="w-full h-48 bg-black/50 rounded-xl mb-6 overflow-hidden border border-white/10 relative group shadow-lg">
          <img src="https://picsum.photos/400/200?random=1" alt="Idol" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
              <p className="text-[#00FFFF] font-bold text-sm uppercase tracking-widest">Target: BTS</p>
          </div>
      </div>

      <div className="mb-8">
        <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Season 1 Ends In</p>
        <p className="text-4xl font-mono text-red-500 font-bold tracking-widest drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]">
          04:21:19
        </p>
      </div>

      <div className="w-full mt-auto mb-4">
        <p className="text-white/70 text-sm mb-4">
          Solve the puzzle in record time.<br/>Win a round-trip ticket to Seoul. <span className="text-[10px] text-white/30 align-top">*</span>
        </p>
        <button 
          onClick={handlePlay}
          className="w-full relative overflow-hidden bg-[#FF0080] text-white font-display text-2xl py-5 rounded-xl shadow-[0_0_20px_#FF0080] active:scale-95 transition-all group"
        >
          <div className="absolute inset-0 shimmer" />
          <div className="relative flex items-center justify-center gap-3">
            <Play fill="white" />
            <span>PLAY NOW</span>
            <span className="text-sm bg-black/20 px-2 py-1 rounded text-white/90 font-sans font-bold flex items-center gap-1">
              -1 <div className="w-3 h-3 bg-red-500 transform rotate-45" />
            </span>
          </div>
        </button>
      </div>

      <Modal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} title="Login Required">
        <div className="text-center">
            <p className="text-white/70 mb-6">You need to log in to track your ranking and win the prize.</p>
            <button 
                onClick={() => { login().then(() => setShowLoginModal(false)); }}
                className="w-full bg-white text-black font-bold py-3 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors"
            >
                <div className="w-5 h-5 rounded-full bg-red-500" /> {/* Mock Google Icon */}
                Continue with Google
            </button>
        </div>
      </Modal>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// --- Screen: Game ---
const GameScreen = () => {
  const { setView, updateBestTime } = useStore();
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [words, setWords] = useState<WordConfig[]>([]);
  
  // Selection State
  const [isSelecting, setIsSelecting] = useState(false);
  const [startId, setStartId] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Game State
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [isWon, setIsWon] = useState(false);

  useEffect(() => {
    const { grid: g, wordList } = generateGrid(10, ['RM', 'JIN', 'SUGA', 'HOPE', 'JIMIN', 'V', 'JK']);
    setGrid(g);
    setWords(wordList);
  }, []);

  useEffect(() => {
    if (isWon) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 50);
    return () => clearInterval(interval);
  }, [startTime, isWon]);

  // Pointer Events for Dragging
  const handlePointerDown = (id: string) => {
    if (isWon) return;
    setIsSelecting(true);
    setStartId(id);
    setCurrentId(id);
    setSelectedIds([id]);
  };

  const handlePointerEnter = (id: string) => {
    if (!isSelecting || !startId || isWon) return;
    if (id === currentId) return;

    setCurrentId(id);
    const newPath = getCellsBetween(startId, id, grid);
    setSelectedIds(newPath);
  };

  const handlePointerUp = () => {
    if (!isSelecting || isWon) return;
    setIsSelecting(false);
    
    // Check word
    const selectedLetters = selectedIds.map(id => grid.find(c => c.id === id)?.letter).join('');
    const reversedLetters = selectedLetters.split('').reverse().join('');
    
    const foundWord = words.find(w => !w.found && (w.word === selectedLetters || w.word === reversedLetters));

    if (foundWord) {
      // Mark Found
      const newWords = words.map(w => w.word === foundWord.word ? { ...w, found: true } : w);
      setWords(newWords);
      
      const newGrid = grid.map(c => selectedIds.includes(c.id) ? { ...c, found: true } : c);
      setGrid(newGrid);

      // Check Win
      if (newWords.every(w => w.found)) {
        setIsWon(true);
        updateBestTime(elapsed);
      }
    }
    
    // Reset transient selection
    setStartId(null);
    setCurrentId(null);
    setSelectedIds([]);
  };

  if (isWon) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#1A0B2E] animate-[popIn_0.3s_ease-out]">
        <Award size={64} className="text-[#00FFFF] mb-4 animate-bounce" />
        <h2 className="text-4xl font-display text-white mb-2">MISSION CLEAR!</h2>
        <p className="text-[#FF0080] font-mono text-3xl mb-8">{formatTime(elapsed)}</p>
        
        <div className="w-full bg-white/10 p-6 rounded-xl mb-6 backdrop-blur-md border border-white/20">
            <div className="flex justify-between items-center mb-4">
                <span className="text-white/60">Global Rank</span>
                <span className="text-white font-bold">Top 5%</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-white/60">Reward</span>
                <span className="text-[#00FFFF] font-bold">+50 EXP</span>
            </div>
        </div>

        <button onClick={() => setView('HOME')} className="w-full bg-[#FF0080] text-white font-bold py-4 rounded-xl mb-4 shadow-[0_0_15px_#FF0080] hover:bg-[#FF0080]/90">
            CLAIM REWARD
        </button>
        <button className="flex items-center gap-2 text-white/70 hover:text-white">
            <Share2 size={18} /> Share Result
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 touch-none" onPointerUp={handlePointerUp}>
      {/* HUD */}
      <div className="flex justify-between items-center mb-6">
        <div className="bg-[#FF0080]/20 px-4 py-2 rounded-full border border-[#FF0080]">
            <span className="text-[#FF0080] font-mono font-bold text-xl">{formatTime(elapsed)}</span>
        </div>
        <div className="text-white text-sm">
            Target: <span className="text-[#00FFFF] font-bold">{words.filter(w => !w.found).length}</span> left
        </div>
      </div>

      {/* Grid */}
      <div 
        className="grid grid-cols-10 gap-1 bg-black/40 p-2 rounded-xl border border-white/10 shadow-inner mb-6 touch-none select-none relative"
      >
        {grid.map((cell) => {
          const isSelected = selectedIds.includes(cell.id);
          return (
            <div
              key={cell.id}
              onPointerDown={() => handlePointerDown(cell.id)}
              onPointerEnter={() => handlePointerEnter(cell.id)}
              className={`
                  aspect-square flex items-center justify-center text-sm font-bold rounded transition-colors duration-75 select-none
                  ${cell.found ? 'bg-[#00FFFF] text-black shadow-[0_0_5px_#00FFFF]' : ''}
                  ${!cell.found && isSelected ? 'bg-[#FF0080] text-white scale-95' : ''}
                  ${!cell.found && !isSelected ? 'bg-white/5 text-white/80' : ''}
              `}
            >
              {cell.letter}
            </div>
          );
        })}
      </div>

      {/* Word List */}
      <div className="flex flex-wrap gap-2 justify-center content-start">
        {words.map((w, idx) => (
            <span 
                key={idx} 
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${w.found ? 'bg-white/10 text-white/30 line-through' : 'bg-[#1A0B2E] text-white border border-white/20'}`}
            >
                {w.word}
            </span>
        ))}
      </div>
    </div>
  );
};

// --- Screen: Leaderboard ---
const LeaderboardScreen = () => {
  const { setView, leaderboard, fetchLeaderboard, currentUser } = useStore();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#0D0518]">
      <div className="p-4 flex items-center gap-4 border-b border-white/10 bg-[#1A0B2E]">
        <button onClick={() => setView('HOME')} className="text-white/70 hover:text-white">
            <ArrowLeft />
        </button>
        <h2 className="text-xl font-display text-white">GLOBAL RANKING</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {leaderboard.map((entry, index) => {
            const isTop3 = index < 3;
            return (
                <div 
                    key={entry.id} 
                    className={`flex items-center p-3 rounded-lg border ${entry.isCurrentUser ? 'bg-[#FF0080]/20 border-[#FF0080]' : 'bg-white/5 border-transparent'}`}
                >
                    <div className={`w-8 font-display text-lg ${isTop3 ? 'text-[#00FFFF]' : 'text-white/50'}`}>
                        {entry.rank}
                    </div>
                    <div className="mr-3 text-2xl" title={entry.country}>
                        {getCountryFlag(entry.country)}
                    </div>
                    <div className="flex-1">
                        <p className={`font-bold ${entry.isCurrentUser ? 'text-[#FF0080]' : 'text-white'}`}>
                            {entry.nickname}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="font-mono text-[#00FFFF]">{formatTime(entry.time)}</p>
                    </div>
                </div>
            )
        })}
      </div>

      {/* My Rank Footer */}
      {currentUser && (
        <div className="p-4 bg-[#1A0B2E] border-t border-[#FF0080]/30 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-20">
            <div className="flex justify-between items-center text-sm text-white/70 mb-2">
                <span>My Rank: <span className="text-white font-bold">1,204</span></span>
                <span>Gap to #1: <span className="text-red-400">-15.02s</span></span>
            </div>
            <button onClick={() => setView('GAME')} className="w-full bg-[#00FFFF] text-black font-bold py-3 rounded-lg hover:bg-[#00FFFF]/80">
                BEAT THE SCORE
            </button>
        </div>
      )}
    </div>
  );
};

// --- Screen: Admin ---
const AdminScreen = () => {
    const { setView } = useStore();
    
    const MetricCard = ({ label, value, icon, color }: any) => (
        <div className="bg-[#1A0B2E] p-4 rounded-xl border border-white/5">
            <div className={`flex justify-between items-start mb-2 ${color}`}>
                {icon}
                <span className="text-xs bg-white/10 px-1 rounded text-white/50">+12%</span>
            </div>
            <p className="text-2xl font-bold text-white font-display">{value}</p>
            <p className="text-xs text-white/40">{label}</p>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col p-4 space-y-6 overflow-y-auto">
             <div className="flex items-center justify-between">
                <button onClick={() => setView('HOME')} className="text-white/70">
                    <ArrowLeft />
                </button>
                <h2 className="text-white font-display text-xl">ADMIN DASHBOARD</h2>
                <div className="w-6" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <MetricCard label="DAU" value="14.2k" icon={<Users />} color="text-[#00FFFF]" />
                <MetricCard label="Revenue" value="$4,203" icon={<DollarSign />} color="text-green-400" />
                <MetricCard label="Games Played" value="89.1k" icon={<Play />} color="text-[#FF0080]" />
                <MetricCard label="Reports" value="2" icon={<Lock />} color="text-red-500" />
            </div>

            {/* Actions */}
            <div className="bg-[#1A0B2E] p-4 rounded-xl border border-white/5 space-y-4">
                <h3 className="text-white font-bold mb-2">Operations</h3>
                <button className="w-full flex items-center justify-between bg-red-500/10 text-red-500 p-3 rounded-lg border border-red-500/20 hover:bg-red-500/20">
                    <span className="flex items-center gap-2"><Trash2 size={16} /> Reset Season</span>
                    <span className="text-xs">Danger</span>
                </button>
                 <button className="w-full flex items-center justify-between bg-blue-500/10 text-blue-400 p-3 rounded-lg border border-blue-500/20 hover:bg-blue-500/20">
                    <span className="flex items-center gap-2"><RefreshCw size={16} /> Generate Dummy Bots</span>
                    <span className="text-xs">Safe</span>
                </button>
            </div>

             {/* User List Mock */}
             <div className="bg-[#1A0B2E] p-4 rounded-xl border border-white/5">
                <h3 className="text-white font-bold mb-4">Suspicious Users</h3>
                {[1,2,3].map(i => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-gray-700" />
                             <div>
                                 <p className="text-white text-sm">SpeedRunner_{i}</p>
                                 <p className="text-[10px] text-red-400">0.5s clear time</p>
                             </div>
                        </div>
                        <button className="px-3 py-1 bg-red-500 text-white text-xs rounded">BAN</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Global Modals ---
const LanguageModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const languages = [
        { code: 'KR', name: '한국어' }, { code: 'US', name: 'English' }, { code: 'JP', name: '日本語' },
        { code: 'CN', name: '中文' }, { code: 'ID', name: 'Bahasa' }, { code: 'TH', name: 'ไทย' },
        { code: 'VN', name: 'Tiếng Việt' }, { code: 'ES', name: 'Español' }, { code: 'BR', name: 'Português' },
        { code: 'RU', name: 'Русский' }, { code: 'FR', name: 'Français' }, { code: 'SA', name: 'العربية' }
    ];
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Select Language">
            <div className="grid grid-cols-3 gap-3">
                {languages.map(lang => (
                    <button key={lang.code} className="flex flex-col items-center justify-center p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <span className="text-2xl mb-1">{getCountryFlag(lang.code)}</span>
                        <span className="text-xs text-white/70">{lang.name}</span>
                    </button>
                ))}
            </div>
        </Modal>
    );
};

const HeartsModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { addHeart } = useStore();
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Get More Hearts">
            <div className="space-y-4">
                 <button 
                    onClick={() => { addHeart(1); onClose(); }}
                    className="w-full flex items-center justify-between bg-[#00FFFF] text-black p-4 rounded-xl font-bold shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:scale-105 transition-transform"
                >
                     <div className="flex items-center gap-3">
                        <Video size={24} />
                        <div className="text-left">
                            <p className="leading-tight">Watch Ad</p>
                            <p className="text-[10px] font-normal opacity-70">Support us & get +1 ❤️</p>
                        </div>
                     </div>
                     <span className="bg-black/20 px-2 py-1 rounded text-xs">FREE</span>
                 </button>

                 <button className="w-full flex items-center justify-between bg-[#FF0080] text-white p-4 rounded-xl font-bold shadow-[0_0_15px_rgba(255,0,128,0.4)] hover:scale-105 transition-transform">
                     <div className="flex items-center gap-3">
                        <Share2 size={24} />
                        <div className="text-left">
                            <p className="leading-tight">Invite Friend</p>
                            <p className="text-[10px] font-normal opacity-70">Both get +1 ❤️ instantly</p>
                        </div>
                     </div>
                     <span className="bg-black/20 px-2 py-1 rounded text-xs">+1 Heart</span>
                 </button>
                 
                 <div className="text-center pt-2">
                     <p className="text-[10px] text-white/40">Daily free refill in: 02:59:12</p>
                 </div>
            </div>
        </Modal>
    );
};

// --- Main App ---
export default function App() {
  const { currentView } = useStore();
  const [showLang, setShowLang] = useState(false);
  const [showHearts, setShowHearts] = useState(false);

  return (
    <Layout 
        onOpenLanguage={() => setShowLang(true)}
        onOpenHearts={() => setShowHearts(true)}
    >
      {currentView === 'HOME' && <HomeScreen onShowHearts={() => setShowHearts(true)} />}
      {currentView === 'GAME' && <GameScreen />}
      {currentView === 'LEADERBOARD' && <LeaderboardScreen />}
      {currentView === 'ADMIN' && <AdminScreen />}
      
      <LanguageModal isOpen={showLang} onClose={() => setShowLang(false)} />
      <HeartsModal isOpen={showHearts} onClose={() => setShowHearts(false)} />

      {/* Footer Legal Trap (Only on Home/Leaderboard) */}
      {(currentView === 'HOME' || currentView === 'LEADERBOARD') && (
         <footer className="bg-[#050208] p-4 text-center pb-8 border-t border-white/5">
            <p className="text-[10px] text-[#333] leading-tight">
            * Prizes are subject to availability. Participation implies acceptance of Terms. 
            Flight tickets are economy class only. Taxes not included. 
            Winner must be 18+ or have guardian consent. 
            StanBeat is not affiliated with HYBE, JYP, or YG Entertainment.
            </p>
        </footer>
      )}
    </Layout>
  );
}