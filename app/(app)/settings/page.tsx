import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import {
  createDepartment,
  removeBrandLogo,
  toggleDepartment,
  toggleSmsSetting,
  updateBrandSettings,
  updateOrganization,
  uploadBrandLogo,
} from "@/app/actions/data";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, Field, inputClass } from "@/components/FormField";
import { statusLabel } from "@/lib/format";
import type { BrandSettings, Department, Organization, SmsSetting } from "@/lib/types";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: orgData }, { data: deptData }, { data: brandData }, { data: smsData }] =
    await Promise.all([
      supabase.from("organizations").select("*").maybeSingle(),
      supabase.from("departments").select("*").order("sort_order"),
      supabase.from("brand_settings").select("*").maybeSingle(),
      supabase.from("sms_settings").select("*").order("event_type"),
    ]);

  const org = orgData as Organization | null;
  const departments = (deptData ?? []) as Department[];
  const brand = brandData as BrandSettings | null;
  const smsSettings = (smsData ?? []) as SmsSetting[];

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <ErrorNote message={error} />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Shop information</h2>
        <form action={updateOrganization} className="space-y-4">
          <Field label="Shop name">
            <input name="name" defaultValue={org?.name ?? ""} required className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Contact email">
              <input name="contact_email" type="email" defaultValue={org?.contact_email ?? ""} className={inputClass} />
            </Field>
            <Field label="Contact phone">
              <input name="contact_phone" defaultValue={org?.contact_phone ?? ""} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Address">
              <input name="address" defaultValue={org?.address ?? ""} className={inputClass} />
            </Field>
            <Field label="City">
              <input name="city" defaultValue={org?.city ?? ""} className={inputClass} />
            </Field>
          </div>
          <SubmitButton>Save shop info</SubmitButton>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Departments</h2>
        <ul className="mb-4 divide-y divide-slate-100">
          {departments.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: d.color_hex ?? "#6366f1" }}
                />
                <span className={d.is_active ? "" : "text-slate-400 line-through"}>
                  {d.name}
                </span>
              </div>
              <form action={toggleDepartment}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="is_active" value={String(!d.is_active)} />
                <button className="text-xs font-medium text-slate-500 hover:text-teal-700">
                  {d.is_active ? "Deactivate" : "Activate"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createDepartment} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <Field label="New department">
              <input name="name" required placeholder="e.g. Digital Press" className={inputClass} />
            </Field>
          </div>
          <Field label="Color">
            <input name="color_hex" type="color" defaultValue="#6366f1" className="h-9 w-14 cursor-pointer rounded border border-slate-300" />
          </Field>
          <SubmitButton>Add</SubmitButton>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Branding</h2>

        {/* Logo upload */}
        <div className="mb-6 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Shop logo</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
              {brand?.logo_url ? (
                <Image
                  src={brand.logo_url}
                  alt="Shop logo"
                  width={80}
                  height={80}
                  unoptimized
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400">No logo</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <form action={uploadBrandLogo} className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  name="logo"
                  accept="image/*"
                  required
                  className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
                />
                <SubmitButton>Upload logo</SubmitButton>
              </form>
              {brand?.logo_url && (
                <form action={removeBrandLogo}>
                  <button className="text-xs font-medium text-red-600 hover:underline">
                    Remove logo
                  </button>
                </form>
              )}
              <p className="text-xs text-slate-400">
                PNG or JPG. Appears on your portal and documents.
              </p>
            </div>
          </div>
        </div>

        <form action={updateBrandSettings} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Primary color">
              <input name="primary_color" type="color" defaultValue={brand?.primary_color ?? "#6366f1"} className="h-9 w-full cursor-pointer rounded border border-slate-300" />
            </Field>
            <Field label="Secondary color">
              <input name="secondary_color" type="color" defaultValue={brand?.secondary_color ?? "#f1f5f9"} className="h-9 w-full cursor-pointer rounded border border-slate-300" />
            </Field>
          </div>
          <Field label="SMS sender name (max 11 chars)">
            <input name="sms_sender_name" maxLength={11} defaultValue={brand?.sms_sender_name ?? ""} className={inputClass} />
          </Field>
          <Field label="Portal tagline">
            <input name="portal_tagline" defaultValue={brand?.portal_tagline ?? ""} className={inputClass} />
          </Field>
          <Field label="Invoice footer">
            <input name="invoice_footer" defaultValue={brand?.invoice_footer ?? ""} placeholder="Thank you for your business!" className={inputClass} />
          </Field>
          <SubmitButton>Save branding</SubmitButton>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">SMS notifications</h2>
        <ul className="divide-y divide-slate-100">
          {smsSettings.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 text-sm">
              <span>{statusLabel(s.event_type)}</span>
              <form action={toggleSmsSetting}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="is_active" value={String(!s.is_active)} />
                <button
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    s.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {s.is_active ? "On" : "Off"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
