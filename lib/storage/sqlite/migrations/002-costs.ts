import 'server-only';
export const costsMigration = `CREATE TABLE cost_events (id TEXT PRIMARY KEY, at TEXT NOT NULL, cost_usd REAL NOT NULL CHECK(cost_usd >= 0)); CREATE INDEX cost_month ON cost_events(at);`;
