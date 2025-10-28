import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import useImage from 'use-image';
import { cellSize } from '../k';

const Image = dynamic(() => import('react-konva').then(mod => ({ default: mod.Image })), { ssr: false });
const Group = dynamic(() => import('react-konva').then(mod => ({ default: mod.Group })), { ssr: false });
const Circle = dynamic(() => import('react-konva').then(mod => ({ default: mod.Circle })), { ssr: false });
const Ellipse = dynamic(() => import('react-konva').then(mod => ({ default: mod.Ellipse })), { ssr: false });

// Konva is only available on client-side
let Konva;
if (typeof window !== 'undefined') {
  Konva = require('konva');
}

export default function MapSimpleCharacter({
  x,
  y,
  isWalking = false
}) {
  var sprite = null;
  // const [sprite] = useImage('/elements/playerWalking.gif');
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

  return (
    <Group x={x} y={y - bounceOffset}>
      {sprite ? (
        <Image
          ref={imageRef}
          image={sprite}
          width={64}
          height={64}
          offsetX={cellSize}
          offsetY={cellSize + 18 / 2}
          filters={Konva ? [Konva.Filters.Pixelate] : []}
          pixelSize={2}
        />
      ) : (<>
        <Circle
          radius={2.5}
          fill="#ffffffff"
          strokeWidth={2}
          offsetX={0}
          offsetY={0 + 23}
          //shadow
          shadowColor="#fff"
          shadowBlur={5}
          shadowOffsetX={0}
          shadowOffsetY={0}
          shadowOpacity={1}
        />
        <Ellipse
          x={0}
          y={-9}
          radiusX={3.5 + bounceOffset / 4}
          radiusY={10}
          fill="black"
        />
      </>)}
    </Group>
  );
}
