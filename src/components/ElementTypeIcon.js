import React from 'react';

export default function ElementTypeIcon({
  elementType,
  quantity,
  isAffordable = true,
  onClick,
  showQuantity = true,
  size = 'medium' // 'small', 'medium', 'large'
}) {
  const sizeMap = {
    small: { width: 24, height: 24, fontSize: 8 },
    medium: { width: 32, height: 32, fontSize: 10 },
    large: { width: 48, height: 48, fontSize: 12 }
  };

  const { width, height, fontSize } = sizeMap[size];

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        backgroundColor: isAffordable ? '#f9f9f9' : '#f0f0f0',
        opacity: isAffordable ? 1 : 0.5,
        cursor: onClick ? 'pointer' : 'default',
        minWidth: width + 16,
        position: 'relative'
      }}
    >
      <img
        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/element_types/${elementType.id}/image.png${elementType.data.imageTimestamp ? `?t=${elementType.data.imageTimestamp}` : ''}`}
        alt={elementType.data.title || 'Item'}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          objectFit: 'contain'
        }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'inline';
        }}
      />
      <span style={{ opacity: 0.5, display: 'none', fontSize: `${fontSize}px` }}>?</span>

      <div style={{
        fontSize: `${fontSize}px`,
        textAlign: 'center',
        marginTop: '4px',
        fontWeight: 'bold',
        color: isAffordable ? '#333' : '#999'
      }}>
        {elementType.data.title || 'Unnamed Item'}
      </div>

      {showQuantity && quantity !== undefined && (
        <div style={{
          fontSize: `${fontSize - 1}px`,
          color: '#666',
          marginTop: '2px'
        }}>
          Qty: {quantity}
        </div>
      )}

      {elementType.data.price && (
        <div style={{
          fontSize: `${fontSize - 1}px`,
          color: '#666',
          marginTop: '2px'
        }}>
          {elementType.data.price} coins
        </div>
      )}
    </div>
  );
}
