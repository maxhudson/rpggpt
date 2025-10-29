import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import useImage from 'use-image';
import { cellSize } from '../k';

const Image = dynamic(() => import('react-konva').then(mod => ({ default: mod.Image })), { ssr: false });
const Group = dynamic(() => import('react-konva').then(mod => ({ default: mod.Group })), { ssr: false });
const Circle = dynamic(() => import('react-konva').then(mod => ({ default: mod.Circle })), { ssr: false });
const Ellipse = dynamic(() => import('react-konva').then(mod => ({ default: mod.Ellipse })), { ssr: false });

var yScale = 0.75; // Scale factor for Y axis to adjust character height

// Konva is only available on client-side
let Konva;
if (typeof window !== 'undefined') {
  Konva = require('konva');
}

const MapSimpleCharacter = React.memo(function MapSimpleCharacter({
  x,
  y,
  characterName,
  isWalking = false,
  isActive = false
}) {
  const [sprite] = useImage(`/Characters/${characterName}.png`);
  const imageRef = useRef(null);
  const [bounceOffset, setBounceOffset] = useState(0);

  // Bounce animation when walking
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isWalking) {
        // Walking animation - bounce up and down
        const bouncePhase = Math.sin(Date.now() * 0.01);
        const easedBounce = Math.pow(Math.abs(bouncePhase), 0.6);
        setBounceOffset(-easedBounce * 2 * Math.sign(bouncePhase)); // 4px max bounce (negative = up)
      } else {
        setBounceOffset(0);
      }
    }, 30); // ~60fps

    return () => {
      clearInterval(intervalId);
    };
  }, [isWalking]);

  // Cache the image for pixelate filter after it loads
  useEffect(() => {
    if (!sprite || !imageRef.current) return;

    const node = imageRef.current;

    // Wait for next frame to ensure Konva node is mounted
    const timeoutId = setTimeout(() => {
      if (node.cache) {
        console.log('Caching character image');
        node.cache();
        node.getLayer()?.batchDraw();
      } else {
        console.warn('cache() method not available on Konva Image node');
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [sprite]);

  // Non-active characters appear slightly transparent
  const opacity = isActive ? 1 : 1;
  const fillColor = isActive ? "black" : "#555";

  return (
    <Group x={x} y={y - bounceOffset} opacity={opacity}>
      {sprite ? (
        <Image
          ref={imageRef}
          image={sprite}
          width={40}
          height={40 / yScale}
          offsetX={20}
          offsetY={40 / yScale - 7}
        />
      ) : (<>
        <Ellipse
          radiusX={2.5}
          radiusY={2.5 / yScale}
          fill={fillColor}
          strokeWidth={2}
          x={0}
          y={0 - 23 / yScale}
        />
        <Ellipse
          x={0}
          y={-9 / yScale}
          radiusX={4 + bounceOffset / 4}
          radiusY={10 / yScale}
          fill={fillColor}
        />
      </>)}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Only re-render if position, walking state, or active state changes
  return (
    prevProps.x === nextProps.x &&
    prevProps.y === nextProps.y &&
    prevProps.isWalking === nextProps.isWalking &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.characterName === nextProps.characterName
  );
});

export default MapSimpleCharacter;
