export function Button({ children, onClick, variant = 'filled', disabled = false, active, theme, style = {} }) {
  const baseStyle = {
    height: '36px',
    padding: '0 16px',
    backgroundColor: variant === 'outline' ? 'transparent' : (disabled ? '#E0DDD4' : (active ? '#555' : (theme === 'secondary' ? '#676767ff' : 'rgba(68, 64, 61, 1)'))),

    color: disabled ? '#999' : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    border: 'none',
    fontWeight: 'bold',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    transform: 'translateY(0)',
    borderRadius: '5px',
    opacity: 1,
    position: 'relative',
    ...style
  };

  const hoverStyle = !disabled ? {
    // opacity: 0.9,
    // boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    // transform: 'translateY(-2px)'
  } : {};

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={baseStyle}
    >
      {children}
      <div style={{position: 'absolute'}}></div>
    </button>
  );
}
