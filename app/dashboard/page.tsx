import Link from "next/link";
import { getActiveCustomerId } from "@/lib/customer-session";
import { selectOne, selectAll } from "@/lib/db";

type Customer = {
  customer_id: number;
  full_name: string;
  email: string;
};

type DashboardStats = {
  order_count: number;
  total_spend: number;
};

type RecentOrder = {
  order_id: number;
  order_datetime: string;
  order_total: number;
};

export default async function DashboardPage() {
  const customerId = await getActiveCustomerId();
  if (!customerId) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Customer Dashboard</h2>
        <p className="mt-2 text-slate-600">Select a customer to continue.</p>
        <Link
          href="/select-customer"
          className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
        >
          Select Customer
        </Link>
      </section>
    );
  }

  const customer = await selectOne<Customer>(
    "SELECT customer_id, full_name, email FROM customers WHERE customer_id = $1",
    [customerId],
  );

  const stats = await selectOne<DashboardStats>(
    "SELECT COUNT(*)::int AS order_count, COALESCE(SUM(order_total), 0)::float AS total_spend FROM orders WHERE customer_id = $1",
    [customerId],
  );

  const recentOrders = await selectAll<RecentOrder>(
    "SELECT order_id, order_datetime, order_total FROM orders WHERE customer_id = $1 ORDER BY order_datetime DESC LIMIT 5",
    [customerId],
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Customer Dashboard</h2>
      <p className="mt-2 text-slate-700">
        {customer?.full_name} ({customer?.email})
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Orders</p>
          <p className="text-2xl font-semibold">{stats?.order_count ?? 0}</p>
        </div>
        <div className="rounded-md border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Spend</p>
          <p className="text-2xl font-semibold">
            ${(stats?.total_spend ?? 0).toFixed(2)}
          </p>
        </div>
      </div>

      <h3 className="mt-6 font-semibold">5 Most Recent Orders</h3>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-600">
            <th className="py-2">Order ID</th>
            <th className="py-2">Date</th>
            <th className="py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {recentOrders.map((o) => (
            <tr key={o.order_id} className="border-b">
              <td className="py-2">{o.order_id}</td>
              <td className="py-2">{o.order_datetime}</td>
              <td className="py-2">${o.order_total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}