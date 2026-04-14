import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { reportError } from '../lib/errorReporter';
import type { SignatureData } from '../types';

export type ViewState = 'loading' | 'start' | 'payment' | 'authenticating' | 'processing' | 'waiting' | 'success' | 'error';

export function useDocumentFlow(id: string | undefined, role: 'sender' | 'recipient') {
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<SignatureData | null>(null);
    const [view, setView] = useState<ViewState>('loading');

    useEffect(() => {
        if (!id) return;

        // Kuunnellaan Stripe redirect_status, mutta EI luoteta siihen suoraan.
        if (searchParams.get('payment_intent_client_secret')) {
            const stashedData = sessionStorage.getItem('appState_data');
            if (stashedData) {
                try {
                    setData(JSON.parse(stashedData));
                    if (searchParams.get('redirect_status') === 'succeeded') {
                        toast.success("Maksu rekisteröity. Odotetaan vahvistusta tietokannasta...");

                        let attempts = 0;
                        const maxAttempts = 20;
                        const checkPaymentStatus = async () => {
                            attempts++;
                            const { data: dbData } = await supabase.rpc('get_document_by_id', { doc_id: id });
                            const doc = dbData && dbData.length > 0 ? dbData[0] : null;
                            const isSender = role === 'sender';
                            const stashedTargetId = JSON.parse(stashedData).signerId;
                            const isPaid = doc ? (isSender ? doc.sender_paid : doc.signers?.find((s: any) => s.id === stashedTargetId)?.paid) : false;

                            if (isPaid) {
                                const parsedData = JSON.parse(stashedData);
                                if (parsedData.senderSigns === false) {
                                    toast.success("Maksu vahvistettu! Asiakirja on lähetetty vastaanottajille.");
                                    const newUrl = window.location.pathname;
                                    window.history.replaceState({}, '', newUrl); // Puhdista osoiterivi redirect-parametreista
                                    setView('waiting');
                                } else {
                                    toast.success("Maksu vahvistettu! Siirrytään tunnistautumiseen...");
                                    import('../DocumentFlow').then(({ initiateAuth }) => {
                                        initiateAuth(parsedData, role).then((success) => {
                                            if (!success) setView('start');
                                        });
                                    });
                                }
                            } else if (attempts < maxAttempts) {
                                setTimeout(checkPaymentStatus, 1500);
                            } else {
                                reportError('Maksua ei vahvistettu (useDocumentFlow)', new Error('Maksua ei voitu vahvistaa järjestelmästä ajoissa'));
                                toast.error("Maksua ei voitu vahvistaa järjestelmästä ajoissa. Yritä ladata sivu uudelleen hetken kuluttua.");
                                setView('start');
                            }
                        };
                        checkPaymentStatus();
                        return;
                    } else {
                        setView('start'); // Jos maksu on peruutettu
                        return;
                    }
                } catch { }
            }
        }

        const fetchDoc = async () => {
            try {
                const { data: docDataDB, error } = await supabase.rpc('get_document_by_id', { doc_id: id });
                const doc = docDataDB && docDataDB.length > 0 ? docDataDB[0] : null;

                if (error || !doc) {
                    toast.error("Asiakirjaa ei löytynyt järjestelmästä.");
                    setView('error');
                } else {
                    const stashedSession = sessionStorage.getItem('appState_view');
                    const stashedData = sessionStorage.getItem('appState_data');

                    if (stashedSession === 'processing' && stashedData) {
                        setData(JSON.parse(stashedData));
                        setView('processing');
                        sessionStorage.removeItem('appState_view');
                        return;
                    } else if (stashedSession === 'authenticating' && stashedData) {
                        setData(JSON.parse(stashedData));
                        setView('authenticating');
                        return;
                    }

                    const signersList = doc.signers || [];

                    const docData: SignatureData = {
                        file: null,
                        documentId: doc.id,
                        sender: doc.sender_email,
                        recipient: '',
                        fileName: doc.file_name,
                        role: role,
                        allSigners: signersList,
                        senderPaid: !!doc.sender_paid,
                        senderSigned: !!doc.sender_name,
                        senderSigns: doc.sender_signs !== false,
                    };

                    if (role === 'recipient') {
                        const signerId = searchParams.get('signer');
                        if (!signerId) {
                            toast.error("Virhe: Sähköpostilinkistä puuttuu tunniste (signer).");
                            setView('error');
                            return;
                        }
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
                            // Jos kaikki on allekirjoittanut ja asiakirja on valmis, näytä success
                            const allSigned = signersList.every((s: any) => s.signed === true) && !!doc.sender_name;
                            if (allSigned && doc.status === 'signed') {
                                setView('success');
                            } else if (allSigned && doc.status !== 'signed') {
                                // AUTO-RECOVERY: Kaikki allekirjoitettu mutta PDF uupuu (esim. reunanauhan virhe)
                                docData.verifiedName = targetSigner.name;
                                setData(docData);
                                setView('processing');
                            } else {
                                setView('waiting');
                            }
                        } else if (stashedSession === 'authenticating' || stashedSession === 'processing') {
                            // Retain current session state if they're mid-flow
                        } else {
                            setView('start');
                        }
                    } else {
                        // SENDER
                        docData.recipient = signersList.length > 0 ? signersList.map((s: any) => s.email).join(', ') : 'Vastaanottajat';
                        setData(docData);

                        const allRecipientsSigned = signersList.length > 0 && signersList.every((s: any) => s.signed === true);

                        if (doc.sender_signs === false) {
                            // OBSERVER: sender ei allekirjoita
                            if (allRecipientsSigned && doc.status === 'signed') {
                                setView('success');
                            } else if (allRecipientsSigned && doc.status !== 'signed') {
                                docData.verifiedName = '[Observer]';
                                setData(docData);
                                setView('processing');
                            } else {
                                setView('waiting');
                            }
                        } else if (doc.sender_name && allRecipientsSigned && doc.status === 'signed') {
                            // Kaikki on allekirjoittanut → näytä valmis-näkymä
                            setView('success');
                        } else if (doc.sender_name && allRecipientsSigned && doc.status !== 'signed') {
                            // AUTO-RECOVERY: Kaikki allekirjoitettu mutta PDF uupuu
                            docData.verifiedName = doc.sender_name;
                            setData(docData);
                            setView('processing');
                        } else if (doc.sender_name) {
                            // Lähettäjä on tunnistautunut mutta odottaa vastaanottajia
                            setView('waiting');
                        } else {
                            // Lähettäjä ei ole vielä tunnistautunut
                            setView('start');
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load document:", err);
                reportError('Asiakirjan haku epäonnistui (useDocumentFlow)', err);
                setView('error');
            }
        };

        fetchDoc();
    }, [id, role, searchParams]);

    // Polling for updates while in 'waiting' state
    useEffect(() => {
        let timer: number;
        if (view === 'waiting' && id) {
            const checkStatus = async () => {
                try {
                    const { data: dbData } = await supabase.rpc('get_document_by_id', { doc_id: id });
                    const doc = dbData && dbData.length > 0 ? dbData[0] : null;
                    if (doc) {
                        const signersList = doc.signers || [];
                        const allRecipientsSigned = signersList.length > 0 && signersList.every((s: any) => s.signed === true);
                        const senderDone = doc.sender_signs === false ? true : !!doc.sender_name;
                        const allSigned = allRecipientsSigned && senderDone;

                        // Päivitetään aktiivisesti allekirjoittajien tilanne UI:ta varten
                        setData(prev => {
                            if (!prev) return prev;
                            return { ...prev, allSigners: signersList, senderSigned: !!doc.sender_name };
                        });

                        if (allSigned && doc.status === 'signed') {
                            setView('success');
                            return; // Stop polling
                        } else if (allSigned && doc.status !== 'signed') {
                            // AUTO-RECOVERY: Toinen osapuoli saattoi keskeyttää PDF-luonnin, yritetään sitä nyt uudelleen automaattisesti!
                            setData(prev => {
                                if (!prev) return prev;
                                const verName = role === 'sender' ? doc.sender_name : (signersList.find((s: any) => s.id === prev.signerId)?.name || '');
                                return { ...prev, verifiedName: verName };
                            });
                            setView('processing');
                            return; // Stop polling
                        }
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
                timer = window.setTimeout(checkStatus, 4000);
            };

            timer = window.setTimeout(checkStatus, 4000);
        }
        return () => window.clearTimeout(timer);
    }, [view, id, role]);

    useEffect(() => {
        if (data && view !== 'loading' && view !== 'error') {
            sessionStorage.setItem('appState_data', JSON.stringify(data));
            sessionStorage.setItem('appState_view', view);
        }
    }, [data, view]);

    return { data, view, setView };
}
