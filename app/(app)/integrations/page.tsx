import { createClient } from "@/lib/supabase/server";
import { toggleIntegration } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import type { IntegrationSetting } from "@/lib/types";

const META: Record<string, { name: string; desc: string; icon: string }> = {
  facebook_messenger: { name: "Facebook Messenger", desc: "Reply to customer chats from Messenger", icon: "💬" },
  gcash_payment_link: { name: "GCash Payment Link", desc: "Send GCash payment links on invoices", icon: "📱" },
  maya_payment_link: { name: "Maya Payment Link", desc: "Send Maya payment links on invoices", icon: "💳" },
  google_drive: { name: "Google Drive", desc: "Back up order files to Drive", icon: "📁" },
  canva: { name: "Canva", desc: "Import designs straight from Canva", icon: "🎨" },
};

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("integration_settings")
    .select("*")
    .order("integration");
  const integrations = (data ?? []) as IntegrationSetting[];

  return (
    <>
      <PageHeader title="Integrations" breadcrumb={["Integrations"]} />

      <div className="max-w-3xl space-y-3">
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          Connect PrintOS to the tools you already use. These are configurable
          stubs — toggle one on to enable it for your shop.
        </p>

        {integrations.map((it) => {
          const meta = META[it.integration] ?? {
            name: it.integration,
            desc: "",
            icon: "🔌",
          };
          return (
            <div
              key={it.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-xl">
                  {meta.icon}
                </span>
                <div>
                  <div className="font-semibold text-slate-800">{meta.name}</div>
                  <div className="text-xs text-slate-400">{meta.desc}</div>
                </div>
              </div>
              <form action={toggleIntegration}>
                <input type="hidden" name="id" value={it.id} />
                <input type="hidden" name="is_enabled" value={String(!it.is_enabled)} />
                <SubmitButton
                  unstyled
                  spinner={false}
                  aria-pressed={it.is_enabled}
                  aria-label={`Toggle ${meta.name}`}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    it.is_enabled ? "bg-teal-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      it.is_enabled ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </SubmitButton>
              </form>
            </div>
          );
        })}
      </div>
    </>
  );
}
