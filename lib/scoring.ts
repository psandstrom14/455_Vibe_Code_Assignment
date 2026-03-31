import "server-only";
import { runStatement, selectAll } from "@/lib/db";

type QueueOrder = {
  id: number;
  total_cents: number;
  created_at: string;
};

export function runWarehouseScoring() {
  const orders = selectAll<QueueOrder>(
    "SELECT id, total_cents, created_at FROM orders WHERE status = 'NEW'",
  );

  for (const order of orders) {
    const ageHours = Math.max(
      0,
      (Date.now() - new Date(order.created_at).getTime()) / 3_600_000,
    );
    const score = Number((order.total_cents / 1000 + ageHours * 2).toFixed(2));
    runStatement("UPDATE orders SET priority_score = ? WHERE id = ?", [
      score,
      order.id,
    ]);
  }

  return orders.length;
}
