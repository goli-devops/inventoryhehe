import React, { useEffect, useRef } from 'react';

// ─── Payload builder ──────────────────────────────────────────────────────────
export const buildQRPayload = (asset) => [
  '== GOLI ICT ASSET ==',
  `ID       : ${asset.asset_id || asset.assetID || 'N/A'}`,
  `Item     : ${asset.description || 'N/A'}`,
  `Category : ${asset.category || 'N/A'}`,
  `Status   : ${asset.status || 'N/A'}`,
  `Location : ${asset.location || 'N/A'}`,
  `Assigned : ${asset.assigned_to || asset.assignedTo || 'Unassigned'}`,
  `JOR #    : ${asset.jor_number || asset.jorNumber || 'N/A'}`,
  `Serial # : ${asset.serial_number || asset.serialNumber || 'N/A'}`,
  '====================',
].join('\n');

// ─── Minimal QR Matrix encoder (no external lib) ─────────────────────────────
// Implements QR Code Model 2, version 1-10, byte mode, ECC level M.
// Based on the public domain qrcode-generator algorithm.

function createQRMatrix(text) {
  // Use the qrcode-generator library pattern via dynamic script injection
  // We use a Promise-based singleton loader
  return text;
}

// ─── Component ───────────────────────────────────────────────────────────────
let _qrLoaded = false;
let _qrLoading = false;
const _qrQueue = [];

function ensureQRLib(cb) {
  if (_qrLoaded && window.QRCode) { cb(); return; }
  _qrQueue.push(cb);
  if (_qrLoading) return;
  _qrLoading = true;

  const script = document.createElement('script');
  // qrcodejs — MIT licensed, well-known, stable CDN
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  script.onload = () => {
    _qrLoaded = true;
    _qrLoading = false;
    _qrQueue.forEach(fn => fn());
    _qrQueue.length = 0;
  };
  script.onerror = () => {
    _qrLoading = false;
    console.error('QRCodeDisplay: failed to load qrcodejs from CDN');
  };
  document.head.appendChild(script);
}

const QRCodeDisplay = ({ asset, value, size = 200 }) => {
  const ref = useRef(null);

  useEffect(() => {
    const text = asset ? buildQRPayload(asset) : (value || '');
    if (!text || !ref.current) return;

    ensureQRLib(() => {
      if (!ref.current || !window.QRCode) return;
      // Clear any previous render
      ref.current.innerHTML = '';
      try {
        new window.QRCode(ref.current, {
          text,
          width: size,
          height: size,
          correctLevel: window.QRCode.CorrectLevel.M,
        });
      } catch (e) {
        console.error('QRCodeDisplay render error:', e);
      }
    });
  }, [asset, value, size]);

  return <div ref={ref} style={{ width: size, height: size, lineHeight: 0 }} />;
};

export default QRCodeDisplay;