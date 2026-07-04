import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "./board";
import type { KanbanStage, Order } from "@/lib/types";

export default async function KanbanPage() {
  const supabase = await createClient();

  const [{ data: stagesData }, { data: ordersData }] = await Promise.all([
    supabase.from("kanban_stages").select("*").order("sort_order"),
    supabase
      .from("orders")
      .select(
        "id, order_number, job_type, qty, rush, due_date, status, total_centavos, kanban_stage_id, customers(id, full_name, phone)",
      )
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const stages = (stagesData ?? []) as KanbanStage[];
  const orders = (ordersData ?? []) as unknown as Order[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Production Board</h1>
      <KanbanBoard stages={stages} orders={orders} />
    </div>
  );
}
