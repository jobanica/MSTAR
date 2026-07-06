"use client";

import { useState } from "react";
import { inputClass } from "@/components/FormField";

/** Password input with a show/hide toggle. */
export function PasswordField({
  name,
  required,
  placeholder,
  autoComplete,
}: {
  name: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${inputClass} pr-16`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-slate-500 hover:text-teal-700"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
