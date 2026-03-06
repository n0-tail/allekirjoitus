import QRCode from 'npm:qrcode';

const generateQR = async (text: string) => {
    try {
        const dataUrl = await QRCode.toDataURL(text);
        return dataUrl;
    } catch (err) {
        console.error(err)
    }
}

const generateHash = async (buffer: ArrayBuffer) => {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
