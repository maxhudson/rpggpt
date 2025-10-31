import { useState } from 'react';
import _ from 'lodash';
import { Button } from './Button';
import { formatCurrency } from './helpers';

export function ActionGroup({ action, onSelectAction }) {
  const [quantities, setQuantities] = useState({});

  // If action has no options, treat it as a single immediate action
  if (!action.options || action.options.length === 0) {
    return (
      <Button onClick={() => onSelectAction(action.type, null, null)}>
        {action.type}
      </Button>
    );
  }

  // Special handling for Buy, Craft, and Plant actions - show quantity inputs
  if (action.type === 'Buy' || action.type === 'Craft' || action.type === 'Plant') {
    const handleQuantityChange = (optionLabel, value) => {
      const qty = parseInt(value) || 0;
      setQuantities(prev => ({
        ...prev,
        [optionLabel]: qty
      }));
    };

    const handleSubmit = () => {
      const items = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([label, qty]) => ({ label, quantity: qty }));

      if (items.length > 0) {
        onSelectAction(action.type, items, null);
      }
    };

    return (
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {action.options.map((option, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="number"
                min="0"
                value={quantities[option.label] || 0}
                onChange={(e) => handleQuantityChange(option.label, e.target.value)}
                style={{
                  width: '80px',
                  height: '30px',
                  padding: '0 16px',
                  fontSize: '14px',
                  border: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ flex: 1 }}>
                <strong>{option.label}</strong>
                {option.costs && _.size(option.costs) > 0 && (
                  <span style={{ fontSize: '0.9em', marginLeft: '8px', opacity: 0.7 }}>
                    ({Object.entries(option.costs).map(([key, val]) => key === 'money' ? formatCurrency(val) : `${val} ${key}`).join(', ')})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <Button onClick={handleSubmit} disabled={Object.values(quantities).every(q => !q || q === 0)}>
          {action.type === 'Buy' ? 'Submit Order' : action.type === 'Plant' ? 'Plant Seeds' : 'Craft Items'}
        </Button>
      </div>
    );
  }

  // Regular action - show as buttons
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {action.options.map((option, index) => (
        <Button
          key={index}
          onClick={() => onSelectAction(action.type, option.label, option)}
        >
          {option.label}
          {option.costs && _.size(option.costs) > 0 && (
            <span style={{ fontSize: '0.9em', marginLeft: '8px', opacity: 0.7 }}>
              ({Object.entries(option.costs).map(([key, val]) => `${val} ${key}`).join(', ')})
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}
