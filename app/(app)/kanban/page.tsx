import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "./board";
import type { KanbanStage, Order } from "@/lib/types";

/**
 * Start of "today" in Philippine time (UTC+8, no DST), as a UTC instant.
 * Completed jobs only stay on the board until the end of the day they were
 * finished; after Manila midnight they drop off automatically.
 */
function manilaDayStartIso() {
  const nowMs = new Date().getTime();
  const manila = new Date(nowMs + 8 * 3_600_000);
  const startMs =
    Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth(), manila.getUTCDate()) -
    8 * 3_600_000;
  return new Date(startMs).toISOString();
}

export default async function KanbanPage() {
  const supabase = await createClient();
  const dayStart = manilaDayStartIso();

  const [{ data: stagesData }, { data: ordersData }] = await Promise.all([
    supabase.from("kanban_stages").select("*").order("sort_order"),
    supabase
      .from("orders")
      .select(
        "id, order_number, job_type, qty, rush, due_date, status, total_centavos, kanban_stage_id, customers(id, full_name, phone)",
      )
      .neq("status", "cancelled")
      // Keep every non-completed job; only show completed ones finished today.
      .or(`status.neq.completed,completed_at.gte.${dayStart}`)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const stages = (stagesData ?? []) as KanbanStage[];
  const orders = (ordersData ?? []) as unknown as Order[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Production Board</h1>
        <p className="mt-1 text-sm text-slate-500">
          Completed jobs clear from the board each day — they stay saved in{" "}
          <span className="font-medium">Orders</span>.
        </p>
      </div>
      <KanbanBoard stages={stages} orders={orders} />
    </div>
  );
}
