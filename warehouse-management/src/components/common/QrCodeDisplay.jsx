import React, { useEffect, useRef, useState } from 'react';

// ─── Unified payload builders ─────────────────────────────────────────────────

export const buildInventoryQRPayload = (item, tag, unitIndex, serialNumber) => [
  '== GOLI ICT ASSET ==',
  `Asset Tag : ${tag || 'N/A'}`,
  `Item      : ${item.description || 'N/A'}`,
  `Category  : ${item.category || 'N/A'}`,
  `Status    : ${item.status || 'In Stock'}`,
  `PO Number : ${item.po_number || 'N/A'}`,
  `PR Number : ${item.pr_number || 'N/A'}`,
  `JOR #     : ${item.jor_number || 'N/A'}`,
  `Location  : ${item.location || 'N/A'}`,
  `Assigned  : ${item.assigned_to || 'Unassigned'}`,
  `Serial #  : ${serialNumber || 'N/A'}`,
  `Unit #    : ${(unitIndex ?? 0) + 1}`,
  '====================',
].join('\n');

export const buildAssetQRPayload = (asset) => [
  '== GOLI ICT ASSET ==',
  `Asset Tag : ${asset.inventory_asset_tag?.trim() || 'N/A'}`,
  `Item      : ${asset.description || 'N/A'}`,
  `Category  : ${asset.category || 'N/A'}`,
  `Status    : ${asset.status || 'N/A'}`,
  `PO Number : ${asset.po_number || 'N/A'}`,
  `PR Number : ${asset.pr_number || 'N/A'}`,
  `JOR #     : ${asset.jor_number || 'N/A'}`,
  `Location  : ${asset.location || 'N/A'}`,
  `Assigned  : ${asset.assigned_to || asset.assignedTo || 'Unassigned'}`,
  `Serial #  : ${asset.serial_number || asset.serialNumber || 'N/A'}`,
  '====================',
].join('\n');

export const buildQRPayload = buildAssetQRPayload;

// ─── QR lib loader ─────────────────────────────────────────────────────────────
let _qrLoaded  = false;
let _qrLoading = false;
const _qrQueue = [];

function ensureQRLib(cb) {
  if (_qrLoaded && window.QRCode) { cb(); return; }
  _qrQueue.push(cb);
  if (_qrLoading) return;
  _qrLoading = true;
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  script.onload = () => {
    _qrLoaded = true; _qrLoading = false;
    _qrQueue.forEach(fn => fn()); _qrQueue.length = 0;
  };
  script.onerror = () => { _qrLoading = false; };
  document.head.appendChild(script);
}

// ─── Raw QR canvas renderer (no styling) ──────────────────────────────────────
// Used internally — renders raw QR into a div ref
const QRCanvas = ({ text, size, onRef }) => {
  const ref = useRef(null);
  const prevText = useRef('');

  useEffect(() => {
    if (!text || !ref.current) return;
    if (text === prevText.current) return;
    prevText.current = text;
    if (onRef) onRef(ref.current);
    ensureQRLib(() => {
      if (!ref.current || !window.QRCode) return;
      ref.current.innerHTML = '';
      try {
        new window.QRCode(ref.current, {
          text,
          width: size, height: size,
          correctLevel: window.QRCode.CorrectLevel.M,
        });
      } catch (e) { console.error('QR render error:', e); }
    });
  }, [text, size]);

  return <div ref={ref} style={{ width: size, height: size, lineHeight: 0, flexShrink: 0 }} />;
};

// ─── GOLI-style QR Card ───────────────────────────────────────────────────────
// Matches the design: white QR on dark navy background, asset tag label below
export const QRCard = ({ text, label, size = 120 }) => (
  <div style={{
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#ffffff',
    border: '1.5px solid #e5e7eb',
    borderRadius: 10,
    padding: size * 0.1,
    gap: size * 0.07,
    flexShrink: 0,
  }}>
    {/* White QR background */}
    <div style={{
      background: '#fff',
      borderRadius: 6,
      padding: size * 0.06,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <QRCanvas text={text} size={size} />
    </div>
    {/* Asset tag label */}
    {label && (
      <span style={{
        color: '#1e3a8a',
        fontSize: Math.max(9, size * 0.09),
        fontFamily: 'monospace',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textAlign: 'center',
        wordBreak: 'break-all',
        maxWidth: size + size * 0.12,
        padding: '0 4px',
      }}>
        {label}
      </span>
    )}
  </div>
);

// ─── QR Preview Modal ─────────────────────────────────────────────────────────
export const QRPreviewModal = ({ text, label, onClose }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <QRCard text={text} label={label} size={220} />
        <button
          onClick={onClose}
          style={{
            background: 'white', color: '#1e3a8a',
            border: '1.5px solid #e5e7eb', borderRadius: 8,
            padding: '8px 24px', fontWeight: 700, fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

// ─── Main QRCodeDisplay component ─────────────────────────────────────────────
// Props:
//   asset  — asset/inventory object → builds payload automatically
//   value  — pre-built string payload (takes priority over asset)
//   label  — text shown below QR (asset tag). If omitted, extracted from asset
//   size   — px size of the QR code itself (default 120)
//   card   — if true (default), renders GOLI-style navy card; if false, raw QR only
const QRCodeDisplay = ({ asset, value, label, size = 120, card = true }) => {
  const text = value
    ? String(value)
    : asset
      ? buildAssetQRPayload(asset)
      : '';

  const displayLabel = label !== undefined
    ? label
    : asset
      ? (asset.inventory_asset_tag?.trim() || asset.asset_id || '')
      : '';

  if (!text) return null;

  if (card) {
    return <QRCard text={text} label={displayLabel} size={size} />;
  }

  // Raw mode — just the QR canvas
  return <QRCanvas text={text} size={size} />;
};

export default QRCodeDisplay;