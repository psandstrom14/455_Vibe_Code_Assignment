import Link from "next/link";

export default function Home() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Welcome to Student Shop</h2>
      <p className="mt-2 text-slate-600">
        Start by selecting a customer, then place orders and score the warehouse
        queue.
      </p>
      <Link
        href="/select-customer"
        className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
      >
        Go to Select Customer
      </Link>
    </section>
  );
}
