import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from './lib/supabase';

// Initialize Stripe. Uses Vite env var.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface CheckoutFormProps {
    onSuccess: () => void;
    reason: string;
    totalAmount: number;
    payForAll: boolean;
    setPayForAll?: (val: boolean) => void;
    numSigners: number;
    showPayForAllToggle: boolean;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ onSuccess, reason, totalAmount, payForAll, setPayForAll, numSigners, showPayForAllToggle }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isElementReady, setIsElementReady] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsProcessing(true);
        setErrorMessage(null);

        try {
            // Add a timeout so we don't hang forever
            const confirmPromise = stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.href,
                },
                redirect: 'if_required',
            });

            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Maksu aikakatkaistiin. Yritä uudelleen.')), 30000)
            );

            const { error } = await Promise.race([confirmPromise, timeoutPromise]);

            if (error) {
                setErrorMessage(error.message || 'Maksussa tapahtui virhe.');
                setIsProcessing(false);
            } else {
                // Payment successful
                onSuccess();
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Maksussa tapahtui virhe.');
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                    Käsittelymaksu ({(totalAmount / 100).toFixed(2).replace('.', ',')} €)
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    {reason}
                </p>

                {showPayForAllToggle && numSigners > 0 && setPayForAll && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', cursor: 'pointer', background: '#e0f2fe', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #bae6fd' }}>
                        <input
                            type="checkbox"
                            checked={payForAll}
                            onChange={(e) => setPayForAll(e.target.checked)}
                            style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', accentColor: '#2563eb' }}
                        />
                        <div>
                            <span style={{ display: 'block', fontWeight: 500, color: '#0369a1' }}>
                                Maksa kaikkien osapuolien käsittelykulut kerralla
                            </span>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#0284c7', marginTop: '0.25rem' }}>
                                Vastaanottajat siirtyvät suoraan tunnistautumiseen.
                            </span>
                        </div>
                    </label>
                )}

                {!isElementReady && (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Ladataan maksutapoja...
                    </div>
                )}
                <PaymentElement
                    onReady={() => setIsElementReady(true)}
                    onLoadError={(e) => setErrorMessage(`Maksutapojen lataus epäonnistui: ${e.error.message}`)}
                />
                {errorMessage && <div style={{ color: 'red', marginTop: '1rem', fontSize: '0.875rem' }}>{errorMessage}</div>}
            </div>
            <button
                type="submit"
                disabled={!stripe || isProcessing || !isElementReady}
                className="btn btn-primary"
                style={{ width: '100%' }}
            >
                {isProcessing ? 'Käsitellään...' : `Maksa ${(totalAmount / 100).toFixed(2).replace('.', ',')} €`}
            </button>
        </form>
    );
};

interface PaymentViewProps {
    onPaymentSuccess: () => void;
    reason: string;
    documentId: string;
    role: 'sender' | 'recipient';
    email: string;
    signerId?: string;
    numSigners: number;
}

export const PaymentView: React.FC<PaymentViewProps> = ({ onPaymentSuccess, reason, documentId, role, email, signerId, numSigners }) => {
    const [clientSecret, setClientSecret] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [payForAll, setPayForAll] = useState(false);

    // We only recalculate intent if payForAll changes
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const secret = params.get('payment_intent_client_secret');
        const redirectStatus = params.get('redirect_status');

        if (secret && redirectStatus === 'succeeded') {
            // Maksu onnistui uudelleenohjauksen kautta (esim. Bancontact)
            onPaymentSuccess();
            return;
        } else if (secret && redirectStatus) {
            setError(`Maksu ei mennyt läpi (Tila: ${redirectStatus}). Lataa sivu uudelleen yrittääksesi uudestaan.`);
            return;
        }

        // Fetch Intent from Supabase Edge Function
        const fetchIntent = async () => {
            setClientSecret('');
            setError(null);
            try {
                const { data, error: funcError } = await supabase.functions.invoke('create-payment-intent', {
                    body: { documentId, role, email, signerId, payForAll }
                });

                if (funcError) throw new Error(funcError.message);
                if (data?.clientSecret) {
                    setClientSecret(data.clientSecret);
                } else {
                    throw new Error('Palvelin ei palauttanut maksutunnusta.');
                }
            } catch (err: any) {
                console.error('Failed to init payment:', err);
                setError(err.message || 'Maksuyhteyden alustaminen epäonnistui.');
            }
        };

        fetchIntent();
    }, [onPaymentSuccess, payForAll, documentId, role, email, signerId]);

    // Calculate total purely for UI consistency (real math is in backend)
    // Actually, in test mode the edge function returns 50 cents, but we display 1.49 for real feel
    const FEE_CENTS = 149; // 1.49 EUR for UI
    const totalAmount = (payForAll && role === 'sender') ? (1 + numSigners) * FEE_CENTS : FEE_CENTS;

    if (error) {
        return (
            <div className="container animate-fade-in">
                <div className="card">
                    <div style={{ color: 'red' }}>Virhe: {error}</div>
                </div>
            </div>
        );
    }

    if (!clientSecret) {
        return (
            <div className="container animate-fade-in">
                <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <div>Ladataan maksuvaihtoehtoja...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="container animate-fade-in">
            <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Vahvista maksu</h2>
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                    <CheckoutForm
                        onSuccess={onPaymentSuccess}
                        reason={reason}
                        totalAmount={totalAmount}
                        payForAll={payForAll}
                        setPayForAll={role === 'sender' ? setPayForAll : undefined}
                        numSigners={numSigners}
                        showPayForAllToggle={role === 'sender'}
                    />
                </Elements>
            </div>
        </div>
    );
};
