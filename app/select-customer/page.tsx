import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearActiveCustomerId,
  setActiveCustomerId,
} from "@/lib/customer-session";
import { selectAll } from "@/lib/db";

type Customer = {
  id: number;
  name: string;
  email: string;
};

async function chooseCustomer(formData: FormData) {
  "use server";
  const customerId = Number(formData.get("customerId"));
  if (Number.isInteger(customerId) && customerId > 0) {
    await setActiveCustomerId(customerId);
  }
  revalidatePath("/");
  redirect("/dashboard");
}

async function clearCustomerSelection() {
  "use server";
  await clearActiveCustomerId();
  revalidatePath("/");
}

export default function SelectCustomerPage() {
  const customers = selectAll<Customer>(
    "SELECT id, name, email FROM customers ORDER BY name ASC",
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Select Customer</h2>
        <form action={clearCustomerSelection}>
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            Clear Selection
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {customers.map((customer) => (
          <form
            key={customer.id}
            action={chooseCustomer}
            className="flex items-center justify-between rounded-md border border-slate-200 p-3"
          >
            <div>
              <p className="font-medium">{customer.name}</p>
              <p className="text-sm text-slate-600">{customer.email}</p>
            </div>
            <input type="hidden" name="customerId" value={customer.id} />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
            >
              Act as Customer
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
