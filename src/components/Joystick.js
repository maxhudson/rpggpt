import React, { useRef, useEffect, useState } from 'react';
import styles from './Joystick.module.css';

export default function Joystick({ onMove, containerRef }) {
  const joystickRef = useRef(null);
  const knobRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const maxDistanceRef = useRef(30); // Maximum distance knob can move from center

  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    const handleTouchMove = (e) => {
      if (touchIdRef.current === null) return;

      const touch = Array.from(e.touches).find(t => t.identifier === touchIdRef.current);
      if (!touch) return;

      e.preventDefault(); // Prevent scrolling

      const deltaX = touch.clientX - centerRef.current.x;
      const deltaY = touch.clientY - centerRef.current.y;

      // Calculate distance from center
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = maxDistanceRef.current;

      // Only register movement if beyond dead zone
      const deadZone = 8;
      if (distance < deadZone) {
        setKnobPosition({ x: 0, y: 0 });
        if (onMove) {
          onMove({ x: 0, y: 0, speed: 0 });
        }
        return;
      }

      // Normalize the direction vector
      let dirX = deltaX / distance;
      let dirY = deltaY / distance;

      // Constant speed (no sprint on mobile)
      const speed = 1;

      // Position knob visually (capped at maxDistance)
      const cappedDistance = Math.min(distance, maxDistance);
      const visualX = (deltaX / distance) * cappedDistance;
      const visualY = (deltaY / distance) * cappedDistance;
      setKnobPosition({ x: visualX, y: visualY });

      // Call onMove callback with normalized direction and speed
      if (onMove) {
        onMove({ x: dirX, y: dirY, speed });
      }
    };

    const handleTouchStart = (e) => {
      // Only handle single touches
      if (e.touches.length !== 1) return;

      e.preventDefault(); // Prevent scrolling

      const touch = e.touches[0];
      touchIdRef.current = touch.identifier;

      // Position joystick at touch location
      const containerRect = container.getBoundingClientRect();
      const touchX = touch.clientX - containerRect.left;
      const touchY = touch.clientY - containerRect.top;

      setJoystickPosition({ x: touchX, y: touchY });
      centerRef.current = {
        x: touch.clientX,
        y: touch.clientY
      };

      setIsActive(true);
      handleTouchMove(e);
    };

    const handleTouchEnd = (e) => {
      const touches = Array.from(e.changedTouches);
      const isOurTouch = touches.some(t => t.identifier === touchIdRef.current);

      if (!isOurTouch) return;

      touchIdRef.current = null;
      setIsActive(false);
      setKnobPosition({ x: 0, y: 0 });

      // Stop movement
      if (onMove) {
        onMove({ x: 0, y: 0, speed: 0 });
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onMove, containerRef]);

  return isActive ? (
    <div
      ref={joystickRef}
      className={`${styles.joystick} ${styles.active}`}
      style={{
        position: 'absolute',
        left: `${joystickPosition.x}px`,
        top: `${joystickPosition.y}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none'
      }}
    >
      <div
        ref={knobRef}
        className={styles.knob}
        style={{
          transform: `translate(${knobPosition.x}px, ${knobPosition.y}px)`
        }}
      />
    </div>
  ) : null;
}
