import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import styles from './SettingsModal.module.css';

export function SettingsModal({ isOpen, onClose, gameId, onTriggerEvent }) {
  const [disableCosts, setDisableCosts] = useState(false);
  const [enableMinigames, setEnableMinigames] = useState(false); // Default to disabled
  const [isGeneratingEvent, setIsGeneratingEvent] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDisableCosts = localStorage.getItem('debug-disable-costs') === 'true';
      const savedEnableMinigames = localStorage.getItem('enable-minigames') === 'true';
      setDisableCosts(savedDisableCosts);
      setEnableMinigames(savedEnableMinigames);
    }
  }, []);

  const handleDisableCostsChange = (e) => {
    const checked = e.target.checked;
    setDisableCosts(checked);
    localStorage.setItem('debug-disable-costs', checked.toString());
  };

  const handleEnableMinigamesChange = (e) => {
    const checked = e.target.checked;
    setEnableMinigames(checked);
    localStorage.setItem('enable-minigames', checked.toString());
  };

  const handleTriggerEvent = async () => {
    setIsGeneratingEvent(true);
    try {
      await onTriggerEvent();
      onClose(); // Close settings modal after triggering event
    } catch (error) {
      console.error('[Settings] Failed to trigger event:', error);
      alert('Failed to generate event. Please try again.');
    } finally {
      setIsGeneratingEvent(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Settings</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h3>Game Settings</h3>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={enableMinigames}
                onChange={handleEnableMinigamesChange}
              />
              <span>Enable Minigames</span>
            </label>
          </div>

          <div className={styles.section}>
            <h3>Debug Options</h3>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={disableCosts}
                onChange={handleDisableCostsChange}
              />
              <span>Disable Costs (Testing)</span>
            </label>
          </div>

          <div className={styles.section}>
            <h3>Events</h3>
            <Button onClick={handleTriggerEvent} disabled={isGeneratingEvent}>
              {isGeneratingEvent ? 'Generating Event...' : 'Trigger Event'}
            </Button>
          </div>
        </div>

        <div className={styles.footer}>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
