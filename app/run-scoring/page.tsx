import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exec } from "child_process";
import path from "path";

async function runScoring() {
  "use server";

  const scriptPath = path.join(process.cwd(), "jobs", "run_inference.py");

  const result = await new Promise<{ success: boolean; output: string; count: string }>((resolve) => {
    exec(
      `python3 ${scriptPath}`,
      { timeout: 60000, cwd: process.cwd() },
      (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, output: stderr || error.message, count: "0" });
          return;
        }
        // Parse count from stdout e.g. "Inference complete. Predictions written: 42"
        const match = stdout.match(/Predictions written:\s*(\d+)/);
        const count = match ? match[1] : "unknown";
        resolve({ success: true, output: stdout, count });
      }
    );
  });

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
      <h2 className="text-xl font-semibold">Run Scoring</h2>
      <p className="mt-2 text-slate-600">
        Triggers the Python inference script which scores all orders using the
        trained ML model and writes predictions into the database. After scoring,
        the Warehouse Priority Queue will update automatically.
      </p>

      <form action={runScoring} className="mt-4">
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
        >
          Run Scoring Now
        </button>
      </form>

      {status === "success" && (
        <div className="mt-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-medium">✅ Scoring complete!</p>
          <p>Orders scored: {count}</p>
          <p className="text-slate-500">Ran at: {timestamp}</p>
        </div>
      )}

      {status === "error" && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-medium">❌ Scoring failed</p>
          <p className="mt-1 font-mono text-xs whitespace-pre-wrap">
            {output ? decodeURIComponent(output) : "Unknown error"}
          </p>
          <p className="mt-1 text-slate-500">Ran at: {timestamp}</p>
        </div>
      )}
    </section>
  );
}