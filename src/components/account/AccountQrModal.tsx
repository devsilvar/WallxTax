import React, { lazy, Suspense } from 'react';
import { Copy, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import toast from 'react-hot-toast';

const QRCode = lazy(() => import('qrcode.react').then((m) => ({ default: m.QRCodeSVG })));

export interface AccountQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export const AccountQrModal: React.FC<AccountQrModalProps> = ({
  isOpen,
  onClose,
  businessName,
  bankName,
  accountNumber,
  accountName,
}) => {
  if (!isOpen || !accountNumber) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(`${bankName} - ${accountNumber}`);
    toast.success('Copied to clipboard');
  };

  return (
    <div
      data-testid="account-qr-modal"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <h3 className="text-base font-bold text-gray-900">Scan to Transfer</h3>
          <p className="text-xs text-gray-500 mt-0.5">Show this to a customer to receive an instant transfer</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-5 mb-5 border border-gray-100">
          <div className="bg-white p-4 rounded-lg flex flex-col items-center shadow-xs">
            <Suspense fallback={<Loader2 className="h-10 w-10 animate-spin text-gray-300 my-12" />}>
              <QRCode
                value={`Pay ${businessName}\nBank: ${bankName}\nAccount Number: ${accountNumber}\nAccount Name: ${accountName}`}
                size={170}
                level="M"
                marginSize={2}
              />
            </Suspense>
            <p className="text-center font-mono text-2xl font-bold text-gray-900 mt-4 tracking-widest tabular-nums">
              {accountNumber}
            </p>
            <p className="text-center text-xs text-gray-600 mt-1">
              {bankName} · <span className="font-semibold text-gray-900">{accountName}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1 text-xs" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5" /> Copy Details
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountQrModal;
