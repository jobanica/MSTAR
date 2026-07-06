"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Direct-to-printer claim stub using Web Bluetooth + ESC/POS.
 *
 * Browsers cannot silently print to a Bluetooth printer through the normal
 * print dialog, so we speak to the printer directly: connect over BLE and
 * send raw ESC/POS commands (text + native QR). Once a printer has been
 * chosen, it is remembered and — when auto-print is on — the stub prints
 * itself on open with no dialog. Falls back to the system print dialog on
 * browsers without Web Bluetooth (e.g. iOS Safari).
 */

export type StubData = {
  shopName: string;
  shopPhone: string | null;
  orderNumber: string;
  customer: string;
  job: string;
  pickup: string | null;
  date: string;
  trackingUrl: string;
  footer: string;
  widthMm: number;
  autoPrint: boolean;
};

// Common service UUIDs exposed by cheap BT thermal printers.
const PRINTER_SERVICES: BluetoothServiceUUID[] = [
  0x18f0, 0xff00, 0xff02, 0xffe0, 0xffe5, 0x1101,
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "0000ff00-0000-1000-8000-00805f9b34fb",
];

const enc = new TextEncoder();
// Keep newlines (0x0a); replace only other non-printable / non-ASCII chars.
const ascii = (s: string) => s.replace(/[^\n\x20-\x7e]/g, "?");

function line(width: number) {
  return "-".repeat(width) + "\n";
}
function lr(label: string, value: string, width: number) {
  const gap = width - label.length - value.length;
  if (gap >= 1) return label + " ".repeat(gap) + value + "\n";
  return label + "\n" + value.padStart(width) + "\n";
}

/** Build the ESC/POS byte stream for the stub, including a native QR code. */
function buildEscPos(d: StubData): Uint8Array {
  const width = d.widthMm >= 80 ? 48 : 32;
  const bytes: number[] = [];
  const push = (...b: number[]) => bytes.push(...b);
  const text = (s: string) => bytes.push(...enc.encode(ascii(s)));

  push(0x1b, 0x40); // init
  push(0x1b, 0x61, 0x01); // center

  // Shop name — bold + double size
  push(0x1b, 0x45, 0x01); // bold on
  push(0x1d, 0x21, 0x11); // double width+height
  text(d.shopName + "\n");
  push(0x1d, 0x21, 0x00); // normal size
  push(0x1b, 0x45, 0x00); // bold off
  if (d.shopPhone) text(d.shopPhone + "\n");

  text(line(width));
  push(0x1b, 0x45, 0x01);
  text("CLAIM STUB\n");
  push(0x1b, 0x45, 0x00);

  // Details — left aligned
  push(0x1b, 0x61, 0x00);
  text(lr("Order", d.orderNumber, width));
  text(lr("Customer", d.customer, width));
  text(lr("Job", d.job, width));
  if (d.pickup) text(lr("Pickup", d.pickup, width));
  text(lr("Date", d.date, width));

  text(line(width));

  // QR code (native ESC/POS, model 2)
  push(0x1b, 0x61, 0x01); // center
  const qrData = enc.encode(d.trackingUrl);
  const size = d.widthMm >= 80 ? 8 : 6;
  push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00); // model 2
  push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size); // module size
  push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31); // error correction M
  const store = qrData.length + 3;
  push(0x1d, 0x28, 0x6b, store & 0xff, (store >> 8) & 0xff, 0x31, 0x50, 0x30, ...qrData);
  push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30); // print

  text("Scan to track your order\n");

  text(line(width));
  text(d.footer + "\n");

  push(0x1b, 0x64, 0x03); // feed 3 lines
  push(0x1d, 0x56, 0x00); // cut (ignored by printers without a cutter)

  return new Uint8Array(bytes);
}

async function findWritable(server: BluetoothRemoteGATTServer) {
  const services = await server.getPrimaryServices();
  for (const svc of services) {
    const chars = await svc.getCharacteristics();
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) return c;
    }
  }
  return null;
}

async function sendToDevice(device: BluetoothDevice, payload: Uint8Array) {
  const server = await device.gatt!.connect();
  const chr = await findWritable(server);
  if (!chr) throw new Error("No writable characteristic on this printer.");
  const chunk = 180;
  const withoutResponse = chr.properties.writeWithoutResponse;
  for (let i = 0; i < payload.length; i += chunk) {
    const slice = payload.slice(i, i + chunk);
    if (withoutResponse) await chr.writeValueWithoutResponse(slice);
    else await chr.writeValue(slice);
    await new Promise((r) => setTimeout(r, 20));
  }
  try {
    server.disconnect();
  } catch {}
}

export function BluetoothPrint({ data }: { data: StubData }) {
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const bt = () =>
    (typeof navigator !== "undefined" &&
      (navigator as Navigator & { bluetooth?: Bluetooth }).bluetooth) ||
    null;

  const printTo = useCallback(
    async (device: BluetoothDevice) => {
      setBusy(true);
      setStatus(`Printing to ${device.name ?? "printer"}…`);
      try {
        await sendToDevice(device, buildEscPos(data));
        setStatus(`Printed to ${device.name ?? "printer"} ✓`);
      } catch (e) {
        setStatus("Print failed: " + (e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [data],
  );

  const chooseAndPrint = useCallback(async () => {
    const b = bt();
    if (!b) return;
    setBusy(true);
    setStatus("Select your printer…");
    try {
      const device = await b.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES,
      });
      await printTo(device);
    } catch (e) {
      setStatus((e as Error).message.includes("cancel") ? "" : "Could not connect.");
      setBusy(false);
    }
  }, [printTo]);

  // On open: detect support and, if a printer was already paired and
  // auto-print is on, print immediately with no dialog.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const b = bt();
      if (!b) {
        setSupported(false);
        return;
      }
      if (!data.autoPrint || !b.getDevices) return;
      try {
        const devices = await b.getDevices();
        if (!cancelled && devices.length > 0) await printTo(devices[0]);
      } catch {
        /* getDevices unsupported — user prints manually */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data.autoPrint, printTo]);

  return (
    <div className="no-print mx-auto mt-6 w-full max-w-xs space-y-2">
      {supported ? (
        <button
          onClick={chooseAndPrint}
          disabled={busy}
          className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60"
        >
          🖨 Print to Bluetooth printer
        </button>
      ) : (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
          This browser can&apos;t print directly to Bluetooth. Use Chrome on
          Android, or the system dialog below.
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => window.print()}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          System print dialog
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      {status && (
        <p className="text-center text-xs text-slate-500">{status}</p>
      )}
    </div>
  );
}
