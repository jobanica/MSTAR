import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  addPortfolioItem,
  deletePortfolioItem,
  togglePortfolioItem,
  updateSiteContent,
} from "@/app/actions/data";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, Field, inputClass } from "@/components/FormField";
import type { Organization, PortfolioItem, SiteContent } from "@/lib/types";

export default async function WebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: orgData }, { data: contentData }, { data: portfolioData }] =
    await Promise.all([
      supabase.from("organizations").select("slug, name").maybeSingle(),
      supabase.from("site_content").select("*").maybeSingle(),
      supabase
        .from("portfolio_items")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
    ]);

  const org = orgData as Pick<Organization, "slug" | "name"> | null;
  const content = contentData as SiteContent | null;
  const portfolio = (portfolioData ?? []) as PortfolioItem[];

  const siteBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const sitePath = org?.slug ? `/s/${org.slug}` : null;
  const siteUrl = sitePath ? `${siteBase}${sitePath}` : null;

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Website</h1>
          <p className="mt-1 text-sm text-slate-500">
            Edit your public landing page. Changes go live instantly.
          </p>
        </div>
        {siteUrl && (
          <Link
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Visit site →
          </Link>
        )}
      </div>

      <ErrorNote message={error} />

      {/* Content */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold">Homepage content</h2>
        <p className="mb-4 text-xs text-slate-400">
          Leave a field blank to use the default text. Your logo, colors, and
          tagline are set under <Link href="/settings" className="text-teal-700 hover:underline">Settings → Branding</Link>.
        </p>
        <form action={updateSiteContent} className="space-y-4">
          <Field label="Hero headline">
            <input
              name="hero_headline"
              defaultValue={content?.hero_headline ?? ""}
              placeholder={org?.name ?? "Your shop name"}
              className={inputClass}
            />
          </Field>
          <Field label="Hero subheadline">
            <textarea
              name="hero_subheadline"
              rows={2}
              defaultValue={content?.hero_subheadline ?? ""}
              placeholder="Quality printing, done right. Track your order and talk to us anytime — no account needed."
              className={inputClass}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <Field label="About section title">
              <input
                name="about_title"
                defaultValue={content?.about_title ?? ""}
                placeholder="About us"
                className={inputClass}
              />
            </Field>
            <Field label="About section text">
              <textarea
                name="about_body"
                rows={4}
                defaultValue={content?.about_body ?? ""}
                placeholder="Tell customers who you are, your experience, turnaround times, and why they should print with you."
                className={inputClass}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="show_services" defaultChecked={content?.show_services ?? true} />
              Show services section
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="show_portfolio" defaultChecked={content?.show_portfolio ?? true} />
              Show portfolio section
            </label>
          </div>
          <SubmitButton>Save changes</SubmitButton>
        </form>
      </section>

      {/* Portfolio */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold">Portfolio — sample jobs</h2>
        <p className="mb-4 text-xs text-slate-400">
          Show off work you&apos;ve done. These appear in the &ldquo;Our work&rdquo; gallery
          on your site.
        </p>

        {portfolio.length > 0 && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-slate-200"
              >
                <div className="aspect-[4/3] w-full bg-slate-100">
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {item.category && (
                        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          {item.category}
                        </span>
                      )}
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {item.title}
                      </p>
                    </div>
                    {!item.is_published && (
                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        HIDDEN
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <form action={togglePortfolioItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="is_published" value={String(!item.is_published)} />
                      <SubmitButton
                        unstyled
                        spinner={false}
                        className="text-xs font-medium text-teal-700 hover:underline"
                      >
                        {item.is_published ? "Hide" : "Publish"}
                      </SubmitButton>
                    </form>
                    <form action={deletePortfolioItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <SubmitButton
                        unstyled
                        spinner={false}
                        pendingLabel="Deleting…"
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <form action={addPortfolioItem} className="space-y-4 rounded-xl border border-dashed border-slate-300 p-4">
          <p className="text-sm font-medium text-slate-700">Add a sample job</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <input name="title" required placeholder="e.g. 4x8 Tarpaulin — Birthday" className={inputClass} />
            </Field>
            <Field label="Category (optional)">
              <input name="category" placeholder="e.g. Large Format" className={inputClass} />
            </Field>
          </div>
          <Field label="Short description (optional)">
            <input name="description" placeholder="e.g. Full-color, eyelets, next-day turnaround" className={inputClass} />
          </Field>
          <Field label="Photo">
            <input
              name="image"
              type="file"
              accept="image/*"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-teal-700 hover:file:bg-teal-100"
            />
          </Field>
          <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or paste a link
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <Field label="Image URL">
            <input
              name="image_url"
              type="url"
              placeholder="https://example.com/photo.jpg"
              className={inputClass}
            />
          </Field>
          <p className="text-xs text-slate-400">
            Upload a photo or paste an image link — whichever is easier. (Right-click an
            image online → &ldquo;Copy image address&rdquo;.)
          </p>
          <SubmitButton>Add to portfolio</SubmitButton>
        </form>
      </section>
    </div>
  );
}
