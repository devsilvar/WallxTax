import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminUsers from '../AdminUsers';
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

const mockUsers = [
  {
    id: 'user-001',
    email: 'merchant1@example.com',
    role: 'user',
    isVerified: true,
    isActive: true,
    lastLoginAt: '2026-10-01T08:00:00.000Z',
    createdAt: '2026-09-01T00:00:00.000Z',
    _count: { businesses: 2 },
    autoPayoutEnabled: false,
  },
  {
    id: 'user-002',
    email: 'merchant2@example.com',
    role: 'user',
    isVerified: true,
    isActive: true,
    lastLoginAt: '2026-10-01T09:00:00.000Z',
    createdAt: '2026-08-15T00:00:00.000Z',
    _count: { businesses: 1 },
    autoPayoutEnabled: true,
  },
];

describe('AdminUsers Payout Mode Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({
      data: {
        data: mockUsers,
        pagination: { page: 1, limit: 15, total: 2, totalPages: 1, hasNext: false, hasPrev: false },
      },
    });
  });

  it('renders Payout Mode column with Automatic/Manual badges for each user account', async () => {
    render(
      <BrowserRouter>
        <AdminUsers />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('merchant1@example.com')).toBeDefined();
      expect(screen.getByText('merchant2@example.com')).toBeDefined();
    });

    // Payout Mode header should be in the table
    expect(screen.getByText('Payout Mode')).toBeDefined();

    // Verify badges and switch buttons are present
    expect(screen.getByText(/🔒 Manual/i)).toBeDefined();
    expect(screen.getByText(/⚡ Automatic/i)).toBeDefined();
  });

  it('toggles user account payout mode via PATCH /admin/users/:id/auto-payout', async () => {
    (api.patch as any).mockResolvedValue({
      data: { success: true, message: 'User payout mode updated' },
    });

    render(
      <BrowserRouter>
        <AdminUsers />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('merchant1@example.com')).toBeDefined();
    });

    // Find "To Auto" button for user-001 (which is currently Manual)
    const toAutoButtons = screen.getAllByText('To Auto');
    expect(toAutoButtons.length).toBeGreaterThan(0);

    fireEvent.click(toAutoButtons[0]);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/admin/users/user-001/auto-payout', {
        enabled: true,
      });
    });
  });
});
