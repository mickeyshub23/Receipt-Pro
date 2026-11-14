import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export function waitForFonts() {
  if (document.fonts && document.fonts.ready) return document.fonts.ready;
  return Promise.resolve();
}

export async function captureElement(el, scale = 2) {
  await waitForFonts();
  // ensure images (backgrounds/logo/qr) are decoded
  const imgs = Array.from(el.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) =>
      img.complete ? Promise.resolve() : new Promise((r) => {
        img.onload = r;
        img.onerror = r;
      }),
    ),
  );
  return html2canvas(el, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });
}

export function downloadCanvasPng(canvas, filename) {
  const a = document.createElement('a');
  a.download = filename;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

export function canvasToPdf(canvas, filename, style) {
  const w = (canvas.width / 2) * 0.75;
  const h = (canvas.height / 2) * 0.75;
  const pdf = new jsPDF({
    unit: 'pt',
    format: style === 1 ? 'a4' : [w, h],
    orientation: 'portrait',
  });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const k = Math.min(pw / w, ph / h);
  const iw = w * (style === 1 ? Math.min(k, 1.35) : k);
  const ih = h * (style === 1 ? Math.min(k, 1.35) : k);
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pw - iw) / 2, style === 1 ? 24 : 0, iw, ih);
  pdf.save(filename);
}

export function canvasToJpegBlob(canvas, quality = 0.7) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}