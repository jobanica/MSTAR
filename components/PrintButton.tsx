"use client";

/**
 * Print controls for the claim stub. On a phone paired with a Bluetooth
 * thermal printer, "Print" opens the system print dialog where the paired
 * printer (or an app like RawBT) can be selected.
 */
export function PrintButton() {
  return (
    <div className="no-print mx-auto mt-6 flex max-w-xs items-center justify-center gap-2">
      <button
        onClick={() => window.print()}
        className="flex-1 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-600"
      >
        🖨 Print claim stub
      </button>
      <button
        onClick={() => window.close()}
        className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Close
      </button>
    </div>
  );
}
