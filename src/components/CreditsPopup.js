import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function CreditsPopup({credits, setCredits, onClose, userId}) {
  const [isLoading, setIsLoading] = useState(false);
  const [creditQuantity, setCreditQuantity] = useState(1000);

  useEffect(() => {
    if (window.location.search.includes('creditsPurchased')) {
      const startTime = Math.floor(Date.now() / 1000);

      setIsLoading(true);

      const interval = setInterval(async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits, last_credit_purchase_date')
          .eq('id', userId)
          .single();

        if (profile && profile.last_credit_purchase_date < Math.floor(Date.now() / 1000) && profile.last_credit_purchase_date > startTime && profile.last_credit_purchase_date) {
          setIsLoading(false);
          setCredits(profile.credits);

          clearInterval(interval);

          window.history.pushState({}, document.title, window.location.pathname);
        }
      }, 500);

      return () => clearInterval(interval);
    }
  }, [userId, setCredits]);

  const handleWrapperClick = (e) => {
    if (e.target.id === 'credits-popup') {
      onClose(e);
    }
  }

  const purchaseCredits = () => {
    if (isLoading) return;

    setIsLoading(true);

    fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({credits: creditQuantity, userId})
    })
    .then(response => response.json())
    .then(data => {
      window.location.href = data.checkoutUrl;
    })
    .catch(error => {
      console.error('Error:', error);
    })
    .finally(() => {
      setIsLoading(false);
    });
  }

  return (
    <div
      id='credits-popup'
      className='credits-popup'
      onClick={handleWrapperClick}
      style={{
        position: 'fixed',
        top: '0px',
        zIndex: 1000000,
        left: '0px',
        width: '100vw',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div
        className='credits-popup-content'
        style={{
          backgroundColor: 'white',
          padding: '1.6rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.51rem',
          borderRadius: '8px',
          minWidth: '400px'
        }}
      >
        <h2 style={{ margin: '0 0 1rem 0' }}>Credits</h2>

        <div style={{
          backgroundColor: '#eeeeee',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          padding: '0.55rem 1rem',
          borderRadius: '4px'
        }}>
          <div style={{
            opacity: 0.5,
            fontSize: '0.8em',
            height: '0.8rem',
            textTransform: 'uppercase',
            marginBottom: '0.5rem'
          }}>
            Current credit balance
          </div>
          <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{credits}</div>
        </div>

        <div style={{
          backgroundColor: '#fff',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          padding: '0.55rem 1rem',
          paddingTop: '0.55rem',
          borderRadius: '4px'
        }}>
          <div style={{
            opacity: 0.5,
            fontSize: '0.8em',
            textTransform: 'uppercase',
            marginBottom: '0.5rem'
          }}>
            Buy credits
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <input
              type="number"
              value={creditQuantity}
              onChange={(e) => setCreditQuantity(parseInt(e.target.value) || 0)}
              style={{
                outline: 'none',
                border: '1px solid #ccc',
                padding: '8px',
                width: '120px',
                borderRadius: '4px'
              }}
              min="100"
              step="100"
            />
            <div style={{flexGrow: 1}} />
            <div style={{opacity: 0.5, fontSize: '0.8em'}}>
              ${(creditQuantity / 100).toFixed(2)} USD
            </div>
          </div>
        </div>

        <div style={{display: 'flex', gap: '10px', marginTop: '1.5rem'}}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: '1px solid #ccc',
              backgroundColor: 'white',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={purchaseCredits}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              border: 'none',
              backgroundColor: '#007bff',
              color: 'white',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              flexGrow: 1,
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? 'Processing...' : 'Purchase Credits'}
          </button>
        </div>
      </div>
    </div>
  );
}
