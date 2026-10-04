import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminWithdrawals from '../AdminWithdrawals';
import api from '@/lib/axios';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockWithdrawals = [
  {
    id: 'req-001',
    businessId: 'biz-001',
    businessName: 'Apex Logistics Ltd',
    amount: 100000,
    fee: 250,
    netAmount: 99750,
    status: 'pending',
    isStale: false,
    destinationBankName: 'Guaranty Trust Bank',
    destinationAccountNum: '0123456789',
    destinationAccountName: 'APEX LOGISTICS LTD',
    transferReference: 'PO-20261001-A1B2C3',
    narration: 'October treasury withdrawal',
    failureReason: null,
    initiatedAt: '2026-10-01T08:00:00.000Z',
    completedAt: null,
    adminApprovedBy: null,
    adminApprovedAt: null,
    autoPayoutEnabled: false,
  },
  {
    id: 'req-002',
    businessId: 'biz-002',
    businessName: 'Kano Supermart',
    amount: 50000,
    fee: 150,
    netAmount: 49850,
    status: 'processing',
    isStale: false,
    destinationBankName: 'Zenith Bank',
    destinationAccountNum: '9876543210',
    destinationAccountName: 'KANO SUPERMART',
    transferReference: 'PO-20261001-D4E5F6',
    narration: 'Daily sales transfer',
    failureReason: null,
    initiatedAt: '2026-10-01T09:00:00.000Z',
    completedAt: null,
    adminApprovedBy: 'admin@paymytax.com',
    adminApprovedAt: '2026-10-01T09:05:00.000Z',
    autoPayoutEnabled: true,
  },
];

describe('AdminWithdrawals UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/admin/settlement/withdrawals')) {
        return Promise.resolve({
          data: {
            data: mockWithdrawals,
            pagination: { page: 1, limit: 20, total: 2, totalPages: 1, hasNext: false, hasPrev: false },
          },
        });
      }
      if (url.includes('/admin/dashboard')) {
        return Promise.resolve({
          data: {
            data: {
              withdrawalSla: { pendingCount: 1, breachedCount: 0, oldestPendingHours: 2 },
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders stacked withdrawal cards without horizontal scrolling table headers', async () => {
    render(
      <BrowserRouter>
        <AdminWithdrawals />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Apex Logistics Ltd')).toBeDefined();
      expect(screen.getByText('Kano Supermart')).toBeDefined();
    });

    // Check that Payout Mode badges are visible on each card
    expect(screen.getByText(/🔒 Manual Review/i)).toBeDefined();
    expect(screen.getByText(/⚡ Auto-Payout/i)).toBeDefined();

    // Check that View Details & Actions button is available for each item
    const detailButtons = screen.getAllByText(/View Details & Actions/i);
    expect(detailButtons.length).toBe(2);
  });

  it('opens comprehensive detail modal when View Details & Actions is clicked', async () => {
    render(
      <BrowserRouter>
        <AdminWithdrawals />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Apex Logistics Ltd')).toBeDefined();
    });

    const firstDetailBtn = screen.getAllByText(/View Details & Actions/i)[0];
    fireEvent.click(firstDetailBtn);

    // Verify detail modal opened with comprehensive sections
    await waitFor(() => {
      expect(screen.getByText('Financial Breakdown')).toBeDefined();
      expect(screen.getByText('Destination Bank Details')).toBeDefined();
      expect(screen.getByText('Audit & Reference')).toBeDefined();
      expect(screen.getByText('APEX LOGISTICS LTD')).toBeDefined();
      expect(screen.getByText('0123456789')).toBeDefined();
    });
  });

  it('displays payout mode as display-only badge without toggle buttons', async () => {
    render(
      <BrowserRouter>
        <AdminWithdrawals />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Apex Logistics Ltd')).toBeDefined();
    });

    // Check display-only status pills are rendered
    expect(screen.getByText(/Manual Review/i)).toBeDefined();
    expect(screen.getByText(/Auto-Payout/i)).toBeDefined();

    // Verify no toggle buttons exist on the page
    expect(screen.queryByText('To Auto')).toBeNull();
    expect(screen.queryByText('To Manual')).toBeNull();
    expect(screen.queryByText('Switch to Auto')).toBeNull();
    expect(screen.queryByText('Switch to Manual')).toBeNull();
  });
});
