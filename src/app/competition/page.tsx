'use client';

import { useState, useEffect } from 'react';
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

  const correctSound = new Audio('/sounds/correct.mp3');
  const wrongSound = new Audio('/sounds/wrong.mp3');

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
      correctSound.play();
    } else {
      setFeedback('❌ Incorrect!');
      wrongSound.play();
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

      {/* ✅ Footer */}
      <Footer />
    </div>
  );
}