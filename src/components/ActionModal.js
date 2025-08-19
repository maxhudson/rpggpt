import React, { useState } from 'react';
import ElementTypeIcon from './ElementTypeIcon';

export default function ActionModal({
  activeAction,
  onClose,
  onAction,
  elementTypes,
  player
}) {
  const [quantities, setQuantities] = useState({});

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
    }
    else if (type === 'sell') {
      // Show items in player inventory that have a price
      return Object.entries(player.inventory)
        .filter(([id, qty]) => qty > 0 && elementTypes[id] && elementTypes[id].data?.price > 0)
        .map(([id, qty]) => ({
          id,
          elementType: elementTypes[id],
          quantity: qty,
          isAffordable: true
        }));
    }
    else if (type === 'buy') {
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
          // Unified layout for all action types with quantity inputs
          <div>
            <div style={{ marginBottom: '20px' }}>
              {availableItems.map(({ id, elementType: itemType, quantity: availableQty }) => {
                const selectedQuantity = quantities[id] || 0;

                // Calculate display info based on action type
                let displayInfo = {};
                if (type === 'buy') {
                  const price = itemType.data.price || 0;
                  displayInfo = {
                    subtitle: `$${price} each`,
                    total: `$${selectedQuantity * price}`,
                    maxQuantity: 999 // No limit for buying
                  };
                } else if (type === 'sell') {
                  const price = itemType.data.price || 0;
                  displayInfo = {
                    subtitle: `$${price} each (have ${availableQty})`,
                    total: `$${selectedQuantity * price}`,
                    maxQuantity: availableQty
                  };
                } else if (type === 'craft') {
                  const outputQuantity = itemType.data?.craftingOutputQuantity || 1;
                  const requirements = itemType.data.craftingRequirements || {};
                  const maxCraftable = Math.min(...Object.entries(requirements).map(([reqId, reqQty]) => {
                    return Math.floor((player.inventory[reqId] || 0) / reqQty);
                  }));
                  displayInfo = {
                    subtitle: `Makes ${outputQuantity} each`,
                    total: `${selectedQuantity * outputQuantity} items`,
                    maxQuantity: maxCraftable
                  };
                }

                return (
                  <div key={id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '10px'
                  }}>
                    <ElementTypeIcon
                      elementType={itemType}
                      size="small"
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>
                        {itemType.data.title || 'Unnamed Item'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {displayInfo.subtitle}
                      </div>
                      {type === 'craft' && itemType.data.craftingRequirements && (
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                          Requires: {Object.entries(itemType.data.craftingRequirements).map(([reqId, reqQty]) => {
                            const reqType = elementTypes[reqId];
                            const hasEnough = (player.inventory[reqId] || 0) >= reqQty * selectedQuantity;
                            return (
                              <span key={reqId} style={{ color: hasEnough ? '#4CAF50' : '#f44336', marginRight: '8px' }}>
                                {reqQty * selectedQuantity}x {reqType?.data?.title || `Item ${reqId}`}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ fontSize: '12px' }}>Qty:</label>
                      <input
                        type="number"
                        min="0"
                        max={displayInfo.maxQuantity}
                        value={selectedQuantity}
                        onChange={(e) => setQuantities(prev => ({
                          ...prev,
                          [id]: Math.max(0, Math.min(displayInfo.maxQuantity, parseInt(e.target.value) || 0))
                        }))}
                        style={{
                          width: '60px',
                          padding: '4px',
                          border: '1px solid #ccc',
                          borderRadius: '2px'
                        }}
                      />
                      <div style={{ fontSize: '12px', minWidth: '60px', textAlign: 'right' }}>
                        {displayInfo.total}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total and action button */}
            {(() => {
              let totalDisplay = '';
              let buttonText = '';
              let canPerformAction = false;
              let hasItems = false;

              if (type === 'buy') {
                const totalCost = availableItems.reduce((sum, { id, elementType: itemType }) => {
                  const quantity = quantities[id] || 0;
                  const price = itemType.data.price || 0;
                  return sum + (quantity * price);
                }, 0);
                totalDisplay = `Total: $${totalCost}`;
                buttonText = totalCost === 0 ? 'Select Items' : totalCost > player.money ? 'Not Enough Money' : 'Buy Items';
                canPerformAction = totalCost > 0 && totalCost <= player.money;
                hasItems = totalCost > 0;
              } else if (type === 'sell') {
                const totalEarnings = availableItems.reduce((sum, { id, elementType: itemType }) => {
                  const quantity = quantities[id] || 0;
                  const price = itemType.data.price || 0;
                  return sum + (quantity * price);
                }, 0);
                totalDisplay = `Total: $${totalEarnings}`;
                buttonText = totalEarnings === 0 ? 'Select Items' : 'Sell Items';
                canPerformAction = totalEarnings > 0;
                hasItems = totalEarnings > 0;
              } else if (type === 'craft') {
                const totalItems = availableItems.reduce((sum, { id, elementType: itemType }) => {
                  const quantity = quantities[id] || 0;
                  const outputQuantity = itemType.data?.craftingOutputQuantity || 1;
                  return sum + (quantity * outputQuantity);
                }, 0);
                totalDisplay = `Total: ${totalItems} items`;
                buttonText = totalItems === 0 ? 'Select Items' : 'Craft Items';

                // Check if we have enough materials for all selected crafts
                canPerformAction = totalItems > 0 && availableItems.every(({ id, elementType: itemType }) => {
                  const quantity = quantities[id] || 0;
                  if (quantity === 0) return true;
                  const requirements = itemType.data.craftingRequirements || {};
                  return Object.entries(requirements).every(([reqId, reqQty]) => {
                    return (player.inventory[reqId] || 0) >= reqQty * quantity;
                  });
                });
                hasItems = totalItems > 0;
              }

              return (
                <div style={{
                  borderTop: '2px solid #ddd',
                  paddingTop: '15px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {totalDisplay}
                  </div>
                  <button
                    onClick={() => onAction({ quantities, type })}
                    disabled={!canPerformAction}
                    style={{
                      backgroundColor: canPerformAction ? '#4CAF50' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '10px 20px',
                      fontSize: '16px',
                      cursor: canPerformAction ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {buttonText}
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
