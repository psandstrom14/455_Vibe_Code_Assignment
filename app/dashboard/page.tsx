import Link from "next/link";
import { getActiveCustomerId } from "@/lib/customer-session";
import { selectOne } from "@/lib/db";

type Customer = {
  id: number;
  name: string;
  email: string;
};

type DashboardStats = {
  order_count: number;
  spent_cents: number;
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

  const customer = selectOne<Customer>(
    "SELECT id, name, email FROM customers WHERE id = ?",
    [customerId],
  );
  const stats = selectOne<DashboardStats>(
    "SELECT COUNT(*) as order_count, COALESCE(SUM(total_cents), 0) as spent_cents FROM orders WHERE customer_id = ?",
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
          <p className="text-2xl font-semibold">
            ${((stats?.spent_cents ?? 0) / 100).toFixed(2)}
          </p>
        </div>
      </div>
    </section>
  );
}
