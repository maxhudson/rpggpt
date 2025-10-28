import { Button } from './Button';
import { getActionColor } from './actionColors';

export function HistoryItem({ historyItem, onLoadCheckpoint }) {
  const { type, content } = historyItem;

  if (type === 'prompt') {
    // Filter out instance IDs and position text from display
    const displayContent = content
      .replace(/\s*\(Instance \d+\)/g, '')
      .replace(/\s+at position \([^)]+\)/g, '');

    // Extract action type from prompt (first word)
    const actionType = displayContent.split(' ')[0];
    const actionColor = getActionColor(actionType);

    return (
      <p style={{
        marginTop: 20,
        marginBottom: 20,
        fontSize: 24,
        color: '#ffffffff',
      }}>
        {displayContent}
      </p>
    );
  }

  if (type === 'error') {
    return (
      <div style={{color: 'rgba(153, 153, 153, 1)', fontStyle: 'italic'}}>
        {content.message}
      </div>
    );
  }

  if (type === 'checkpoint') {
    return (
      <Button
        onClick={onLoadCheckpoint}
        variant="outline"
        style={{
          border: 'none',
          backgroundColor: 'transparent',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '8px'
        }}
      >
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: '#ffa500'
        }} />
        <span style={{ fontSize: '0.9em', color: '#666' }}>Checkpoint</span>
      </Button>
    );
  }

  if (type === 'response') {
    // Group updates by type for display
    const updateSummary = {};

    if (content.updates && content.updates.length > 0) {
      content.updates.forEach(update => {
        const { type: updateType, path, value } = update;

        // Extract meaningful info from path
        const pathParts = path.split('.');

        // Inventory changes
        if (path.includes('.inventory.')) {
          const itemName = pathParts[pathParts.length - 1];
          if (!updateSummary.inventory) updateSummary.inventory = {};
          if (updateType === 'set') {
            updateSummary.inventory[itemName] = value;
          }
        }
        // Element instance changes (building/harvesting)
        else if (path.includes('.elementInstances.')) {
          if (updateType === 'set') {
            if (value && value.element) {
              if (!updateSummary.added) updateSummary.added = [];
              updateSummary.added.push(value.element);
            }
          } else if (updateType === 'unset') {
            if (!updateSummary.removed) updateSummary.removed = [];
            updateSummary.removed.push(pathParts[pathParts.length - 1]);
          }
        }
        // Clock changes
        else if (path.includes('.clock.')) {
          const clockProp = pathParts[pathParts.length - 1];
          if (clockProp === 'time') {
            updateSummary.time = value;
          } else if (clockProp === 'day') {
            updateSummary.day = value;
          }
        }
        // Character XP/level changes
        else if (path.includes('.levels.') || path.includes('.xp')) {
          if (!updateSummary.xp) updateSummary.xp = [];
          updateSummary.xp.push({ path, value });
        }
      });
    }

    return (
      <div style={{position: 'relative'}}>
        {/* Story text */}
        {content.storyText && (
          <p style={{ whiteSpace: 'pre-wrap', marginTop: '10px', marginBottom: '10px' }}>
            {content.storyText}
          </p>
        )}

        {/* Update summary */}
        {Object.keys(updateSummary).length > 0 && (
          <div style={{ fontSize: '0.9em', opacity: 0.7, marginTop: '8px' }}>
            {/* Inventory changes */}
            {/* {updateSummary.inventory && (
              <div style={{ marginBottom: '4px' }}>
                {Object.entries(updateSummary.inventory).map(([item, qty]) => (
                  <span key={item} style={{ marginRight: '12px' }}>
                    {item}: {qty}
                  </span>
                ))}
              </div>
            )} */}
            {/* Time/Day changes */}
            {(updateSummary.time || updateSummary.day) && (
              <div style={{ marginBottom: '4px' }}>
                {updateSummary.day && <span>Day {updateSummary.day} </span>}
                {updateSummary.time && (
                  <span>
                    {updateSummary.time[0]}:{String(updateSummary.time[1]).padStart(2, '0')} {updateSummary.time[2]}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Fallback for unknown types
  return (
    <pre style={{ background: '#f5f5f5', padding: '10px' }}>
      {JSON.stringify(content, null, 2)}
    </pre>
  );
}
