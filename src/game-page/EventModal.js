import React, { useState } from 'react';
import { Button } from './Button';
import styles from './SettingsModal.module.css';
import { getPrompt } from './getPrompt';

export function EventModal({ event, game, history, onClose, onEventComplete }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  if (!event) return null;

  const handleOptionSelect = async (option) => {
    setIsProcessing(true);
    setSelectedOption(option);

    try {
      // Build prompt for AI to process event response
      const eventPrompt = `${getPrompt(game, history, '')}

SPECIAL EVENT RESPONSE:
The player is responding to an event. Process the event outcome based on their choice.

Event: ${event.eventTitle}
Event Description: ${event.eventDescription}
Player's Choice: ${option.label} - ${option.description}

Based on this choice, generate a response that:
1. Describes the outcome of the player's choice (2-3 sentences)
2. Updates the game state appropriately with consequences
3. May add/remove items, change stats, create new elements, etc.

Return a JSON object with:
{
  "storyText": "Description of what happens as a result",
  "updates": [
    {"type": "set", "path": "path.to.property", "value": newValue},
    {"type": "unset", "path": "path.to.remove"}
  ]
}`;

      const response = await fetch('/api/handle-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: eventPrompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process event response');
      }

      // Pass the result back to parent
      onEventComplete(data);
      onClose();
    } catch (error) {
      console.error('Failed to process event option:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setSelectedOption(null);
    }
  };

  return (
    <div className={styles.overlay} onClick={isProcessing ? undefined : onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{event.eventTitle}</h2>
          {!isProcessing && <button className={styles.closeButton} onClick={onClose}>×</button>}
        </div>

        <div className={styles.content}>
          <p style={{marginBottom: '20px', lineHeight: '1.6'}}>
            {event.eventDescription}
          </p>

          <div className={styles.section}>
            <h3>How do you respond?</h3>
            {event.options.map((option, index) => (
              <Button
                key={option.id}
                onClick={() => handleOptionSelect(option)}
                disabled={isProcessing}
                style={{
                  width: '100%',
                  marginBottom: '10px',
                  textAlign: 'left',
                  padding: '12px 16px',
                  opacity: isProcessing && selectedOption?.id !== option.id ? 0.5 : 1
                }}
              >
                <strong>{index + 1}. {option.label}</strong>
                <br />
                <span style={{fontSize: '0.9em', opacity: 0.8}}>{option.description}</span>
              </Button>
            ))}
          </div>

          {isProcessing && (
            <p style={{textAlign: 'center', marginTop: '20px', color: '#888'}}>
              Processing your choice...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
