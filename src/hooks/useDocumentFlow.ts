import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { SignatureData } from '../types';

export type ViewState = 'loading' | 'start' | 'payment' | 'authenticating' | 'processing' | 'waiting' | 'success' | 'error';

export function useDocumentFlow(id: string | undefined, role: 'sender' | 'recipient') {
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<SignatureData | null>(null);
    const [view, setView] = useState<ViewState>('loading');

    useEffect(() => {
        if (!id) return;

        // Jos olemme palanneet onnistuneesta maksusta (Stripe redirect_status)
        if (searchParams.get('payment_intent_client_secret')) {
            const stashedData = sessionStorage.getItem('appState_data');
            if (stashedData) {
                try {
                    setData(JSON.parse(stashedData));

                    // Jos maksu onnistui, ohjataan heti tunnistautumaan
                    if (searchParams.get('redirect_status') === 'succeeded') {
                        toast.success("Maksu vahvistettu! Siirrytään tunnistautumiseen...");
                        // Käytettiin aiemmin setView('authenticating');
                        import('../DocumentFlow').then(({ initiateAuth }) => {
                            initiateAuth(JSON.parse(stashedData), role).then((success) => {
                                if (!success) setView('start');
                            });
                        });
                        return;
                    } else {
                        setView('start'); // Jos peruutettu
                    }
                } catch { }
            }
        }

        supabase.from('documents').select('*').eq('id', id).single()
            .then(({ data: docDataDB, error }) => {
                const doc = docDataDB;
                if (error || !doc) {
                    toast.error("Asiakirjaa ei löytynyt järjestelmästä.");
                    setView('error');
                } else {
                    // Haetaan sessionstoragesta jos siellä on jo jotain (esim OIDC paluu)
                    const stashedSession = sessionStorage.getItem('appState_view');
                    const stashedData = sessionStorage.getItem('appState_data');

                    if (stashedSession === 'processing' && stashedData) {
                        setData(JSON.parse(stashedData));
                        setView('processing');
                        sessionStorage.removeItem('appState_view');
                        return;
                    }

                    if (stashedSession === 'authenticating' && stashedData) {
                        setData(JSON.parse(stashedData));
                        setView('authenticating');
                        return;
                    }

                    const docData: SignatureData = {
                        file: null,
                        documentId: doc.id,
                        sender: doc.sender_email,
                        recipient: '',
                        fileName: doc.file_name,
                        role: role,
                        allSigners: doc.signers || []
                    };

                    if (role === 'recipient') {
                        const signerId = searchParams.get('signer');
                        if (!signerId) {
                            toast.error("Virhe: Sähköpostilinkistä puuttuu tunniste (signer).");
                            setView('error');
                            return;
                        }
                        const signersList = doc.signers || [];
                        const targetSigner = signersList.find((s: any) => s.id === signerId);

                        if (!targetSigner) {
                            toast.error("Virhe: Sinua ei löytynyt tämän asiakirjan allekirjoittajista.");
                            setView('error');
                            return;
                        }

                        docData.recipient = targetSigner.email;
                        docData.signerId = signerId;
                        setData(docData);

                        if (targetSigner.signed) {
                            setView('waiting');
                        } else if (stashedSession === 'authenticating' || stashedSession === 'processing') {
                            // Retain current session state if they're mid-flow
                        } else {
                            setView('start');
                        }
                    } else {
                        // SENDER
                        docData.recipient = doc.signers && doc.signers.length > 0 ? doc.signers.map((s: any) => s.email).join(', ') : 'Vastaanottajat';
                        setData(docData);

                        if (doc.sender_name) {
                            setView('waiting');
                        } else if (doc.sender_paid) {
                            // Bug #2 Fix: Jos on jo maksettu, ohjataan aloitusnäkymään josta voi klikata itsensä tunnistautumaan.
                            // Jos laitamme suoraan 'authenticating', se jää jumiin koska initiateAuth koodataan UX:n kautta.
                            setView('start');
                        } else {
                            setView('start');
                        }
                    }
                }
            });
    }, [id, role, searchParams]);

    useEffect(() => {
        if (data && view !== 'loading' && view !== 'error') {
            sessionStorage.setItem('appState_data', JSON.stringify(data));
            sessionStorage.setItem('appState_view', view);
        }
    }, [data, view]);

    return { data, view, setView };
}
