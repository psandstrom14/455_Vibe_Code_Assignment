import { redirect } from "next/navigation";
import { getActiveCustomerId } from "@/lib/customer-session";
import { selectAll, selectOne } from "@/lib/db";

type Customer = {
  id: number;
  name: string;
  email: string;
};

type DashboardStats = {
  order_count: number;
  total_value: number;
};

type RecentOrder = {
  order_id: number;
  order_timestamp: string;
  fulfilled: number;
  total_value: number;
};

export default async function DashboardPage() {
  const customerId = await getActiveCustomerId();
  if (!customerId) {
    redirect("/select-customer");
  }

  const customer = selectOne<Customer>(
    "SELECT id, name, email FROM customers WHERE id = ?",
    [customerId],
  );
  if (!customer) {
    redirect("/select-customer");
  }

  const stats = selectOne<DashboardStats>(
    `SELECT
      COUNT(*) as order_count,
      COALESCE(SUM(total_cents), 0) / 100.0 as total_value
    FROM orders
    WHERE customer_id = ?`,
    [customerId],
  );

  const recentOrders = selectAll<RecentOrder>(
    `SELECT
      id as order_id,
      created_at as order_timestamp,
      CASE WHEN status = 'FULFILLED' THEN 1 ELSE 0 END as fulfilled,
      total_cents / 100.0 as total_value
    FROM orders
    WHERE customer_id = ?
    ORDER BY created_at DESC
    LIMIT 5`,
    [customerId],
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Customer Dashboard</h2>
      <p className="mt-2 text-slate-700">
        {customer?.name} ({customer?.email})
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Orders</p>
          <p className="text-2xl font-semibold">{stats?.order_count ?? 0}</p>
        </div>
        <div className="rounded-md border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Spend</p>
          <p className="text-2xl font-semibold">${(stats?.total_value ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold">5 Most Recent Orders</h3>
        {recentOrders.length === 0 ? (
          <p className="mt-2 text-slate-600">No orders yet for this customer.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse rounded-md border border-slate-200 text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-3 py-2">Order ID</th>
                  <th className="px-3 py-2">Order Timestamp</th>
                  <th className="px-3 py-2">Fulfilled</th>
                  <th className="px-3 py-2">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.order_id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{order.order_id}</td>
                    <td className="px-3 py-2">
                      {new Date(order.order_timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{order.fulfilled ? "Yes" : "No"}</td>
                    <td className="px-3 py-2">${Number(order.total_value).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
