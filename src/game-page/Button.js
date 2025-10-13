export function Button({ children, onClick, variant = 'filled', disabled = false, style = {} }) {
  const baseStyle = {
    height: '40px',
    padding: '0 16px',
    backgroundColor: variant === 'outline' ? 'transparent' : (disabled ? '#E0DDD4' : '#111'),
    color: disabled ? '#999' : '#ffffff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    border: 'none',
    fontWeight: '500',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    transform: 'translateY(0)',
    ...style
  };

  const hoverStyle = !disabled ? {
    backgroundColor: variant === 'outline' ? '#555' : '#555',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    transform: 'translateY(-2px)'
  } : {};

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (!disabled) {
          Object.assign(e.target.style, hoverStyle);
        }
      }}
      onMouseLeave={(e) => {
        Object.assign(e.target.style, baseStyle);
      }}
    >
      {children}
    </button>
  );
}
