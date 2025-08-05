// pages/dashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import toast, { Toaster } from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import Footer from '@/components/Footer';

// --- Firebase Imports ---
import { db, auth } from '@/lib/firebaseConfig'; // Adjust path as needed
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth'; // Import User type

// --- Define App ID for Firestore Paths (REPLACE WITH YOUR ACTUAL FIREBASE PROJECT ID) ---
const FIREBASE_APP_ID = 'b-s-spelling-bee-organizer'; // <<< IMPORTANT: REPLACE THIS

// Define interfaces for your data structure
interface WordItem {
  id: string; // Used by Dnd-kit
  word: string;
}

interface RoundWords {
  [key: string]: WordItem[]; // e.g., { "Round 1": [{id: "uuid", word: "test"}] }
}

function SortableItem({
  id,
  word,
  index,
  onDelete,
}: {
  id: string;
  word: string;
  index: number;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'inline-flex',
    alignItems: 'center',
    marginRight: '0.5rem',
    marginBottom: '0.25rem',
    padding: '0.25rem 0.5rem',
    backgroundColor: 'white',
    borderRadius: '0.375rem',
    boxShadow: '0 1px 2px rgb(0 0 0 / 0.05)',
    cursor: 'move',
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="text-sm text-black"
    >
      <span className="mr-2 font-semibold">{index + 1}.</span>
      <span className="mr-2">{word}</span>
      <button onClick={() => onDelete(id)} className="text-red-500 hover:text-red-700">
        <Trash2 size={14} />
      </button>
    </li>
  );
}

