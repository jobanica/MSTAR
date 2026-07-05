"use client";

import { useState } from "react";
import { inputClass } from "@/components/FormField";
import { formatCentavos } from "@/lib/format";
import type { Service } from "@/lib/types";

type Row = {
  key: number;
  serviceId: string;
  description: string;
  qty: number;
  unit: string; // pesos, as typed
};

let counter = 1;
const newRow = (): Row => ({
  key: counter++,
  serviceId: "",
  description: "",
  qty: 1,
  unit: "",
});

/**
 * Repeatable line-item builder for a quote. Each row submits parallel
 * fields item_description / item_qty / item_unit (the server reads them
 * with formData.getAll). Picking a service fills description + price.
 */
export function QuoteItemsBuilder({ services }: { services: Service[] }) {
  const [rows, setRows] = useState<Row[]>([newRow()]);

  function update(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function onService(key: number, id: string) {
    const svc = services.find((s) => s.id === id);
    update(key, {
      serviceId: id,
      ...(svc
        ? { description: svc.name, unit: (svc.unit_price_centavos / 100).toFixed(2) }
        : {}),
    });
  }

  const lineTotal = (r: Row) =>
    Math.round((parseFloat(r.unit) || 0) * 100) * (r.qty || 0);
  const subtotal = rows.reduce((s, r) => s + lineTotal(r), 0);

  return (
    <div className="space-y-3">
      <span className="block text-sm font-medium text-slate-700">Jobs</span>

      {rows.map((r, i) => (
        <div key={r.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Job {i + 1}</span>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                Remove
              </button>
            )}
          </div>

          {services.length > 0 && (
            <select
              value={r.serviceId}
              onChange={(e) => onService(r.key, e.target.value)}
              className={`${inputClass} mb-2`}
            >
              <option value="">— Custom job —</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · ₱{(s.unit_price_centavos / 100).toLocaleString("en-PH")}
                  {s.unit ? ` ${s.unit}` : ""}
                </option>
              ))}
            </select>
          )}

          <input
            name="item_description"
            required
            value={r.description}
            onChange={(e) => update(r.key, { description: e.target.value })}
            placeholder="Description (e.g. Tarpaulin 4x8)"
            className={`${inputClass} mb-2`}
          />

          <div className="grid grid-cols-3 gap-2">
            <label className="block text-xs">
              <span className="mb-1 block text-slate-500">Qty</span>
              <input
                name="item_qty"
                type="number"
                min={1}
                value={r.qty}
                onChange={(e) => update(r.key, { qty: parseInt(e.target.value, 10) || 1 })}
                className={inputClass}
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block text-slate-500">Unit price (₱)</span>
              <input
                name="item_unit"
                type="number"
                step="0.01"
                min={0}
                required
                value={r.unit}
                onChange={(e) => update(r.key, { unit: e.target.value })}
                className={inputClass}
              />
            </label>
            <div className="text-xs">
              <span className="mb-1 block text-slate-500">Line total</span>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium">
                {formatCentavos(lineTotal(r))}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, newRow()])}
          className="rounded-lg border border-teal-600 px-3 py-1.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
        >
          + Add another job
        </button>
        <div className="text-sm">
          <span className="text-slate-500">Subtotal: </span>
          <span className="font-bold text-slate-900">{formatCentavos(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}
