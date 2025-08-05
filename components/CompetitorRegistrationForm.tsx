// src/components/CompetitorRegistrationForm.tsx
import React, { useState } from 'react';
import { PlusCircle, Trash2, Play } from 'lucide-react'; // For icons
import toast from 'react-hot-toast'; // Import toast for consistent error messages

// Define Competitor interface (should match the one in CompetitionPage.tsx)
interface Competitor {
  id: string;
  name: string;
  isEliminated: boolean;
  isCurrentTurn: boolean; // <--- This was the missing property
  score: number;
}

interface CompetitorRegistrationFormProps {
  // Updated the type of competitors in the prop to match the full Competitor interface
  onRegisterCompetitors: (competitors: Competitor[]) => void;
  onStartCompetition: () => void;
}

const CompetitorRegistrationForm: React.FC<CompetitorRegistrationFormProps> = ({
  onRegisterCompetitors,
  onStartCompetition,
}) => {
  const [competitorName, setCompetitorName] = useState<string>('');
  // Updated the type of the 'competitors' state to match the full Competitor interface
  const [competitors, setCompetitors] = useState<Competitor[]>([]);

  // Handles adding a new competitor to the list
  const handleAddCompetitor = () => {
    if (competitorName.trim() !== '') {
      // Generate a simple unique ID for each competitor
      const newCompetitor: Competitor = { // <--- Explicitly type newCompetitor
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9), // Simple unique ID
        name: competitorName.trim(),
        isEliminated: false,
        isCurrentTurn: false, // <--- Initialize isCurrentTurn to false
        score: 0,
      };
      setCompetitors((prev) => [...prev, newCompetitor]);
      setCompetitorName(''); // Clear the input field
    }
  };

  // Handles removing a competitor from the list
  const handleRemoveCompetitor = (id: string) => {
    setCompetitors((prev) => prev.filter((comp) => comp.id !== id));
  };

  // Handles starting the competition after names are entered
  const handleStartCompetition = () => {
    if (competitors.length < 2) {
      toast.error('Please add at least two competitors to start the competition.'); // Changed from alert to toast
      return;
    }
    onRegisterCompetitors(competitors); // Pass the registered competitors up to the parent
    onStartCompetition(); // Signal to the parent to start the competition UI
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-xl border border-green-200">
      <h2 className="text-3xl font-bold mb-6 text-center text-green-800">Register Competitors</h2>

      {/* Input for new competitor */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Enter competitor name"
          value={competitorName}
          onChange={(e) => setCompetitorName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddCompetitor();
            }
          }}
          className="flex-grow p-3 border border-green-400 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-800 placeholder-gray-400"
          aria-label="Competitor name input"
        />
        <button
          onClick={handleAddCompetitor}
          className="bg-green-600 text-white p-3 rounded-md shadow-md hover:bg-green-700 transition-colors duration-200 flex items-center justify-center gap-1 active:scale-95"
          aria-label="Add competitor"
        >
          <PlusCircle size={20} /> Add
        </button>
      </div>

      {/* List of registered competitors */}
      {competitors.length > 0 && (
        <div className="mb-6 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Current Competitors:</h3>
          <ul className="space-y-2">
            {competitors.map((comp) => (
              <li
                key={comp.id}
                className="flex items-center justify-between bg-green-100 p-3 rounded-md shadow-sm text-gray-900 font-medium"
              >
                <span>{comp.name}</span>
                <button
                  onClick={() => handleRemoveCompetitor(comp.id)}
                  className="text-red-500 hover:text-red-700 transition-colors duration-200 p-1 rounded-full hover:bg-red-100"
                  aria-label={`Remove ${comp.name}`}
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Start Competition button */}
      <button
        onClick={handleStartCompetition}
        disabled={competitors.length < 2}
        className={`w-full py-3 rounded-md shadow-lg font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer
          ${competitors.length < 2
            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-98'
          }`}
        aria-label="Start Competition"
      >
        <Play size={24} /> Start Competition
      </button>
    </div>
  );
};

export default CompetitorRegistrationForm;
