import React from 'react';
import TransactionDetailPanel, { type TransactionDetailData } from '@/components/TransactionDetailPanel';
import PayoutWithdrawalModal from '@/components/PayoutWithdrawalModal.tsx';
import PinModal from '@/components/PinModal.tsx';
import StatementExportModal from '@/components/StatementExportModal.tsx';
import AccountQrModal from './AccountQrModal.tsx';

export interface AccountModalsProps {
  businessId?: string;
  businessName?: string;
  qrModal: {
    isOpen: boolean;
    onClose: () => void;
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  detailPanel: {
    transaction: TransactionDetailData | null;
    onClose: () => void;
    onVerifySuccess: () => void;
  };
  payoutModal: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
  };
  pinModal: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (token: string) => Promise<void>;
    enabled: boolean;
  };
  exportModal: {
    isOpen: boolean;
    onClose: () => void;
  };
}

export const AccountModals: React.FC<AccountModalsProps> = ({
  businessId,
  businessName = '',
  qrModal,
  detailPanel,
  payoutModal,
  pinModal,
  exportModal,
}) => {
  return (
    <>
      {/* Scan to Transfer QR Modal */}
      <AccountQrModal
        isOpen={qrModal.isOpen}
        onClose={qrModal.onClose}
        businessName={businessName}
        bankName={qrModal.bankName}
        accountNumber={qrModal.accountNumber}
        accountName={qrModal.accountName}
      />

      {/* Transaction Classification Slide-Over */}
      <TransactionDetailPanel
        isOpen={Boolean(detailPanel.transaction)}
        onClose={detailPanel.onClose}
        transaction={detailPanel.transaction}
        onVerifySuccess={detailPanel.onVerifySuccess}
      />

      {/* Instant Payout Modal */}
      {businessId && (
        <PayoutWithdrawalModal
          isOpen={payoutModal.isOpen}
          onClose={payoutModal.onClose}
          businessId={businessId}
          onSuccess={payoutModal.onSuccess}
        />
      )}

      {/* Auto-Split Step-Up PIN Modal */}
      {businessId && (
        <PinModal
          isOpen={pinModal.isOpen}
          onClose={pinModal.onClose}
          onSuccess={pinModal.onSuccess}
          title="Confirm Auto-Split Update"
          description={`Enter your 4-digit transaction PIN to ${
            pinModal.enabled ? 'disable' : 'enable'
          } 7.5% tax auto-split.`}
        />
      )}

      {/* Statement Export Modal */}
      {businessId && (
        <StatementExportModal
          isOpen={exportModal.isOpen}
          onClose={exportModal.onClose}
          businessId={businessId}
          businessName={businessName}
        />
      )}
    </>
  );
};

export default AccountModals;
