import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { documentId, role, signerId, payForAll } = await req.json()
        console.log('[CONFIRM-PAYMENT] Called with:', { documentId, role, signerId, payForAll })

        if (!documentId || !role) {
            return new Response(JSON.stringify({ error: 'Missing documentId or role' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        if (role === 'sender') {
            if (payForAll) {
                // Fetch current signers, mark ALL as paid
                const { data: doc, error: fetchErr } = await supabase
                    .from('documents')
                    .select('signers')
                    .eq('id', documentId)
                    .single()

                if (fetchErr || !doc) {
                    console.error('[CONFIRM-PAYMENT] Failed to fetch doc:', fetchErr?.message)
                    return new Response(JSON.stringify({ error: 'Document not found' }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 404,
                    })
                }

                const updatedSigners = (doc.signers || []).map((s: any) => ({ ...s, paid: true }))
                console.log('[CONFIRM-PAYMENT] Marking all signers as paid:', updatedSigners.length)

                const { error: updateErr } = await supabase
                    .from('documents')
                    .update({ sender_paid: true, signers: updatedSigners })
                    .eq('id', documentId)

                if (updateErr) {
                    console.error('[CONFIRM-PAYMENT] DB update failed:', updateErr.message)
                    return new Response(JSON.stringify({ error: updateErr.message }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 500,
                    })
                }

                console.log('[CONFIRM-PAYMENT] SUCCESS: All signers marked paid for', documentId)
            } else {
                // Just mark sender as paid
                const { error } = await supabase
                    .from('documents')
                    .update({ sender_paid: true })
                    .eq('id', documentId)

                if (error) {
                    console.error('[CONFIRM-PAYMENT] sender_paid update failed:', error.message)
                } else {
                    console.log('[CONFIRM-PAYMENT] sender_paid set for', documentId)
                }
            }
        } else if (role === 'recipient' && signerId) {
            // Fetch and update just this signer
            const { data: doc, error: fetchErr } = await supabase
                .from('documents')
                .select('signers')
                .eq('id', documentId)
                .single()

            if (!fetchErr && doc && doc.signers) {
                const updatedSigners = doc.signers.map((s: any) =>
                    s.id === signerId ? { ...s, paid: true } : s
                )

                const { error } = await supabase
                    .from('documents')
                    .update({ signers: updatedSigners })
                    .eq('id', documentId)

                if (error) {
                    console.error('[CONFIRM-PAYMENT] signer update failed:', error.message)
                } else {
                    console.log('[CONFIRM-PAYMENT] Signer', signerId, 'marked paid')
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (err: any) {
        console.error('[CONFIRM-PAYMENT] Error:', err.message)
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
