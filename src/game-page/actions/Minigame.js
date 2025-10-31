import React, { useState, useEffect, useRef } from 'react';

export function Minigame({ minigameType = 'accuracy', onEvent, onComplete, requiredScore = 100 }) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [flashColor, setFlashColor] = useState(null);
  const energyCostPerClick = 1;

  // Timing minigame state
  const timeRef = useRef(0);
  const [dotOpacity, setDotOpacity] = useState(0.5);

  // Accuracy minigame state (build, attack)
  const [circlePos, setCirclePos] = useState({ x: 50, y: 50 });
  const velocityRef = useRef({
    x: (Math.random() - 0.5) * 3,
    y: (Math.random() - 0.5) * 3
  });

  // Memory minigame state (concentration)
  const [grid, setGrid] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [isChecking, setIsChecking] = useState(false);

  const gameAreaRef = useRef(null);

  // Initialize memory game grid
  useEffect(() => {
    if (minigameType !== 'memory') return;

    // Create 8 pairs of symbols
    const symbols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const pairs = [...symbols, ...symbols];

    // Shuffle the pairs
    const shuffled = pairs.sort(() => Math.random() - 0.5);
    setGrid(shuffled);
  }, [minigameType]);

  // Calculate opacity using sine wave (0 to 1) for timing minigame
  const getOpacity = () => {
    return (Math.sin(timeRef.current * 2) + 1) / 2;
  };

  // Timing minigame animation
  useEffect(() => {
    if (minigameType !== 'timing') return;

    const interval = setInterval(() => {
      timeRef.current += 0.016;
      setDotOpacity(getOpacity());
    }, 16);

    return () => clearInterval(interval);
  }, [minigameType]);

  // Accuracy minigame animation
  useEffect(() => {
    if (minigameType !== 'accuracy') return;

    const interval = setInterval(() => {
      setCirclePos(prev => {
        let newX = prev.x + velocityRef.current.x;
        let newY = prev.y + velocityRef.current.y;

        if (newX <= 15 || newX >= 85) {
          velocityRef.current.x = -velocityRef.current.x;
          newX = newX <= 15 ? 15 : 85;
        }
        if (newY <= 15 || newY >= 85) {
          velocityRef.current.y = -velocityRef.current.y;
          newY = newY <= 15 ? 15 : 85;
        }

        return { x: newX, y: newY };
      });
    }, 30);

    return () => clearInterval(interval);
  }, [minigameType]);

  const handleTimingClick = () => {
    if (progress >= requiredScore) return;

    const currentOpacity = getOpacity();

    let progressGain = 0;
    let hitType = 'miss';
    let flash = 'white';

    if (currentOpacity >= 0.9) {
      progressGain = 3;
      hitType = 'critical';
      flash = 'red';
    } else if (currentOpacity >= 0.7) {
      progressGain = 1;
      hitType = 'good';
      flash = 'white';
    }

    console.log(`[Timing Minigame] Click at opacity: ${currentOpacity.toFixed(3)}, result: ${hitType}, score: +${progressGain}`);

    setFlashColor(flash);
    setTimeout(() => setFlashColor(null), 150);

    if (progressGain > 0) {
      const newProgress = Math.min(requiredScore, progress + progressGain);
      setProgress(newProgress);

      console.log(`[Timing Minigame] Progress: ${newProgress}/${requiredScore}`);

      if (onEvent) {
        onEvent({
          type: 'click',
          progress: newProgress,
          progressGain,
          energyCost: energyCostPerClick
        });
      }

      if (newProgress >= requiredScore) {
        console.log(`[Timing Minigame] Complete! Final score: ${newProgress}`);
        setIsComplete(true);
        if (onComplete) {
          onComplete({ progress: newProgress });
        }
      }
    }
  };

  const handleAccuracyClick = (e) => {
    if (!gameAreaRef.current || progress >= requiredScore) return;

    const rect = gameAreaRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const distancePercent = Math.sqrt(
      Math.pow(clickX - circlePos.x, 2) + Math.pow(clickY - circlePos.y, 2)
    );

    const distancePx = (distancePercent / 100) * rect.width;
    const circleRadius = 20;
    const centerThreshold = (5 / rect.width) * 100;

    let progressGain = 0;
    let hitType = 'miss';
    let flash = null;

    if (distancePercent <= centerThreshold) {
      progressGain = 3;
      hitType = 'center';
      flash = 'red';
    } else if (distancePercent <= circleRadius) {
      progressGain = 1;
      hitType = 'hit';
      flash = 'white';
    }

    console.log(`[Accuracy Minigame] Click at (${clickX.toFixed(1)}, ${clickY.toFixed(1)}), circle at (${circlePos.x.toFixed(1)}, ${circlePos.y.toFixed(1)}), distance: ${distancePx.toFixed(1)}px, result: ${hitType}, score: +${progressGain}`);

    if (flash) {
      setFlashColor(flash);
      setTimeout(() => setFlashColor(null), 150);
    }

    if (progressGain > 0) {
      const newProgress = Math.min(requiredScore, progress + progressGain);
      setProgress(newProgress);

      console.log(`[Accuracy Minigame] Progress: ${newProgress}/${requiredScore}`);

      if (onEvent) {
        onEvent({
          type: 'click',
          progress: newProgress,
          progressGain,
          energyCost: energyCostPerClick
        });
      }

      if (newProgress >= requiredScore) {
        console.log(`[Accuracy Minigame] Complete! Final score: ${newProgress}`);
        setIsComplete(true);
        if (onComplete) {
          onComplete({ progress: newProgress });
        }
      }
    }
  };

  const handleMemoryClick = (index) => {
    if (isChecking || matchedPairs.includes(index) || flippedIndices.includes(index)) return;
    if (progress >= requiredScore) return;

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setIsChecking(true);

      setTimeout(() => {
        const [first, second] = newFlipped;

        if (grid[first] === grid[second]) {
          // Match found
          const newMatched = [...matchedPairs, first, second];
          setMatchedPairs(newMatched);

          const progressGain = 3;
          const newProgress = Math.min(requiredScore, progress + progressGain);
          setProgress(newProgress);

          console.log(`[Memory Minigame] Match! Progress: ${newProgress}/${requiredScore}`);

          setFlashColor('red');
          setTimeout(() => setFlashColor(null), 150);

          if (onEvent) {
            onEvent({
              type: 'click',
              progress: newProgress,
              progressGain,
              energyCost: energyCostPerClick
            });
          }

          if (newProgress >= requiredScore) {
            console.log(`[Memory Minigame] Complete! Final score: ${newProgress}`);
            setIsComplete(true);
            if (onComplete) {
              onComplete({ progress: newProgress });
            }
          }
        } else {
          // No match
          setFlashColor('white');
          setTimeout(() => setFlashColor(null), 150);
        }

        setFlippedIndices([]);
        setIsChecking(false);
      }, 800);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      pointerEvents: 'auto',
      opacity: isComplete ? 0 : 1,
      transition: 'opacity 0.5s ease-out'
    }}>
      {minigameType === 'memory' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '5px',
            backgroundColor: flashColor === 'red' ? 'rgba(255, 0, 0, 0.5)' : flashColor === 'white' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)',
            padding: '10px',
            transition: 'background-color 0.15s ease-out'
          }}
        >
          {grid.map((symbol, index) => {
            const isFlipped = flippedIndices.includes(index) || matchedPairs.includes(index);
            return (
              <div
                key={index}
                onClick={() => handleMemoryClick(index)}
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: isFlipped ? '#fff' : 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isFlipped ? 'default' : 'pointer',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#000',
                  transition: 'background-color 0.3s'
                }}
              >
                {isFlipped ? symbol : ''}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          ref={gameAreaRef}
          onClick={minigameType === 'timing' ? handleTimingClick : handleAccuracyClick}
          style={{
            width: '200px',
            height: '200px',
            backgroundColor: flashColor === 'red' ? 'rgba(255, 0, 0, 0.5)' : flashColor === 'white' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)',
            position: 'relative',
            display: 'flex',
            alignItems: minigameType === 'timing' ? 'center' : 'flex-start',
            justifyContent: minigameType === 'timing' ? 'center' : 'flex-start',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease-out'
          }}
        >
          {minigameType === 'timing' ? (
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                opacity: dotOpacity
              }}
            />
          ) : (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: `${circlePos.x}%`,
                  top: `${circlePos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  opacity: 0.5
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${circlePos.x}%`,
                  top: `${circlePos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#ff0000'
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
