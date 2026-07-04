"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const STEPS = [
  { slug: "new", label: "Order received" },
  { slug: "design", label: "In design" },
  { slug: "revision", label: "Revision requested" },
  { slug: "approved", label: "Approved" },
  { slug: "sent_to_production", label: "Sent to production" },
  { slug: "printing", label: "Printing" },
  { slug: "done", label: "Done" },
  { slug: "ready", label: "Ready for pickup" },
  { slug: "completed", label: "Completed" },
];

type Order = {
  order_id: string;
  order_number: string;
  job_type: string;
  status: string;
  due_date: string | null;
  shop_name: string;
  customer_name: string;
};

type Msg = {
  content: string;
  is_customer: boolean;
  author: string;
  created_at: string;
};

const label = (s: string) =>
  s.split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

export default function TrackSearchPage() {
  const supabase = createClient();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discAmount, setDiscAmount] = useState("");
  const [discReason, setDiscReason] = useState("");
  const [discSent, setDiscSent] = useState(false);

  async function requestDiscount(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    const cents = Math.round((parseFloat(discAmount) || 0) * 100);
    const { data } = await supabase.rpc("public_request_discount", {
      p_order_id: order.order_id,
      p_phone: phone.trim(),
      p_amount_centavos: cents,
      p_reason: discReason.trim(),
    });
    if (data === true) {
      setDiscSent(true);
      setDiscAmount("");
      setDiscReason("");
    } else {
      setError("Couldn't submit your discount request. Please try again.");
    }
  }

  async function loadMessages(orderId: string, ph: string) {
    const { data } = await supabase.rpc("public_order_messages", {
      p_order_id: orderId,
      p_phone: ph,
    });
    setMessages((data ?? []) as Msg[]);
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("public_order_lookup", {
      p_order_number: orderNumber.trim(),
      p_phone: phone.trim(),
    });
    setLoading(false);
    const row = Array.isArray(data) ? (data[0] as Order | undefined) : undefined;
    if (err || !row) {
      setOrder(null);
      setError(
        "No matching order. Double-check the order number and the phone number you gave the shop.",
      );
      return;
    }
    setOrder(row);
    loadMessages(row.order_id, phone.trim());
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!order || !draft.trim()) return;
    setSending(true);
    const { data } = await supabase.rpc("public_post_message", {
      p_order_id: order.order_id,
      p_phone: phone.trim(),
      p_content: draft.trim(),
    });
    setSending(false);
    if (data === true) {
      setDraft("");
      loadMessages(order.order_id, phone.trim());
    } else {
      setError("Couldn't send your message. Please try again.");
    }
  }

  const currentIndex = order ? STEPS.findIndex((s) => s.slug === order.status) : -1;
  const cancelled = order?.status === "cancelled";

  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-50 p-6">
      <div className="mt-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="text-xl font-bold text-teal-700">PrintOS</div>
          <p className="text-sm text-slate-500">Track your order</p>
        </div>

        {!order && (
          <form
            onSubmit={search}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Order number
              </span>
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                required
                placeholder="e.g. ORD-2026-0001"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Phone number on file
              </span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="09xx xxx xxxx"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </label>
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              disabled={loading}
              className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
            >
              {loading ? "Searching…" : "Find my order"}
            </button>
          </form>
        )}

        {order && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs text-slate-400">{order.shop_name}</div>
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold text-slate-900">
                  {order.order_number}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    cancelled
                      ? "bg-red-100 text-red-700"
                      : order.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-teal-100 text-teal-800"
                  }`}
                >
                  {label(order.status)}
                </span>
              </div>
              <div className="mt-1 text-sm text-slate-500">{order.job_type}</div>
            </div>

            {!cancelled && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <ol className="space-y-3">
                  {STEPS.map((step, i) => {
                    const done = i < currentIndex;
                    const active = i === currentIndex;
                    return (
                      <li key={step.slug} className="flex items-center gap-3">
                        <span
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                            done
                              ? "bg-teal-600 text-white"
                              : active
                                ? "bg-teal-100 text-teal-800 ring-2 ring-teal-500"
                                : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {done ? "✓" : i + 1}
                        </span>
                        <span
                          className={`text-sm ${
                            active
                              ? "font-semibold text-slate-900"
                              : done
                                ? "text-slate-500"
                                : "text-slate-400"
                          }`}
                        >
                          {step.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">
                Messages &amp; revision requests
              </h2>
              <div className="mb-3 max-h-64 space-y-2 overflow-y-auto">
                {messages.length === 0 && (
                  <p className="text-sm text-slate-400">
                    No messages yet. Tell the shop what you&apos;d like changed.
                  </p>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      m.is_customer
                        ? "ml-8 bg-teal-50 text-slate-700"
                        : "mr-8 bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="mb-0.5 text-[11px] font-medium text-slate-400">
                      {m.is_customer ? "You" : m.author}
                    </div>
                    {m.content}
                  </div>
                ))}
              </div>
              <form onSubmit={send} className="space-y-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder="e.g. Please make the logo bigger and change the date to July 20"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
                <button
                  disabled={sending || !draft.trim()}
                  className="w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send message"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-sm font-semibold text-slate-800">
                Request a discount
              </h2>
              {discSent ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Your discount request was sent. The shop owner will review it.
                </p>
              ) : (
                <form onSubmit={requestDiscount} className="space-y-2">
                  <p className="text-xs text-slate-400">
                    Ask the shop for a discount on this order — the owner
                    reviews every request.
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={discAmount}
                      onChange={(e) => setDiscAmount(e.target.value)}
                      type="number"
                      step="0.01"
                      min={0}
                      required
                      placeholder="Amount ₱"
                      className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                    />
                    <input
                      value={discReason}
                      onChange={(e) => setDiscReason(e.target.value)}
                      placeholder="Reason (optional)"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                    />
                  </div>
                  <button
                    disabled={!discAmount}
                    className="w-full rounded-lg border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                  >
                    Request discount
                  </button>
                </form>
              )}
            </div>

            <button
              onClick={() => {
                setOrder(null);
                setMessages([]);
                setError(null);
                setDiscSent(false);
              }}
              className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              ← Look up a different order
            </button>
          </>
        )}

        <p className="text-center text-xs text-slate-400">Powered by PrintOS</p>
      </div>
    </div>
  );
}
