import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card.tsx';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useInvoiceStore } from '@/stores/invoice.store.ts';
import type { CreateInvoicePayload } from '@/types/index.ts';
import { getErrorMessage } from '@/lib/axios.ts';

interface LineRow {
  description: string;
  quantity: string; // keep as string while user is typing; coerce on submit
  unitPrice: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function money(n: number) {
  return Math.round(n * 100) / 100;
}

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const emptyLine = (): LineRow => ({ description: '', quantity: '1', unitPrice: '' });

export default function InvoiceForm() {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const fetchInvoice = useInvoiceStore((s) => s.fetchInvoice);
  const createInvoice = useInvoiceStore((s) => s.createInvoice);
  const updateInvoice = useInvoiceStore((s) => s.updateInvoice);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');

  const [issueDate, setIssueDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState(addDays(todayStr(), 14));
  const [vatRate, setVatRate] = useState('7.5');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  const [lines, setLines] = useState<LineRow[]>([emptyLine()]);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [notEditable, setNotEditable] = useState(false);

  // Load invoice when editing
  useEffect(() => {
    if (!biz || !isEdit || !id) return;
    setLoading(true);
    fetchInvoice(biz.id, id)
      .then((inv) => {
        if (!inv) {
          toast.error('Invoice not found');
          navigate('/invoices');
          return;
        }
        if (inv.status !== 'draft') {
          // Backend will refuse the update too, but we surface this up-front so
          // the user doesn't fill out the form just to hit a 409.
          setNotEditable(true);
        }
        setCustomerName(inv.customerName);
        setCustomerEmail(inv.customerEmail ?? '');
        setCustomerPhone(inv.customerPhone ?? '');
        setCustomerAddress(inv.customerAddress ?? '');
        setCustomerTaxId(inv.customerTaxId ?? '');
        setIssueDate(inv.issueDate.slice(0, 10));
        setDueDate(inv.dueDate.slice(0, 10));
        setVatRate(String(Number(inv.vatRate)));
        setDiscount(String(Number(inv.discount)));
        setNotes(inv.notes ?? '');
        setPaymentTerms(inv.paymentTerms ?? '');
        setLines(
          (inv.lines ?? []).map((l) => ({
            description: l.description,
            quantity: String(Number(l.quantity)),
            unitPrice: String(Number(l.unitPrice)),
          })),
        );
      })
      .finally(() => setLoading(false));
  }, [biz, id, isEdit, fetchInvoice, navigate]);

  // Live totals — mirrors the backend computeTotals exactly
  const totals = useMemo(() => {
    const rateN = Number(vatRate) || 0;
    const discountN = Number(discount) || 0;
    const subtotal = money(
      lines.reduce((sum, l) => {
        const q = Number(l.quantity) || 0;
        const u = Number(l.unitPrice) || 0;
        return sum + q * u;
      }, 0),
    );
    const taxable = Math.max(0, money(subtotal - discountN));
    const vatAmount = money((taxable * rateN) / 100);
    const total = money(taxable + vatAmount);
    return { subtotal, discount: discountN, vatRate: rateN, vatAmount, total };
  }, [lines, vatRate, discount]);

  const updateLine = (idx: number, patch: Partial<LineRow>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const validate = (): string | null => {
    if (!customerName.trim()) return 'Customer name is required';
    if (!issueDate || !dueDate) return 'Issue and due dates are required';
    if (new Date(dueDate) < new Date(issueDate)) return 'Due date cannot be before issue date';
    if (lines.length === 0) return 'Add at least one line item';
    for (const [i, l] of lines.entries()) {
      if (!l.description.trim()) return `Line ${i + 1}: description is required`;
      const q = Number(l.quantity);
      const u = Number(l.unitPrice);
      if (!Number.isFinite(q) || q <= 0) return `Line ${i + 1}: quantity must be greater than 0`;
      if (!Number.isFinite(u) || u < 0) return `Line ${i + 1}: unit price cannot be negative`;
    }
    const rateN = Number(vatRate);
    if (!Number.isFinite(rateN) || rateN < 0 || rateN > 100) return 'VAT rate must be between 0 and 100';
    const discountN = Number(discount);
    if (!Number.isFinite(discountN) || discountN < 0) return 'Discount cannot be negative';
    return null;
  };

  const buildPayload = (): CreateInvoicePayload => ({
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim() || undefined,
    customerPhone: customerPhone.trim() || undefined,
    customerAddress: customerAddress.trim() || undefined,
    customerTaxId: customerTaxId.trim() || undefined,
    issueDate,
    dueDate,
    vatRate: Number(vatRate),
    discount: Number(discount),
    notes: notes.trim() || undefined,
    paymentTerms: paymentTerms.trim() || undefined,
    lines: lines.map((l) => ({
      description: l.description.trim(),
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
    })),
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!biz) return;

    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setSaving(true);
    try {
      if (isEdit && id) {
        await updateInvoice(biz.id, id, buildPayload());
        toast.success('Invoice updated');
        navigate(`/invoices/${id}`);
      } else {
        const created = await createInvoice(biz.id, buildPayload());
        toast.success(`Invoice ${created.invoiceNumber} created`);
        navigate(`/invoices/${created.id}`);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!biz) return <p className="py-20 text-center text-gray-400">Select a business first.</p>;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading invoice...
      </div>
    );
  }

  if (notEditable) {
    return (
      <Card className="py-12 text-center">
        <p className="text-sm text-gray-600">
          This invoice is not in draft status and cannot be edited.
        </p>
        <Link
          to={`/invoices/${id}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to invoice
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to={isEdit ? `/invoices/${id}` : '/invoices'}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Invoice' : 'New Invoice'}
          </h1>
          <p className="mt-1 font-body text-sm text-gray-500">
            Totals are computed automatically. Saved as a draft — you can send it from the invoice page.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer */}
        <Card>
          <h2 className="mb-1 text-base font-semibold text-gray-900">Bill To</h2>
          <p className="mb-4 font-body text-xs text-gray-500">
            Add a WhatsApp number to send the invoice to your customer via WhatsApp.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Customer Name *"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              maxLength={200}
              required
            />
            <Input
              label="Email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              maxLength={200}
              placeholder="customer@example.com"
            />
            <Input
              label="WhatsApp / Phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              maxLength={30}
              placeholder="e.g. 08031234567 or +2348031234567"
            />
            <Input
              label="TIN"
              value={customerTaxId}
              onChange={(e) => setCustomerTaxId(e.target.value)}
              maxLength={50}
              placeholder="Tax Identification Number"
            />
            <div className="sm:col-span-2">
              <Input
                label="Address"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
        </Card>

        {/* Dates + VAT */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900">Dates & Tax</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Input
              label="Issue Date *"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
            <Input
              label="Due Date *"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={issueDate}
              required
            />
            <Input
              label="VAT Rate (%)"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
            />
            <Input
              label="Discount (₦)"
              type="number"
              step="0.01"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>
        </Card>

        {/* Line items */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Line Items</h2>
            <Button type="button" variant="secondary" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4" /> Add line
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, idx) => {
              const q = Number(line.quantity) || 0;
              const u = Number(line.unitPrice) || 0;
              const lineTotal = money(q * u);
              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 rounded-lg border border-gray-100 bg-gray-50/50 p-3 sm:gap-3"
                >
                  <div className="col-span-12 sm:col-span-6">
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Description
                    </label>
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(idx, { description: e.target.value })}
                      placeholder="e.g. Consulting services, hours 1-10"
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      maxLength={500}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-500">Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-right text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Unit price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-right text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2 flex flex-col justify-end">
                    <label className="mb-1 block text-xs font-medium text-gray-500 text-right">
                      Amount
                    </label>
                    <div className="flex items-center justify-end gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900">
                      <span className="truncate">{formatNaira(lineTotal)}</span>
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        disabled={lines.length === 1}
                        className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                        aria-label="Remove line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-sm space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatNaira(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount</span>
                  <span>-{formatNaira(totals.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>VAT ({totals.vatRate}%)</span>
                <span>{formatNaira(totals.vatAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{formatNaira(totals.total)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Notes + terms */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900">Notes & Terms</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Payment Terms</label>
              <textarea
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="e.g. Net 14. Pay to Access Bank acc 0123456789."
                className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Thank you for your business."
                className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(isEdit ? `/invoices/${id}` : '/invoices')}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {isEdit ? 'Save changes' : 'Create as draft'}
          </Button>
        </div>
      </form>
    </div>
  );
}
