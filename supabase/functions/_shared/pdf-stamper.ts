import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib";
import QRCode from "npm:qrcode";

interface StampParams {
    pdfArrayBuffer: ArrayBuffer;
    documentId: string;
    fileName: string;
    senderName: string;
    senderEmail: string;
    signers: any[];
    auditTrail: any[];
}

/**
 * Stamps a PDF with:
 * - Document ID watermark on every original page (bottom left)
 * - A full audit trail page with logo, checkmark, document info, signer details
 * - QR code for verification
 * - Branding and footer disclaimer
 *
 * Returns the stamped PDF as Uint8Array.
 */
export async function stampPdf(params: StampParams): Promise<Uint8Array> {
    const { pdfArrayBuffer, documentId, fileName, senderName, senderEmail, signers, auditTrail } = params;

    const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const originalPages = pdfDoc.getPages();
    const numPages = originalPages.length;

    // Stamp Document ID on EVERY original page (bottom left margin)
    for (let i = 0; i < numPages; i++) {
        const page = originalPages[i];
        page.drawText(`Allekirjoitettu helppoallekirjoitus.fi -palvelussa | Tunnus: ${documentId} | Sivu ${i + 1}/${numPages}`, {
            x: 20,
            y: 15,
            size: 8,
            font: helveticaFont,
            color: rgb(0.5, 0.5, 0.5)
        });
    }

    // Add the Final Audit Trail Page
    let auditPage = pdfDoc.addPage();
    const { width, height } = auditPage.getSize();
    const timestamp = new Date().toLocaleString('fi-FI', { timeZone: 'Europe/Helsinki' });

    // Draw Top Header Bar (Brand Color)
    auditPage.drawRectangle({
        x: 0,
        y: height - 10,
        width: width,
        height: 10,
        color: rgb(0.145, 0.388, 0.922)
    });

    // Add Logo
    try {
        const logoRes = await fetch('https://helppoallekirjoitus.fi/logo.jpg');
        if (logoRes.ok) {
            const logoBuffer = await logoRes.arrayBuffer();
            const brandLogo = await pdfDoc.embedJpg(logoBuffer);
            const logoDims = brandLogo.scaleToFit(140, 40);
            auditPage.drawImage(brandLogo, {
                x: 50,
                y: height - 25 - logoDims.height,
                width: logoDims.width,
                height: logoDims.height,
            });
        } else {
            auditPage.drawText('Helppo Allekirjoitus', { x: 50, y: height - 45, size: 16, font: helveticaBold, color: rgb(0.145, 0.388, 0.922) });
        }
    } catch {
        auditPage.drawText('Helppo Allekirjoitus', { x: 50, y: height - 45, size: 16, font: helveticaBold, color: rgb(0.145, 0.388, 0.922) });
    }

    // Add "Luotettava Sähköinen Allekirjoitus" tag top right
    const rightText = 'Luotettava Sähköinen Allekirjoitus';
    const rightTextWidth = helveticaFont.widthOfTextAtSize(rightText, 10);
    auditPage.drawText(rightText, {
        x: width - 50 - rightTextWidth,
        y: height - 40,
        size: 10,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5)
    });

    // Visual "Approved" Checkmark (Green Circle with Check)
    const checkmarkPath = "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z";
    auditPage.drawSvgPath(checkmarkPath, {
        x: (width / 2) - 15,
        y: height - 70,
        scale: 1.25,
        color: rgb(0.133, 0.773, 0.369)
    });

    // Center Title
    const titleText = 'SÄHKÖINEN ALLEKIRJOITUSTODISTUS';
    const titleTextWidth = helveticaBold.widthOfTextAtSize(titleText, 18);
    auditPage.drawText(titleText, {
        x: (width / 2) - (titleTextWidth / 2),
        y: height - 120,
        size: 18,
        font: helveticaBold,
        color: rgb(0.066, 0.094, 0.153)
    });

    // Center Timestamp
    const timeText = `Vahvistettu ${timestamp}`;
    const timeTextWidth = helveticaFont.widthOfTextAtSize(timeText, 11);
    auditPage.drawText(timeText, {
        x: (width / 2) - (timeTextWidth / 2),
        y: height - 140,
        size: 11,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4)
    });

    // Draw Document Info Block
    auditPage.drawRectangle({
        x: 50,
        y: height - 250,
        width: width - 100,
        height: 85,
        color: rgb(0.976, 0.98, 0.984),
        borderColor: rgb(0.898, 0.906, 0.922),
        borderWidth: 1
    });

    auditPage.drawText('Asiakirjan tiedot', { x: 70, y: height - 185, size: 12, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
    auditPage.drawText(`Tunnus (ID):`, { x: 70, y: height - 205, size: 10, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });
    auditPage.drawText(`${documentId}`, { x: 140, y: height - 205, size: 10, font: helveticaFont, color: rgb(0.2, 0.2, 0.2) });
    auditPage.drawText(`Tiedosto:`, { x: 70, y: height - 220, size: 10, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });
    auditPage.drawText(`${fileName}`, { x: 140, y: height - 220, size: 10, font: helveticaFont, color: rgb(0.2, 0.2, 0.2) });
    auditPage.drawText(`Tarkista aitous: helppoallekirjoitus.fi/verify/${documentId}`, { x: 70, y: height - 235, size: 8, font: helveticaFont, color: rgb(0.5, 0.5, 0.5) });

    // Draw Signers Table
    let currentY = height - 290;

    const getAuditData = (r: string, identifier: string) => {
        if (r === 'recipient') {
            return auditTrail.slice().reverse().find((a: any) => a.role === r && (a.signerId === identifier || a.email === identifier)) || { ip: 'Ei tallennettu', auth_method: 'FTN' };
        }
        return auditTrail.slice().reverse().find((a: any) => a.role === r && a.email === identifier) || { ip: 'Ei tallennettu', auth_method: 'FTN' };
    };

    const checkPagination = () => {
        if (currentY < 130) {
            auditPage = pdfDoc.addPage();
            currentY = height - 70;
            auditPage.drawText('SÄHKÖINEN ALLEKIRJOITUSTODISTUS (Jatkoa)', { x: 50, y: height - 40, size: 14, font: helveticaBold, color: rgb(0, 0, 0) });
        }
    };

    // Sender
    checkPagination();
    const senderAudit = getAuditData('sender', senderEmail);
    auditPage.drawLine({ start: { x: 50, y: currentY }, end: { x: width - 50, y: currentY }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
    currentY -= 25;
    auditPage.drawText('OSAPUOLI 1: LÄHETTÄJÄ', { x: 50, y: currentY, size: 10, font: helveticaBold, color: rgb(0.5, 0.5, 0.5) });
    currentY -= 18;
    auditPage.drawText(`${senderName}`, { x: 50, y: currentY, size: 14, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
    currentY -= 15;
    auditPage.drawText(`${senderEmail}`, { x: 50, y: currentY, size: 10, font: helveticaFont, color: rgb(0.3, 0.3, 0.3) });
    currentY -= 15;
    auditPage.drawText(`Tunnistus: ${senderAudit.auth_method}`, { x: 50, y: currentY, size: 10, font: helveticaFont, color: rgb(0.3, 0.3, 0.3) });
    currentY -= 15;
    auditPage.drawText(`IP-osoite: ${senderAudit.ip}`, { x: 50, y: currentY, size: 10, font: helveticaFont, color: rgb(0.3, 0.3, 0.3) });
    currentY -= 20;

    // Recipients
    signers.forEach((s: any, index: number) => {
        checkPagination();
        const recAudit = getAuditData('recipient', s.id);
        auditPage.drawLine({ start: { x: 50, y: currentY }, end: { x: width - 50, y: currentY }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
        currentY -= 25;
        auditPage.drawText(`OSAPUOLI ${index + 2}: VASTAANOTTAJA`, { x: 50, y: currentY, size: 10, font: helveticaBold, color: rgb(0.5, 0.5, 0.5) });
        currentY -= 18;
        auditPage.drawText(`${s.name}`, { x: 50, y: currentY, size: 14, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
        currentY -= 15;
        auditPage.drawText(`${s.email}`, { x: 50, y: currentY, size: 10, font: helveticaFont, color: rgb(0.3, 0.3, 0.3) });
        currentY -= 15;
        auditPage.drawText(`Tunnistus: ${recAudit.auth_method}`, { x: 50, y: currentY, size: 10, font: helveticaFont, color: rgb(0.3, 0.3, 0.3) });
        currentY -= 15;
        auditPage.drawText(`IP-osoite: ${recAudit.ip}`, { x: 50, y: currentY, size: 10, font: helveticaFont, color: rgb(0.3, 0.3, 0.3) });
        currentY -= 20;
    });

    // Add QR Code for verification
    if (currentY < 160) {
        auditPage = pdfDoc.addPage();
        auditPage.drawText('SÄHKÖINEN ALLEKIRJOITUSTODISTUS (Jatkoa)', { x: 50, y: height - 40, size: 14, font: helveticaBold, color: rgb(0, 0, 0) });
    }

    const verifyUrl = `https://helppoallekirjoitus.fi/verify/${documentId}`;
    try {
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, color: { dark: '#000000', light: '#ffffff' } });
        const base64Data = qrDataUrl.split(',')[1];
        if (base64Data) {
            const qrImageArrayBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const qrImage = await pdfDoc.embedPng(qrImageArrayBuffer);
            auditPage.drawImage(qrImage, { x: 50, y: 65, width: 65, height: 65 });
            auditPage.drawText('Skannaa QR-koodi', { x: 125, y: 115, size: 9, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });
            auditPage.drawText('tarkistaaksesi asiakirjan', { x: 125, y: 102, size: 9, font: helveticaFont, color: rgb(0.3, 0.3, 0.3) });
            auditPage.drawText('aitouden palvelusta.', { x: 125, y: 89, size: 9, font: helveticaFont, color: rgb(0.3, 0.3, 0.3) });
        }
    } catch (qrErr) {
        console.error("QR Code generation failed:", qrErr);
        auditPage.drawText(`Validointilinkki: ${verifyUrl}`, { x: 50, y: 100, size: 10, font: helveticaFont, color: rgb(0.2, 0.2, 0.2) });
    }

    // Marketing / Branding Text
    auditPage.drawText('Allekirjoitettu turvallisesti helppoallekirjoitus.fi -palvelussa.', {
        x: 50, y: 50, size: 9, font: helveticaBold, color: rgb(0.145, 0.388, 0.922),
    });

    // Footer disclaimer
    auditPage.drawText('Tämä sivu on automaattinen palveluntarjoajan varmenne vahvasta sähköisestä', { x: 50, y: 35, size: 7, font: helveticaFont, color: rgb(0.5, 0.5, 0.5) });
    auditPage.drawText('tunnistautumisesta (FTN) ja maksujen suorittamisesta suojatussa ympäristössä.', { x: 50, y: 25, size: 7, font: helveticaFont, color: rgb(0.5, 0.5, 0.5) });

    return pdfDoc.save();
}
