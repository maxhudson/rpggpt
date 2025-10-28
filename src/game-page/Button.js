export function Button({ children, onClick, variant = 'filled', disabled = false, active, theme, style = {} }) {
  const baseStyle = {
    height: '36px',
    padding: '0 16px',
    backgroundColor: variant === 'outline' ? 'transparent' : (disabled ? '#E0DDD4' : (active ? '#555' : (theme === 'secondary' ? '#676767ff' : '#555555ff'))),

    color: disabled ? '#999' : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    border: 'none',
    fontWeight: '500',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    transform: 'translateY(0)',
    opacity: 1,
    ...style
  };

  const hoverStyle = !disabled ? {
    opacity: 0.9,
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
