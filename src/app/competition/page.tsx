// pages/competition.tsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import BeeFlyer from '@/components/BeeFlyer';
import Footer from '@/components/Footer';
import toast, { Toaster } from 'react-hot-toast';
import CompetitorRegistrationForm from '@/components/CompetitorRegistrationForm';
import CompetitorRoundDisplay from '@/components/CompetitorRoundDisplay';
import Timer from '@/components/Timer'; // Import the new Timer component
//import Confetti from 'react-confetti'; // Import the confetti component

// --- Firebase Imports ---
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Define Competitor interface for better type safety
interface Competitor {
  id: string;
  name: string;
  isEliminated: boolean; // True if out of the competition
  isCurrentTurn: boolean; // To highlight who's currently spelling
  score: number; // Optional, if you want to track scores
}

export default function CompetitionPage() {
  const [passkey, setPasskey] = useState('');
  const [loadedData, setLoadedData] = useState<any>(null); // This will hold competitionName and rounds
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
  const [showPasskeyInput, setShowPasskeyInput] = useState(true);
  const [showCompetitorRegistration, setShowCompetitorRegistration] = useState(false);
  const [showRoundSelection, setShowRoundSelection] = useState(false); // Phase for selecting winners to advance
  const [showCompetitionUI, setShowCompetitionUI] = useState(false); // Main spelling UI for a round
  const [finalWinner, setFinalWinner] = useState<Competitor | null>(null);

  // --- TIMER STATE ---
  const [timerDuration, setTimerDuration] = useState(30); // Default 30 seconds
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [selectedSpellerId, setSelectedSpellerId] = useState<string | null>(null); // ID of the competitor whose turn it is

  // --- MODAL STATE ---
  const [showResultModal, setShowResultModal] = useState(false);
  // --- NEW STATE FOR HIDING SPELLING INPUT ---
  const [showSpellingInputOnly, setShowSpellingInputOnly] = useState(false); // Only hides spelling input, not word number

  // State to hold window dimensions for full-screen confetti
  const [windowDimension, setWindowDimension] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // Use useRef to hold the Audio objects. They will be initialized once on the client.
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);
  const competitorsScrollRef = useRef<HTMLDivElement>(null);

  // Filter active competitors for the current round display (those not eliminated)
  const activeCompetitorsInRound = competitors.filter(comp => !comp.isEliminated);
  // Find the current competitor based on selectedSpellerId
  const currentCompetitor = activeCompetitorsInRound.find(comp => comp.id === selectedSpellerId) || null;

  // Function to start a new competitor's turn and timer
  const startSpellingTurn = useCallback(() => {
    if (!selectedSpellerId) {
      toast.error("Please select a competitor first to start their turn.");
      return;
    }
    setTimerIsRunning(true);
    setFeedback('');
    setCorrectWord('');
    setTypedWord('');
    setInputWord(''); // Clear spelling input for new turn
    setShowSpellingInputOnly(true); // Show spelling input (Point 3)

    // Automatically focus the spelling input
    setTimeout(() => {
      document.getElementById('spelling-input')?.focus();
    }, 100); // Small delay to ensure render
  }, [selectedSpellerId]); // Depend on selectedSpellerId

  // Handler for when the timer ends
  const handleTimerEnd = useCallback(() => {
    setTimerIsRunning(false);
    toast.error(`${currentCompetitor?.name || 'Current speller'}'s time is up!`);
    // Optionally, automatically mark as incorrect or move to next competitor
    // For now, we'll just stop the timer and let the organizer decide.
  }, [currentCompetitor?.name]);

  const handleLoad = async () => {
    setIsLoading(true);
    setLoadedData(null);
    setFeedback('');
    setCorrectWord('');
    setTypedWord('');
    setCurrentRound(1);
    setCompetitors([]); // Clear competitors on new load
    setFinalWinner(null); // Clear winner on new load
    setSelectedSpellerId(null); // Reset selected speller
    setTimerIsRunning(false); // Ensure timer is stopped
    setShowSpellingInputOnly(false); // Hide spelling input on load

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
        // FIX: Corrected syntax for object property assignment
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
        setShowCompetitorRegistration(true); // Transition to registration
        setIsLoading(false);
      }, 3000);

    } catch (error) {
      console.error('Error loading competition:', error);
      toast.error('Failed to load competition. Please try again.');
      setIsLoading(false);
    }
  };

  // Handler for registering competitors from CompetitorRegistrationForm
  const handleRegisterCompetitors = (registeredCompetitors: Competitor[]) => {
    setCompetitors(registeredCompetitors);
  };

  // Handler for starting the main competition flow after registration
  const handleStartCompetitionUI = () => {
    setShowCompetitorRegistration(false);
    setShowCompetitionUI(true); // Directly show the spelling UI for Round 1
    setCurrentRound(1); // Ensure it's Round 1
    // No automatic timer start here, waiting for organizer to click a competitor or "Start Turn"
  };

  // Handler for confirming winners for the current round
  const handleConfirmRoundWinners = (winners: Competitor[]) => {
    // Update the main competitors state: mark non-winners as eliminated
    setCompetitors(prevCompetitors =>
      prevCompetitors.map(comp => ({
        ...comp,
        isEliminated: !winners.some(winner => winner.id === comp.id), // If not in winners list, they are eliminated
        isCurrentTurn: false // Reset current turn status
      }))
    );

    const remainingCompetitors = winners.filter(comp => !comp.isEliminated);

    if (remainingCompetitors.length === 1) {
      // If only one competitor remains, declare them the winner
      setFinalWinner(remainingCompetitors[0]);
      setShowRoundSelection(false);
      setShowCompetitionUI(false);
      toast.success(`${remainingCompetitors[0].name} wins the competition!`);
    } else {
      // If more than one, advance to the next round's spelling phase
      setCurrentRound(prevRound => prevRound + 1); // Increment round number
      setShowRoundSelection(false); // Hide competitor selection
      setShowCompetitionUI(true); // Show main spelling UI for the new round
      setSelectedSpellerId(null); // Reset selected speller for the new round
      setTimerIsRunning(false); // Ensure timer is stopped for the new round
      setShowSpellingInputOnly(false); // Hide spelling input for new round start
      toast.success(`Round ${currentRound + 1} will now begin! Please select a speller.`);
    }
  };

  // Close the result modal
  const closeResultModal = () => {
    setShowResultModal(false);
    setFeedback('');
    setCorrectWord('');
    setTypedWord('');
  };

  const handleCheck = () => {
    setTimerIsRunning(false); // Stop the timer when check is clicked

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

    const index = parseInt(inputNumber) - 1; // Convert to 0-based index

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
    // Clear inputs and hide spelling input after check (as requested)
    setInputNumber('');
    setInputWord('');
    setShowSpellingInputOnly(false); // Hide spelling input after check
    setShowResultModal(true); // Show the result in a modal
  };

  const handleRefresh = () => {
    setInputNumber('');
    setInputWord('');
    setFeedback('');
    setCorrectWord('');
    setTypedWord('');
    setTimerIsRunning(false); // Stop timer on refresh
    setShowResultModal(false); // Hide modal on refresh
    setShowSpellingInputOnly(false); // Hide spelling input on refresh
  };

  // Function to move to the winner selection phase for the current round
  const endRoundSpellingPhase = () => {
    setShowCompetitionUI(false); // Hide spelling UI
    setShowRoundSelection(true); // Show winner selection UI
    setSelectedSpellerId(null); // Clear selected speller
    setTimerIsRunning(false); // Stop timer
    setShowSpellingInputOnly(false); // Hide spelling input when ending round
    toast('Spelling phase ended. Please select winners for this round.');
  };

  // Modified previousRound to go to selection phase
  const previousRound = () => {
    if (!loadedData || !loadedData.rounds) return;

    if (currentRound > 1) {
      setCurrentRound(currentRound - 1);
      setShowCompetitionUI(false); // Hide spelling UI
      setShowRoundSelection(true); // Go back to selection for previous round
      handleRefresh(); // Clear inputs and feedback
      setSelectedSpellerId(null); // Reset selected speller
      setTimerIsRunning(false); // Stop timer
      setShowSpellingInputOnly(false); // Hide spelling input
    } else {
      toast('Already at the first round!');
    }
  };

  // Modified nextRound to go to selection phase
  const nextRound = () => {
    if (!loadedData || !loadedData.rounds) return;

    const maxRound = Math.max(...Object.keys(loadedData.rounds).map(key => parseInt(key.replace('Round ', ''))));

    // If currently in spelling UI, clicking next round should take to winner selection for current round
    if (showCompetitionUI) {
      endRoundSpellingPhase();
      return;
    }

    if (currentRound < maxRound) {
      setCurrentRound(currentRound + 1);
      setShowCompetitionUI(false); // Hide current UI
      setShowRoundSelection(true); // Go to selection for next round
      handleRefresh(); // Clear inputs and feedback
      setSelectedSpellerId(null); // Reset selected speller
      setTimerIsRunning(false); // Stop timer
      setShowSpellingInputOnly(false); // Hide spelling input
    } else {
      // If all rounds are done, and we're trying to go next,
      // it means we should be in the final winner selection phase (if not already declared)
      const nonEliminated = competitors.filter(comp => !comp.isEliminated);
      if (nonEliminated.length === 1) {
        setFinalWinner(nonEliminated[0]);
        setShowCompetitionUI(false);
        setShowRoundSelection(false);
      } else {
        toast('All predefined rounds completed! Please confirm final winners to declare a champion.');
        setShowCompetitionUI(false);
        setShowRoundSelection(true); // Force to selection to pick final winners
      }
    }
  };

  // Effect to handle window resizing for confetti
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

      // Add event listener for window resize
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

    // Cleanup function for the resize event listener
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', detectSize);
      }
    };
  }, [detectSize]); // Add detectSize to dependency array


  return (
    <div className={`bg-green-50 min-h-screen flex flex-col
      justify-between transition-opacity duration-1000
      relative overflow-hidden
      ${mounted ? 'opacity-100' : 'opacity-0'}`}>

      <Toaster />

      {isFlying && (
        <BeeFlyer onFinish={() => {}} />
      )}

      {/* Confetti will render only when finalWinner is true and isFlying is false */}
      {finalWinner && !isFlying && (
        <Confetti
          width={windowDimension.width}
          height={windowDimension.height}
          recycle={true} // Makes the confetti continuous
          numberOfPieces={500} // Adjust for more/less confetti
          gravity={0.1} // Adjust how fast it falls
          initialVelocityX={{ min: -5, max: 5 }} // Horizontal spread
          initialVelocityY={{ min: 5, max: 15 }} // Vertical spread
          className="absolute inset-0 z-0" // Ensure it covers the whole screen and is behind content
        />
      )}

      <div className={`p-6 transition-opacity duration-1000 ease-in-out
        ${mounted ? 'opacity-100' : 'opacity-0'} flex-grow flex items-center justify-center`}>

        {/* Passkey Input UI */}
        {showPasskeyInput && !isFlying && (
          <div className='max-w-xl mx-auto w-full'>
            <h1 className="text-2xl font-bold mb-4 text-green-800 text-center">
              Please enter your passkey:
            </h1>
            <input
              type="text"
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

        {/* Competitor Registration UI */}
        {showCompetitorRegistration && !isFlying && loadedData && (
          <CompetitorRegistrationForm
            onRegisterCompetitors={handleRegisterCompetitors}
            onStartCompetition={handleStartCompetitionUI}
          />
        )}

        {/* Round Selection / Winner Confirmation UI (appears AFTER a spelling round) */}
        {showRoundSelection && !isFlying && loadedData && !finalWinner && (
          <CompetitorRoundDisplay
            currentRound={currentRound}
            activeCompetitors={activeCompetitorsInRound}
            onConfirmWinners={handleConfirmRoundWinners}
            isSpellingPhase={false}
          />
        )}

        {/* Main Competition UI (Spelling Phase) */}
        {showCompetitionUI && !isFlying && loadedData && !finalWinner && (
          <div className={`transition-opacity duration-1000 ease-in-out w-full h-full flex flex-col items-center justify-center p-4
            ${showCompetitionUI ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="text-5xl md:text-6xl font-sans font-bold mb-4 text-black text-center">
              {loadedData.competitionName}
            </h2>
            <div className='w-full max-w-7xl flex flex-col items-center space-y-4'> {/* Increased max-w-5xl */}
              <p className="text-3xl font-bold text-blue-900">Round {currentRound}</p>

              {/* Display current competitors (from activeCompetitorsInRound) */}
              <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-4">
                <button
                  onClick={previousRound}
                  // Adjusted color to match Next Round button
                  className="bg-blue-300 text-blue-900 hover:bg-yellow-200 px-4 py-2 rounded-md shadow-md
                    hover:scale-105 transition-transform hover:cursor-pointer hover:text-blue-400
                    active:scale-95 font-semibold text-base lg:order-1 w-full lg:w-auto"
                >
                  Previous Round
                </button>
                <div className="flex-grow w-full p-4 border rounded-md bg-blue-50 border-blue-200 shadow-md lg:order-2 relative overflow-hidden">
                  <h3 className="text-xl font-semibold mb-2 text-blue-800 text-center">Contestants in Round {currentRound}:</h3>
                  {/* Updated: flex-nowrap to prevent wrapping, overflow-x-auto to show scrollbar */}
                  <div
                    ref={competitorsScrollRef} // Ref to control scrolling
                    className="flex flex-nowrap gap-4 justify-start overflow-x-auto scroll-smooth py-2" // Removed scrollbar hiding styles
                    // Removed: style={{ scrollbarWidth: 'none', '-ms-overflow-style': 'none' }}
                  >
                    {activeCompetitorsInRound.map(comp => (
                        <button
                          key={comp.id}
                          onClick={() => {
                            setCompetitors(prevComps => prevComps.map(c => ({
                              ...c,
                              isCurrentTurn: c.id === comp.id
                            })));
                            setSelectedSpellerId(comp.id); // Set the selected speller ID
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
                {/* Current Competitor's Turn */}
                {currentCompetitor && (
                  <div className="w-full md:w-[65%] text-center p-4 bg-blue-100/30 rounded-xl shadow-inner border border-indigo-200">
                    <p className="text-lg text-blue-800 font-semibold">Current Speller:</p>
                    <p className="text-3xl font-bold text-blue-900 mt-1">
                      {currentCompetitor.name}
                    </p>
                  </div>
                )}

                <div className="w-full md:w-[35%] flex flex-col sm:flex-row md:flex-row items-center justify-center gap-4 p-4 bg-gray-100 rounded-xl shadow-md border border-gray-200">
                  {/* Styled container */}
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

              {/* Word Number, Spelling Input, and Start Turn Button */}
              <div className="w-full flex flex-col md:flex-row items-center justify-center gap-4">
                {/* Point 3: Word number input always visible */}
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
                {/* Point 3: Spelling input conditionally hidden */}
                <input
                  id="spelling-input" // Added ID for focusing
                  type="text"
                  placeholder="Enter spelling"
                  value={inputWord}
                  onChange={(e) => setInputWord(e.target.value)}
                  className={`p-3 border border-green-500 rounded-md flex-grow md:w-1/3 bg-white text-black placeholder-gray-400 text-lg focus:outline-none focus:ring-2 focus:ring-green-600 ${showSpellingInputOnly ? '' : 'hidden'}`}
                  onKeyPress={(e) => {
                      if (e.key === 'Enter' && inputNumber && inputWord) {
                          handleCheck();
                      }
                  }}
                />
                <button
                  onClick={startSpellingTurn} // Button to start timer and focus input (Point 3)
                  disabled={!selectedSpellerId || timerIsRunning} // Disable if no speller is selected or timer is already running
                  className={`bg-purple-600 text-white px-5 py-2 rounded-md shadow-md
                  hover:bg-purple-700 hover:scale-105 transition-transform
                  cursor-pointer active:scale-95 font-semibold text-base w-full md:w-auto`}
                >
                  Start Turn
                </button>
              </div>

              {/* Control Buttons */}
              <div className="flex flex-wrap justify-center gap-3 w-full mt-4">
                <button
                  onClick={handleCheck}
                  disabled={!showSpellingInputOnly} // Disable if spelling input is hidden
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
                  onClick={endRoundSpellingPhase} // New button to explicitly end spelling phase and go to winner selection
                  className="bg-red-500 text-white px-5 py-2 rounded-md shadow-md
                  hover:bg-red-600 hover:scale-105 transition-transform
                  active:scale-95 cursor-pointer font-semibold text-base"
                >
                  End Round Spelling
                </button>
              </div>
            </div>

            {/* Result Modal */}
            {showResultModal && typedWord && correctWord && (
              <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center p-4 z-50"> {/* Point 2: Changed opacity */}
                <div className="bg-white p-6 rounded-lg shadow-2xl text-center w-full max-w-md border border-gray-300 relative">
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

        {/* Final Winner Display UI */}
        {finalWinner && !isFlying && (
          <div className="bg-white rounded-lg shadow-xl p-8 text-center border border-yellow-300 inline-block mx-auto max-w-full z-10 relative"> {/* Added inline-block, mx-auto, max-w-full, z-10, relative */}
            <h2 className="text-4xl font-bold mb-4 text-yellow-600">🎉 Competition Winner! 🎉</h2>
            <p className="text-6xl font-extrabold text-green-700 uppercase mb-6 drop-shadow-lg">
              {finalWinner.name}
            </p>
            <p className="text-xl text-gray-700">Congratulations on winning the Spelling Bee!</p>
            <button
              onClick={() => {
                // Reset everything to start a new competition
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
                setTimerDuration(30); // Reset timer duration
                setTimerIsRunning(false); // Ensure timer is stopped
                setSelectedSpellerId(null); // Reset selected speller
                setShowResultModal(false); // Hide modal
                setShowSpellingInputOnly(false); // Hide spelling input
              }}
              className="mt-8 bg-purple-600 text-white px-6 py-3 rounded-md shadow-lg font-bold text-lg hover:bg-purple-700 
              transition-transform transform hover:scale-105 active:scale-95 hover:cursor-pointer"
            >
              Start New Competition
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
