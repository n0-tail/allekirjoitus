import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const docIds = ['a59b9354-c28f-469c-b4b7-443ebe42040b', '1c4b7e62-fa20-4cad-8f5a-92c7ec7a97e2'];

async function stripPages() {
  for (const docId of docIds) {
    const { data: doc, error: dbErr } = await supabase.from('documents').select('file_name').eq('id', docId).single();
    if (dbErr || !doc) { console.error('DB err', dbErr); continue; }
    
    const safeFileName = doc.file_name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filePath = `${docId}/${safeFileName}`;
    console.log('Downloading:', filePath);
    
    // Download current multi-stamped PDF
    const { data: fileBlob, error: downloadError } = await supabase.storage.from('pdfs').download(filePath);
    if (downloadError) { console.error('Download error:', downloadError); continue; }
    
    const arrayBuffer = await fileBlob.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    const pageCount = pdfDoc.getPageCount();
    console.log(`${doc.file_name} original pages: ${pageCount}`);
    
    // Check if it has enough pages to strip
    // The original might have been 1 page. With 2 stamps it's 3 pages.
    pdfDoc.removePage(pageCount - 1); 
    pdfDoc.removePage(pageCount - 2); 
    
    console.log(`${doc.file_name} stripped back to ${pdfDoc.getPageCount()} pages`);
    
    const strippedBytes = await pdfDoc.save();
    
    // Overwrite the file in the bucket with our cleanly stripped original PDF
    const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(filePath, strippedBytes, { upsert: true, contentType: 'application/pdf' });
        
    if (uploadError) { console.error('Upload error:', uploadError); continue; }
    
    console.log(`${doc.file_name} stripped PDF uploaded back to bucket.`);
    
    // Set status to pending before invoking to make sure email logic thinks it's a new finish
    await supabase.from('documents').update({ status: 'pending' }).eq('id', docId);

    // Call finalization
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('record-action', {
      body: {
        documentId: docId,
        role: 'sender',
        verifiedName: 'Milja Marjatta Heinonen',
        sender: 'miljahe@gmail.com',
        recipient: '',
        signerId: '',
        fileName: doc.file_name
      }
    });

    console.log(`Re-stamped result:`, edgeErr || edgeData);
  }
}

stripPages();
