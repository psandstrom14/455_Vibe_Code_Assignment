import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { selectAll, withTransaction } from "@/lib/db";
import { getActiveCustomerId } from "@/lib/customer-session";

type Product = {
  product_id: number;
  product_name: string;
  price: number;
};

async function createOrder(formData: FormData) {
  "use server";
  const customerId = Number(formData.get("customerId"));
  if (!Number.isInteger(customerId) || customerId <= 0) {
    redirect("/select-customer");
  }

  const products = await selectAll<Product>(
    "SELECT product_id, product_name, price FROM products WHERE is_active = 1 ORDER BY product_name ASC",
  );

  const entries = products
    .map((product) => {
      const quantity = Number(formData.get(`qty-${product.product_id}`) ?? 0);
      const cleanQty = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
      return { product, quantity: cleanQty };
    })
    .filter((entry) => entry.quantity > 0);

  if (entries.length === 0) {
    redirect("/place-order?error=1");
  }

  await withTransaction(async (client) => {
    const orderTotal = entries.reduce(
      (sum, entry) => sum + entry.quantity * entry.product.price,
      0,
    );
    const orderSubtotal = orderTotal;
    const shippingFee = 5.99;
    const taxAmount = orderSubtotal * 0.08;
    const finalTotal = orderSubtotal + shippingFee + taxAmount;

    const orderResult = await client.query<{ order_id: number }>(
      `INSERT INTO orders
        (customer_id, order_datetime, payment_method, device_type, ip_country,
         promo_used, order_subtotal, shipping_fee, tax_amount, order_total)
        VALUES ($1, NOW(), 'credit_card', 'web', 'US', 0, $2, $3, $4, $5)
        RETURNING order_id`,
      [customerId, orderSubtotal, shippingFee, taxAmount, finalTotal],
    );

    const orderId = orderResult.rows[0].order_id;

    for (const entry of entries) {
      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total) VALUES ($1, $2, $3, $4, $5)",
        [
          orderId,
          entry.product.product_id,
          entry.quantity,
          entry.product.price,
          entry.quantity * entry.product.price,
        ],
      );
    }
  });
  revalidatePath("/dashboard");
  revalidatePath("/order-history");
  redirect("/order-history?placed=1");
}

export default async function PlaceOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const customerId = await getActiveCustomerId();
  if (!customerId) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Place Order</h2>
        <p className="mt-2 text-slate-600">Select a customer before placing an order.</p>
        <Link
          href="/select-customer"
          className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
        >
          Select Customer
        </Link>
      </section>
    );
  }

  const products = await selectAll<Product>(
    "SELECT product_id, product_name, price FROM products WHERE is_active = 1 ORDER BY product_name ASC",
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Place Order</h2>
      {error ? (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Choose at least one item with quantity greater than 0.
        </p>
      ) : null}

      <form action={createOrder} className="mt-4 space-y-3">
        <input type="hidden" name="customerId" value={customerId} />
        {products.map((product) => (
          <div
            key={product.product_id}
            className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-4 sm:items-center"
          >
            <p className="font-medium sm:col-span-2">{product.product_name}</p>
            <p className="text-sm text-slate-600">${product.price.toFixed(2)}</p>
            <input
              type="number"
              name={`qty-${product.product_id}`}
              min={0}
              defaultValue={0}
              className="rounded-md border border-slate-300 px-2 py-1"
            />
          </div>
        ))}
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
        >
          Submit Order
        </button>
      </form>
    </section>
  );
}