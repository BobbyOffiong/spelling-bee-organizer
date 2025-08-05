// pages/competition.tsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import BeeFlyer from '@/components/BeeFlyer';
import Footer from '@/components/Footer';
import toast, { Toaster } from 'react-hot-toast';
import CompetitorRegistrationForm from '@/components/CompetitorRegistrationForm';
import CompetitorRoundDisplay from '@/components/CompetitorRoundDisplay';
import Timer from '@/components/Timer';
import Confetti from 'react-confetti';

// --- Firebase Imports ---
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Competitor {
  id: string;
  name: string;
  isEliminated: boolean;
  isCurrentTurn: boolean;
  score: number;
}

export default function CompetitionPage() {
  const [passkey, setPasskey] = useState('');
  const [loadedData, setLoadedData] = useState<any>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [inputNumber, setInputNumber] = useState('');
  const [inputWord, setInputWord] = useState('');
  const [feedback, setFeedback] = useState('');
  const [correctWord, setCorrectWord] = useState('');
  const [typedWord, setTypedWord] = useState('');
  const [isFlying, setIsFlying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- COMPETITOR MANAGEMENT & UI FLOW ---
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [roundCompetitorStates, setRoundCompetitorStates] = useState<Map<number, Competitor[]>>(new Map());
  const [showPasskeyInput, setShowPasskeyInput] = useState(true);
  const [showCompetitorRegistration, setShowCompetitorRegistration] = useState(false);
  const [showRoundSelection, setShowRoundSelection] = useState(false);
  const [showCompetitionUI, setShowCompetitionUI] = useState(false);
  const [finalWinner, setFinalWinner] = useState<Competitor | null>(null);

  // --- NEW STATE FOR REVIEWING PREVIOUS ROUND ---
  const [isReviewingPastRound, setIsReviewingPastRound] = useState(false); //

  // --- TIMER STATE ---
  const [timerDuration, setTimerDuration] = useState(30);
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [selectedSpellerId, setSelectedSpellerId] = useState<string | null>(null);

  // --- MODAL STATE ---
  const [showResultModal, setShowResultModal] = useState(false);
  const [showSpellingInputOnly, setShowSpellingInputOnly] = useState(false);

  const [windowDimension, setWindowDimension] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);
  const winnerSoundRef = useRef<HTMLAudioElement | null>(null);
  const competitorsScrollRef = useRef<HTMLDivElement>(null);

  const activeCompetitorsInRound = competitors.filter(comp => !comp.isEliminated);
  const currentCompetitor = activeCompetitorsInRound.find(comp => comp.id === selectedSpellerId) || null;

  const startSpellingTurn = useCallback(() => {
    if (!selectedSpellerId) {
      toast.error("Please select a competitor first to start their turn.");
      return;
    }
    setTimerIsRunning(true);
    setFeedback('');
    setCorrectWord('');
    setTypedWord('');
    setInputWord('');
    setShowSpellingInputOnly(true);

    setTimeout(() => {
      document.getElementById('spelling-input')?.focus();
    }, 100);
  }, [selectedSpellerId]);

  const handleTimerEnd = useCallback(() => {
    setTimerIsRunning(false);
    toast.error(`${currentCompetitor?.name || 'Current speller'}'s time is up!`);
  }, [currentCompetitor?.name]);

  const handleLoad = async () => {
    setIsLoading(true);
    setLoadedData(null);
    setFeedback('');
    setCorrectWord('');
    setTypedWord('');
    setCurrentRound(1);
    setCompetitors([]);
    setFinalWinner(null);
    setSelectedSpellerId(null);
    setTimerIsRunning(false);
    setShowSpellingInputOnly(false);
    setRoundCompetitorStates(new Map());
    setIsReviewingPastRound(false); // Reset on new load

    if (!passkey.trim()) {
      toast.error("Please enter a passkey.");
      setIsLoading(false);
      return;
    }

    const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!FIREBASE_PROJECT_ID) {
      toast.error("Firebase Project ID is not configured. Check .env.local");
      setIsLoading(false);
      return;
    }

    try {
      const competitionsRef = collection(db, `artifacts/${FIREBASE_PROJECT_ID}/public/data/competitions`);
      const q = query(competitionsRef, where("passkey", "==", passkey.trim()));
      const competitionSnapshots = await getDocs(q);

      if (competitionSnapshots.empty) {
        toast.error('Competition not found or passkey is incorrect.');
        setIsLoading(false);
        return;
      }

      const competitionDoc = competitionSnapshots.docs[0];
      const competitionData = competitionDoc.data();
      const competitionId = competitionDoc.id;

      const roundsRef = collection(db, `artifacts/${FIREBASE_PROJECT_ID}/public/data/competitions/${competitionId}/rounds`);
      const roundsSnapshots = await getDocs(roundsRef);

      const roundsOrganized: { [key: string]: { word: string }[] } = {};
      roundsSnapshots.forEach(roundDoc => {
        const roundNumber = roundDoc.id;
        const roundWordsData = roundDoc.data();
        roundsOrganized[`Round ${roundNumber}`] = roundWordsData.words || [];
      });


      setLoadedData({
        competitionName: competitionData.competitionName,
        rounds: roundsOrganized,
        competitionId: competitionId
      });

      setShowPasskeyInput(false);
      setIsFlying(true);
      setTimeout(() => {
        setIsFlying(false);
        setShowCompetitorRegistration(true);
        setIsLoading(false);
      }, 3000);

    } catch (error) {
      console.error('Error loading competition:', error);
      toast.error('Failed to load competition. Please try again.');
      setIsLoading(false);
    }
  };

  const handleRegisterCompetitors = (registeredCompetitors: Competitor[]) => {
    setCompetitors(registeredCompetitors);
    setRoundCompetitorStates(prev => new Map(prev).set(1, JSON.parse(JSON.stringify(registeredCompetitors))));
  };

  const handleStartCompetitionUI = () => {
    setShowCompetitorRegistration(false);
    setShowCompetitionUI(true);
    setCurrentRound(1);
  };

  const handleConfirmRoundWinners = (winners: Competitor[]) => {
    const updatedCompetitors = competitors.map(comp => ({
      ...comp,
      isEliminated: !winners.some(winner => winner.id === comp.id),
      isCurrentTurn: false
    }));

    // Save the state of competitors for the *current* round (after eliminations)
    setRoundCompetitorStates(prev => new Map(prev).set(currentRound, JSON.parse(JSON.stringify(updatedCompetitors))));
    setCompetitors(updatedCompetitors);

    const remainingCompetitors = updatedCompetitors.filter(comp => !comp.isEliminated);

    // --- MODIFIED LOGIC HERE ---
    if (isReviewingPastRound) { // If we were reviewing a past round
        setIsReviewingPastRound(false); // Reset the flag
        setShowRoundSelection(false); // Hide selection UI
        setShowCompetitionUI(true); // Go back to the spelling UI for the *current* round (the one we just reviewed)
        setSelectedSpellerId(null); // Reset selected speller for consistency
        setTimerIsRunning(false); // Stop timer
        setShowSpellingInputOnly(false); // Hide spelling input
        toast(`Winners for Round ${currentRound} updated. Back to spelling.`); //
    } else if (remainingCompetitors.length === 1) {
      setFinalWinner(remainingCompetitors[0]);
      setShowRoundSelection(false);
      setShowCompetitionUI(false);
      if (winnerSoundRef.current) {
        winnerSoundRef.current.play();
      }
      toast.success(`${remainingCompetitors[0].name} wins the competition!`);
    } else {
      const nextRoundNumber = currentRound + 1;
      setCurrentRound(nextRoundNumber);
      setShowRoundSelection(false);
      setShowCompetitionUI(true);
      setSelectedSpellerId(null);
      setTimerIsRunning(false);
      setShowSpellingInputOnly(false);
      toast.success(`Round ${nextRoundNumber} will now begin! Please select a speller.`);
    }
  };

  const closeResultModal = () => {
    setShowResultModal(false);
    setFeedback('');
    setCorrectWord('');
    setTypedWord('');
  };

  const handleCheck = () => {
    setTimerIsRunning(false);

    if (!loadedData || !loadedData.rounds) {
      toast.error("Competition data not loaded.");
      return;
    }
    if (!currentCompetitor) {
      toast.error("Please select a competitor to spell.");
      return;
    }

    const roundKey = `Round ${currentRound}`;
    const roundWords = loadedData.rounds[roundKey] || [];

    const index = parseInt(inputNumber) - 1;

    if (isNaN(index) || index < 0 || index >= roundWords.length) {
      toast.error('Invalid word number for this round.');
      return;
    }

    const wordFromData = roundWords[index]?.word;
    if (!wordFromData) {
        toast.error('Word not found at this index.');
        return;
    }

    setCorrectWord(wordFromData);
    setTypedWord(inputWord);

    const isCorrect = wordFromData.trim().toLowerCase() === inputWord.trim().toLowerCase();

    if (isCorrect) {
      setFeedback('✅ Correct!');
      if (correctSoundRef.current) {
        correctSoundRef.current.play();
      }
    } else {
      setFeedback('❌ Incorrect!');
      if (wrongSoundRef.current) {
        wrongSoundRef.current.play();
      }
    }
    setInputNumber('');
    setInputWord('');
    setShowSpellingInputOnly(false);
    setShowResultModal(true);
  };

  const handleRefresh = () => {
    setInputNumber('');
    setInputWord('');
    setFeedback('');
    setCorrectWord('');
    setTypedWord('');
    setTimerIsRunning(false);
    setShowResultModal(false);
    setShowSpellingInputOnly(false);
  };

  const endRoundSpellingPhase = () => {
    setShowCompetitionUI(false);
    setShowRoundSelection(true);
    setSelectedSpellerId(null);
    setTimerIsRunning(false);
    setShowSpellingInputOnly(false);
    setIsReviewingPastRound(false); // Ensure this is false when going to end-of-round selection
    toast('Spelling phase ended. Please select winners for this round.');
  };

  // Modified previousRound to use roundCompetitorStates
  const previousRound = () => {
    if (!loadedData || !loadedData.rounds) return;

    const prevRoundNumber = currentRound - 1;
    if (prevRoundNumber >= 1) {
      const historicalCompetitors = roundCompetitorStates.get(prevRoundNumber);
      if (historicalCompetitors) {
        setCompetitors(JSON.parse(JSON.stringify(historicalCompetitors)));
        setCurrentRound(prevRoundNumber);
        setShowCompetitionUI(false);
        setShowRoundSelection(true); // Still go to selection for previous round
        handleRefresh();
        setSelectedSpellerId(null);
        setTimerIsRunning(false);
        setShowSpellingInputOnly(false);
        setIsReviewingPastRound(true); // Set flag when navigating back to review
        toast(`Moved back to Round ${prevRoundNumber}. Please review winners.`); //
      } else {
        toast.error(`No historical data found for Round ${prevRoundNumber}.`);
      }
    } else {
      toast('Already at the first round!');
    }
  };

  const nextRound = () => {
    if (!loadedData || !loadedData.rounds) return;

    const maxRound = Math.max(...Object.keys(loadedData.rounds).map(key => parseInt(key.replace('Round ', ''))));

    if (showCompetitionUI) {
      endRoundSpellingPhase();
      return;
    }

    const nextRoundNumber = currentRound + 1;
    if (nextRoundNumber <= maxRound) {
      const historicalCompetitors = roundCompetitorStates.get(nextRoundNumber);
      if (historicalCompetitors) {
        setCompetitors(JSON.parse(JSON.stringify(historicalCompetitors)));
        setCurrentRound(nextRoundNumber);
        setShowCompetitionUI(false);
        setShowRoundSelection(true);
        handleRefresh();
        setSelectedSpellerId(null);
        setTimerIsRunning(false);
        setShowSpellingInputOnly(false);
        setIsReviewingPastRound(false); // Ensure false when going forward
        toast(`Moved to Round ${nextRoundNumber}.`);
      } else {
        toast.error(`No historical data found for Round ${nextRoundNumber}. Please confirm winners for the current round first.`);
      }
    } else {
      const nonEliminated = competitors.filter(comp => !comp.isEliminated);
      if (nonEliminated.length === 1) {
        setFinalWinner(nonEliminated[0]);
        setShowCompetitionUI(false);
        setShowRoundSelection(false);
        if (winnerSoundRef.current) {
          winnerSoundRef.current.play();
        }
      } else {
        toast('All predefined rounds completed! Please confirm final winners to declare a champion.');
        setShowCompetitionUI(false);
        setShowRoundSelection(true);
        setIsReviewingPastRound(false); //
      }
    }
  };

  const detectSize = useCallback(() => {
    setWindowDimension({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      correctSoundRef.current = new Audio('/sounds/correct.mp3');
      wrongSoundRef.current = new Audio('/sounds/wrong.mp3');
      winnerSoundRef.current = new Audio('/sounds/winner.mp3');

      window.addEventListener('resize', detectSize);
    }
    setMounted(true);

    const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      toast(
        '📲 Tap the Share icon and choose "Add to Home Screen" to install this app.',
        {
          duration: 8000,
          icon: '📱',
          style: {
            borderRadius: '10px',
            background: '#ffffff',
            color: '#047857',
          },
        }
      );
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', detectSize);
      }
    };
  }, [detectSize]);


  return (
    <div className={`bg-green-50 min-h-screen flex flex-col
      justify-between transition-opacity duration-1000
      relative overflow-hidden
      ${mounted ? 'opacity-100' : 'opacity-0'}`}>

      <Toaster />

      {isFlying && (
        <BeeFlyer onFinish={() => {}} />
      )}

      {finalWinner && !isFlying && (
        <Confetti
          width={windowDimension.width}
          height={windowDimension.height}
          recycle={true}
          numberOfPieces={500}
          gravity={0.1}
          initialVelocityX={{ min: -5, max: 5 }}
          initialVelocityY={{ min: 5, max: 15 }}
          className="absolute inset-0 z-0"
        />
      )}

      <div className={`p-6 transition-opacity duration-1000 ease-in-out
        ${mounted ? 'opacity-100' : 'opacity-0'} flex-grow flex items-center justify-center`}>

        {showPasskeyInput && !isFlying && (
          <div className='max-w-xl mx-auto w-full'>
            <h1 className="text-2xl font-bold mb-4 text-green-800 text-center">
              Please enter your passkey:
            </h1>
            <input
              type="password"
              placeholder="Enter passkey"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              className="p-3 w-full mb-4 border border-green-500 rounded-md
              text-black placeholder-gray-400 bg-white focus:outline-none
              focus:ring-2 focus:ring-green-700 text-lg"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleLoad();
                }
              }}
            />
            <button
              onClick={handleLoad}
              disabled={isLoading}
              className={`flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-md cursor-pointer font-semibold text-lg transition-transform transform hover:scale-105 hover:bg-blue-700 active:scale-95 disabled:opacity-50 w-full`}
            >
              {isLoading && (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3.5-3.5L12 0v4a8 8 0 00-8 8z"
                  ></path>
                </svg>
              )}
              {isLoading ? 'Loading...' : 'Start Competition'}
            </button>
          </div>
        )}

        {showCompetitorRegistration && !isFlying && loadedData && (
          <CompetitorRegistrationForm
            onRegisterCompetitors={handleRegisterCompetitors}
            onStartCompetition={handleStartCompetitionUI}
          />
        )}

        {showRoundSelection && !isFlying && loadedData && !finalWinner && (
          <CompetitorRoundDisplay
            currentRound={currentRound}
            activeCompetitors={competitors}
            onConfirmWinners={handleConfirmRoundWinners}
            isSpellingPhase={false}
          />
        )}

        {showCompetitionUI && !isFlying && loadedData && !finalWinner && (
          <div className={`transition-opacity duration-1000 ease-in-out w-full h-full flex flex-col items-center justify-center p-4
            ${showCompetitionUI ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="text-5xl md:text-6xl font-sans font-bold mb-4 text-black text-center">
              {loadedData.competitionName}
            </h2>
            <div className='w-full max-w-7xl flex flex-col items-center space-y-4'>
              <p className="text-3xl font-bold text-blue-900">Round {currentRound}</p>

              <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-4">
                <button
                  onClick={previousRound}
                  className="bg-blue-300 text-blue-900 hover:bg-yellow-200 px-4 py-2 rounded-md shadow-md
                    hover:scale-105 transition-transform hover:cursor-pointer hover:text-blue-400
                    active:scale-95 font-semibold text-base lg:order-1 w-full lg:w-auto"
                >
                  Previous Round
                </button>
                <div className="flex-grow w-full p-4 border rounded-md bg-blue-50 border-blue-200 shadow-md lg:order-2 relative overflow-hidden">
                  <h3 className="text-xl font-semibold mb-2 text-blue-800 text-center">Contestants in Round {currentRound}:</h3>
                  <div
                    ref={competitorsScrollRef}
                    className="flex flex-nowrap gap-4 justify-start overflow-x-auto scroll-smooth py-2"
                  >
                    {activeCompetitorsInRound.map(comp => (
                        <button
                          key={comp.id}
                          onClick={() => {
                            setCompetitors(prevComps => prevComps.map(c => ({
                              ...c,
                              isCurrentTurn: c.id === comp.id
                            })));
                            setSelectedSpellerId(comp.id);
                          }}
                          className={`px-4 py-2 rounded-full text-base font-medium flex-shrink-0 transition-all duration-300 cursor-pointer
                            ${comp.isCurrentTurn ? 'bg-yellow-200 text-blue-900 ring-2 ring-yellow-600 font-semibold' : 'bg-blue-200 text-blue-900 hover:bg-blue-300'}`}
                        >
                          {comp.name}
                        </button>
                      ))}
                  </div>
                </div>
                <button
                  onClick={nextRound}
                  className="bg-blue-300 text-blue-900 hover:bg-yellow-200 px-4 py-2 rounded-md shadow-md
                  hover:bg-purple-700 hover:scale-105 transition-transform hover:cursor-pointer
                  active:scale-95 font-semibold text-base lg:order-3 w-full lg:w-auto hover:text-blue-400"
                >
                  Next Round
                </button>
              </div>


              <div className="w-full flex flex-col md:flex-row items-center md:items-start justify-center gap-6 p-4 bg-gray-50 rounded-xl shadow-lg border border-gray-200">
                {currentCompetitor && (
                  <div className="w-full md:w-[65%] text-center p-4 bg-blue-100/30 rounded-xl shadow-inner border border-indigo-200">
                    <p className="text-lg text-blue-800 font-semibold">Current Speller:</p>
                    <p className="text-3xl font-bold text-blue-900 mt-1">
                      {currentCompetitor.name}
                    </p>
                  </div>
                )}

                <div className="w-full md:w-[35%] flex flex-col sm:flex-row md:flex-row items-center justify-center gap-4 p-4 bg-gray-100 rounded-xl shadow-md border border-gray-200">
                  <label
                    htmlFor="timer-duration"
                    className="text-gray-700 font-medium whitespace-nowrap"
                  >
                    Timer (sec):
                  </label>
                  <input
                    id="timer-duration"
                    type="number"
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(parseInt(e.target.value) || 0)}
                    className="w-20 p-2 border border-gray-300 rounded-md text-center text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                    min="5"
                    max="120"
                  />
                  <Timer
                    initialTime={timerDuration}
                    isRunning={timerIsRunning}
                    onTimerEnd={handleTimerEnd}
                  />
                </div>
              </div>

              <div className="w-full flex flex-col md:flex-row items-center justify-center gap-4">
                <input
                  type="number"
                  placeholder="Word Number"
                  value={inputNumber}
                  onChange={(e) => setInputNumber(e.target.value)}
                  className={`p-3 border border-green-500 rounded-md flex-grow md:w-1/3 bg-white text-black placeholder-gray-400 text-lg focus:outline-none focus:ring-2 focus:ring-green-600`}
                  onKeyPress={(e) => {
                      if (e.key === 'Enter' && inputNumber && inputWord) {
                          handleCheck();
                      }
                  }}
                />
                <input
                  id="spelling-input"
                  type="text"
                  placeholder="Enter spelling"
                  value={inputWord}
                  onChange={(e) => setInputWord(e.target.value)}
                  className={`p-3 border border-green-500 rounded-md flex-grow md:w-1/3 bg-white text-black placeholder-gray-400 text-xl focus:outline-none focus:ring-2 focus:ring-green-600 ${showSpellingInputOnly ? '' : 'hidden'}`}
                  onKeyPress={(e) => {
                      if (e.key === 'Enter' && inputNumber && inputWord) {
                          handleCheck();
                      }
                  }}
                />
                <button
                  onClick={startSpellingTurn}
                  disabled={!selectedSpellerId || timerIsRunning}
                  className={`bg-purple-600 text-white px-5 py-2 rounded-md shadow-md
                  hover:bg-purple-700 hover:scale-105 transition-transform
                  cursor-pointer active:scale-95 font-semibold text-base w-full md:w-auto`}
                >
                  Start Turn
                </button>
              </div>

              <div className="flex flex-wrap justify-center gap-3 w-full mt-4">
                <button
                  onClick={handleCheck}
                  disabled={!showSpellingInputOnly}
                  className={`bg-green-600 text-white px-5 py-2 rounded-md shadow-md
                  hover:bg-green-700 hover:scale-105 transition-transform
                  cursor-pointer active:scale-95 font-semibold text-base ${showSpellingInputOnly ? '' : 'opacity-50 cursor-not-allowed'}`}
                >
                  Check Spelling
                </button>
                <button
                  onClick={handleRefresh}
                  className="bg-yellow-500 text-white px-5 py-2 rounded-md shadow-md
                  hover:bg-yellow-600 hover:scale-105 transition-transform
                  active:scale-95 cursor-pointer font-semibold text-base"
                >
                  Clear Inputs
                </button>
                <button
                  onClick={endRoundSpellingPhase}
                  className="bg-red-500 text-white px-5 py-2 rounded-md shadow-md
                  hover:bg-red-600 hover:scale-105 transition-transform
                  active:scale-95 cursor-pointer font-semibold text-base"
                >
                  End Round Spelling
                </button>
              </div>
            </div>

            {showResultModal && typedWord && correctWord && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                <div className="bg-white p-6 rounded-lg shadow-2xl text-center w-full max-w-4xl border border-gray-300 relative">
                  <button
                    onClick={closeResultModal}
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold"
                    aria-label="Close"
                  >
                    &times;
                  </button>
                  <p className="text-lg font-semibold text-gray-800 mb-2">Contestant Spelt:</p>
                  <p className="text-4xl md:text-5xl font-bold mb-3 uppercase text-black font-serif break-words">{typedWord}</p>

                  <p className="text-lg font-semibold text-gray-800 mb-2">Correct Word:</p>
                  <p className={`text-4xl md:text-5xl font-bold mb-3 uppercase font-serif break-words ${feedback.includes('Correct') ? 'text-green-700' : 'text-red-600'}`}>
                    {correctWord}
                  </p>

                  <p className={`text-xl md:text-2xl font-bold ${feedback.includes('Correct') ? 'text-green-700' : 'text-red-600'}`}>
                    {feedback}
                  </p>
                  <button
                    onClick={closeResultModal}
                    className="mt-6 bg-blue-600 text-white px-5 py-2 rounded-md shadow-md
                    hover:bg-blue-700 hover:scale-105 transition-transform
                    active:scale-95 font-semibold text-base"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {finalWinner && !isFlying && (
          <div className="bg-white rounded-lg shadow-xl p-8 text-center border border-yellow-300 inline-block mx-auto max-w-full z-10 relative">
            <h2 className="text-4xl font-bold mb-4 text-yellow-600">🎉 Competition Winner! 🎉</h2>
            <p className="text-6xl font-extrabold text-green-700 uppercase mb-6 drop-shadow-lg">
              {finalWinner.name}
            </p>
            <p className="text-xl text-gray-700">Congratulations on winning the Spelling Bee!</p>
            <button
              onClick={() => {
                setPasskey('');
                setLoadedData(null);
                setCurrentRound(1);
                setInputNumber('');
                setInputWord('');
                setFeedback('');
                setCorrectWord('');
                setTypedWord('');
                setCompetitors([]);
                setShowPasskeyInput(true);
                setShowCompetitorRegistration(false);
                setShowRoundSelection(false);
                setShowCompetitionUI(false);
                setFinalWinner(null);
                setTimerDuration(30);
                setTimerIsRunning(false);
                setSelectedSpellerId(null);
                setShowResultModal(false);

                if (winnerSoundRef.current) {
                  winnerSoundRef.current.pause();
                  winnerSoundRef.current.currentTime = 0;
                }
                setRoundCompetitorStates(new Map());
                setIsReviewingPastRound(false); // Reset on new competition
              }}
              className="mt-8 bg-purple-600 text-white px-6 py-3 rounded-md shadow-lg font-bold text-lg hover:bg-purple-700 transition-transform transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              Start New Competition
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
