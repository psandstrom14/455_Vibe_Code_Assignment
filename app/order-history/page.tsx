import Link from "next/link";
import { getActiveCustomerId } from "@/lib/customer-session";
import { selectAll } from "@/lib/db";

type OrderRow = {
  order_id: number;
  order_datetime: string;
  order_total: number;
  item_count: number;
};

type OrderItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export default async function OrderHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string; order_id?: string }>;
}) {
  const { placed, order_id } = await searchParams;
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
    `SELECT o.order_id, o.order_datetime, o.order_total,
      COUNT(oi.order_item_id) as item_count
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.order_id
     WHERE o.customer_id = ?
     GROUP BY o.order_id
     ORDER BY o.order_datetime DESC`,
    [customerId],
  );

  const selectedOrder = order_id
    ? selectAll<OrderItem>(
        `SELECT p.product_name, oi.quantity, oi.unit_price, oi.line_total
         FROM order_items oi
         JOIN products p ON p.product_id = oi.product_id
         WHERE oi.order_id = ?`,
        [Number(order_id)],
      )
    : null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Order History</h2>
      {placed ? (
        <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Order placed successfully!
        </p>
      ) : null}

      <div className="mt-4 space-y-2">
        {orders.length === 0 ? (
          <p className="text-slate-600">No orders yet.</p>
        ) : (
          orders.map((order) => (
            <div key={order.order_id}>
              <Link
                href={`/order-history?order_id=${order.order_id}`}
                className="block rounded-md border border-slate-200 p-3 hover:bg-slate-50"
              >
                <p className="font-medium">Order #{order.order_id}</p>
                <p className="text-sm text-slate-600">{order.order_datetime}</p>
                <p className="text-sm">
                  {order.item_count} item(s) — ${order.order_total.toFixed(2)}
                </p>
              </Link>

              {order_id === String(order.order_id) && selectedOrder && (
                <div className="mt-1 rounded-md border border-slate-300 bg-slate-50 p-3">
                  <p className="mb-2 font-medium text-sm">Order Details</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-600">
                        <th className="py-1">Product</th>
                        <th className="py-1">Qty</th>
                        <th className="py-1">Unit Price</th>
                        <th className="py-1">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.map((item, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-1">{item.product_name}</td>
                          <td className="py-1">{item.quantity}</td>
                          <td className="py-1">${item.unit_price.toFixed(2)}</td>
                          <td className="py-1">${item.line_total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}