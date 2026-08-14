import toast from 'react-hot-toast';
import { supabase } from './supabase';
import type { SignatureData } from '../types';

export function initiateAuth(data: SignatureData, role: 'sender' | 'recipient'): Promise<boolean> {
    if (!data.documentId) {
        toast.error('Virhe: Asiakirjan tunnistetta ei löytynyt.');
        return Promise.resolve(false);
    }

    sessionStorage.setItem('signatureData', JSON.stringify({ ...data, role }));

    const clientId = import.meta.env.VITE_IDURA_CLIENT_ID;
    const domain = import.meta.env.VITE_IDURA_DOMAIN;

    if (!clientId || !domain) {
        console.warn("Idura OIDC muuttujia ei löydy.");
        toast.error("Tunnistautuminen ei ole käytössä (muuttujat puuttuvat).");
        return Promise.resolve(false);
    }

    const redirectUri = `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`;

    return supabase.functions.invoke('init-auth', {
        body: {
            state: data.documentId,
            redirectUri: redirectUri
        }
    })
        .then(({ data: authData, error }) => {
            if (error) {
                toast.error("Virhe tunnistautumisen alustuksessa: " + error.message);
                return false;
            }

            if (authData && authData.authUrl) {
                window.location.href = authData.authUrl;
                return true;
            } else if (authData && authData.error) {
                toast.error("Virhe tunnistautumisen alustuksessa: " + authData.error);
                return false;
            } else {
                toast.error("Palvelin ei palauttanut kelvollista ohjausosoitetta.");
                return false;
            }
        })
        .catch(err => {
            toast.error("Yhteysvirhe tunnistautumisen alustuksessa: " + err.message);
            return false;
        });
}
