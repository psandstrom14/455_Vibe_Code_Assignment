import { selectAll } from "@/lib/db";

type QueueRow = {
  order_id: number;
  order_datetime: string;
  order_total: number;
  customer_name: string;
  predicted_is_fraud: number | null;
  is_fraud: number | null;
};

export default async function WarehousePriorityQueuePage() {
  let queue: QueueRow[] = [];
  let tableReady = true;

  try {
    queue = await selectAll<QueueRow>(
      `SELECT
        o.order_id,
        o.order_datetime,
        o.order_total,
        c.full_name AS customer_name,
        o.predicted_is_fraud,
        o.is_fraud
      FROM orders o
      JOIN customers c ON c.customer_id = o.customer_id
      WHERE o.predicted_is_fraud IS NOT NULL
      ORDER BY o.order_id DESC
      LIMIT 50`,
    );
  } catch {
    tableReady = false;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Fraud Review Queue</h2>
      <p className="mt-2 text-sm text-slate-600">
        This queue shows the latest 50 scored orders. Rows predicted as fraud
        are listed first to help your team review risky orders quickly.
      </p>

      <div className="mt-4">
        {!tableReady ? (
          <p className="mt-4 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
            No fraud predictions available yet. Use the Run Fraud Scoring page first.
          </p>
        ) : queue.length === 0 ? (
          <p className="mt-4 text-slate-600">
            No fraud predictions found. Run fraud scoring to populate this queue.
          </p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-600">
                <th className="py-2">Order ID</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Order Date</th>
                <th className="py-2">Total</th>
                <th className="py-2">Predicted Fraud</th>
                <th className="py-2">Actual Fraud Label</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((row) => (
                <tr key={row.order_id} className="border-b hover:bg-slate-50">
                  <td className="py-2">#{row.order_id}</td>
                  <td className="py-2">{row.customer_name}</td>
                  <td className="py-2">{row.order_datetime}</td>
                  <td className="py-2">${row.order_total.toFixed(2)}</td>
                  <td className="py-2">
                    {row.predicted_is_fraud === 1 ? "Yes" : "No"}
                  </td>
                  <td className="py-2 text-slate-500">
                    {row.is_fraud === null ? "Unknown" : row.is_fraud === 1 ? "Fraud" : "Not Fraud"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}