import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runStatement, selectAll } from "@/lib/db";

const FRAUD_API_URL = process.env.FRAUD_API_URL ?? "http://127.0.0.1:8787";

type ScoringRow = {
  order_id: number;
  order_datetime: string;
  billing_zip: string | null;
  shipping_zip: string | null;
  shipping_state: string | null;
  payment_method: string | null;
  device_type: string | null;
  ip_country: string | null;
  promo_used: number | null;
  promo_code: string | null;
  order_subtotal: number | null;
  shipping_fee: number | null;
  tax_amount: number | null;
  order_total: number | null;
  gender: string | null;
  city: string | null;
  customer_state: string | null;
  customer_zip: string | null;
  customer_segment: string | null;
  loyalty_tier: string | null;
  customer_is_active: number | null;
  num_items: number | null;
  line_count: number | null;
  order_hour: number | null;
  order_dow: number | null;
};

function normalizeFeatureValue(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  return value;
}

async function runScoring() {
  "use server";

  let result: { success: boolean; output: string; count: string } = {
    success: false,
    output: "Unknown scoring error.",
    count: "0",
  };

  try {
    const schemaResponse = await fetch(`${FRAUD_API_URL}/schema`, {
      cache: "no-store",
    });
    if (!schemaResponse.ok) {
      throw new Error(`Inference schema request failed (${schemaResponse.status}).`);
    }

    const schemaJson = (await schemaResponse.json()) as {
      inference_columns?: string[];
    };
    const inferenceColumns = schemaJson.inference_columns ?? [];
    if (inferenceColumns.length === 0) {
      throw new Error("Inference service returned no inference columns.");
    }

    const rows = await selectAll<ScoringRow>(
      `SELECT
        o.order_id,
        o.order_datetime,
        o.billing_zip,
        o.shipping_zip,
        o.shipping_state,
        o.payment_method,
        o.device_type,
        o.ip_country,
        o.promo_used,
        o.promo_code,
        o.order_subtotal,
        o.shipping_fee,
        o.tax_amount,
        o.order_total,
        c.gender,
        c.city,
        c.state AS customer_state, 
        c.zip_code AS customer_zip,
        c.customer_segment,
        c.loyalty_tier,
        c.is_active AS customer_is_active,
        COALESCE(agg.num_items, 0)::float AS num_items,
        COALESCE(agg.line_count, 0)::int AS line_count,
        EXTRACT(HOUR FROM o.order_datetime::timestamp)::integer AS order_hour,
EXTRACT(DOW FROM o.order_datetime::timestamp)::integer AS order_dow
      FROM orders o
      JOIN customers c ON c.customer_id = o.customer_id
      LEFT JOIN (
        SELECT order_id, SUM(quantity)::float AS num_items, COUNT(*)::int AS line_count
        FROM order_items
        GROUP BY order_id
      ) agg ON agg.order_id = o.order_id
      ORDER BY o.order_id DESC
      LIMIT 200`,
    );

    let scoredCount = 0;
    for (const row of rows) {
      const zipMismatch =
        row.billing_zip && row.shipping_zip && row.billing_zip !== row.shipping_zip ? 1 : 0;
      const rowFeatures: Record<string, unknown> = {
        ...row,
        zip_mismatch: zipMismatch,
      };

      const features = Object.fromEntries(
        inferenceColumns.map((column) => [
          column,
          normalizeFeatureValue(rowFeatures[column]),
        ]),
      );

      const predictResponse = await fetch(`${FRAUD_API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features }),
        cache: "no-store",
      });

      if (!predictResponse.ok) {
        const errorText = await predictResponse.text();
        throw new Error(`Predict failed for order ${row.order_id}: ${errorText}`);
      }

      const prediction = (await predictResponse.json()) as {
        is_fraud: number;
      };

      await runStatement("UPDATE orders SET predicted_is_fraud = $1 WHERE order_id = $2", [
        prediction.is_fraud,
        row.order_id,
      ]);
      scoredCount += 1;
    }

    result = {
      success: true,
      output: "Fraud scoring complete.",
      count: String(scoredCount),
    };
  } catch (error) {
    result = {
      success: false,
      output: error instanceof Error ? error.message : "Unknown scoring error.",
      count: "0",
    };
  }

  revalidatePath("/warehouse-priority-queue");

  if (result.success) {
    redirect(`/run-scoring?status=success&count=${result.count}`);
  } else {
    redirect(`/run-scoring?status=error&output=${encodeURIComponent(result.output)}`);
  }
}

export default async function RunScoringPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; count?: string; output?: string }>;
}) {
  const { status, count, output } = await searchParams;
  const timestamp = new Date().toLocaleString();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Run Fraud Scoring</h2>
      <p className="mt-2 text-slate-600">
        Scores all current orders using the fraud model and stores the binary
        prediction in <code>orders.predicted_is_fraud</code>. Historical truth
        labels in <code>orders.is_fraud</code> are not overwritten.
      </p>

      <form action={runScoring} className="mt-4">
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
        >
          Run Fraud Scoring Now
        </button>
      </form>

      {status === "success" && (
        <div className="mt-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-medium">Fraud scoring complete.</p>
          <p>Orders scored: {count}</p>
          <p className="text-slate-500">Ran at: {timestamp}</p>
        </div>
      )}

      {status === "error" && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-medium">Fraud scoring skipped.</p>
          <p className="mt-1 font-mono text-xs whitespace-pre-wrap">
            {output ? decodeURIComponent(output) : "Unknown error"}
          </p>
          <p className="mt-1 text-slate-500">Ran at: {timestamp}</p>
        </div>
      )}
    </section>
  );
}