"use client";

import { useRef, useState } from "react";
import { inputClass } from "@/components/FormField";

const ROLES = ["operator", "designer", "sales", "admin"];

function generate() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Optional "create a login" block for the new-employee form. */
export function EmployeeLoginFields() {
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          name="create_login"
          checked={on}
          onChange={(e) => {
            setOn(e.target.checked);
            if (e.target.checked && ref.current && !ref.current.value) {
              ref.current.value = generate();
            }
          }}
        />
        Create a login for this employee
      </label>

      {on && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Role</span>
            <select name="login_role" defaultValue="operator" className={inputClass}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Temporary password</span>
            <div className="flex items-center gap-2">
              <input
                ref={ref}
                name="login_password"
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
          </label>
        </div>
      )}

      <p className="mt-2 text-xs text-slate-400">
        Uses the email above. They can sign in immediately and change the password
        later. Set their exact access by editing the role in{" "}
        <span className="font-medium">Users</span>.
      </p>
    </div>
  );
}