export default function DashboardPage() {
  const [competitionName, setCompetitionName] = useState('');
  const [passkey, setPasskey] = useState(''); // Used as an identifier for the competition
  const [roundCount, setRoundCount] = useState(1);
  const [currentRound, setCurrentRound] = useState(1);
  const [roundWords, setRoundWords] = useState<RoundWords>({}); // State to hold words for all rounds
  const [word, setWord] = useState('');
  const [mounted, setMounted] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingLoad, setLoadingLoad] = useState(false); // Kept loadingLoad state for the new Load button
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Firebase authenticated user
  const [loadingAuth, setLoadingAuth] = useState(true); // State to indicate if auth status is being checked

  // --- New states for Bulk Add Modal ---
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkWordsInput, setBulkWordsInput] = useState('');

  // --- Authenticate User on Mount ---
  useEffect(() => {
    setMounted(true); // For CSS transition

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
      if (!user) {
        // Redirect to login if not authenticated
        toast.error('Please log in to access the dashboard.');
        setTimeout(() => {
          window.location.href = '/login'; // Or your login page path
        }, 1500);
      }
    });

    return () => unsubscribe(); // Cleanup subscription
  }, []);

  // --- NEW useEffect to log roundWords changes ---
  useEffect(() => {
    console.log('roundWords state updated:', roundWords);
    // Optionally, log the words for the current round specifically
    console.log(`Words for current Round ${currentRound}:`, roundWords[`Round ${currentRound}`] || []);
  }, [roundWords, currentRound]); // Depend on roundWords and currentRound

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Refactored handleAddWord to be a reusable helper
  const handleAddWord = (newWord: string): boolean => {
    if (!newWord) return false;

    const roundKey = `Round ${currentRound}`;
    const existingWords = roundWords[roundKey] || [];

    if (existingWords.some(w => w.word.toLowerCase() === newWord.toLowerCase())) {
      toast.error(`"${newWord}" is already in this round.`);
      return false; // Indicate that word was not added (duplicate)
    }

    const newEntry: WordItem = { id: crypto.randomUUID?.() || Date.now().toString(), word: newWord };

    setRoundWords((prev) => ({
      ...prev,
      [roundKey]: [...existingWords, newEntry],
    }));
    return true; // Indicate that word was added successfully
  };

  // New function for the single input field
  const handleSingleAddWord = () => {
    const newWord = word.trim();
    if (handleAddWord(newWord)) {
      setWord(''); // Clear only if added successfully
    }
  };

  // New function for bulk adding words
  const handleBulkAddWords = () => {
    const wordsToAdd = bulkWordsInput
      .split(/[\n,]+/) // Split by newlines or commas
      .map(w => w.trim())
      .filter(w => w.length > 0); // Filter out empty strings

    if (wordsToAdd.length === 0) {
      toast.error('Please enter words to add.');
      return;
    }

    const roundKey = `Round ${currentRound}`;
    // Get the current words for the round from the state
    const existingWordsInRound = roundWords[roundKey] || [];
    const newWordsForRound: WordItem[] = [...existingWordsInRound]; // Start with existing words

    let addedCount = 0;
    wordsToAdd.forEach(newWordText => {
      // Check for duplicates against the *accumulated* newWordsForRound
      if (!newWordsForRound.some(w => w.word.toLowerCase() === newWordText.toLowerCase())) {
        const newEntry: WordItem = { id: crypto.randomUUID?.() || Date.now().toString(), word: newWordText };
        newWordsForRound.push(newEntry);
        addedCount++;
      } else {
        toast.error(`"${newWordText}" is already in this round (skipped).`);
      }
    });

    // Update the state once with the complete new list for the current round
    setRoundWords((prev) => ({
      ...prev,
      [roundKey]: newWordsForRound,
    }));

    toast.success(`Added ${addedCount} new word(s) to Round ${currentRound}.`);
    setBulkWordsInput(''); // Clear textarea
    setShowBulkAddModal(false); // Close modal
  };

  const handleDeleteWord = (id: string) => {
    const roundKey = `Round ${currentRound}`;
    setRoundWords((prev) => ({
      ...prev,
      [roundKey]: prev[roundKey].filter((item) => item.id !== id),
    }));
  };

  // --- Firestore Save Function ---
  const handleSave = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to save words.');
      return;
    }
    if (!competitionName || !passkey) {
      toast.error('Competition name and passkey are required');
      return;
    }
    setLoadingSave(true);

    try {
      // 1. Find existing competition or generate a new ID
      let competitionId: string;
      const q = query(
        collection(db, `artifacts/${FIREBASE_APP_ID}/public/data/competitions`),
        where('passkey', '==', passkey)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Competition exists, use its ID
        competitionId = querySnapshot.docs[0].id;
        toast('Competition found, updating existing data.', { icon: '🔄' });
      } else {
        // New competition, generate a new ID
        const newCompetitionRef = doc(collection(db, `artifacts/${FIREBASE_APP_ID}/public/data/competitions`));
        competitionId = newCompetitionRef.id;
        toast('New competition created.', { icon: '✨' });
      }

      // 2. Save/Update main competition details
      const competitionDocRef = doc(db, `artifacts/${FIREBASE_APP_ID}/public/data/competitions`, competitionId);
      await setDoc(competitionDocRef, {
        competitionName,
        passkey,
        organizerId: currentUser.uid, // Link competition to the authenticated organizer
        roundCount,
        lastModified: new Date(),
        status: 'setup', // Initial status
      }, { merge: true }); // Use merge to update existing fields without overwriting others

      // 3. Save/Update words for each round
      for (let i = 1; i <= roundCount; i++) {
        const roundKey = `Round ${i}`;
        const wordsForRound = roundWords[roundKey] || [];
        const roundDocRef = doc(db, `artifacts/${FIREBASE_APP_ID}/public/data/competitions/${competitionId}/rounds`, String(i)); // Round number as document ID

        await setDoc(roundDocRef, {
          roundNumber: i,
          words: wordsForRound,
          lastModified: new Date(),
        }, { merge: true });
      }

      toast.success('Words saved successfully to Firestore!');
    } catch (error) {
      console.error('Error saving words:', error);
      toast.error('Error saving words. Check console for details.');
    } finally {
      setLoadingSave(false);
    }
  };

  // --- Modified handleLoad to load all rounds ---
  const handleLoad = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to load words.');
      return;
    }
    if (!competitionName || !passkey) {
      toast.error('Competition name and passkey are required');
      return;
    }
    setLoadingLoad(true); // Use loadingLoad for the main load operation
    console.log('Attempting to load competition data...');

    try {
      // 1. Find the competition by passkey
      const q = query(
        collection(db, `artifacts/${FIREBASE_APP_ID}/public/data/competitions`),
        where('passkey', '==', passkey)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('Competition not found with this passkey.');
        console.log('Competition not found for passkey:', passkey);
        return;
      }

      const competitionDoc = querySnapshot.docs[0];
      const competitionData = competitionDoc.data();
      const competitionId = competitionDoc.id;
      console.log('Competition found:', competitionData.competitionName, 'ID:', competitionId);

      // Verify if the current user is the organizer of this competition
      if (competitionData.organizerId !== currentUser.uid) {
          toast.error('You do not have permission to load this competition.');
          console.log('Permission denied: Organizer ID mismatch.', { expected: competitionData.organizerId, actual: currentUser.uid });
          return;
      }

      // Set competition details from loaded data
      setCompetitionName(competitionData.competitionName || '');
      const loadedRoundCount = competitionData.roundCount || 1;
      setRoundCount(loadedRoundCount);
      console.log('Loaded competition details:', { name: competitionData.competitionName, rounds: loadedRoundCount });

      // 2. Load words for ALL rounds
      const allRoundsWords: RoundWords = {};
      for (let i = 1; i <= loadedRoundCount; i++) {
          const roundDocRef = doc(db, `artifacts/${FIREBASE_APP_ID}/public/data/competitions/${competitionId}/rounds`, String(i));
          const roundDocSnap = await getDoc(roundDocRef);
          if (roundDocSnap.exists()) {
              const roundData = roundDocSnap.data();
              allRoundsWords[`Round ${i}`] = (roundData.words || []) as WordItem[];
              console.log(`Loaded words for Round ${i}:`, allRoundsWords[`Round ${i}`].length, 'words');
          } else {
              allRoundsWords[`Round ${i}`] = [];
              console.log(`No words found for Round ${i}.`);
          }
      }
      setRoundWords(allRoundsWords); // Set all round words at once
      setCurrentRound(1); // Reset to Round 1 after loading all data

      toast.success(`Competition "${competitionData.competitionName}" and all rounds loaded successfully!`);

    } catch (err) {
      console.error('Error loading competition and words:', err);
      toast.error('Error loading competition and words. Check console for details.');
    } finally {
      setLoadingLoad(false);
      console.log('Finished loading operation.');
    }
  };


  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const roundKey = `Round ${currentRound}`;
    const currentList = roundWords[roundKey];

    const oldIndex = currentList.findIndex(w => w.id === active.id);
    const newIndex = currentList.findIndex(w => w.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder array
    const newList = arrayMove(currentList, oldIndex, newIndex);

    // Save updated list to state
    setRoundWords((prev) => ({
      ...prev,
      [roundKey]: newList,
    }));
  };

  const roundKey = `Round ${currentRound}`;
  const currentWords = roundWords[roundKey] || [];
  const roundTabs = Array.from({ length: roundCount }, (_, i) => i + 1);

  // Show loading state for authentication
  if (loadingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-green-50">
        <svg className="animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span className="ml-3 text-green-800">Checking authentication...</span>
      </div>
    );
  }

  // If not authenticated, the useEffect already handles redirection, but a message can be shown
  if (!currentUser && !loadingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-green-50">
        <span className="text-red-600">Redirecting to login...</span>
      </div>
    );
  }


  return (
    <div className="flex flex-col min-h-screen bg-green-50">
      <div className="flex-grow">
        <div className={`transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="p-6 max-w-4xl mx-auto">
            <Toaster />
            <h1 className="text-3xl font-bold mb-6 text-green-800 text-center">Organizer Dashboard</h1>
            {currentUser && <p className="text-center text-sm text-gray-600 mb-4">Logged in as: {currentUser.email || currentUser.uid}</p>}

            <input type="text" placeholder="Competition Name" value={competitionName} onChange={(e) => setCompetitionName(e.target.value)}
              className="mb-5 w-full p-3 border rounded shadow-sm text-black bg-white placeholder-gray-300 border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600" />

            <input type="text" placeholder="Passkey (used to identify competition)" value={passkey} onChange={(e) => setPasskey(e.target.value)}
              className="mb-5 w-full p-3 border rounded shadow-sm bg-white text-black placeholder-gray-300 border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600" />

            {/* NEW: Load Competition Button */}
            <button
              onClick={handleLoad}
              disabled={loadingLoad || !currentUser}
              className={`mb-6 w-full bg-yellow-500 text-white px-4 py-3 rounded transition-transform cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center ${
                loadingLoad || !currentUser ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loadingLoad ? (
                <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              ) : null}
              Load Competition
            </button>

            <input type="number" min={1} placeholder="How many rounds?" value={roundCount} onChange={(e) => {
              const newCount = parseInt(e.target.value);
              setRoundCount(newCount);
              if (currentRound > newCount) setCurrentRound(newCount || 1); // Adjust current round if it exceeds new count
            }}
              className="mb-6 w-full p-3 border rounded shadow-sm text-black placeholder-gray-300 border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600 bg-white" />

            <div className="flex flex-wrap gap-2 mb-4">
              {roundTabs.map((roundNum) => (
                <div key={roundNum} className="flex gap-2 items-center">
                  <button onClick={() => {
                    setCurrentRound(roundNum);
                    // Log the words for the newly selected round
                    const wordsForSelectedRound = roundWords[`Round ${roundNum}`] || [];
                    console.log(`Switched to Round ${roundNum}. Words for this round:`, wordsForSelectedRound);
                    toast(`Switched to Round ${roundNum}. ${wordsForSelectedRound.length} words loaded.`); // Added toast
                  }}
                    className={`px-4 py-2 rounded shadow-sm transition-all cursor-pointer text-sm font-medium ${roundNum === currentRound ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-green-100'}`}>Round {roundNum}</button>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-semibold mb-3 text-green-700">Round {currentRound}</h2>

            {/* Combined input and buttons for word entry */}
            <div className="flex flex-wrap gap-3 mb-5"> {/* Added flex-wrap and gap-3 */}
              <input type="text" placeholder="Enter word" value={word} onChange={(e) => setWord(e.target.value)}
                className="flex-grow p-3 border rounded shadow-sm text-black placeholder-gray-300 border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600 bg-white" />
              <button onClick={handleSingleAddWord} className="bg-green-600 text-white px-5 py-3 rounded hover:scale-105 active:scale-95 transition-transform cursor-pointer">Add</button>
              {/* Moved Bulk Add Words Button */}
              <button
                onClick={() => setShowBulkAddModal(true)}
                className="bg-blue-500 text-white px-5 py-3 rounded shadow-md hover:bg-blue-600 active:scale-95 transition-transform cursor-pointer"
              >
                Bulk Add Words
              </button>
            </div>

            <div className="mb-6">
              <p className="font-medium mb-2 text-green-900">Words (drag to reorder or delete):</p>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={currentWords.map(item => item.id)} strategy={verticalListSortingStrategy}>
                  <ol className="p-0 flex flex-wrap overflow-y-auto" style={{ maxHeight: '400px', listStyle: 'none' }}>
                    {currentWords.map((item, index) => (
                      <SortableItem
                        key={item.id}
                        id={item.id}
                        index={index}
                        word={item.word}
                        onDelete={() => handleDeleteWord(item.id)}
                      />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
            </div>


            <div className="flex justify-center space-x-6 mb-6">
              <button
                onClick={handleSave}
                disabled={loadingSave || !currentUser}
                className={`bg-purple-600 text-white px-4 py-3 rounded transition-transform cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center ${
                  loadingSave || !currentUser ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loadingSave ? (
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                ) : null}
                Save words
              </button>

              <Link href="/competition">
                <button
                  onClick={() => setLoadingStart(true)}
                  disabled={loadingStart || !currentUser}
                  className={`px-5 py-3 bg-green-600 text-white rounded hover:bg-green-700 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center ${
                    loadingStart || !currentUser ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loadingStart ? (
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                  ) : null}
                  Start Competition
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Add Words Modal */}
      {showBulkAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-green-800 text-center">Bulk Add Words for Round {currentRound}</h2>
            <p className="text-gray-700 mb-4 text-center">Enter words separated by newlines or commas.</p>
            <textarea
              className="w-full h-40 p-3 border border-green-400 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-800"
              placeholder="e.g., apple, banana, orange&#10;grape&#10;kiwi"
              value={bulkWordsInput}
              onChange={(e) => setBulkWordsInput(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setBulkWordsInput(''); // Clear input on cancel
                  setShowBulkAddModal(false);
                }}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAddWords}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Add Words
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
