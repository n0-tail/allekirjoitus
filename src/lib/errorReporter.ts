import { supabase } from './supabase';

export const reportError = async (context: string, err: unknown) => {
  try {
    const errorDetails = err instanceof Error ? err.stack || err.message : String(err);
    console.error(`[Virhereportti - ${context}]:`, err);
    
    await supabase.functions.invoke('send-email', {
      body: {
        emailType: 'admin_error',
        errorContext: context,
        errorDetails
      }
    });
  } catch (e) {
    console.error('Admin-ilmoituksen lähetys epäonnistui:', e);
  }
};
