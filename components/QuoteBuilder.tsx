"use client";

import { useMemo, useState } from "react";
import { createQuote } from "@/app/actions/data";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, inputClass } from "@/components/FormField";
import { formatCentavos } from "@/lib/format";
import type { Service } from "@/lib/types";

type Row = {
  key: number;
  serviceId: string;
  name: string;
  qty: string;
  price: string; // pesos, as typed
};

let nextKey = 1;
const blankRow = (): Row => ({ key: nextKey++, serviceId: "", name: "", qty: "1", price: "" });

const toCentavos = (pesos: string) => Math.round((parseFloat(pesos) || 0) * 100);
const toQty = (q: string) => Math.max(parseInt(q, 10) || 0, 0);

export function QuoteBuilder({
  customers,
  departments,
  services,
  orgName,
}: {
  customers: { id: string; full_name: string }[];
  departments: { id: string; name: string }[];
  services: Service[];
  orgName: string;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [discount, setDiscount] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function pickService(key: number, serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    updateRow(key, {
      serviceId,
      ...(svc
        ? { name: svc.name, price: (svc.unit_price_centavos / 100).toFixed(2) }
        : {}),
    });
  }

  const lineItems = useMemo(
    () =>
      rows
        .filter((r) => r.name.trim())
        .map((r) => ({
          name: r.name.trim(),
          qty: toQty(r.qty) || 1,
          unit_price_centavos: toCentavos(r.price),
          unit: services.find((s) => s.id === r.serviceId)?.unit ?? null,
        })),
    [rows, services],
  );

  const subtotal = lineItems.reduce((s, i) => s + i.qty * i.unit_price_centavos, 0);
  const discountCentavos = toCentavos(discount);
  const total = Math.max(subtotal - discountCentavos, 0);

  const itemsPayload = JSON.stringify(
    lineItems.map(({ name, qty, unit_price_centavos }) => ({ name, qty, unit_price_centavos })),
  );
  const customerName = customers.find((c) => c.id === customerId)?.full_name ?? "—";

  return (
    <form
      action={createQuote}
      className="flex flex-col gap-6 lg:flex-row lg:items-start"
    >
      {/* ---- Left: builder ---- */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:min-w-0 lg:flex-1">
        <input type="hidden" name="items" value={itemsPayload} />

        <Field label="Customer">
          <select
            name="customer_id"
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className={inputClass}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </Field>

        {/* Line items */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Services / items</span>
            <button
              type="button"
              onClick={() => setRows((rs) => [...rs, blankRow()])}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              + Add service
            </button>
          </div>

          <div className="space-y-3">
            {rows.map((r, idx) => {
              const cents = toCentavos(r.price);
              const line = (toQty(r.qty) || 1) * cents;
              return (
                <div key={r.key} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-400">Item {idx + 1}</span>
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
                      onChange={(e) => pickService(r.key, e.target.value)}
                      className={`${inputClass} mt-2`}
                    >
                      <option value="">— Custom item —</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · ₱{(s.unit_price_centavos / 100).toLocaleString("en-PH")}
                          {s.unit ? ` ${s.unit}` : ""}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    value={r.name}
                    onChange={(e) => updateRow(r.key, { name: e.target.value })}
                    required
                    placeholder="Description (e.g. Tarpaulin 4x8)"
                    className={`${inputClass} mt-2`}
                  />

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-xs text-slate-500">Qty</span>
                      <input
                        type="number"
                        min={1}
                        value={r.qty}
                        onChange={(e) => updateRow(r.key, { qty: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-slate-500">Unit ₱</span>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={r.price}
                        onChange={(e) => updateRow(r.key, { price: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-slate-500">Line total</span>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium tabular-nums text-slate-700">
                        {formatCentavos(line)}
                      </div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Department">
            <select name="department_id" className={inputClass}>
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input name="due_date" type="date" className={inputClass} />
          </Field>
          <Field label="Valid until">
            <input
              name="valid_until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Discount (₱)">
          <input
            name="discount"
            type="number"
            step="0.01"
            min={0}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className={inputClass}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="rush" /> Rush job
        </label>

        <Field label="Notes">
          <textarea
            name="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </Field>

        <SubmitButton>Create quote</SubmitButton>
      </div>

      {/* ---- Right: live preview ---- */}
      <div className="lg:sticky lg:top-6 lg:w-[360px] lg:shrink-0 lg:self-start">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
            <span className="truncate text-sm font-bold text-slate-900">{orgName}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quotation</span>
          </div>

          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Bill to</p>
            <p className="text-sm font-semibold text-slate-800">{customerName}</p>
            {validUntil && (
              <p className="mt-1 text-xs text-slate-400">
                Valid until {new Date(validUntil).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            )}
          </div>

          <div className="px-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <span>Item</span>
              <span>Amount</span>
            </div>
            {lineItems.length === 0 ? (
              <p className="py-4 text-sm text-slate-400">Add a service to see it here.</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {lineItems.map((it, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{it.name}</p>
                      <p className="text-xs text-slate-400">
                        {it.qty} × {formatCentavos(it.unit_price_centavos)}
                        {it.unit ? ` / ${it.unit}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-slate-800">
                      {formatCentavos(it.qty * it.unit_price_centavos)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-1 space-y-1.5 border-t border-slate-100 px-5 py-4 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCentavos(subtotal)}</span>
            </div>
            {discountCentavos > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Discount</span>
                <span className="tabular-nums">- {formatCentavos(discountCentavos)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
              <span>Total</span>
              <span className="tabular-nums">{formatCentavos(total)}</span>
            </div>
          </div>

          {notes.trim() && (
            <p className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">{notes}</p>
          )}
        </div>
      </div>
    </form>
  );
}
