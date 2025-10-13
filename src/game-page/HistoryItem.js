import { Button } from './Button';
import { Currency } from './Currency';
import { formatTime } from './helpers';

export function HistoryItem({ historyItem, game, onLoadCheckpoint }) {
  const { type, content } = historyItem;

  if (type === 'prompt') {
    return (
      <p style={{ fontWeight: 'bold', marginTop: 20, marginBottom: 20, color: '#0066cc' }}>
        &gt; {content}
      </p>
    );
  }

  if (type === 'error') {
    return (
      <div style={{ padding: '10px', backgroundColor: '#fee', borderLeft: '3px solid #f44336', color: '#c33' }}>
        ⚠️ {content.message}
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
    return (
      <div style={{position: 'relative'}}>
        {/* Timestamp from updatedClock */}
        {content.updatedClock && (
          <div style={{ opacity: 0.4, position: 'absolute', right: 'calc(100% + 15px)', whiteSpace: 'nowrap' }}>
            Day {content.updatedClock.day}, {formatTime(content.updatedClock.time)}
          </div>
        )}

        {/* Story text */}
        {/* {content.additionalStoryText && (
          <p style={{ whiteSpace: 'pre-wrap' }}>{content.additionalStoryText}</p>
        )} */}

        {/* Items sold */}
        {content.itemsSold && Object.keys(content.itemsSold).length > 0 && (
          <div style={{ padding: '8px', backgroundColor: '#f0f8ff', borderLeft: '3px solid #4CAF50', marginTop: '5px' }}>
            <strong>Items Sold:</strong>
            {Object.entries(content.itemsSold).map(([item, data]) => {
              const qty = data.quantity;
              const revenue = data.moneyMade;
              return (
                <div key={item} style={{ marginLeft: '10px' }}>
                  • {qty}x {item}
                  {revenue && <span style={{ marginLeft: '8px' }}>(+<Currency amount={revenue} />)</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Money changes */}
        {(content.netMoneyChange !== undefined && content.netMoneyChange !== 0) && (
          <div style={{ marginTop: '20px' }}>
            <div style={{
              marginBottom: '5px'
            }}>
              Money: <Currency amount={content.updatedMoney} />
              <span style={{ marginLeft: '8px', color: content.netMoneyChange >= 0 ? '#4CAF50' : '#F44336' }}>
                ({(content.netMoneyChange) > 0 ? '+' : ''}<Currency amount={content.netMoneyChange} />)
              </span>
            </div>
          </div>
        )}

        {/* Inventory updates */}
        {content.inventoryUpdates && Object.keys(content.inventoryUpdates).length > 0 && (
          <div style={{ marginTop: '20px' }}>
            {Object.entries(content.inventoryUpdates).map(([itemName, diff]) => {
              const newValue = game.items?.[itemName]?.inventory || 0;

              return (
                <div key={itemName} style={{marginBottom: '5px' }}>
                  {itemName}: {newValue}
                  <span style={{ marginLeft: '8px', color: diff > 0 ? '#4CAF50' : '#F44336' }}>
                    ({diff > 0 ? '+' : ''}{diff})
                  </span>
                </div>
              );
            })}
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
