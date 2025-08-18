import React from 'react';
import ElementTypeIcon from './ElementTypeIcon';

export default function ActionModal({
  activeAction,
  onClose,
  onAction,
  elementTypes,
  player
}) {
  if (!activeAction) return null;

  const { type, elementType } = activeAction;

  // Get available items based on action type
  const getAvailableItems = () => {
    if (type === 'craft') {
      // Show items that can be crafted (have crafting requirements)
      return Object.entries(elementTypes)
        .filter(([id, et]) => et.data?.type === 'item' && et.data?.craftingRequirements)
        .map(([id, et]) => {
          const requirements = et.data.craftingRequirements || {};
          const canAfford = Object.entries(requirements).every(([reqId, reqQty]) => {
            return (player.inventory[reqId] || 0) >= reqQty;
          });
          return { id, elementType: et, isAffordable: canAfford };
        });
    } else if (type === 'sell') {
      // Show items in player inventory
      return Object.entries(player.inventory)
        .filter(([id, qty]) => qty > 0 && elementTypes[id])
        .map(([id, qty]) => ({
          id,
          elementType: elementTypes[id],
          quantity: qty,
          isAffordable: true
        }));
    } else if (type === 'buy') {
      // Show all items with prices
      return Object.entries(elementTypes)
        .filter(([id, et]) => et.data?.type === 'item' && et.data?.price > 0)
        .map(([id, et]) => ({
          id,
          elementType: et,
          isAffordable: player.money >= (et.data.price || 0)
        }));
    }
    return [];
  };

  const availableItems = getAvailableItems();

  const getModalTitle = () => {
    switch (type) {
      case 'craft': return `Craft at ${elementType.data.title}`;
      case 'sell': return `Sell at ${elementType.data.title}`;
      case 'buy': return `Buy from ${elementType.data.title}`;
      default: return 'Action';
    }
  };

  const getEmptyMessage = () => {
    switch (type) {
      case 'craft': return 'No items can be crafted here';
      case 'sell': return 'You have no items to sell';
      case 'buy': return 'No items available for purchase';
      default: return 'No items available';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer'
          }}
        >
          ×
        </button>

        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>
          {getModalTitle()}
        </h2>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px'
        }}>
          <span style={{ fontWeight: 'bold' }}>Money:</span>
          <span>${player.money}</span>
        </div>

        {availableItems.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>
            {getEmptyMessage()}
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '10px'
          }}>
            {availableItems.map(({ id, elementType: itemType, quantity, isAffordable }) => (
              <div key={id}>
                <ElementTypeIcon
                  elementType={itemType}
                  quantity={quantity}
                  isAffordable={isAffordable}
                  onClick={isAffordable ? () => onAction(itemType) : undefined}
                  showQuantity={type === 'sell'}
                  size="medium"
                />
                {type === 'craft' && itemType.data.craftingRequirements && (
                  <div style={{
                    fontSize: '10px',
                    color: '#666',
                    marginTop: '5px',
                    textAlign: 'center'
                  }}>
                    Requires:
                    {Object.entries(itemType.data.craftingRequirements).map(([reqId, reqQty]) => {
                      const reqType = elementTypes[reqId];
                      const hasEnough = (player.inventory[reqId] || 0) >= reqQty;
                      return (
                        <div key={reqId} style={{
                          color: hasEnough ? '#4CAF50' : '#f44336'
                        }}>
                          {reqQty}x {reqType?.data?.title || `Item ${reqId}`}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
