import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, selectAll } from "@/lib/db";
import { getActiveCustomerId } from "@/lib/customer-session";

type Product = {
  id: number;
  name: string;
  price_cents: number;
  stock: number;
};

async function createOrder(formData: FormData) {
  "use server";
  const customerIdRaw = formData.get("customerId");
  const customerId = Number(customerIdRaw);
  if (!Number.isInteger(customerId) || customerId <= 0) {
    redirect("/select-customer");
  }

  const db = getDb();
  const products = selectAll<Product>(
    "SELECT id, name, price_cents, stock FROM products ORDER BY name ASC",
  );

  const entries = products
    .map((product) => {
      const quantity = Number(formData.get(`qty-${product.id}`) ?? 0);
      const cleanQty = Number.isFinite(quantity)
        ? Math.max(0, Math.floor(quantity))
        : 0;
      return { product, quantity: Math.min(cleanQty, product.stock) };
    })
    .filter((entry) => entry.quantity > 0);

  if (entries.length === 0) {
    redirect("/place-order?error=1");
  }

  const create = db.transaction(() => {
    const totalCents = entries.reduce(
      (sum, entry) => sum + entry.quantity * entry.product.price_cents,
      0,
    );

    const orderResult = db
      .prepare("INSERT INTO orders (customer_id, status, total_cents) VALUES (?, 'NEW', ?)")
      .run(customerId, totalCents);
    const orderId = Number(orderResult.lastInsertRowid);

    const insertItem = db.prepare(
      "INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)",
    );
    const updateStock = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");

    for (const entry of entries) {
      insertItem.run(orderId, entry.product.id, entry.quantity, entry.product.price_cents);
      updateStock.run(entry.quantity, entry.product.id);
    }
  });

  create();
  revalidatePath("/dashboard");
  revalidatePath("/order-history");
  revalidatePath("/warehouse-priority-queue");
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

  const products = selectAll<Product>(
    "SELECT id, name, price_cents, stock FROM products ORDER BY name ASC",
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Place Order</h2>
      {error ? (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Choose at least one item quantity greater than 0.
        </p>
      ) : null}

      <form action={createOrder} className="mt-4 space-y-3">
        <input type="hidden" name="customerId" value={customerId} />
        {products.map((product) => (
          <div
            key={product.id}
            className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-4 sm:items-center"
          >
            <p className="font-medium sm:col-span-2">{product.name}</p>
            <p className="text-sm text-slate-600">
              ${ (product.price_cents / 100).toFixed(2) } | Stock: {product.stock}
            </p>
            <input
              type="number"
              name={`qty-${product.id}`}
              min={0}
              max={product.stock}
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
