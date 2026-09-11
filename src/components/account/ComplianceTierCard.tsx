import React from 'react';
import { ShieldCheck } from 'lucide-react';

export interface ComplianceTierCardProps {
  businessName: string;
  bvnVerifiedAt?: string | null;
}

export const ComplianceTierCard: React.FC<ComplianceTierCardProps> = ({
  businessName,
  bvnVerifiedAt,
}) => {
  return (
    <div data-testid="compliance-tier-card" className="rounded-xl border border-gray-200/80 bg-white shadow-xs p-5 sm:p-6">
      <h3 className="text-sm font-bold text-gray-900 mb-3">Compliance &amp; Tier</h3>
      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
          <span className="text-gray-500">Business</span>
          <span className="font-semibold text-gray-900 truncate max-w-[150px]">{businessName}</span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
          <span className="text-gray-500">Identity (BVN)</span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            {bvnVerifiedAt ? 'Verified Tier 2' : 'Pending'}
          </span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-gray-500">Tax Status</span>
          <span className="font-semibold text-gray-800">FIRS Compliant</span>
        </div>
      </div>
    </div>
  );
};

export default ComplianceTierCard;
