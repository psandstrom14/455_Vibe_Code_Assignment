import Database from 'better-sqlite3';
import path from 'path';

export default function SchemaPage() {
  const db = new Database(path.join(process.cwd(), 'shop.db'), { readonly: true });

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as { name: string }[];

  const schema = tables.map((t) => {
    const columns = db.prepare(`PRAGMA table_info(${t.name})`).all() as {
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }[];
    return { table: t.name, columns };
  });

  db.close();

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>Database Schema — shop.db</h1>
      {schema.map((s) => (
        <div key={s.table} style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#0070f3' }}>{s.table}</h2>
          <table border={1} cellPadding={6}>
            <thead>
              <tr>
                <th>Column</th>
                <th>Type</th>
                <th>Not Null</th>
                <th>Primary Key</th>
              </tr>
            </thead>
            <tbody>
              {s.columns.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td>{c.type}</td>
                  <td>{c.notnull ? 'YES' : 'NO'}</td>
                  <td>{c.pk ? 'YES' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}