import React, { useRef, useEffect, useState } from 'react';
import styles from './Joystick.module.css';

export default function Joystick({ onMove }) {
  const joystickRef = useRef(null);
  const knobRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const maxDistanceRef = useRef(30); // Maximum distance knob can move from center

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

      // Only register movement if beyond dead zone
      const deadZone = 8;
      if (distance < deadZone) {
        setPosition({ x: 0, y: 0 });
        if (onMove) {
          onMove({ x: 0, y: 0, speed: 0 });
        }
        return;
      }

      // Calculate angle in degrees
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      // Snap to 8 directions (0, 1, or -1 for each axis)
      let dirX = 0;
      let dirY = 0;

      // Determine direction based on angle
      if (angle >= -22.5 && angle < 22.5) {
        // Right
        dirX = 1;
        dirY = 0;
      } else if (angle >= 22.5 && angle < 67.5) {
        // Down-Right
        dirX = 1;
        dirY = 1;
      } else if (angle >= 67.5 && angle < 112.5) {
        // Down
        dirX = 0;
        dirY = 1;
      } else if (angle >= 112.5 && angle < 157.5) {
        // Down-Left
        dirX = -1;
        dirY = 1;
      } else if (angle >= 157.5 || angle < -157.5) {
        // Left
        dirX = -1;
        dirY = 0;
      } else if (angle >= -157.5 && angle < -112.5) {
        // Up-Left
        dirX = -1;
        dirY = -1;
      } else if (angle >= -112.5 && angle < -67.5) {
        // Up
        dirX = 0;
        dirY = -1;
      } else if (angle >= -67.5 && angle < -22.5) {
        // Up-Right
        dirX = 1;
        dirY = -1;
      }

      // Constant speed (no sprint on mobile)
      const speed = 1;

      // Position knob visually in the snapped direction
      const visualDistance = maxDistance * 0.6;
      const visualX = dirX * visualDistance;
      const visualY = dirY * visualDistance;
      setPosition({ x: visualX, y: visualY });

      // Call onMove callback with snapped direction and speed
      if (onMove) {
        onMove({ x: dirX, y: dirY, speed });
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
        onMove({ x: 0, y: 0, speed: 0 });
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
