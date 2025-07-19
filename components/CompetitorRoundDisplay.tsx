// components/CompetitorRoundDisplay.tsx
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react'; // For icons

// Define Competitor interface (should match the one in CompetitionPage.tsx)
interface Competitor {
  id: string;
  name: string;
  isEliminated: boolean;
  isCurrentTurn: boolean;
  score: number;
}

interface CompetitorRoundDisplayProps {
  currentRound: number;
  activeCompetitors: Competitor[];
  onConfirmWinners: (winners: Competitor[]) => void;
  onAdvanceToSpelling: () => void; // New prop to signal transition to spelling phase
  isSpellingPhase: boolean; // New prop to indicate if we are in spelling phase
}

const CompetitorRoundDisplay: React.FC<CompetitorRoundDisplayProps> = ({
  currentRound,
  activeCompetitors,
  onConfirmWinners,
  onAdvanceToSpelling,
  isSpellingPhase,
}) => {
  // State to track which competitors are selected to advance to the next round
  const [selectedToAdvance, setSelectedToAdvance] = useState<string[]>([]);
  const [showConfirmButton, setShowConfirmButton] = useState(false); // Controls visibility of Confirm Winners button

  // Reset selectedToAdvance when activeCompetitors or currentRound changes
  useEffect(() => {
    setSelectedToAdvance(activeCompetitors.map(comp => comp.id)); // By default, all active competitors are selected
    setShowConfirmButton(true); // Show confirm button when a new round starts
  }, [activeCompetitors, currentRound]);

  // Handle toggling selection of a competitor
  const handleToggleSelection = (competitorId: string) => {
    setSelectedToAdvance((prev) =>
      prev.includes(competitorId)
        ? prev.filter((id) => id !== competitorId) // Deselect
        : [...prev, competitorId] // Select
    );
  };

  // Handle confirming the winners for the current round
  const handleConfirm = () => {
    if (selectedToAdvance.length === 0) {
      alert('Please select at least one competitor to advance.'); // Will replace with toast later
      return;
    }
    const winners = activeCompetitors.filter(comp => selectedToAdvance.includes(comp.id));
    onConfirmWinners(winners); // Pass the confirmed winners up to the parent
    setShowConfirmButton(false); // Hide the button after confirmation
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      {!isSpellingPhase && ( // Only show competitor selection if not in spelling phase
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl border border-blue-200">
          <h3 className="text-2xl font-bold mb-6 text-center text-blue-800">
            Round {currentRound} - Select Winners
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {activeCompetitors.map((comp) => (
              <div
                key={comp.id}
                className={`flex items-center justify-between p-4 rounded-lg shadow-sm cursor-pointer transition-all duration-200
                  ${selectedToAdvance.includes(comp.id)
                    ? 'bg-green-100 border-2 border-green-500'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                onClick={() => handleToggleSelection(comp.id)}
              >
                <span className="text-lg font-semibold text-gray-800">{comp.name}</span>
                {selectedToAdvance.includes(comp.id) ? (
                  <CheckCircle size={24} className="text-green-600" />
                ) : (
                  <XCircle size={24} className="text-gray-400" />
                )}
              </div>
            ))}
          </div>
          {showConfirmButton && (
            <button
              onClick={handleConfirm}
              className="w-full py-3 rounded-md shadow-lg font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 bg-blue-600 text-white hover:bg-blue-700 active:scale-98"
            >
              Confirm Winners for Round {currentRound}
            </button>
          )}
        </div>
      )}

      {isSpellingPhase && ( // Show a message or a placeholder if in spelling phase
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl border border-green-200 text-center">
          <h3 className="text-2xl font-bold mb-4 text-green-800">
            Round {currentRound} - Spelling Time!
          </h3>
          <p className="text-gray-700 mb-4">
            Competitors for this round have been confirmed.
            The spelling section will now be active.
          </p>
          {/* This button is temporary, the parent will handle the actual transition */}
          {/* <button
            onClick={onAdvanceToSpelling}
            className="bg-purple-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-purple-700 transition-colors duration-200"
          >
            Go to Spelling
          </button> */}
        </div>
      )}
    </div>
  );
};

export default CompetitorRoundDisplay;
