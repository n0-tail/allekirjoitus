interface CompletionEmailParams {
    resendApiKey: string;
    fileName: string;
    senderEmail: string;
    senderName: string;
    signers: any[];
    signedUrl: string;
    pdfBase64: string;
}

/**
 * Sends completion emails to all parties (sender + all signers)
 * with the signed PDF attached.
 */
export async function sendCompletionEmails(params: CompletionEmailParams): Promise<void> {
    const { resendApiKey, fileName, senderEmail, senderName, signers, signedUrl, pdfBase64 } = params;

    const allNames = [senderName, ...signers.map((s: any) => s.name)].filter(Boolean).join(', ');

    const downloadBlock = signedUrl
        ? `<div style="margin: 30px 0;">
            <a href="${signedUrl}" download style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
              Lataa allekirjoitettu asiakirja (PDF)
            </a>
            <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">Linkki on voimassa 24 tuntia.</p>
          </div>`
        : `<p style="color: #6b7280; font-size: 14px;">Latauslinkki ei ole juuri nyt saatavilla. Voit ladata asiakirjan palvelussa.</p>`;

    const emailSubject = signers.length === 0
        ? `Asiakirjasi on valmis: ${fileName}`
        : `Asiakirja valmis: Kaikki osapuolet ovat allekirjoittaneet`;

    const emailTitle = signers.length === 0
        ? `Asiakirjasi on nyt valmis`
        : `Asiakirja on nyt valmis (Kaikkien suostumus)`;

    const emailBody = signers.length === 0
        ? `Olet sähköisesti allekirjoittanut asiakirjan.`
        : `Kaikki osapuolet (<strong>${allNames}</strong>) ovat nyt sähköisesti allekirjoittaneet asiakirjan.`;

    const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
      <h2 style="color: #065f46; margin-top: 0;">${emailTitle}</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.5;">
        ${emailBody}
      </p>
      ${downloadBlock}
    </div>`;

    // Filter out null/undefined/empty emails and deduplicate
    const allEmails = [...new Set([senderEmail, ...signers.map((s: any) => s.email)].filter(Boolean))];

    const emailPromises = allEmails.map(async (emailTarget: string) => {
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
                body: JSON.stringify({
                    from: 'Helppo Allekirjoitus <noreply@helppoallekirjoitus.fi>',
                    to: [emailTarget],
                    subject: emailSubject,
                    html: emailHtml,
                    attachments: [{
                        filename: fileName,
                        content: pdfBase64,
                    }],
                }),
            });
            if (!res.ok) {
                const errBody = await res.text();
                console.error(`Sähköpostin lähetys epäonnistui osoitteeseen ${emailTarget} (${res.status}):`, errBody);
            } else {
                console.log(`Valmis-sähköposti lähetetty: ${emailTarget}`);
            }
        } catch (emailErr) {
            console.error(`Sähköpostin lähetys epäonnistui osoitteeseen ${emailTarget}:`, emailErr);
        }
    });

    await Promise.all(emailPromises);
}
