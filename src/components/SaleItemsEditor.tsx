import { useMemo } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import type { SaleLineItem } from '@/types/index.ts';

interface SaleItemsEditorProps {
  items: SaleLineItem[];
  onChange: (items: SaleLineItem[]) => void;
  disabled?: boolean;
}

export default function SaleItemsEditor({
  items,
  onChange,
  disabled = false,
}: SaleItemsEditorProps) {
  const handleItemChange = (
    index: number,
    field: keyof SaleLineItem,
    value: string | number
  ) => {
    const updated = items.map((item, idx) => {
      if (idx !== index) return item;
      const next = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : Number(item.quantity);
        const price = field === 'unitPrice' ? Number(value) : Number(item.unitPrice);
        next.lineTotal = Math.round((qty * price) * 100) / 100;
      }
      return next;
    });
    onChange(updated);
  };

  const handleAddItem = () => {
    onChange([
      ...items,
      {
        name: '',
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0,
        sortOrder: items.length,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    const updated = items
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, sortOrder: idx }));
    onChange(updated);
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const line = Math.round((Number(item.quantity || 0) * Number(item.unitPrice || 0)) * 100) / 100;
      return Math.round((sum + line) * 100) / 100;
    }, 0);
  }, [items]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Package className="w-4 h-4 text-primary-500" />
          <span>Product Items ({items.length})</span>
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          disabled={disabled || items.length >= 50}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Item rows */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {items.map((item, index) => {
          const lineTotal = Math.round((Number(item.quantity || 0) * Number(item.unitPrice || 0)) * 100) / 100;
          return (
            <div
              key={index}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Product name (e.g. 50kg Bag of Rice)"
                  value={item.name}
                  onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                  disabled={disabled}
                  required
                  className="flex-1 min-w-0 text-sm px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={disabled}
                    className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={item.quantity === 0 ? '' : item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)
                    }
                    disabled={disabled}
                    required
                    className="w-full text-sm px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="col-span-4">
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                    Unit Price (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={item.unitPrice === 0 ? '' : item.unitPrice}
                    onChange={(e) =>
                      handleItemChange(index, 'unitPrice', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)
                    }
                    disabled={disabled}
                    required
                    className="w-full text-sm px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="col-span-4 text-right">
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                    Total
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    ₦{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Items total summary */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/50">
        <span className="text-xs font-medium text-primary-900 dark:text-primary-200">
          Total Amount:
        </span>
        <span className="text-base font-bold text-primary-700 dark:text-primary-300">
          ₦{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}
