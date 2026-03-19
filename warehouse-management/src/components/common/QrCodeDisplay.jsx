import React, { useEffect, useRef } from 'react';

// ─── Unified payload builders — same format for Inventory and Asset QR codes ──

// Inventory item QR payload (used in InventoryForm, InventoryEditForm, InventoryDetails)
export const buildInventoryQRPayload = (item, tag, unitIndex) => [
  '== GOLI ICT ASSET ==',
  `Asset Tag : ${tag || 'N/A'}`,
  `Unit #    : ${(unitIndex ?? 0) + 1}`,
  `Item Code : ${item.item_code || item.itemCode || 'N/A'}`,
  `Item      : ${item.description || 'N/A'}`,
  `Category  : ${item.category || 'N/A'}`,
  `Location  : ${item.location || 'N/A'}`,
  '====================',
].join('\n');

// Asset QR payload (used in QRCodeDisplay when passed an asset object)
export const buildAssetQRPayload = (asset) => [
  '== GOLI ICT ASSET ==',
  `Asset Tag : ${asset.asset_id || asset.inventory_asset_tag || 'N/A'}`,
  `Item      : ${asset.description || 'N/A'}`,
  `Category  : ${asset.category || 'N/A'}`,
  `Status    : ${asset.status || 'N/A'}`,
  `Location  : ${asset.location || 'N/A'}`,
  `Assigned  : ${asset.assigned_to || asset.assignedTo || 'Unassigned'}`,
  `Serial #  : ${asset.serial_number || asset.serialNumber || 'N/A'}`,
  '====================',
].join('\n');

// Keep backward-compatible alias
export const buildQRPayload = buildAssetQRPayload;

// ─── QR lib loader ────────────────────────────────────────────────────────────
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

// ─── Component ────────────────────────────────────────────────────────────────
// Props:
//   asset  — asset/inventory object → builds payload automatically
//   value  — pre-built string payload (takes priority over asset)
//   size   — px size (default 200)
const QRCodeDisplay = ({ asset, value, size = 200 }) => {
  const ref       = useRef(null);
  const prevText  = useRef('');

  useEffect(() => {
    const text = value
      ? String(value)
      : asset
        ? buildAssetQRPayload(asset)
        : '';

    if (!text || !ref.current) return;
    if (text === prevText.current) return; // skip re-render if same text
    prevText.current = text;

    ensureQRLib(() => {
      if (!ref.current || !window.QRCode) return;
      ref.current.innerHTML = '';
      try {
        new window.QRCode(ref.current, {
          text,
          width:        size,
          height:       size,
          correctLevel: window.QRCode.CorrectLevel.M,
        });
      } catch (e) {
        console.error('QRCodeDisplay render error:', e);
      }
    });
  }, [asset, value, size]);

  return (
    <div
      ref={ref}
      style={{ width: size, height: size, lineHeight: 0, flexShrink: 0 }}
    />
  );
};

export default QRCodeDisplay;