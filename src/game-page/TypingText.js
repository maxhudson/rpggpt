import React from 'react';

export function TypingText({ text, speed = 30, onComplete }) {
  const [displayedText, setDisplayedText] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  React.useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (currentIndex === text.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <span style={{ position: 'relative', display: 'inline-block', textAlign: 'left' }}>
      {/* Hidden full text to reserve space */}
      {/* <span style={{ visibility: 'hidden', whiteSpace: 'normal', wordWrap: 'break-word' }}>{text}</span> */}
      {/* Typing text positioned absolutely */}
      <span style={{color: '#fff', whiteSpace: 'pre-line', top: 0, left: 0, right: 0, whiteSpace: 'normal', wordWrap: 'break-word' }}>
        {displayedText}
      </span>
    </span>
  );
}
