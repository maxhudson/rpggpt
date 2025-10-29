import React from 'react';
import { formatTime } from './helpers';
import { Button } from './Button';
import { getActionColor } from './actionColors';
import { TypingText } from './TypingText';
import { Tooltip } from 'react-tooltip';
import styles from './HUD.module.css';

export default function HUD({
  game,
  actionsByType,
  isProcessing,
  isGameOver,
  selectedActionType,
  setSelectedActionType,
  onActionClick,
  history,
  onClearMessage
}) {

  if (!game?.instance) return null;

  const { activeLocation, clock, activeQuest, activeCharacter, characters } = game.instance;
  const locationName = activeLocation || 'Unknown';
  const timeString = clock?.time ? formatTime(clock.time) : '';

  // Get active character stats
  const characterData = characters?.[activeCharacter];
  const characterStats = characterData?.stats || {};
  const statsDefinitions = game.elements?.Stats || {};

  // Calculate inventory items
  const inventory = game.instance?.locations?.[activeLocation]?.inventory || {};
  const relevantInventoryItems = Object.entries(inventory).filter(([, qty]) => qty > 0);

  // Combine stats and inventory items
  const statsEntries = Object.entries(characterStats).map(([name, value]) => ({
    name,
    value,
    type: 'stat',
    def: statsDefinitions[name]
  }));
  const inventoryEntries = relevantInventoryItems.map(([name, value]) => ({
    name,
    value,
    type: 'item',
    def: game.elements?.Items?.[name]
  }));
  const allItems = [...statsEntries, ...inventoryEntries];

  // Get last story text or error message from history
  let lastMessage = '';
  let lastMessageIndex = -1;
  if (isProcessing) {
    lastMessage = 'Loading...';
  } else if (history && history.length > 0) {
    // Find the most recent story or error message that hasn't been cleared
    for (let i = history.length - 1; i >= 0; i--) {
      const item = history[i];

      // Skip cleared messages
      if (item.cleared) continue;

      if (item.type === 'error' && item.content?.message) {
        lastMessage = item.content.message;
        lastMessageIndex = i;
        break;
      } else if (item.type === 'response' && item.content?.storyText) {
        lastMessage = item.content.storyText;
        lastMessageIndex = i;
        break;
      }
    }
  }

  const handleClearMessage = () => {
    if (onClearMessage && lastMessageIndex !== -1) {
      onClearMessage(lastMessageIndex);
    }
  };

  // Format quest display text with progress
  const getQuestDisplayText = (questInput) => {
    let quest = questInput;

    // If quest is a string, try to find the matching quest object by ID
    if (typeof questInput === 'string') {
      const questList = game.quests || [];
      const foundQuest = questList.find(q =>
        (typeof q === 'object' && q.id === questInput)
      );

      // If found a quest object with matching ID, use it
      if (foundQuest) {
        quest = foundQuest;
      } else {
        // Otherwise it's an AI-tracked string quest, display as-is
        return questInput;
      }
    }

    // Object quests with conditions - show progress
    if (quest.conditions && Array.isArray(quest.conditions)) {
      const conditionTexts = quest.conditions.map(condition => {
        const { action, item, element, quantity } = condition;
        const targetName = item || element;

        // Get current progress based on action type
        let current = 0;
        const location = game.instance?.locations?.[activeLocation];

        if (action === 'Harvest' || action === 'Forage' || action === 'Craft') {
          // Check inventory
          current = inventory[targetName] || 0;
        } else if (action === 'Build' || action === 'Plant') {
          // Check built structures
          const elementInstances = location?.elementInstances || {};
          current = Object.values(elementInstances).filter(
            instance => instance.element === targetName
          ).length;
        }

        // Format the condition text
        if (quantity && quantity > 1) {
          return `${action} (${current}/${quantity}) ${targetName}${quest.to ? ` to ${quest.to}` : ''}`;
        } else if (quantity === 1) {
          return `${action} ${targetName}${quest.to ? ` to ${quest.to}` : ''}`;
        } else {
          // No quantity specified
          return `${action} ${targetName}${quest.to ? ` to ${quest.to}` : ''}`;
        }
      });

      // Combine all condition texts
      return conditionTexts.join(' and ');
    }
    return '';
  };

  return (
    <>
      {/* Top Center - Quest/Message, Time, Location */}
      <div className={styles.topCenter} style={{...lastMessage ? {} : {}}}>
        <div style={{position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', height: '100%'}}>
          <div className={styles.timeDisplay}>
            {timeString} &nbsp; &nbsp; Day {clock?.day} &nbsp; &nbsp; {locationName}
          </div>
          {lastMessage ? (
            <div className={styles.questDisplay} style={{pointerEvents: 'auto'}}>
              <span style={{flex: 1}}>
                <TypingText text={lastMessage} speed={16} />
              </span>
              {!isProcessing && (
                <div
                  onClick={handleClearMessage}
                  style={{
                    background: 'none',
                    border: 'none',
                    marginTop: 5,
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: '0 4px',
                    position: 'relative',
                    opacity: 0.5,
                    left: -4,
                    pointerEvents: 'auto'
                  }}
                >
                  ✓
                </div>
              )}
            </div>
          ) : activeQuest ? (
            <div className={styles.questDisplay}>
              <TypingText text={getQuestDisplayText(activeQuest)} speed={16} />
            </div>
          ) : null}
        </div>
        {/* <div style={{position: 'absolute', right: 'calc(100% - 0.25px)', top: 0, width: 0, height: 0, borderRight: '50px solid rgb(68, 64, 61)', borderBottom: '50px solid transparent'}}></div>
        <div style={{position: 'absolute', left: 'calc(100% - 0.25px)', top: 0, width: 0, height: 0, borderLeft: '50px solid rgb(68, 64, 61)', borderBottom: '50px solid transparent'}}></div> */}
      </div>

      {/* Bottom Left - Action Buttons */}
      <div className={styles.bottomLeft}>
        {!isProcessing && !isGameOver && actionsByType && Object.keys(actionsByType).length > 0 && (
          <div>
            {selectedActionType && actionsByType[selectedActionType] && actionsByType[selectedActionType].length > 1 ? (
              /* Submenu view - show only sub-actions for selected action type */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {actionsByType[selectedActionType].map((action, index) => {
                  const isUpgrade = action.isUpgrade;
                  const displayLabel = isUpgrade ? `Upgrade ${action.targetElement}` : action.targetElement;
                  const elementDef = game.elements?.[action.targetCollection]?.[action.targetElement];
                  const elementColor = elementDef?.color || '#676767ff';

                  return (
                    <Button
                      key={`${selectedActionType}-${index}`}
                      style={{
                        color: 'white'
                      }}
                      onClick={() => onActionClick(selectedActionType, false, action)}
                    >
                      {displayLabel}
                    </Button>
                  );
                })}
                {/* Back button */}
                <Button
                  onClick={() => setSelectedActionType(null)}
                  style={{
                    color: 'white'
                  }}
                >
                  ← {selectedActionType}
                </Button>
              </div>
            ) : (
              /* Main action type buttons */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.keys(actionsByType).map((actionType, i) => {
                  const actions = actionsByType[actionType];
                  const isSingleOption = actions.length === 1;
                  const singleAction = isSingleOption ? actions[0] : null;

                  return (
                    <Button
                      key={actionType}
                      active={selectedActionType === actionType}
                      onClick={() => onActionClick(actionType, isSingleOption, singleAction)}
                      style={{
                        position: 'relative',
                        minWidth: 80,
                        // borderRadius: 5,
                        // ...(i !== 0 ? {borderTop: '1px solid rgba(255, 255, 255, 0.1)'} : {}),
                        // ...(i === 0 ? {borderTopLeftRadius: 5, borderTopRightRadius: 5} : {}),
                        // ...(i === Object.keys(actionsByType).length - 1 ? {borderBottomLeftRadius: 5, borderBottomRightRadius: 5} : {})
                      }}
                    >
                      {actionType}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className={styles.footerSpacer} />

        {/* Stats and Inventory */}
        {allItems.length > 0 && (
          <div style={{display: 'flex', flexDirection: 'column-reverse', flexWrap: 'wrap', gap: 2, zIndex: 2000}}>
            {allItems.map((item) => {
              const itemColor = item.def?.color || 'rgba(0, 0, 0, 0.3)';
              const tooltipContent = item.type === 'stat'
                ? `${item.name.toUpperCase()}: ${item.value}/${item.def?.maxAmount || 10}`
                : item.name.toUpperCase();

              return (
                <div
                  key={`${item.type}-${item.name}`}
                  style={{
                    position: 'relative',
                    padding: '0 16px',
                    height: '36px',
                    width: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    cursor: 'default'
                  }}
                  data-tooltip-id={`${item.type}-tooltip-${item.name}`}
                  data-tooltip-content={tooltipContent}
                >
                  {/* Background color layer */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: itemColor,
                    pointerEvents: 'none'
                  }} />

                  {/* Content layer */}
                  <span style={{ color: 'white', position: 'relative', zIndex: 1, paddingRight: 10, paddingBottom: 7}}>
                    {item.name.charAt(0).toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: '9px',
                    position: 'absolute',
                    bottom: '2px',
                    right: '5px',
                    color: 'white',
                    zIndex: 1
                  }}>
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tooltips */}
      {allItems.map((item) => (
        <Tooltip
          key={`${item.type}-tooltip-${item.name}`}
          id={`${item.type}-tooltip-${item.name}`}
          place="right"
          style={{
            borderRadius: '0px',
            textTransform: 'uppercase',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 1000
          }}
        />
      ))}
    </>
  );
}
