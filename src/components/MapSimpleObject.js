import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import useImage from 'use-image';
import { cellSize } from '../k';
import sprites from '@/sprites';

const Image = dynamic(() => import('react-konva').then(mod => ({ default: mod.Image })), { ssr: false });
const Group = dynamic(() => import('react-konva').then(mod => ({ default: mod.Group })), { ssr: false });
const Text = dynamic(() => import('react-konva').then(mod => ({ default: mod.Text })), { ssr: false });
const Rect = dynamic(() => import('react-konva').then(mod => ({ default: mod.Rect })), { ssr: false });

// Konva is only available on client-side
let Konva;
if (typeof window !== 'undefined') {
  Konva = require('konva');
}

const MapSimpleObject = React.memo(function MapSimpleObject({
  instance,
  instanceId,
  elementDef,
  x,
  y,
  opacity,
  displayText,
  characterIsBehind = false
}) {
  const imageRef = useRef(null);
  const spriteId = elementDef?.spriteId;
  const imagePath = spriteId ? `/${instance.collection}/${spriteId}.png` : null;
  const [image] = useImage(imagePath);

  // Cache the image for pixelate filter after it loads
  useEffect(() => {
    if (!image || !imageRef.current) return;

    const node = imageRef.current;

    // Wait for next frame to ensure Konva node is mounted
    const timeoutId = setTimeout(() => {
      if (node.cache) {
        node.cache();
        node.getLayer()?.batchDraw();
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [image]);

  // Animation and flipping for animals
  const isAnimal = instance.collection === 'Animals';
  const facingRight = instance.facingRight !== undefined ? instance.facingRight : false;

  if (image) {
    var spriteData = sprites[spriteId];
    var imageSize = cellSize * Math.max(spriteData.width || 1, spriteData.height || 1) * (spriteData.imageScale || 1);
  }

  var yScale = 0.75;

  return (
    <Group x={x} y={y} opacity={characterIsBehind ? 1 : 1}>
      {image ? (
        <>
          <Image
            ref={imageRef}
            image={image}
            width={imageSize}
            height={imageSize / yScale}
            x={-imageSize / 2 + spriteData.width * cellSize / 2}
            y={(spriteData.yOffset || 0) * cellSize / yScale - imageSize / yScale + spriteData.width * cellSize / 2 * (spriteData.imageScale || 1)}
            scaleX={isAnimal && facingRight ? -1 : 1} // Flip horizontally when facing right
            offsetX={isAnimal && facingRight ? imageSize : 0} // Adjust offset for flip
            // filters={Konva ? [Konva.Filters.Pixelate] : []}
            // pixelSize={8}
          />
        </>
      ) : (
        <>
          {/* Text label above */}
          <Text
            x={0}
            width={cellSize}
            y={6}
            text={displayText.toUpperCase()[0]}
            letterSpacing={1}
            fontSize={18}
            fill="black"
            align="center"
            fontFamily="EB Garamond"
          />
        </>
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.x === nextProps.x &&
    prevProps.y === nextProps.y &&
    prevProps.opacity === nextProps.opacity &&
    prevProps.instanceId === nextProps.instanceId &&
    prevProps.instance.level === nextProps.instance.level &&
    prevProps.displayText === nextProps.displayText &&
    prevProps.characterIsBehind === nextProps.characterIsBehind &&
    prevProps.instance.facingRight === nextProps.instance.facingRight &&
    prevProps.instance.animationFrame === nextProps.instance.animationFrame &&
    prevProps.instance.isPaused === nextProps.instance.isPaused
  );
});

export default MapSimpleObject;
