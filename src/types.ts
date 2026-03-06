export interface SignatureData {
    file: File | null;
    sender: string;
    recipient: string;
    documentId?: string;
    fileName?: string;
    verifiedName?: string;
    role?: 'sender' | 'recipient';
    signerId?: string;
    allSigners?: any[];
    senderPaid?: boolean;
}
