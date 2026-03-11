import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Builds a plain-text QR payload from an asset object.
 * When scanned with any QR reader, it shows the asset info directly —
 * no URL, no redirect, no internet required.
 */
export const buildQRPayload = (asset) => {
  const id          = asset?.asset_id || asset?.assetID || '';
  const description = asset?.description || '';
  const category    = asset?.category || '';
  const status      = asset?.status || '';
  const location    = asset?.location || '—';
  const assignedTo  = asset?.assigned_to || asset?.assignedTo || '—';
  const serial      = asset?.serial_number || asset?.serialNumber || '—';

  return [
    '== GOLI ICT ASSET ==',
    `ID       : ${id}`,
    `Item     : ${description}`,
    `Category : ${category}`,
    `Status   : ${status}`,
    `Location : ${location}`,
    `Assigned : ${assignedTo}`,
    `Serial # : ${serial}`,
    '====================',
  ].join('\n');
};

const QRCodeDisplay = ({ asset, value, size = 5, className = '' }) => {
  const canvasRef = useRef(null);
  const [error, setError] = useState(false);

  // Accept either a full asset object or a raw value string
  const payload = asset ? buildQRPayload(asset) : (value || '');

  useEffect(() => {
    if (!payload || !canvasRef.current) return;
    setError(false);
    QRCode.toCanvas(canvasRef.current, payload, {
      width: size,
      margin: 1,
      color: { dark: '#1e3a5f', light: '#ffffff' },
      errorCorrectionLevel: 'M', // M is fine for text; H makes it too dense
    }, (err) => {
      if (err) { console.error('QR generation error:', err); setError(true); }
    });
  }, [payload, size]);

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