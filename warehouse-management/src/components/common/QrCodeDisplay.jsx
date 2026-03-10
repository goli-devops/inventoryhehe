import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

/**
 * QRCodeDisplay
 * Props:
 *  - value      : string to encode (required)
 *  - size       : canvas width/height in px (default 128)
 *  - className  : extra Tailwind classes on the wrapper
 */
const QRCodeDisplay = ({ value, size = 128, className = '' }) => {
  const canvasRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!value || !canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: {
        dark: '#1e3a5f',   // dark blue dots — matches brand
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    }, (err) => {
      if (err) {
        console.error('QR generation error:', err);
        setError(true);
      }
    });
  }, [value, size]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded text-xs text-gray-400 ${className}`}
        style={{ width: size, height: size }}
      >
        QR Error
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`rounded ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export default QRCodeDisplay;
