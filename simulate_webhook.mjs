import Stripe from 'stripe';
import crypto from 'crypto';

const webhookSecret = "whsec_p2Kr2fsjjhpZWwtGBvg42IUfXeDaMtIT";

// Simulated Event object based on what test-stripe fetched
const payload = {
    "id": "evt_3T93VbCZY5bhGlfS1rzDnq4J",
    "object": "event",
    "api_version": "2023-10-16",
    "created": 1741525574,
    "type": "payment_intent.succeeded",
    "data": {
        "object": {
            "id": "pi_3T93VbCZY5bhGlfS1tBwQx59",
            "object": "payment_intent",
            "amount": 100,
            "currency": "eur",
            "metadata": {
                "documentId": "9141a010-be77-47f0-a919-01e0fbd22a7f",
                "payForAll": "true",
                "role": "sender"
            },
            "status": "succeeded"
        }
    }
};

const payloadString = JSON.stringify(payload);

// generate signature
const timestamp = Math.floor(Date.now() / 1000);
const signedPayload = `${timestamp}.${payloadString}`;
const signature = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
const stripeSignatureHeader = `t=${timestamp},v1=${signature}`;

async function testWebhook() {
    console.log("Sending simulated webhook to production...");
    const res = await fetch("https://vjyugemmqwghvdmbcpek.supabase.co/functions/v1/stripe-webhook", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Stripe-Signature": stripeSignatureHeader
        },
        body: payloadString
    });

    const text = await res.text();
    console.log("Webhook logic responded with status:", res.status);
    console.log("Response Body:", text);
}

testWebhook();
