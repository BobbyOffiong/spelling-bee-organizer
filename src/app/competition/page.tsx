// pages/competition.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import BeeFlyer from '@/components/BeeFlyer';
import Footer from '@/components/Footer';
import toast, { Toaster } from 'react-hot-toast'; // Import Toaster

// --- Firebase Imports ---
import { db } from '@/lib/firebaseConfig'; // Your Firestore instance
import { collection, query, where, getDocs } from 'firebase/firestore';

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
  const [showCompetitionUI, setShowCompetitionUI] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Use useRef to hold the Audio objects. They will be initialized once on the client.
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);

  const handleLoad = async () => {
    setIsLoading(true);
    setLoadedData(null); // Clear previous data
    setFeedback('');
    setCorrectWord('');
    setTypedWord('');
    setCurrentRound(1); // Reset to first round on new load

    // Ensure passkey is not empty
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
      // 1. Query for the competition document using the passkey
      const competitionsRef = collection(db, `artifacts/${FIREBASE_PROJECT_ID}/public/data/competitions`);
      const q = query(competitionsRef, where("passkey", "==", passkey.trim()));
      const competitionSnapshots = await getDocs(q);

      if (competitionSnapshots.empty) {
        toast.error('Competition not found or passkey is incorrect.');
        setIsLoading(false);
        return;
      }

      // Assuming passkey is unique, get the first document
      const competitionDoc = competitionSnapshots.docs[0];
      const competitionData = competitionDoc.data();
      const competitionId = competitionDoc.id; // This is the {competitionId} for subcollections

      // 2. Fetch all rounds for this competition
      const roundsRef = collection(db, `artifacts/${FIREBASE_PROJECT_ID}/public/data/competitions/${competitionId}/rounds`);
      const roundsSnapshots = await getDocs(roundsRef);

      const roundsOrganized: { [key: string]: { word: string }[] } = {};
      roundsSnapshots.forEach(roundDoc => {
        // Assuming round document IDs are "1", "2", "3" or similar
        // and that each round document contains an array of word objects directly
        const roundNumber = roundDoc.id; // e.g., "1", "2"
        const roundWordsData = roundDoc.data();

        // Convert the object structure to an array of { word: string } objects
        // Assuming your Firestore round document contains fields like word1, word2, etc.
        // Or if it's an array field named 'words', use that: roundWordsData.words
        // Let's assume it's an array field named 'words' within the document
        // If it's an object with keys "word1", "word2" directly, you'll need to adapt this part
        
        // Example if Firestore doc is { "words": [{word: "hello"}, {word: "world"}] }
        // roundsOrganized[`Round ${roundNumber}`] = roundWordsData.words || [];

        // Example if Firestore doc is { "1": {word: "hello"}, "2": {word: "world"} } (this isn't ideal for ordered array)
        // More likely, each round document like '1', '2' etc. contains an array of word objects
        
        // Let's assume each round document (e.g., doc with ID '1') directly contains an array of words
        // e.g., { words: [{ word: "apple" }, { word: "banana" }] }
        // OR each round document is itself the object with word properties, and we need to convert it.

        // Given your previous data structure in `handleSave`
        // competitionData.rounds[`Round ${index + 1}`] = words.map(w => ({ word: w }));
        // This implies each round doc will have a single field which is an array of objects.
        // So a round doc might look like { words: [{word: "apple"}, {word: "banana"}] }
        roundsOrganized[`Round ${roundNumber}`] = roundWordsData.words || [];
      });


      setLoadedData({
        competitionName: competitionData.competitionName,
        rounds: roundsOrganized,
        competitionId: competitionId // Store competition ID for potential future use
      });

      setIsFlying(true); // Show bee animation
      setTimeout(() => {
        setIsFlying(false); // Hide bee
        setTimeout(() => setShowCompetitionUI(true), 50); // Show UI shortly after bee hides
        setIsLoading(false);
      }, 3000); // Adjust bee animation duration if needed (was 6000)

    } catch (error) {
      console.error('Error loading competition:', error);
      toast.error('Failed to load competition. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCheck = () => {
    if (!loadedData || !loadedData.rounds) {
      toast.error("Competition data not loaded.");
      return;
    }

    const roundKey = `Round ${currentRound}`;
    const roundWords = loadedData.rounds[roundKey] || [];

    const index = parseInt(inputNumber) - 1; // Convert to 0-based index

    if (isNaN(index) || index < 0 || index >= roundWords.length) {
      toast.error('Invalid word number for this round.');
      return;
    }

    const wordFromData = roundWords[index]?.word; // Access .word property
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
  };

  const handleRefresh = () => {
    setInputNumber('');
    setInputWord('');
    setFeedback('');
    setCorrectWord('');
    setTypedWord('');
  };

  const previousRound = () => {
    if (!loadedData || !loadedData.rounds) return;

    if (currentRound > 1) {
      setCurrentRound(currentRound - 1);
      setFeedback('');
      handleRefresh(); // Also clear inputs and feedback when changing rounds
    } else {
      toast('Already at the first round!');
    }
  };

  const nextRound = () => {
    if (!loadedData || !loadedData.rounds) return;

    // Check if there's a next round
    // Object.keys(loadedData.rounds) gives an array of "Round 1", "Round 2", etc.
    // Convert them to numbers to find the max round number
    const maxRound = Math.max(...Object.keys(loadedData.rounds).map(key => parseInt(key.replace('Round ', ''))));

    if (currentRound < maxRound) {
      setCurrentRound(currentRound + 1);
      handleRefresh(); // Clear inputs and feedback when changing rounds
    } else {
      toast('All rounds completed!');
    }
  };

  useEffect(() => {
    // Initialize Audio objects only on the client side
    if (typeof window !== 'undefined') {
      correctSoundRef.current = new Audio('/sounds/correct.mp3');
      wrongSoundRef.current = new Audio('/sounds/wrong.mp3');
    }
    setMounted(true);

    // iOS Safari fallback (manual install guide)
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
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div className={`bg-green-50 min-h-screen flex flex-col
      justify-between transition-opacity duration-1000
      relative overflow-hidden
      ${mounted ? 'opacity-100' : 'opacity-0'}`}>

      <Toaster /> {/* Toaster for displaying messages */}

      {isFlying && (
        <BeeFlyer onFinish={() => {}} />
      )}

      <div className={`p-6 transition-opacity duration-1000 ease-in-out
        ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        {!isFlying && !loadedData && (
          <div className='max-w-xl mx-auto'>
            <h1 className="text-2xl font-bold mb-4 text-green-800">
              Please enter your passkey:
            </h1>
            <input
              type="text"
              placeholder="Enter passkey"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              className="p-2 w-full mb-4 border border-green-500 rounded
              text-black placeholder-gray-300 bg-white focus:outline-none
              focus:ring-1 focus:ring-green-700"
              autoFocus // Focus on this input when page loads
              onKeyPress={(e) => { // Allow pressing Enter to load
                if (e.key === 'Enter') {
                  handleLoad();
                }
              }}
            />
            <button
              onClick={handleLoad}
              disabled={isLoading}
              className={`flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded cursor-pointer font-semibold transition-transform transform hover:scale-105 hover:bg-blue-700 active:scale-95 disabled:opacity-50`}
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

        {!isFlying && loadedData && (
          <div className={`transition-opacity duration-1000 ease-in-out
          ${showCompetitionUI ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="text-6xl font-sans font-bold mt-4 mb-6 text-black text-center">
              {loadedData.competitionName}
            </h2>
            <div className='max-w-xl mx-auto'>
              <p className="mb-2 font-semibold text-gray-800">Round {currentRound}</p>

              <input
                type="number"
                placeholder="Word number"
                value={inputNumber}
                onChange={(e) => setInputNumber(e.target.value)}
                className="p-2 border border-green-500 rounded w-full mb-3 bg-white text-black placeholder-gray-400"
                onKeyPress={(e) => { // Allow pressing Enter to check
                    if (e.key === 'Enter' && inputNumber && inputWord) {
                        handleCheck();
                    }
                }}
              />

              <input
                type="text"
                placeholder="Enter spelling"
                value={inputWord}
                onChange={(e) => setInputWord(e.target.value)}
                className="p-2 border border-green-500 rounded w-full mb-3 bg-white text-black placeholder-gray-400"
                onKeyPress={(e) => { // Allow pressing Enter to check
                    if (e.key === 'Enter' && inputNumber && inputWord) {
                        handleCheck();
                    }
                }}
              />

              <div className="flex justify-evenly flex-wrap gap-2 mb-3 w-full">
                <button
                  onClick={handleCheck}
                  className="bg-green-600 text-white px-4 py-2 rounded
                  hover:bg-green-700 hover:scale-105 transition-transform
                  cursor-pointer active:scale-95"
                >
                  Check
                </button>
                <button
                  onClick={handleRefresh}
                  className="bg-yellow-500 text-white px-4 py-2 rounded
                  hover:bg-yellow-600 hover:scale-105 transition-transform
                  active:scale-95 cursor-pointer"
                >
                  Refresh
                </button>

                <button
                  onClick={previousRound}
                  className="bg-blue-600 text-white px-4 py-2 rounded
                  hover:bg-blue-700 hover:scale-105 transition-transform
                  active:scale-95 cursor-pointer"
                >
                  Previous Round
                </button>


                <button
                  onClick={nextRound}
                  className="bg-purple-600 text-white px-4 py-2 rounded
                  hover:bg-purple-700 hover:scale-105 transition-transform
                  active:scale-95 cursor-pointer"
                >
                  Next Round
                </button>
              </div></div>

              {typedWord && correctWord && (
              <div className="mt-6 bg-white p-4 rounded shadow text-center max-w-xl mx-auto">
                <p className="text-lg font-semibold text-gray-800">Contestant Spelt:</p>
                <p className="text-5xl font-bold mb-3 uppercase text-black font-serif">{typedWord}</p>

                <p className="text-lg font-semibold text-gray-800">Correct Word:</p>
                <p className={`text-5xl font-bold mb-3 uppercase font-serif ${feedback.includes('Correct') ? 'text-green-700' : 'text-red-600'}`}>
                  {correctWord}
                </p>

                <p className={`text-xl font-bold ${feedback.includes('Correct') ? 'text-green-700' : 'text-red-600'}`}>
                  {feedback}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

{/*OLD CODE
'use client';
import { useState, useEffect, useRef } from 'react';
import BeeFlyer from '@/components/BeeFlyer';
import Footer from '@/components/Footer'; // ✅ import footer


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
  const [showCompetitionUI, setShowCompetitionUI] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  //const correctSound = new Audio('/sounds/correct.mp3');
  //const wrongSound = new Audio('/sounds/wrong.mp3');

  // 1. Use useRef to hold the Audio objects. They will be initialized once on the client.
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);

  const handleLoad = async () => {
  setIsLoading(true);
  const res = await fetch(`/api/competition/${passkey}`);
  if (res.ok) {
    const json = await res.json();
    setIsFlying(true); // Show bee
    setTimeout(() => {
      setIsFlying(false); // Hide bee
      setLoadedData(json);
      setTimeout(() => setShowCompetitionUI(true), 50);
      setIsLoading(false);
    }, 6000);
  } else {
    alert('Competition not found.');
    setIsLoading(false);
  }
};



  const handleCheck = () => {
    if (!loadedData) return;

    const roundKey = `Round ${currentRound}`;
    const roundWords = loadedData.rounds[roundKey] || [];

    const index = parseInt(inputNumber) - 1;

    if (isNaN(index) || index < 0 || index >= roundWords.length) {
      alert('Invalid word number for this round.');
      return;
    }

    const wordFromData = roundWords[index].word;
    setCorrectWord(wordFromData);
    setTypedWord(inputWord);

    const isCorrect = wordFromData.trim().toLowerCase() === inputWord.trim().toLowerCase();

    if (isCorrect) {
      setFeedback('✅ Correct!');
      //correctSound.play();
      // 3. Play the sound using the ref, checking if it's initialized
      if (correctSoundRef.current) {
        correctSoundRef.current.play();
      }
    } else {
      setFeedback('❌ Incorrect!');
      //wrongSound.play();
      // 4. Play the sound using the ref, checking if it's initialized
      if (wrongSoundRef.current) {
        wrongSoundRef.current.play();
      }
    }
  };

  const handleRefresh = () => {
    setInputNumber('');
    setInputWord('');
    setFeedback('');
    setCorrectWord('');
    setTypedWord('');
  };

  const previousRound = () => {
  if (currentRound > 1) {
    setCurrentRound(currentRound - 1);
    setFeedback('');
  } else {
    alert('Already at the first round!');
  }
};


  const nextRound = () => {
    if (currentRound < Object.keys(loadedData.rounds).length) {
      setCurrentRound(currentRound + 1);
      handleRefresh();
    } else {
      alert('All rounds completed!');
    }
  };

  useEffect(() => {
     correctSoundRef.current = new Audio('/sounds/correct.mp3');
    wrongSoundRef.current = new Audio('/sounds/wrong.mp3');
        setMounted(true);
      }, []);


  return (
    <div className={`bg-green-50 min-h-screen flex flex-col 
      justify-between transition-opacity duration-1000 
      relative overflow-hidden 
      ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      
      {isFlying && (
        <BeeFlyer onFinish={() => {}} />
        )}

      <div className={`p-6 transition-opacity duration-1000 ease-in-out 
        ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        {!isFlying && !loadedData && (
          <div className='max-w-xl mx-auto'>            
            <h1 className="text-2xl font-bold mb-4 text-green-800">
              Please enter your passkey:
            </h1>
            <input
              type="text"
              placeholder="Enter passkey"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              className="p-2 w-full mb-4 border border-green-500 rounded 
              text-black placeholder-gray-300 bg-white focus:outline-none 
              focus:ring-1 focus:ring-green-700"
            />
            <button
  onClick={handleLoad}
  disabled={isLoading}
  className={`flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded cursor-pointer font-semibold transition-transform transform hover:scale-105 hover:bg-blue-700 active:scale-95 disabled:opacity-50`}
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
        d="M4 12a8 8 0 018-8v4l3.5-3.5L12 0v4a8 8 0 00-8 8h4z"
      ></path>
    </svg>
  )}
  {isLoading ? 'Loading...' : 'Start Competition'}
</button>

            </div>
        )}

        {!isFlying && loadedData && (
          <div className={`transition-opacity duration-1000 ease-in-out
          ${showCompetitionUI ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="text-6xl font-sans font-bold mt-4 mb-6 text-black text-center">
              {loadedData.competitionName}
            </h2>
<div className='max-w-xl mx-auto'>
            <p className="mb-2 font-semibold text-gray-800">Round {currentRound}</p>

            <input
              type="number"
              placeholder="Word number"
              value={inputNumber}
              onChange={(e) => setInputNumber(e.target.value)}
              className="p-2 border border-green-500 rounded w-full mb-3 bg-white text-black placeholder-gray-400"
            />

            <input
              type="text"
              placeholder="Enter spelling"
              value={inputWord}
              onChange={(e) => setInputWord(e.target.value)}
              className="p-2 border border-green-500 rounded w-full mb-3 bg-white text-black placeholder-gray-400"
            />

            <div className="flex justify-evenly flex-wrap gap-2 mb-3 w-full">
              <button
                onClick={handleCheck}
                className="bg-green-600 text-white px-4 py-2 rounded 
                hover:bg-green-700 hover:scale-105 transition-transform 
                cursor-pointer active:scale-95"
              >
                Check
              </button>
              <button
                onClick={handleRefresh}
                className="bg-yellow-500 text-white px-4 py-2 rounded 
                hover:bg-yellow-600 hover:scale-105 transition-transform 
                active:scale-95 cursor-pointer"
              >
                Refresh
              </button>

<button
  onClick={previousRound}
  className="bg-blue-600 text-white px-4 py-2 rounded 
  hover:bg-blue-700 hover:scale-105 transition-transform 
  active:scale-95 cursor-pointer"
>
  Previous Round
</button>


              <button
                onClick={nextRound}
                className="bg-purple-600 text-white px-4 py-2 rounded 
                hover:bg-purple-700 hover:scale-105 transition-transform 
                active:scale-95 cursor-pointer"
              >
                Next Round
              </button>
            </div></div>

             {typedWord && correctWord && (
              <div className="mt-6 bg-white p-4 rounded shadow text-center max-w-xl mx-auto">
                <p className="text-lg font-semibold text-gray-800">Contestant Spelt:</p>
                <p className="text-5xl font-bold mb-3 uppercase text-black font-serif">{typedWord}</p>

                <p className="text-lg font-semibold text-gray-800">Correct Word:</p>
                <p className={`text-5xl font-bold mb-3 uppercase font-serif ${feedback.includes('Correct') ? 'text-green-700' : 'text-red-600'}`}>
                  {correctWord}
                </p>

                <p className={`text-xl font-bold ${feedback.includes('Correct') ? 'text-green-700' : 'text-red-600'}`}>
                  {feedback}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ✅ Footer *
      <Footer />
    </div>
  );
}
*/}