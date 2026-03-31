import { selectAll } from "@/lib/db";

type QueueRow = {
  order_id: number;
  order_datetime: string;
  order_total: number;
  customer_id: number;
  customer_name: string;
  late_delivery_probability: number;
  predicted_late_delivery: number;
  prediction_timestamp: string;
};

export default function WarehousePriorityQueuePage() {
  let queue: QueueRow[] = [];
  let tableReady = true;

  try {
    queue = selectAll<QueueRow>(
      `SELECT
        o.order_id,
        o.order_datetime,
        o.order_total,
        c.customer_id,
        c.full_name AS customer_name,
        p.late_delivery_probability,
        p.predicted_late_delivery,
        p.prediction_timestamp
      FROM orders o
      JOIN customers c ON c.customer_id = o.customer_id
      JOIN order_predictions p ON p.order_id = o.order_id
      ORDER BY p.late_delivery_probability DESC, o.order_datetime ASC
      LIMIT 50`,
    );
  } catch {
    tableReady = false;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Warehouse Priority Queue</h2>
      <p className="mt-2 text-sm text-slate-600">
        This queue shows the 50 orders most likely to arrive late, ranked by
        the ML model's predicted late delivery probability. Warehouse staff
        should process higher-probability orders first to reduce delays.
      </p>

      <div className="mt-4">
        {!tableReady ? (
          <p className="mt-4 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
            ⚠️ No predictions available yet. Use the Run Scoring page to generate predictions.
          </p>
        ) : queue.length === 0 ? (
          <p className="mt-4 text-slate-600">
            No predictions found. Run scoring to populate this queue.
          </p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-600">
                <th className="py-2">Order ID</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Order Date</th>
                <th className="py-2">Total</th>
                <th className="py-2">Late Probability</th>
                <th className="py-2">Predicted Late</th>
                <th className="py-2">Scored At</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((row) => (
                <tr key={row.order_id} className="border-b hover:bg-slate-50">
                  <td className="py-2">#{row.order_id}</td>
                  <td className="py-2">{row.customer_name}</td>
                  <td className="py-2">{row.order_datetime}</td>
                  <td className="py-2">${row.order_total.toFixed(2)}</td>
                  <td className="py-2 font-medium text-red-600">
                    {(row.late_delivery_probability * 100).toFixed(1)}%
                  </td>
                  <td className="py-2">
                    {row.predicted_late_delivery === 1 ? "⚠️ Yes" : "✅ No"}
                  </td>
                  <td className="py-2 text-slate-500">{row.prediction_timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}