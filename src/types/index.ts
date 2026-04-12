export interface User {
  id: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Business {
  id: string;
  userId: string;
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
  transactionDate: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  businessId: string;
  category: string;
  description?: string;
  amount: number;
  expenseDate: string;
  receiptUrl?: string;
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
}

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

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
