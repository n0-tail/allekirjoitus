import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.functions.invoke('record-action', {
    body: {
      documentId: 'a59b9354-c28f-469c-b4b7-443ebe42040b',
      role: 'sender',
      verifiedName: 'MILJA HELIN',
      sender: 'miljahe@gmail.com',
      recipient: '',
      signerId: '',
      fileName: 'Lupporinki yhtiökokous 9.4.2026 pöytäkirja.pdf' 
    }
  });
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
