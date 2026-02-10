import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, DollarSign, Play, RefreshCw, Share2, ShieldAlert, Trash2, Users, Video } from 'lucide-react';
import { Layout, Modal } from './components/Layout';
import { languageOptions, t } from './i18n';
import { useStore } from './store';
import { GridCell, WordConfig } from './types';
import { formatTime, generateGrid, getCountryFlag } from './utils';

const TARGET_WORDS = ['RM', 'JIN', 'SUGA', 'HOPE', 'JIMIN', 'V', 'JK'];

const HomeScreen = ({ onShowHearts }: { onShowHearts: () => void }) => {
  const { setView, consumeHeart, currentUser, login, language, termsAccepted, acceptTerms, seasonEndsAt } = useStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [rewardIndex, setRewardIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRewardIndex((prev) => (prev + 1) % 3);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const remainingText = useMemo(() => {
    const remainMs = Math.max(0, seasonEndsAt - Date.now());
    const totalSec = Math.floor(remainMs / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }, [seasonEndsAt]);

  useEffect(() => {
    const timer = setInterval(() => {
      // trigger re-render for countdown
      setRewardIndex((prev) => prev);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePlay = () => {
    navigator.vibrate?.(25);

    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    if (!termsAccepted) {
      setShowTermsModal(true);
      return;
    }

    const consumed = consumeHeart();
    if (!consumed) {
      onShowHearts();
      return;
    }

    setView('GAME');
  };

  const rewardImages = [
    'https://picsum.photos/seed/plane-ticket/420/200',
    'https://picsum.photos/seed/bts-goods/420/200',
    'https://picsum.photos/seed/seoul-night/420/200',
  ];

  return (
    <div className="flex-1 flex flex-col p-6 text-center">
      <h1 className="text-4xl text-white font-black tracking-tight mt-4 glitch">{t(language, 'homeTitle')}</h1>

      <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 relative h-48">
        <img src="https://picsum.photos/seed/bts-cutout/420/220" alt="BTS" className="w-full h-full object-cover opacity-85" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <p className="absolute left-3 bottom-3 text-[#00FFFF] text-xs font-bold uppercase">{t(language, 'homeTarget')}</p>
      </div>

      <div className="mt-5">
        <p className="text-white/60 text-xs uppercase">{t(language, 'seasonEnds')}</p>
        <p className="text-red-500 text-3xl font-mono font-black">{remainingText}</p>
      </div>

      <p className="text-white/70 text-sm mt-4">
        최단 시간에 멤버 이름을 찾으세요. 1위에게는 서울행 항공권을 드립니다.
        <span className="text-[10px] text-white/40 align-top">* Terms apply</span>
      </p>

      <button
        onClick={handlePlay}
        className="w-full mt-5 relative overflow-hidden bg-[#FF0080] text-white font-black text-2xl py-5 rounded-2xl active:scale-95 transition-transform"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_linear_infinite]" />
        <div className="relative flex items-center justify-center gap-3">
          <Play fill="white" />
          <span>{t(language, 'playNow')}</span>
        </div>
      </button>

      <div className="mt-4 rounded-xl overflow-hidden border border-white/10 bg-black/30">
        <img src={rewardImages[rewardIndex]} alt="reward" className="w-full h-24 object-cover" />
        <p className="text-white/80 text-xs py-2">이 모든 것이 당신의 것일 수 있습니다.</p>
      </div>

      <Modal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} title={t(language, 'loginRequired')}>
        <p className="text-white/70 text-sm mb-4">{t(language, 'loginPrompt')}</p>
        <button
          onClick={() => {
            login().then(() => setShowLoginModal(false));
          }}
          className="w-full bg-white text-black font-bold py-3 rounded-xl"
        >
          {t(language, 'continueGoogle')}
        </button>
      </Modal>

      <Modal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} title="서비스 이용약관">
        <label className="flex items-start text-white/80 text-sm gap-2 mb-4 text-left">
          <input type="checkbox" defaultChecked />
          서비스 이용약관 및 경품 지급 정책에 동의합니다.
        </label>
        <button
          onClick={() => {
            acceptTerms();
            setShowTermsModal(false);
          }}
          className="w-full bg-[#00FFFF] text-black font-bold py-2 rounded-lg"
        >
          동의하고 계속
        </button>
      </Modal>

      <style>{`@keyframes shimmer {0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
    </div>
  );
};

const GameScreen = () => {
  const { setView, updateBestTime } = useStore();
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [words, setWords] = useState<WordConfig[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startId, setStartId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const startMs = useState(Date.now())[0];

  useEffect(() => {
    const { grid: generated, wordList } = generateGrid(10, TARGET_WORDS);
    setGrid(generated);
    setWords(wordList);
  }, []);

  useEffect(() => {
    if (won) return;
    const timer = setInterval(() => {
      setElapsed(Date.now() - startMs);
    }, 10);
    return () => clearInterval(timer);
  }, [won, startMs]);

  useEffect(() => {
    if (words.length > 0 && words.every((word) => word.found)) {
      setWon(true);
      updateBestTime(elapsed);
    }
  }, [elapsed, updateBestTime, words]);

  const commitSelection = (ids: string[]) => {
    const text = ids.map((id) => grid.find((cell) => cell.id === id)?.letter ?? '').join('');
    const reverse = text.split('').reverse().join('');
    const matched = words.find((word) => !word.found && (word.word === text || word.word === reverse));

    if (!matched) return;

    setWords((prev) => prev.map((word) => (word.word === matched.word ? { ...word, found: true } : word)));
    setGrid((prev) => prev.map((cell) => (ids.includes(cell.id) ? { ...cell, found: true } : cell)));
  };

  const handlePointerDown = (id: string) => {
    setStartId(id);
    setSelectedIds([id]);
  };

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

  if (won) {
    return <ResultScreen elapsed={elapsed} />;
  }

  return (
    <div className="flex-1 p-4" onPointerUp={handlePointerUp}>
      <div className="flex items-center justify-between mb-4">
        <div className="bg-[#FF0080]/20 border border-[#FF0080] rounded-full px-3 py-1 text-[#FF0080] font-mono font-bold">{formatTime(elapsed)}</div>
        <button onClick={() => setView('HOME')} className="text-white/70 hover:text-white">Exit</button>
      </div>

      <div className="grid grid-cols-10 gap-1 bg-black/40 p-2 rounded-xl border border-white/10 select-none">
        {grid.map((cell) => {
          const selected = selectedIds.includes(cell.id);
          return (
            <div
              key={cell.id}
              onPointerDown={() => handlePointerDown(cell.id)}
              onPointerEnter={() => handlePointerEnter(cell.id)}
              className={`aspect-square rounded flex items-center justify-center text-xs font-bold ${cell.found ? 'bg-[#00FFFF] text-black' : selected ? 'bg-[#FF0080] text-white' : 'bg-white/5 text-white/80'}`}
            >
              {cell.letter}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {words.map((word) => (
          <span
            key={word.word}
            className={`text-xs px-2 py-1 rounded ${word.found ? 'bg-white/10 text-white/40 line-through' : 'bg-[#1A0B2E] text-white border border-white/20'}`}
          >
            {word.word}
          </span>
        ))}
      </div>
    </div>
  );
};

const ResultScreen = ({ elapsed }: { elapsed: number }) => {
  const { setView } = useStore();

  return (
    <div className="flex-1 p-6 flex flex-col items-center text-center">
      <h2 className="text-[#00FFFF] text-4xl font-black mb-2">TOP 1% ARMY</h2>
      <p className="text-white/70 mb-4">Clear Time: {formatTime(elapsed)}</p>

      <div className="w-full max-w-[250px] aspect-[9/16] bg-gradient-to-b from-[#FF0080]/40 to-[#00FFFF]/30 border border-white/20 rounded-2xl p-4 mb-4">
        <h3 className="text-white text-2xl font-black mt-8">Rank #42</h3>
        <p className="text-white/80 text-xs mt-2">QR: stanbeat.app/invite/u42</p>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full">
        <button className="bg-white text-black rounded-lg py-2 text-sm font-bold">이미지 저장</button>
        <button className="bg-[#FF0080] text-white rounded-lg py-2 text-sm font-bold">인스타 공유</button>
      </div>

      <button onClick={() => setView('GAME')} className="mt-3 text-white/80 underline">다시 도전하기</button>
    </div>
  );
};

const LeaderboardScreen = () => {
  const { setView, leaderboard, fetchLeaderboard, currentUser, language } = useStore();

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const myEntry = leaderboard.find((entry) => entry.isCurrentUser);
  const topTime = leaderboard[0]?.time ?? 0;
  const gapSeconds = myEntry ? ((myEntry.time - topTime) / 1000).toFixed(2) : '15.00';

  return (
    <div className="flex-1 flex flex-col bg-[#0D0518]">
      <div className="p-4 flex items-center gap-4 border-b border-white/10 bg-[#1A0B2E]">
        <button onClick={() => setView('HOME')} className="text-white/70 hover:text-white"><ArrowLeft /></button>
        <h2 className="text-xl font-black text-white">{t(language, 'rankingTitle')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {leaderboard.filter((entry) => !entry.banned).map((entry, index) => (
          <div key={entry.id} className={`flex items-center p-3 rounded-lg border ${entry.isCurrentUser ? 'bg-[#FF0080]/20 border-[#FF0080]' : 'bg-white/5 border-transparent'}`}>
            <div className="w-8 text-lg text-center">{index < 3 ? ['🥇', '🥈', '🥉'][index] : entry.rank}</div>
            <img src={entry.avatarUrl} alt={entry.nickname} className="w-8 h-8 rounded-full mr-2" />
            <div className="mr-2 text-xl" title={entry.country}>{getCountryFlag(entry.country)}</div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">{entry.nickname}</p>
              <p className="text-white/40 text-[10px]">{entry.isBot ? 'BOT' : 'PLAYER'}</p>
            </div>
            <p className="font-mono text-[#00FFFF]">{formatTime(entry.time)}</p>
          </div>
        ))}
      </div>

      {currentUser && (
        <div className="sticky bottom-0 p-4 bg-[#1A0B2E] border-t border-[#FF0080]/30">
          <div className="flex justify-between text-sm text-white/70 mb-2">
            <span>현재 {myEntry?.rank ?? 1204}위</span>
            <span>1위까지 -{gapSeconds}초 단축 필요!</span>
          </div>
          <button onClick={() => setView('GAME')} className="w-full bg-[#00FFFF] text-black font-bold py-3 rounded-lg">
            {t(language, 'retry')}
          </button>
        </div>
      )}
    </div>
  );
};

const AdminScreen = () => {
  const {
    setView,
    leaderboard,
    heartsUsedToday,
    adRevenue,
    notice,
    setNotice,
    resetSeason,
    generateDummyBots,
    banUser,
    currentUser,
    editUserHeart,
  } = useStore();

  const [noticeDraft, setNoticeDraft] = useState(notice);
  const [heartDraft, setHeartDraft] = useState(3);

  const riskWarning = leaderboard.some((entry) => entry.time <= 1000);
  const dau = leaderboard.filter((entry) => !entry.banned).length;

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setView('HOME')} className="text-white/70"><ArrowLeft /></button>
        <h2 className="text-white font-black text-xl">ADMIN DASHBOARD</h2>
        <div className="w-5" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="DAU" value={String(dau)} icon={<Users />} color="text-[#00FFFF]" />
        <MetricCard label="Ad Revenue" value={`$${adRevenue.toFixed(2)}`} icon={<DollarSign />} color="text-green-400" />
        <MetricCard label="Total Hearts Used" value={String(heartsUsedToday)} icon={<Play />} color="text-[#FF0080]" />
        <MetricCard label="Risk Meter" value={riskWarning ? 'Warning' : 'Normal'} icon={<ShieldAlert />} color={riskWarning ? 'text-red-400' : 'text-[#00FFFF]'} />
      </div>

      <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10 space-y-3">
        <button onClick={resetSeason} className="w-full bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg py-2 flex items-center justify-center gap-2">
          <Trash2 size={16} /> Reset Season
        </button>
        <button onClick={() => generateDummyBots(50)} className="w-full bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-lg py-2 flex items-center justify-center gap-2">
          <RefreshCw size={16} /> 봇 50명 생성 (40~60초)
        </button>
      </div>

      <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10">
        <p className="text-white font-semibold mb-2">공지사항 및 팝업 설정</p>
        <textarea className="w-full h-20 bg-black/30 rounded p-2 text-white" value={noticeDraft} onChange={(e) => setNoticeDraft(e.target.value)} />
        <button onClick={() => setNotice(noticeDraft)} className="mt-2 bg-[#00FFFF] text-black font-bold px-3 py-1 rounded">저장</button>
      </div>

      <div className="bg-[#1A0B2E] rounded-xl p-4 border border-white/10 space-y-2">
        <p className="text-white font-semibold mb-2">유저 관리</p>
        {leaderboard.filter((entry) => !entry.banned).slice(0, 8).map((entry) => (
          <div key={entry.id} className="flex items-center justify-between bg-black/20 p-2 rounded">
            <div className="flex items-center gap-2">
              <img src={entry.avatarUrl} className="w-8 h-8 rounded-full" />
              <div>
                <p className="text-white text-sm">{entry.nickname}</p>
                <p className="text-white/50 text-xs">{formatTime(entry.time)}</p>
              </div>
            </div>
            {!entry.isCurrentUser && (
              <button onClick={() => banUser(entry.id)} className="bg-red-500 text-white text-xs px-2 py-1 rounded">BAN</button>
            )}
          </div>
        ))}

        {currentUser && (
          <div className="pt-2 border-t border-white/10">
            <p className="text-white/70 text-xs mb-1">내 하트 강제 지급(테스트)</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={3}
                value={heartDraft}
                onChange={(e) => setHeartDraft(Number(e.target.value))}
                className="w-16 bg-black/30 text-white rounded px-2 py-1"
              />
              <button onClick={() => editUserHeart(currentUser.id, heartDraft)} className="bg-white/10 text-white px-3 py-1 rounded text-xs">Apply</button>
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

const LanguageModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { setLanguage, language } = useStore();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Language">
      <div className="grid grid-cols-3 gap-2">
        {languageOptions.map((option) => (
          <button
            key={option.code}
            onClick={() => setLanguage(option.code)}
            className={`rounded-lg p-2 border ${language === option.code ? 'bg-[#00FFFF]/20 border-[#00FFFF]' : 'bg-white/5 border-transparent'}`}
          >
            <p className="text-2xl">{option.flag}</p>
            <p className="text-[10px] text-white/80">{option.name}</p>
          </button>
        ))}
      </div>
    </Modal>
  );
};

const HeartsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { addHeart, claimDailyHeart, language } = useStore();
  const [seconds, setSeconds] = useState(3 * 60 * 60);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t(language, 'heartsTitle')}>
      <div className="space-y-3">
        <p className="text-white/70 text-xs">{t(language, 'nextHeart')}: {hh}:{mm}:{ss}</p>

        <button onClick={() => { addHeart(1); onClose(); }} className="w-full rounded-xl p-3 bg-[#00FFFF] text-black font-bold flex items-center justify-center gap-2">
          <Video size={18} /> {t(language, 'watchAd')}
        </button>

        <button className="w-full rounded-xl p-3 bg-[#FF0080] text-white font-bold flex items-center justify-center gap-2">
          <Share2 size={18} /> {t(language, 'inviteFriend')}
        </button>

        <button onClick={() => claimDailyHeart()} className="w-full rounded-xl p-3 bg-white/10 text-white text-sm">
          Daily 무료 하트 받기 (+1 ❤️)
        </button>

        <p className="text-[11px] text-white/50">{t(language, 'missionGet')}</p>
        <p className="text-[11px] text-white/50">{t(language, 'maxHearts')}</p>
      </div>
    </Modal>
  );
};

export default function App() {
  const { currentView, language } = useStore();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showHeartsModal, setShowHeartsModal] = useState(false);

  return (
    <Layout onOpenLanguage={() => setShowLanguageModal(true)} onOpenHearts={() => setShowHeartsModal(true)}>
      {currentView === 'HOME' && <HomeScreen onShowHearts={() => setShowHeartsModal(true)} />}
      {currentView === 'GAME' && <GameScreen />}
      {currentView === 'LEADERBOARD' && <LeaderboardScreen />}
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
