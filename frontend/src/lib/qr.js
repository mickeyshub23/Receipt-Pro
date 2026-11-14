import QRCode from 'qrcode';

export async function qrDataUrl(text, fg = '#2a2a2a', bg = '#ffffff', size = 130) {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 4,
      color: { dark: fg, light: bg },
      width: size,
      height: size,
    });
  } catch (e) {
    return '';
  }
}