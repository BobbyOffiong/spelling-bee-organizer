// components/Timer.tsx
import React, { useState, useEffect, useRef } from 'react';

interface TimerProps {
  initialTime: number; // Time in seconds
  isRunning: boolean;
  onTimerEnd: () => void;
  onTick?: (secondsLeft: number) => void; // Optional callback for each tick
}

const Timer: React.FC<TimerProps> = ({ initialTime, isRunning, onTimerEnd, onTick }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialTime);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to reset timer when initialTime changes (e.g., organizer adjusts duration)
  // This will also reset when `isRunning` becomes true, ensuring a fresh start.
  useEffect(() => {
    setSecondsLeft(initialTime);
  }, [initialTime]);

  // Effect to manage the timer countdown
  useEffect(() => {
    if (isRunning) {
      // Clear any existing interval before starting a new one
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Ensure timer starts from initialTime when it begins running
      setSecondsLeft(initialTime); // <--- Added this line to force reset on start

      timerRef.current = setInterval(() => {
        setSecondsLeft((prevTime) => {
          const newTime = prevTime - 1;
          if (onTick) {
            onTick(newTime); // Call optional tick callback
          }
          if (newTime <= 0) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            onTimerEnd(); // Signal timer has ended
            return 0; // Ensure time doesn't go negative
          }
          return newTime;
        });
      }, 1000);
    } else {
      // If not running, clear any existing interval
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    // Cleanup function: clear interval when component unmounts or isRunning becomes false
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, initialTime, onTimerEnd, onTick]); // Added initialTime to dependencies to reset timer when duration changes

  // Format time for display (MM:SS)
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`font-mono text-4xl font-bold rounded-lg px-4 py-2 shadow-md
      ${secondsLeft <= 10 && secondsLeft > 0 ? 'bg-red-200 text-red-800 animate-pulse' : 'bg-green-200 text-green-800'}`}>
      {formatTime(secondsLeft)}
    </div>
  );
};

export default Timer;
