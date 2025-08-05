// src/components/CompetitorRoundDisplay.tsx
import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { CheckCircle, XCircle } from 'lucide-react'; // For icons
import toast from 'react-hot-toast'; // Import toast

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
  isSpellingPhase: boolean;
}

const CompetitorRoundDisplay: React.FC<CompetitorRoundDisplayProps> = ({
  currentRound,
  activeCompetitors,
  onConfirmWinners,
  isSpellingPhase,
}) => {
  // State to track which competitors are selected to advance to the next round
  const [selectedToAdvance, setSelectedToAdvance] = useState<string[]>([]);
  const [showConfirmButton, setShowConfirmButton] = useState(false); // Controls visibility of Confirm Winners button

  // Use a ref to track the previous currentRound to differentiate between
  // a new round starting and a re-render within the same round.
  const prevRoundRef = useRef<number>(currentRound);

  // Effect to manage selectedToAdvance based on round changes and active competitors
  useEffect(() => {
    // If the currentRound prop has changed, it signifies a new round.
    // In this case, we reset the selection to be empty by default.
    if (prevRoundRef.current !== currentRound) {
      setSelectedToAdvance([]); // Reset selection for a new round
      toast('New round started. Please select winners.', { icon: '🏆' });
    } else {
      // If it's the same round, but activeCompetitors might have changed (e.g., due to eliminations),
      // we filter the current selection to ensure only still-active competitors remain selected.
      const currentActiveIds = new Set(activeCompetitors.map(c => c.id));
      setSelectedToAdvance(prevSelected => prevSelected.filter(id => currentActiveIds.has(id)));
    }

    // Update the ref to the current round number for the next render cycle.
    prevRoundRef.current = currentRound;

    // Always show the confirm button when this component is active.
    setShowConfirmButton(true);
  }, [activeCompetitors, currentRound]); // Dependencies: re-run when activeCompetitors or currentRound changes

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
      toast.error('Please select at least one competitor to advance.');
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
                    ? 'bg-green-100 border-2 border-green-500' // Selected style
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100' // Unselected style
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
              className="w-full py-3 rounded-md shadow-lg font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 bg-blue-600 text-white hover:bg-blue-700 active:scale-98 cursor-pointer"
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
