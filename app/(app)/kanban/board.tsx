"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { moveOrderToStage } from "@/app/actions/data";
import { formatCentavos, formatDate } from "@/lib/format";
import type { KanbanStage, Order } from "@/lib/types";

export function KanbanBoard({
  stages,
  orders,
}: {
  stages: KanbanStage[];
  orders: Order[];
}) {
  const [, startTransition] = useTransition();
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [optimisticOrders, applyMove] = useOptimistic(
    orders,
    (state, move: { orderId: string; stageId: string }) =>
      state.map((o) =>
        o.id === move.orderId ? { ...o, kanban_stage_id: move.stageId } : o,
      ),
  );

  const firstStageId = stages[0]?.id ?? null;

  function onDrop(stageId: string, e: React.DragEvent) {
    e.preventDefault();
    setDragOverStage(null);
    const orderId = e.dataTransfer.getData("text/order-id");
    if (!orderId) return;
    startTransition(async () => {
      applyMove({ orderId, stageId });
      await moveOrderToStage(orderId, stageId);
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const cards = optimisticOrders.filter(
          (o) => (o.kanban_stage_id ?? firstStageId) === stage.id,
        );
        return (
          <div
            key={stage.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stage.id);
            }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={(e) => onDrop(stage.id, e)}
            className={`flex w-64 shrink-0 flex-col rounded-xl border bg-slate-100/60 transition-colors ${
              dragOverStage === stage.id
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: stage.color_hex ?? "#94a3b8" }}
                />
                {stage.name}
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
                {cards.length}
              </span>
            </div>
            <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
              {cards.map((o) => (
                <div
                  key={o.id}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/order-id", o.id)
                  }
                  className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/orders/${o.id}`}
                      className="text-sm font-semibold text-indigo-600"
                    >
                      {o.order_number}
                    </Link>
                    {o.rush && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        RUSH
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {o.job_type} × {o.qty}
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-500">
                    {o.customers?.full_name}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Due {formatDate(o.due_date)}
                    </span>
                    <span className="font-medium">
                      {formatCentavos(o.total_centavos)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
