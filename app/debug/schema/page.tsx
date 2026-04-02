import { selectAll } from "@/lib/db";

type ColumnRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
};

export default async function SchemaPage() {
  let columns: ColumnRow[] = [];
  let error: string | null = null;

  try {
    columns = await selectAll<ColumnRow>(
      `SELECT table_name, column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
       ORDER BY table_name, ordinal_position`,
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load schema.";
  }

  const byTable = columns.reduce<Record<string, ColumnRow[]>>((acc, row) => {
    if (!acc[row.table_name]) acc[row.table_name] = [];
    acc[row.table_name].push(row);
    return acc;
  }, {});

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>Database schema (Supabase Postgres)</h1>
      {error ? (
        <p style={{ color: "crimson" }}>{error}</p>
      ) : (
        Object.entries(byTable).map(([table, rows]) => (
          <div key={table} style={{ marginBottom: "2rem" }}>
            <h2 style={{ color: "#0070f3" }}>{table}</h2>
            <table border={1} cellPadding={6}>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Type</th>
                  <th>Nullable</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.column_name}>
                    <td>{c.column_name}</td>
                    <td>{c.data_type}</td>
                    <td>{c.is_nullable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
