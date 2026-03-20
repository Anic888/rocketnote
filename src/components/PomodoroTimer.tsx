import { useEffect, useRef } from 'react';
import { PomodoroState } from '../types';
import { Timer, Coffee } from '../icons';
import './PomodoroTimer.css';

interface PomodoroTimerProps {
  pomodoro: PomodoroState;
  setPomodoro: React.Dispatch<React.SetStateAction<PomodoroState>>;
}

function PomodoroTimer({ pomodoro, setPomodoro }: PomodoroTimerProps) {
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (pomodoro.isRunning && pomodoro.timeRemaining > 0) {
      intervalRef.current = window.setInterval(() => {
        setPomodoro(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        }));
      }, 1000);
    } else if (pomodoro.timeRemaining === 0 && pomodoro.isRunning) {
      // Timer finished
      const isBreak = pomodoro.isBreak;
      let newSessions = pomodoro.sessionsCompleted;
      let nextIsBreak = !isBreak;
      let nextDuration: number;

      if (!isBreak) {
        // Work session ended
        newSessions += 1;
        const isLongBreak = newSessions % pomodoro.sessionsUntilLongBreak === 0;
        nextDuration = isLongBreak ? pomodoro.longBreakDuration : pomodoro.breakDuration;
        
        // Notification
        if (Notification.permission === 'granted') {
          new Notification('Pomodoro Complete!', {
            body: isLongBreak ? 'Time for a long break!' : 'Time for a short break!',
          });
        }
      } else {
        // Break ended
        nextDuration = pomodoro.workDuration;
        
        if (Notification.permission === 'granted') {
          new Notification('Break Over!', {
            body: 'Time to get back to work!',
          });
        }
      }

      setPomodoro(prev => ({
        ...prev,
        isBreak: nextIsBreak,
        timeRemaining: nextDuration * 60,
        sessionsCompleted: newSessions,
        isRunning: false,
      }));
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pomodoro.isRunning, pomodoro.timeRemaining, setPomodoro]);

  const toggleTimer = () => {
    if (!pomodoro.isRunning && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setPomodoro(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const resetTimer = () => {
    setPomodoro(prev => ({
      ...prev,
      isRunning: false,
      isBreak: false,
      timeRemaining: prev.workDuration * 60,
    }));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = pomodoro.isBreak
    ? 1 - (pomodoro.timeRemaining / ((pomodoro.sessionsCompleted % pomodoro.sessionsUntilLongBreak === 0 ? pomodoro.longBreakDuration : pomodoro.breakDuration) * 60))
    : 1 - (pomodoro.timeRemaining / (pomodoro.workDuration * 60));

  return (
    <div className={`pomodoro-timer ${pomodoro.isBreak ? 'break' : 'work'}`}>
      <div 
        className="timer-display"
        onClick={toggleTimer}
        title={pomodoro.isRunning ? 'Click to pause' : 'Click to start'}
      >
        <div 
          className="timer-progress" 
          style={{ width: `${progress * 100}%` }}
        />
        <span className="timer-icon">
          {pomodoro.isBreak ? <Coffee size={16} strokeWidth={1.75} /> : <Timer size={16} strokeWidth={1.75} />}
        </span>
        <span className="timer-time">{formatTime(pomodoro.timeRemaining)}</span>
      </div>
      
      {pomodoro.isRunning && (
        <button className="timer-reset" onClick={resetTimer} title="Reset">
          ↺
        </button>
      )}
      
      <span className="session-count" title={`${pomodoro.sessionsCompleted} sessions completed`}>
        {pomodoro.sessionsCompleted}
      </span>
    </div>
  );
}

export default PomodoroTimer;
