// Persistent browser draft storage (localStorage + IndexedDB for PDF blobs)
// Protects user-filled contract fields, signer emails, and selected PDF files
// against accidental page reloads, tab closures, or browser crashes.

const UPLOAD_FORM_KEY = 'helppo_upload_form_draft_v1';
const TEMPLATE_DRAFT_PREFIX = 'helppo_template_draft_v1_';
const IDB_NAME = 'helppo_draft_storage_db';
const IDB_STORE = 'draft_files';
const IDB_PDF_KEY = 'current_upload_pdf';

export interface UploadFormDraft {
    sender: string;
    recipients: Array<{
        id: string;
        email: string;
    }>;
    updatedAt: number;
}

export function saveTemplateDraft(slug: string, values: Record<string, string>): void {
    try {
        localStorage.setItem(
            `${TEMPLATE_DRAFT_PREFIX}${slug}`,
            JSON.stringify({ values, updatedAt: Date.now() })
        );
    } catch {
        // Ignore quota errors in private browsing
    }
}

export function loadTemplateDraft(slug: string): { values: Record<string, string>; updatedAt: number } | null {
    try {
        const raw = localStorage.getItem(`${TEMPLATE_DRAFT_PREFIX}${slug}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.values === 'object' && parsed.values !== null) {
            return {
                values: parsed.values as Record<string, string>,
                updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
            };
        }
    } catch {
        // Ignore corrupted JSON
    }
    return null;
}

export function clearTemplateDraft(slug: string): void {
    try {
        localStorage.removeItem(`${TEMPLATE_DRAFT_PREFIX}${slug}`);
    } catch {
        // Ignore
    }
}

export function saveUploadFormDraft(draft: Omit<UploadFormDraft, 'updatedAt'>): void {
    try {
        localStorage.setItem(
            UPLOAD_FORM_KEY,
            JSON.stringify({ ...draft, updatedAt: Date.now() })
        );
    } catch {
        // Ignore
    }
}

export function loadUploadFormDraft(): UploadFormDraft | null {
    try {
        const raw = localStorage.getItem(UPLOAD_FORM_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return {
                sender: typeof parsed.sender === 'string' ? parsed.sender : '',
                recipients: Array.isArray(parsed.recipients) && parsed.recipients.length > 0
                    ? parsed.recipients
                    : [{ id: crypto.randomUUID(), email: '' }],
                updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
            };
        }
    } catch {
        // Ignore
    }
    return null;
}

function openDraftDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB not supported'));
            return;
        }
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function saveUploadFileDraft(file: File | null): Promise<void> {
    try {
        const db = await openDraftDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            if (!file) {
                store.delete(IDB_PDF_KEY);
            } else {
                store.put(
                    {
                        blob: file,
                        name: file.name,
                        type: file.type || 'application/pdf',
                        lastModified: file.lastModified || Date.now(),
                        savedAt: Date.now(),
                    },
                    IDB_PDF_KEY
                );
            }
            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error);
            };
        });
    } catch {
        // Fallback silently if IndexedDB is blocked
    }
}

export async function loadUploadFileDraft(): Promise<File | null> {
    try {
        const db = await openDraftDb();
        return await new Promise<File | null>((resolve) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const store = tx.objectStore(IDB_STORE);
            const req = store.get(IDB_PDF_KEY);
            req.onsuccess = () => {
                db.close();
                const res = req.result;
                if (!res || !res.blob) {
                    resolve(null);
                    return;
                }
                if (res.blob instanceof File) {
                    resolve(res.blob);
                } else if (res.blob instanceof Blob) {
                    resolve(new File([res.blob], res.name || 'sopimus.pdf', {
                        type: res.type || 'application/pdf',
                        lastModified: res.lastModified || Date.now(),
                    }));
                } else {
                    resolve(null);
                }
            };
            req.onerror = () => {
                db.close();
                resolve(null);
            };
        });
    } catch {
        return null;
    }
}

export async function clearAllUploadDrafts(): Promise<void> {
    try {
        localStorage.removeItem(UPLOAD_FORM_KEY);
    } catch {
        // Ignore
    }
    await saveUploadFileDraft(null);
}
