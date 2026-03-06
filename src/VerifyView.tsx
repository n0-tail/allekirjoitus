import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from './lib/supabase';

export const VerifyView = () => {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [docData, setDocData] = useState<any | null>(null);

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                if (!id) throw new Error('Virheellinen linkki.');

                const { data, error: dbError } = await supabase
                    .from('documents')
                    .select('id, sender_name, sender_email, signers, status, file_name, created_at, updated_at, document_hash, audit_trail')
                    .eq('id', id)
                    .single();

                if (dbError || !data) {
                    throw new Error('Asiakirjaa ei löytynyt tai tarkistuslinkki on vanhentunut.');
                }

                setDocData(data);
            } catch (err: any) {
                setError(err.message || 'Tapahtui tuntematon virhe.');
            } finally {
                setLoading(false);
            }
        };

        fetchDoc();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
                <p className="text-gray-500">Haetaan allekirjoitustietoja...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
                <div className="bg-red-50 text-red-600 p-6 rounded-2xl max-w-md w-full border border-red-100 text-center">
                    <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h2 className="text-xl font-bold mb-2">Tarkistus epäonnistui</h2>
                    <p>{error}</p>
                    <Link to="/" className="inline-block mt-6 text-emerald-600 hover:text-emerald-700 font-medium">
                        Palaa etusivulle
                    </Link>
                </div>
            </div>
        );
    }

    const isSigned = docData?.status === 'signed';
    const participants = [
        { name: docData?.sender_name, email: docData?.sender_email },
        ...(docData?.signers || []).map((s: any) => ({ name: s.name, email: s.email, signed: s.signed }))
    ];

    return (
        <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in relative z-10">
            <div className="text-center mb-10 mt-8">
                <p className="inline-block px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100/50 text-emerald-600 font-medium text-sm tracking-wide shadow-sm mb-4">
                    Todistuksen tarkistus (Aitoustodistus)
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
                    Validointiportaali
                </h1>
                <p className="text-lg text-slate-500 max-w-xl mx-auto">
                    Tarkista sähköisesti allekirjoitetun asiakirjan aitous ja tila.
                </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group hover:shadow-2xl hover:shadow-emerald-200/20 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative">
                    <div className="flex items-start justify-between sm:items-center flex-col sm:flex-row gap-4 mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Allekirjoituksen tila</h2>
                            <p className="text-sm text-slate-500 mt-1">ID: {docData?.id}</p>
                        </div>

                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium ${isSigned ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                            {isSigned ? (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Hyväksytty
                                </>
                            ) : (
                                <>
                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                    Odottaa allekirjoituksia
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6 mb-8">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tiedoston nimi</p>
                            <p className="text-slate-800 font-medium truncate" title={docData?.file_name}>
                                {docData?.file_name || 'Tuntematon asiakirja'}
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Laskettu SHA-256 Tiiviste</p>
                            <p className="text-slate-800 font-medium text-sm font-mono break-all line-clamp-2" title={docData?.document_hash || 'Ei vielä laskettu'}>
                                {docData?.document_hash || 'Lasketaan kun kaikki ovat allekirjoittaneet'}
                            </p>
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Osapuolet ({participants.length})
                    </h3>

                    <div className="space-y-3 mb-8">
                        {participants.map((p, idx) => {
                            // Hakee oikean audit trailin jos doc on signed
                            const auditLogEntry = (docData?.audit_trail || []).slice().reverse().find((a: any) => a.email === p.email);

                            return (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-800 flex items-center gap-2">
                                            {p.name || 'Nimi ei vielä vahvistettu'}
                                            {(idx === 0 || p.signed) && (
                                                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            )}
                                        </span>
                                        <span className="text-sm text-slate-500">{p.email}</span>
                                    </div>
                                    {auditLogEntry && (
                                        <div className="hidden sm:flex flex-col text-right">
                                            <span className="text-xs text-slate-400">IP: {auditLogEntry.ip}</span>
                                            <span className="text-xs text-slate-400">Tunnistus: {auditLogEntry.auth_method.replace("Vahva sähköinen tunnistautuminen (FTN)", "Vahva FTN")}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <Link to="/" className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group">
                            Takaisin palveluun
                            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
