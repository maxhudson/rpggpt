import React, { useRef, useEffect, useState } from 'react';
import styles from './Joystick.module.css';

export default function Joystick({ onMove }) {
  const joystickRef = useRef(null);
  const knobRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const maxDistanceRef = useRef(20); // Maximum distance knob can move from center

  useEffect(() => {
    const joystick = joystickRef.current;
    if (!joystick) return;

    const handleTouchStart = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      touchIdRef.current = touch.identifier;

      const rect = joystick.getBoundingClientRect();
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      setIsActive(true);
      handleTouchMove(e);
    };

    const handleTouchMove = (e) => {
      if (touchIdRef.current === null) return;

      const touch = Array.from(e.touches).find(t => t.identifier === touchIdRef.current);
      if (!touch) return;

      const deltaX = touch.clientX - centerRef.current.x;
      const deltaY = touch.clientY - centerRef.current.y;

      // Calculate distance from center
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = maxDistanceRef.current;

      // Constrain to circle
      let x = deltaX;
      let y = deltaY;

      if (distance > maxDistance) {
        const angle = Math.atan2(deltaY, deltaX);
        x = Math.cos(angle) * maxDistance;
        y = Math.sin(angle) * maxDistance;
      }

      setPosition({ x, y });

      // Normalize to -1 to 1 range
      const normalizedX = x / maxDistance;
      const normalizedY = y / maxDistance;

      // Call onMove callback with normalized direction
      if (onMove) {
        onMove({ x: normalizedX, y: normalizedY });
      }
    };

    const handleTouchEnd = (e) => {
      const touches = Array.from(e.changedTouches);
      const isOurTouch = touches.some(t => t.identifier === touchIdRef.current);

      if (!isOurTouch) return;

      touchIdRef.current = null;
      setIsActive(false);
      setPosition({ x: 0, y: 0 });

      // Stop movement
      if (onMove) {
        onMove({ x: 0, y: 0 });
      }
    };

    joystick.addEventListener('touchstart', handleTouchStart, { passive: false });
    joystick.addEventListener('touchmove', handleTouchMove, { passive: false });
    joystick.addEventListener('touchend', handleTouchEnd);
    joystick.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      joystick.removeEventListener('touchstart', handleTouchStart);
      joystick.removeEventListener('touchmove', handleTouchMove);
      joystick.removeEventListener('touchend', handleTouchEnd);
      joystick.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onMove]);
  console.log('Joystick mounted');
  return (
    <div
      ref={joystickRef}
      className={`${styles.joystick} ${isActive ? styles.active : ''}`}
    >
      <div
        ref={knobRef}
        className={styles.knob}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`
        }}
      />
    </div>
  );
}
