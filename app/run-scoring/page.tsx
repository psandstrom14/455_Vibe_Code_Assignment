import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runWarehouseScoring } from "@/lib/scoring";

async function scoreOrders() {
  "use server";
  const updatedCount = runWarehouseScoring();
  revalidatePath("/warehouse-priority-queue");
  revalidatePath("/order-history");
  redirect(`/run-scoring?updated=${updatedCount}`);
}

export default async function RunScoringPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const { updated } = await searchParams;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Run Scoring</h2>
      <p className="mt-2 text-slate-600">
        Recalculates priority for all NEW orders using amount + age.
      </p>
      <form action={scoreOrders} className="mt-4">
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
        >
          Run Scoring Now
        </button>
      </form>
      {updated ? (
        <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-sm">
          Updated {updated} queued order(s).
        </p>
      ) : null}
    </section>
  );
}
