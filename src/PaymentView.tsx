import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from './lib/supabase';

// Initialize Stripe. Uses Vite env var.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface CheckoutFormProps {
    onSuccess: () => void;
    reason: string;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ onSuccess, reason }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsProcessing(true);

        const { error } = await stripe.confirmPayment({
            elements,
            redirect: 'if_required', // Avoid full page redirect so we can continue our SPA flow
        });

        if (error) {
            setErrorMessage(error.message || 'Maksussa tapahtui virhe.');
            setIsProcessing(false);
        } else {
            // Payment successful
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                    Käsittelymaksu (3,00 €)
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    {reason}
                </p>
                <PaymentElement />
                {errorMessage && <div style={{ color: 'red', marginTop: '1rem', fontSize: '0.875rem' }}>{errorMessage}</div>}
            </div>
            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="btn btn-primary"
                style={{ width: '100%' }}
            >
                {isProcessing ? 'Käsitellään...' : 'Maksa 3,00 €'}
            </button>
        </form>
    );
};

interface PaymentViewProps {
    onPaymentSuccess: () => void;
    reason: string;
}

export const PaymentView: React.FC<PaymentViewProps> = ({ onPaymentSuccess, reason }) => {
    const [clientSecret, setClientSecret] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch Intent from Supabase Edge Function
        const fetchIntent = async () => {
            try {
                const { data, error: funcError } = await supabase.functions.invoke('create-payment-intent');

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
    }, []);

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
                    <CheckoutForm onSuccess={onPaymentSuccess} reason={reason} />
                </Elements>
            </div>
        </div>
    );
};
