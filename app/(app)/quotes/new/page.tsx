import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QuoteBuilder } from "@/components/QuoteBuilder";
import { ErrorNote } from "@/components/FormField";
import type { Service } from "@/lib/types";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [
    { data: customers },
    { data: departments },
    { data: servicesData },
    { data: org },
  ] = await Promise.all([
    supabase.from("customers").select("id, full_name").eq("is_active", true).order("full_name"),
    supabase.from("departments").select("id, name").eq("is_active", true).order("sort_order"),
    supabase.from("services").select("*").eq("is_active", true).order("name"),
    supabase.from("organizations").select("name").maybeSingle(),
  ]);
  const services = (servicesData ?? []) as Service[];

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">New Quote</h1>
      <ErrorNote message={error} />

      {(customers ?? []).length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You need a customer first.{" "}
          <Link href="/customers/new" className="font-medium underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <QuoteBuilder
          customers={(customers ?? []) as { id: string; full_name: string }[]}
          departments={(departments ?? []) as { id: string; name: string }[]}
          services={services}
          orgName={org?.name ?? "Your Shop"}
        />
      )}
    </div>
  );
}
