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
  const [loadingLoad, setLoadingLoad] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Firebase authenticated user
  const [loadingAuth, setLoadingAuth] = useState(true); // State to indicate if auth status is being checked

  // --- Authenticate User on Mount ---
  useEffect(() => {
    setMounted(true); // For CSS transition

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
      if (!user) {
        // Redirect to login if not authenticated
        // Using window.location for simplicity, consider Next.js Router for better UX
        toast.error('Please log in to access the dashboard.');
        setTimeout(() => {
          window.location.href = '/login'; // Or your login page path
        }, 1500);
      }
    });

    return () => unsubscribe(); // Cleanup subscription
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleAddWord = () => {
    const newWord = word.trim();
    if (!newWord) return;

    const roundKey = `Round ${currentRound}`;
    const existingWords = roundWords[roundKey] || [];

    if (existingWords.some(w => w.word.toLowerCase() === newWord.toLowerCase())) {
      toast.error('This word has already been added to this round.');
      return;
    }

    const newEntry: WordItem = { id: crypto.randomUUID?.() || Date.now().toString(), word: newWord };

    setRoundWords((prev) => ({
      ...prev,
      [roundKey]: [...existingWords, newEntry],
    }));
    setWord('');
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

  // --- Firestore Load Function ---
  const handleLoadRoundWords = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to load words.');
      return;
    }
    if (!competitionName || !passkey) {
      toast.error('Competition name and passkey are required');
      return;
    }
    setLoadingLoad(true);

    try {
      // 1. Find the competition by passkey
      const q = query(
        collection(db, `artifacts/${FIREBASE_APP_ID}/public/data/competitions`),
        where('passkey', '==', passkey)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('Competition not found with this passkey.');
        return;
      }

      const competitionDoc = querySnapshot.docs[0];
      const competitionData = competitionDoc.data();
      const competitionId = competitionDoc.id;

      // Verify if the current user is the organizer of this competition
      if (competitionData.organizerId !== currentUser.uid) {
          toast.error('You do not have permission to load this competition.');
          return;
      }

      // Set competition details from loaded data
      setCompetitionName(competitionData.competitionName || '');
      setRoundCount(competitionData.roundCount || 1);
      // setCurrentRound remains as is, as user might want to load a specific round

      // 2. Load words for the current round
      const roundDocRef = doc(db, `artifacts/${FIREBASE_APP_ID}/public/data/competitions/${competitionId}/rounds`, String(currentRound));
      const roundDocSnap = await getDoc(roundDocRef);

      if (roundDocSnap.exists()) {
        const roundData = roundDocSnap.data();
        setRoundWords((prev) => ({
          ...prev,
          [`Round ${currentRound}`]: (roundData.words || []) as WordItem[],
        }));
        toast.success(`Loaded words for Round ${currentRound} successfully!`);
      } else {
        setRoundWords((prev) => ({
          ...prev,
          [`Round ${currentRound}`]: [], // Round document doesn't exist, so no words
        }));
        toast.error(`No words found for Round ${currentRound}.`);
      }

    } catch (err) {
      console.error('Error loading words:', err);
      toast.error('Error loading words. Check console for details.');
    } finally {
      setLoadingLoad(false);
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
          <div className="p-6 max-w-2xl mx-auto">
            <Toaster />
            <h1 className="text-3xl font-bold mb-6 text-green-800 text-center">Organizer Dashboard</h1>
            {currentUser && <p className="text-center text-sm text-gray-600 mb-4">Logged in as: {currentUser.email || currentUser.uid}</p>}

            <input type="text" placeholder="Competition Name" value={competitionName} onChange={(e) => setCompetitionName(e.target.value)}
              className="mb-5 w-full p-3 border rounded shadow-sm text-black bg-white placeholder-gray-300 border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600" />

            <input type="text" placeholder="Passkey (used to identify competition)" value={passkey} onChange={(e) => setPasskey(e.target.value)}
              className="mb-5 w-full p-3 border rounded shadow-sm bg-white text-black placeholder-gray-300 border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600" />

            <input type="number" min={1} placeholder="How many rounds?" value={roundCount} onChange={(e) => {
              const newCount = parseInt(e.target.value);
              setRoundCount(newCount);
              if (currentRound > newCount) setCurrentRound(newCount || 1); // Adjust current round if it exceeds new count
            }}
              className="mb-6 w-full p-3 border rounded shadow-sm text-black placeholder-gray-300 border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600 bg-white" />

            <div className="flex flex-wrap gap-2 mb-4">
              {roundTabs.map((roundNum) => (
                <div key={roundNum} className="flex gap-2 items-center">
                  <button onClick={() => setCurrentRound(roundNum)}
                    className={`px-4 py-2 rounded shadow-sm transition-all cursor-pointer text-sm font-medium ${roundNum === currentRound ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-green-100'}`}>Round {roundNum}</button>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-semibold mb-3 text-green-700">Round {currentRound}</h2>

            <div className="flex mb-5">
              <input type="text" placeholder="Enter word" value={word} onChange={(e) => setWord(e.target.value)}
                className="flex-grow p-3 border rounded-l shadow-sm text-black placeholder-gray-300 border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600 bg-white" />
              <button onClick={handleAddWord} className="bg-green-600 text-white px-5 py-3 rounded-r hover:scale-105 active:scale-95 transition-transform cursor-pointer">Add</button>
            </div>

            <div className="mb-6">
              <p className="font-medium mb-2 text-green-900">Words (drag to reorder or delete):</p>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={currentWords.map(item => item.id)} strategy={verticalListSortingStrategy}>
                  <ol className="p-0 flex flex-wrap overflow-y-auto" style={{ maxHeight: '70px', listStyle: 'none' }}>
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

              <button
                onClick={handleLoadRoundWords}
                disabled={loadingLoad || !currentUser}
                className={`bg-yellow-500 text-white px-4 py-3 rounded transition-transform cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center ${
                  loadingLoad || !currentUser ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loadingLoad ? (
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                ) : null}
                Load Round {currentRound} Words
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

      <Footer />
    </div>
  );
}


{/*
//CHECKPOINT CODE
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

function SortableItem({
  id,
  word,
  index,
  onDelete,
}: {
  id: string;
  word:string;
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

  //const wordText = id.split('-').slice(0, -1).join('-'); // safely get back original word
const wordText = id;

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="text-sm text-black"
    >
      <span className="mr-2 font-semibold">{index + 1}.</span>
      <span className="mr-2">{typeof word === 'string' ? word : word.word}</span>
      <button onClick={() => onDelete(id)} className="text-red-500 hover:text-red-700">
        <Trash2 size={14} />
      </button>
    </li>
  );
}


export default function DashboardPage() {
  const [competitionName, setCompetitionName] = useState('');
  const [passkey, setPasskey] = useState('');
  const [roundCount, setRoundCount] = useState(1);
  const [currentRound, setCurrentRound] = useState(1);
  const [roundWords, setRoundWords] = useState<{ [key: string]: string[] }>({});
  const [word, setWord] = useState('');
  const [mounted, setMounted] = useState(false);
  //const [loadingButton, setLoadingButton] = useState('');
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingLoad, setLoadingLoad] = useState(false);  // New loading state for load button

  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleAddWord = () => {
  const newWord = word.trim();
  if (!newWord) return;

  const roundKey = `Round ${currentRound}`;
  const existingWords = roundWords[roundKey] || [];

   if (existingWords.some(w => w.word === newWord)) {
    toast.error('This word has already been added.');
    return;
  }

  const newEntry = { id: crypto.randomUUID?.() || Date.now().toString(), word: newWord };

  setRoundWords((prev) => ({
    ...prev,
    [roundKey]: [...existingWords, newEntry],
  }));
  setWord('');
};


  const handleDeleteWord = (id: string) => {
  const roundKey = `Round ${currentRound}`;
  setRoundWords((prev) => ({
    ...prev,
    [roundKey]: prev[roundKey].filter((item) => item.id !== id),
  }));
};


  const handleSave = async () => {
    if (!competitionName || !passkey) {
      toast.error('Competition name and passkey are required');
      return;
    }
    setLoadingSave(true);
    const payload = { competitionName, passkey, rounds: roundWords };
    const res = await fetch('/api/save-words', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setLoadingSave(false);

    if (res.ok) toast.success('Words saved successfully!');
    else toast.error('Error saving words.');
  };

  const handleLoadRoundWords = async () => {
    if (!competitionName || !passkey) {
      toast.error('Competition name and passkey are required');
      return;
    }
    setLoadingLoad(true);
try {
  const res = await fetch(
    `/api/load-words?competitionName=${encodeURIComponent(competitionName)}&passkey=${encodeURIComponent(passkey)}&round=${encodeURIComponent(currentRound)}`
  );

  if (!res.ok) throw new Error('Failed to load words');
  const data = await res.json();

  setRoundWords((prev) => ({
    ...prev,
    [`Round ${currentRound}`]: (data.words || []).map((word: string) => ({
  id: crypto.randomUUID?.() || Date.now().toString(),
  word,
  })),
  }));

  toast.success(`Loaded words for Round ${currentRound}`);
} catch (err) {
  toast.error('Error loading words');
} finally {
  setLoadingLoad(false);
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

  // Reassign correct numbering based on new order
  const renumberedList = newList.map((item, index) => ({
  ...item,
  word: item.word, // unchanged, since it's just a string
}));


  // Save updated list
  setRoundWords((prev) => ({
    ...prev,
    [roundKey]: newList,
  }));
};

  const roundKey = `Round ${currentRound}`;
  const currentWords = roundWords[roundKey] || [];
  const roundTabs = Array.from({ length: roundCount }, (_, i) => i + 1);

  return (
   <div className="flex flex-col min-h-screen bg-green-50">
  <div className="flex-grow">
    <div className={`transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className="p-6 max-w-2xl mx-auto">
        <Toaster />
        <h1 className="text-3xl font-bold mb-6 text-green-800 text-center">Organizer Dashboard</h1>

        <input type="text" placeholder="Competition Name" value={competitionName} onChange={(e) => setCompetitionName(e.target.value)}
          className="mb-5 w-full p-3 border rounded shadow-sm text-black bg-white placeholder-gray-300 border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600" />

        <input type="text" placeholder="Passkey (used as file name)" value={passkey} onChange={(e) => setPasskey(e.target.value)}
          className="mb-5 w-full p-3 border rounded shadow-sm bg-white text-black placeholder-gray-300 border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600" />

        <input type="number" min={1} placeholder="How many rounds?" value={roundCount} onChange={(e) => {
          const newCount = parseInt(e.target.value);
          setRoundCount(newCount);
          if (currentRound > newCount) setCurrentRound(1);
        }}
          className="mb-6 w-full p-3 border rounded shadow-sm text-black placeholder-gray-300 border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600 bg-white" />

        <div className="flex flex-wrap gap-2 mb-4">
          {roundTabs.map((roundNum) => (
            <div key={roundNum} className="flex gap-2 items-center">
              <button onClick={() => setCurrentRound(roundNum)}
                className={`px-4 py-2 rounded shadow-sm transition-all cursor-pointer text-sm font-medium ${roundNum === currentRound ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-green-100'}`}>Round {roundNum}</button>  
            </div>
          ))}
        </div>

        <h2 className="text-xl font-semibold mb-3 text-green-700">Round {currentRound}</h2>

        <div className="flex mb-5">
          <input type="text" placeholder="Enter word" value={word} onChange={(e) => setWord(e.target.value)}
            className="flex-grow p-3 border rounded-l shadow-sm text-black placeholder-gray-300 border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600 bg-white" />
          <button onClick={handleAddWord} className="bg-green-600 text-white px-5 py-3 rounded-r hover:scale-105 active:scale-95 transition-transform cursor-pointer">Add</button>
        </div>

        <div className="mb-6">
  <p className="font-medium mb-2 text-green-900">Words (drag to reorder or delete):</p>

  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
    <SortableContext items={currentWords.map(item => item.id)} strategy={verticalListSortingStrategy}>
      <ol className="p-0 flex flex-wrap overflow-y-auto" style={{ maxHeight: '70px', listStyle: 'none' }}>
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
            disabled={loadingSave}
            className={`bg-purple-600 text-white px-4 py-3 rounded transition-transform cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center ${
              loadingSave ? 'opacity-70 cursor-not-allowed' : ''
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

          <button
            onClick={handleLoadRoundWords}
            disabled={loadingLoad}
            className={`bg-yellow-500 text-white px-4 py-3 rounded transition-transform cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center ${
              loadingLoad ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loadingLoad ? (
              <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            ) : null}
            Load Round {currentRound} Words
          </button>

          <Link href="/competition">
            <button
              onClick={() => setLoadingStart(true)}
              disabled={loadingStart}
              className={`px-5 py-3 bg-green-600 text-white rounded hover:bg-green-700 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center ${
                loadingStart ? 'opacity-70 cursor-not-allowed' : ''
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

  // Footer stays pinned to bottom 
  <Footer />
</div>
  );
}
*/}