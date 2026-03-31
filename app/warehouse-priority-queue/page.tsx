import { selectAll } from "@/lib/db";

type QueueRow = {
  id: number;
  customer_name: string;
  total_cents: number;
  priority_score: number;
  created_at: string;
};

export default function WarehousePriorityQueuePage() {
  const queue = selectAll<QueueRow>(
    `SELECT
      o.id,
      c.name as customer_name,
      o.total_cents,
      o.priority_score,
      o.created_at
    FROM orders o
    INNER JOIN customers c ON c.id = o.customer_id
    WHERE o.status = 'NEW'
    ORDER BY o.priority_score DESC, o.created_at ASC`,
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Warehouse Priority Queue</h2>
      <p className="mt-2 text-sm text-slate-600">
        Higher score means higher shipping priority.
      </p>

      <div className="mt-4 space-y-3">
        {queue.length === 0 ? (
          <p className="text-slate-600">No queued orders.</p>
        ) : (
          queue.map((order) => (
            <article key={order.id} className="rounded-md border border-slate-200 p-3">
              <p className="font-medium">
                Order #{order.id} - {order.customer_name}
              </p>
              <p className="text-sm">
                Total: ${(order.total_cents / 100).toFixed(2)} | Score:{" "}
                {order.priority_score.toFixed(2)}
              </p>
              <p className="text-sm text-slate-600">
                Created: {new Date(order.created_at).toLocaleString()}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
