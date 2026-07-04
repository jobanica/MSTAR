"use client";

import { useState } from "react";
import { inputClass } from "@/components/FormField";
import type { Service } from "@/lib/types";

/**
 * Renders the job_type + qty + subtotal fields for the quote/order forms.
 * Picking a service fills job_type and computes subtotal = unit price × qty
 * automatically; the fields stay editable for custom jobs.
 */
export function ServicePicker({ services }: { services: Service[] }) {
  const [serviceId, setServiceId] = useState("");
  const [jobType, setJobType] = useState("");
  const [qty, setQty] = useState(1);
  const [subtotal, setSubtotal] = useState("");
  const [autoPrice, setAutoPrice] = useState(true);

  const selected = services.find((s) => s.id === serviceId) ?? null;

  function recompute(nextQty: number, svc: Service | null, auto: boolean) {
    if (auto && svc) {
      setSubtotal(((svc.unit_price_centavos * nextQty) / 100).toFixed(2));
    }
  }

  function onServiceChange(id: string) {
    setServiceId(id);
    const svc = services.find((s) => s.id === id) ?? null;
    if (svc) {
      setJobType(svc.name);
      setAutoPrice(true);
      setSubtotal(((svc.unit_price_centavos * qty) / 100).toFixed(2));
    }
  }

  return (
    <div className="space-y-4">
      {services.length > 0 && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Service{" "}
            <span className="font-normal text-slate-400">(auto-fills price)</span>
          </span>
          <select
            value={serviceId}
            onChange={(e) => onServiceChange(e.target.value)}
            className={inputClass}
          >
            <option value="">— Custom job —</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · ₱{(s.unit_price_centavos / 100).toLocaleString("en-PH")}
                {s.unit ? ` ${s.unit}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Job type</span>
        <input
          name="job_type"
          required
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
          placeholder="e.g. Tarpaulin 4x8"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Quantity</span>
          <input
            name="qty"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => {
              const q = parseInt(e.target.value, 10) || 1;
              setQty(q);
              recompute(q, selected, autoPrice);
            }}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Subtotal (₱)
          </span>
          <input
            name="subtotal"
            type="number"
            step="0.01"
            min={0}
            required
            value={subtotal}
            onChange={(e) => {
              setSubtotal(e.target.value);
              setAutoPrice(false); // manual override
            }}
            className={inputClass}
          />
        </label>
      </div>
      {selected && (
        <p className="text-xs text-slate-400">
          {qty} × ₱{(selected.unit_price_centavos / 100).toLocaleString("en-PH")} from{" "}
          <span className="font-medium">{selected.name}</span>
          {autoPrice ? "" : " (price edited manually)"}
        </p>
      )}
    </div>
  );
}
