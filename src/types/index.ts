export interface User {
  id: string;
  email: string;
  phone?: string;
  bvn?: string;
  nin?: string;
  bvnVerifiedAt?: string;
  ninVerifiedAt?: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Business {
  id: string;
  userId: string;
  merchantId: string;
  businessName: string;
  ownerName: string;
  taxId?: string;
  businessType: string;
  address?: string;
  city?: string;
  state?: string;
  defaultProfitMargin?: number;
  taxReminderDay?: number;
  paystackCustomerCode?: string;
  virtualAccountNumber?: string;
  virtualAccountBank?: string;
  paystackSubaccountCode?: string;
  settlementBankCode?: string;
  settlementBankName?: string;
  settlementAccountNumber?: string;
  settlementAccountName?: string;
  platformCommissionPct?: number;
  settlementConnectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesTransaction {
  id: string;
  businessId: string;
  amount: number;
  source: string;
  status: string;
  referenceId?: string;
  description?: string;
  customerName?: string;
  customerHint?: string;
  finalClassification?: string;
  needsVerification?: boolean;
  verifiedAt?: string;
  isTaxable?: boolean;
  transactionDate: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  businessId: string;
  category: string;
  description?: string;
  amount: number;
  expenseDate: string;
  receiptUrl?: string;
  isDeductible: boolean;
  createdAt: string;
}

export interface TaxReport {
  id: string;
  businessId: string;
  taxMonth: string;
  totalSales: number;
  totalExpenses: number;
  grossProfit: number;
  taxRate: number;
  taxPayable: number;
  profitMargin: number;
  paymentStatus: PaymentStatus;
  isFinalized: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxPayment {
  id: string;
  businessId: string;
  taxReportId: string;
  amountPaid: number;
  paymentMethod: string;
  transactionReference: string;
  paymentStatus: PaymentStatus;
  paymentDate?: string;
  createdAt: string;
  remittanceStatus?: RemittanceStatus;
  firsRemittanceRef?: string | null;
  firsReceiptUrl?: string | null;
}

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export type RemittanceStatus = 'collected' | 'remitting' | 'remitted';

// ─── Invoices ───────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export type InvoicePaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'pos'
  | 'card'
  | 'mobile_money'
  | 'cheque'
  | 'online'
  | 'other';

export const INVOICE_PAYMENT_METHODS: ReadonlyArray<{
  value: InvoicePaymentMethod;
  label: string;
}> = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'pos', label: 'POS' },
  { value: 'card', label: 'Card' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
];

export function invoicePaymentMethodLabel(m: InvoicePaymentMethod | null | undefined): string | null {
  if (!m) return null;
  return INVOICE_PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;
}

export interface InvoiceLine {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
  sortOrder?: number;
}

export interface Invoice {
  id: string;
  businessId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  sentAt: string | null;
  paidAt: string | null;
  paymentMethod: InvoicePaymentMethod | null;

  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerTaxId: string | null;

  subtotal: number;
  vatRate: number;
  vatAmount: number;
  discount: number;
  total: number;
  currency: string;

  notes: string | null;
  paymentTerms: string | null;

  linkedSaleId: string | null;
  linkedSale?: SalesTransaction | null;

  lines?: InvoiceLine[];
  _count?: { lines: number };

  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoicePayload {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTaxId?: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  vatRate?: number;
  discount?: number;
  currency?: string;
  notes?: string;
  paymentTerms?: string;
  lines: Array<Pick<InvoiceLine, 'description' | 'quantity' | 'unitPrice'>>;
}

export type UpdateInvoicePayload = Partial<CreateInvoicePayload>;

export interface InvoiceListQuery {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface MarkInvoicePaidPayload {
  paymentMethod: InvoicePaymentMethod;
  paymentDate?: string;
}

export interface SendInvoiceWhatsAppResult {
  invoice: Invoice;
  /** wa.me URL the frontend should open in a new tab as desktop fallback. */
  waUrl: string;
  /** Pre-composed message body — used as the share text on mobile and the
   *  wa.me text param on desktop. */
  message: string;
  /** Public PDF URL (token-protected). Used on mobile as the file source for
   *  Web Share API, and on desktop as the link inside the WA message. */
  pdfUrl: string;
  /** E.164-style normalized phone the message will be addressed to — surfaced
   *  for analytics / debugging only; the wa.me link already encodes it. */
  to: string;
  /** The actual PDF file as a Blob for direct attachment in WhatsApp */
  pdfBlob: Blob | null;
  /** Filename for the PDF */
  filename: string;
}

// ─── Sales Import ───────────────────────────────────────────

export type SalesImportRowStatus =
  | 'valid'
  | 'invalid'
  | 'duplicate_in_file'
  | 'duplicate_in_db'
  | 'locked';

export interface SalesImportPreviewRow {
  rowNumber: number;
  status: SalesImportRowStatus;
  data?: {
    transactionDate: string;
    amount: number;
    source: string;
    customerName?: string;
    description?: string;
    referenceId?: string;
  };
  errors?: Array<{ field: string; message: string }>;
}

export interface SalesImportSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicateInFile: number;
  duplicateInDb: number;
  locked: number;
}

export interface SalesImportPreview {
  fileToken: string;
  summary: SalesImportSummary;
  rows: SalesImportPreviewRow[];
}

export interface SalesImportCommitResult {
  imported: number;
  skippedRaceDuplicates: number;
  skippedLockedAtCommit: number;
  invalidCount: number;
  duplicateInFileCount: number;
  duplicateInDbCount: number;
  lockedMonthCount: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
}

// Admin types
export interface AdminDashboardStats {
  totalUsers: number;
  totalBusinesses: number;
  totalTaxReports: number;
  totalRevenueProcessed: number;
  recentSignups: { id: string; email: string; createdAt: string }[];
}

export interface AdminUser {
  id: string;
  email: string;
  phone?: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { businesses: number };
}

export interface AdminUserDetail extends AdminUser {
  businesses: Business[];
}

export interface AdminBusiness {
  id: string;
  businessName: string;
  ownerName: string;
  taxId?: string;
  businessType: string;
  state?: string;
  city?: string;
  createdAt: string;
  user: { id: string; email: string };
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; email: string } | null;
}

// ─── Tax Analytics ──────────────────────────────────────────

export interface TaxAnalyticsSeriesPoint {
  taxMonth: string; // "YYYY-MM"
  totalSales: number;
  totalExpenses: number;
  grossProfit: number;
  taxPayable: number;
  profitMargin: number;
  paymentStatus: 'none' | 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  isFinalized: boolean;
  isLocked: boolean;
  reportId: string | null;
}

export interface TaxAnalyticsYoYMonth {
  month: number; // 1..12
  current: number | null;
  prior: number | null;
  deltaPct: number | null;
}

export interface TaxAnalyticsResponse {
  window: { from: string; to: string; monthsInRange: number };
  kpis: {
    totalTaxPaid: number;
    totalTaxOwed: number;
    reportsFiled: number;
    averageMonthlyTax: number;
    deltas: {
      totalTaxPaidPct: number | null;
      totalTaxOwedPct: number | null;
      reportsFiledPct: number | null;
    };
  };
  series: TaxAnalyticsSeriesPoint[];
  statusDistribution: { paid: number; pending: number; failed: number };
  yoy: null | {
    currentYear: number;
    priorYear: number;
    months: TaxAnalyticsYoYMonth[];
  };
}

// ─── Reminders ─────────────────────────────────────────────
export type ReminderType =
  | 'tax_deadline'
  | 'unfiled_tax'
  | 'unfinalized_report'
  | 'unpaid_tax'
  | 'margin_warning'
  | 'invoice_overdue'
  | 'payment_successful'
  | 'dva_received'
  | 'dva_validation_failed';

export type ReminderReferenceType = 'invoice' | 'payment' | 'sales_transaction' | 'business';

export interface Reminder {
  id: string;
  businessId: string;
  reminderType: ReminderType;
  scheduledDate: string;
  message: string;
  isSent: boolean;
  sentAt: string | null;
  createdAt: string;
  referenceType: ReminderReferenceType | null;
  referenceId: string | null;
}

// Returned by `GET /api/v1/banks`. Backs the BVN-validation bank dropdown on
// the Account page. `code` is the NIBSS clearing code Paystack expects as
// `bank_code` on `/customer/:code/identification`; `slug` is the identifier
// used elsewhere (e.g. `preferred_bank` on DVA creation). Server-side cache
// in `banks` table refreshes from Paystack every 24h.
export interface Bank {
  id: string;
  code: string;
  name: string;
  slug: string;
  longCode: string | null;
  type: string | null;
  active: boolean;
}
