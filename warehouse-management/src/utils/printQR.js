// P900W 24mm tape print with GOLI logo
export const goliPrintQR = (tags, payloadBuilder, title = 'Asset Labels') => {
  const validTags = tags.filter(Boolean);
  if (validTags.length === 0) { alert('No asset tags to print.'); return; }
  const printWindow = window.open('', '_blank', 'width=800,height=700');
  if (!printWindow) { alert('Please allow pop-ups to print.'); return; }
  const QR_SIZE = 80;
  const cards = validTags.map((tag, i) => `
    <div class="label">
      <div class="qr-box"><div id="qr_${i}"></div></div>
      <div class="info">
        <img class="logo" src="${window.location.origin}/goli_logo.jpg" alt="GOLI" onerror="this.style.display='none'" />
        <div class="asset-tag">${tag}</div>
      </div>
    </div>`).join('');
  const scripts = validTags.map((tag, i) =>
    'new QRCode(document.getElementById(\\'qr_' + i + '\\'),{text:' + JSON.stringify(payloadBuilder(tag, i)) + ',width:' + QR_SIZE + ',height:' + QR_SIZE + ',correctLevel:QRCode.CorrectLevel.M});'
  ).join('\n');
  printWindow.document.write('<!DOCTYPE html><html><head><title>' + title + '</title><style>'
    + '@page{size:38mm 24mm;margin:0}'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{background:#fff;padding:0;font-family:Arial,sans-serif}'
    + '.page{display:flex;flex-direction:column;gap:0}'
    + '.label{width:38mm;height:24mm;display:flex;align-items:center;padding:1mm;background:#fff;page-break-after:always}'
    + '.qr-box{flex-shrink:0;width:20mm;height:20mm;margin-right:1mm;display:flex;align-items:center;justify-content:center}'
    + '.qr-box canvas,.qr-box img{display:block}'
    + '.info{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:0.5mm}'
    + '.logo{max-width:12mm;max-height:6mm;object-fit:contain}'
    + '.asset-tag{font-size:6.5pt;font-weight:bold;color:#000;font-family:monospace;letter-spacing:0.03em;word-break:break-all;text-align:center;line-height:1.1}'
    + '.label:last-child{page-break-after:avoid}'
    + '@media screen{body{background:#f0f0f0;padding:16px}.page{gap:12px}.label{border:1px solid #000}}'
    + '@media print{.label{border:none}}'
    + '</style></head><body>'
    + '<div class="page">' + cards + '</div>'
    + '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>'
    + '<script>window.addEventListener(\'load\',()=>{setTimeout(()=>{' + scripts + ';setTimeout(()=>window.print(),700)},300)});<\/script>'
    + '</body></html>');
  printWindow.document.close();
};
