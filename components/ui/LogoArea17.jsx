'use client';
import { useState } from 'react';

export default function LogoArea17({ size = 40, glow = true }) {
  const [error, setError] = useState(false);

  const border = '2px solid rgba(45,206,107,0.5)';
  const shadow = glow
    ? '0 0 18px rgba(45,206,107,0.4), 0 0 6px rgba(45,206,107,0.2)'
    : 'none';
  const base = {
    width:        size,
    height:       size,
    borderRadius: '50%',
    flexShrink:   0,
    display:      'block',
    border,
    boxShadow:    shadow,
  };

  if (error) {
    return (
      <div style={{
        ...base,
        background:     'linear-gradient(135deg,#1a6b40,#0a3d22)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontWeight:     900,
        fontSize:       size * 0.32,
        color:          '#c8f0d8',
        letterSpacing:  '-1px',
        userSelect:     'none',
      }}>
        A17
      </div>
    );
  }

  return (
    <img
      src="/logo-area17.png"
      alt="Área 17"
      onError={() => setError(true)}
      style={{
        ...base,
        objectFit:    'cover',
        objectPosition: 'center',
        display:      'block',
        flexShrink:   0,
        overflow:     'hidden',
      }}
    />
  );
}
