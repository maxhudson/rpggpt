import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Konva components to avoid SSR issues
const Ellipse = dynamic(() => import('react-konva').then(mod => mod.Ellipse), { ssr: false });

const Player = ({
  centerX,
  centerY,
  isWalking,
  playerRadius = 5,
  baseOffset = -20,
  fill = "#000000",
  playerPosition = { x: 0, y: 0 }
}) => {
  const [animationTime, setAnimationTime] = useState(0);
  const [bounceOffset, setBounceOffset] = useState(0);
  const lastPositionRef = useRef(playerPosition);
  const lastMoveTimeRef = useRef(Date.now());
  const intervalDependenciesRef = useRef({ playerPosition });

  // Update ref with current dependencies
  intervalDependenciesRef.current = { playerPosition };

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      const currentPlayerPosition = intervalDependenciesRef.current.playerPosition;

      // Check if player position has changed recently to determine if walking
      const positionChanged =
        lastPositionRef.current.x !== currentPlayerPosition.x ||
        lastPositionRef.current.y !== currentPlayerPosition.y;

      if (positionChanged) {
        lastMoveTimeRef.current = now;
        lastPositionRef.current = { ...currentPlayerPosition };
      }

      // Consider walking if moved within last 100ms
      const isCurrentlyWalking = (now - lastMoveTimeRef.current) < 100;

      if (isCurrentlyWalking) {
        // Walking animation - continuous bouncing
        setAnimationTime(prev => prev + 0.2);
        const bouncePhase = Math.sin(Date.now() * 0.01);
        // Realistic bounce with gravity-like easing
        const easedBounce = Math.pow(Math.abs(bouncePhase), 0.7); // More realistic curve
        setBounceOffset(easedBounce * 3 * Math.sign(bouncePhase)); // 6px max bounce
      } else {
        // Animation finished
        setBounceOffset(0);
      }
    }, 16); // ~60fps

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <Ellipse
      key="player"
      x={centerX}
      y={centerY + baseOffset + bounceOffset}
      radiusX={playerRadius}
      radiusY={playerRadius}
      fill={'#000'}
      listening={false}
    />
  );
};

export default Player;
