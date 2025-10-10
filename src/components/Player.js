import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Konva components to avoid SSR issues
const Circle = dynamic(() => import('react-konva').then(mod => mod.Circle), { ssr: false });

const Player = ({
  centerX,
  centerY,
  isWalking,
  playerRadius = 6,
  baseOffset = -20,
  fill = "#000000",
  playerPosition = { x: 0, y: 0 }
}) => {
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
        // Walking animation - subtle bounce
        const bouncePhase = Math.sin(Date.now() * 0.012);
        const easedBounce = Math.pow(Math.abs(bouncePhase), 0.7);
        setBounceOffset(easedBounce * 2 * Math.sign(bouncePhase)); // 2px max bounce
      } else {
        setBounceOffset(0);
      }
    }, 16); // ~60fps

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <Circle
      key="player"
      x={centerX}
      y={centerY + baseOffset + bounceOffset}
      radius={playerRadius}
      fill={fill}
      listening={false}
    />
  );
};

export default Player;
