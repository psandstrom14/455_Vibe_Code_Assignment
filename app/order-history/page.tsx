import Link from "next/link";
import { getActiveCustomerId } from "@/lib/customer-session";
import { selectAll } from "@/lib/db";

type OrderRow = {
  id: number;
  status: string;
  total_cents: number;
  priority_score: number;
  created_at: string;
  items: string;
};

export default async function OrderHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string }>;
}) {
  const { placed } = await searchParams;
  const customerId = await getActiveCustomerId();
  if (!customerId) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Order History</h2>
        <p className="mt-2 text-slate-600">Select a customer to view order history.</p>
        <Link
          href="/select-customer"
          className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
        >
          Select Customer
        </Link>
      </section>
    );
  }

  const orders = selectAll<OrderRow>(
    `SELECT
      o.id,
      o.status,
      o.total_cents,
      o.priority_score,
      o.created_at,
      COALESCE(
        GROUP_CONCAT(p.name || ' x' || oi.quantity, ', '),
        ''
      ) as items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE o.customer_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC`,
    [customerId],
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Order History</h2>
      {placed ? (
        <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Order placed successfully.
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {orders.length === 0 ? (
          <p className="text-slate-600">No orders yet.</p>
        ) : (
          orders.map((order) => (
            <article key={order.id} className="rounded-md border border-slate-200 p-3">
              <p className="font-medium">Order #{order.id}</p>
              <p className="text-sm text-slate-600">
                {new Date(order.created_at).toLocaleString()}
              </p>
              <p className="mt-1 text-sm">Status: {order.status}</p>
              <p className="text-sm">Items: {order.items || "None"}</p>
              <p className="text-sm">
                Total: ${(order.total_cents / 100).toFixed(2)} | Score:{" "}
                {order.priority_score.toFixed(2)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
