import { useState } from 'react';
import _ from 'lodash';
import { Button } from './Button';
import { ActionGroup } from './ActionGroup';

export function ActionSelector({ actions, onSelectAction }) {
  const [selectedActionType, setSelectedActionType] = useState(null);

  const selectedAction = selectedActionType
    ? actions.find(a => a.type === selectedActionType)
    : null;

  if (selectedAction) {
    return (
      <div style={{ marginTop: 30, marginBottom: '20px',  }}>
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button onClick={() => setSelectedActionType(null)}>
            ← Back
          </Button>
          <h2 style={{ margin: 0, marginLeft: 10, fontSize: '1.3em' }}>{selectedAction.type}</h2>
        </div>
        <ActionGroup
          action={selectedAction}
          onSelectAction={(type, label, option) => {
            onSelectAction(type, label, option);
            setSelectedActionType(null);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 30, marginBottom: '20px',  }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {actions.map((action, index) => {
          // Action types that always need submenus for quantity/selection
          const needsSubmenu = _.includes(['Buy', 'Craft', 'Build', 'Plant'], action.type);

          // If action has no options, execute immediately
          if (!action.options || action.options.length === 0) {
            return (
              <Button
                key={index}
                onClick={() => onSelectAction(action.type, action.label, null)}
              >
                {action.type + (action.label ? `: ${action.label}` : '')}
              </Button>
            );
          }

          // If action has only one option and doesn't need a submenu, show it at top level
          if (action.options.length === 1 && !needsSubmenu) {
            const option = action.options[0];
            return (
              <Button
                key={index}
                onClick={() => onSelectAction(action.type, option.label, option)}
              >
                {action.type}: {option.label}
                {option.costs && _.size(option.costs) > 0 && (
                  <span style={{ fontSize: '0.9em', marginLeft: '8px', opacity: 0.7 }}>
                    ({Object.entries(option.costs).map(([key, val]) => `${val} ${key}`).join(', ')})
                  </span>
                )}
              </Button>
            );
          }

          // Multiple options or special action types - show submenu
          return (
            <Button
              key={index}
              onClick={() => setSelectedActionType(action.type)}
            >
              {action.type}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
