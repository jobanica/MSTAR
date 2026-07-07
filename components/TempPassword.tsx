"use client";

import { useEffect, useRef } from "react";
import { inputClass } from "@/components/FormField";

function generate() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Readable temp-password field with a Generate button (uncontrolled). */
export function TempPassword({ name = "password" }: { name?: string }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current && !ref.current.value) ref.current.value = generate();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={ref}
        name={name}
        type="text"
        required
        minLength={6}
        placeholder="Temp password"
        className={inputClass}
      />
      <button
        type="button"
        onClick={() => {
          if (ref.current) ref.current.value = generate();
        }}
        className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Generate
      </button>
    </div>
  );
}
