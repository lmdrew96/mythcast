"use node";

// Lazy Neo4j driver singleton for the graph layer (spec Section 9). Only
// ever imported from "use node" actions — the bolt protocol needs real TCP
// sockets, which the default Convex runtime doesn't provide.
//
// Credentials come from Convex's own environment variable store
// (`npx convex env set NEO4J_URI/NEO4J_USERNAME/NEO4J_PASSWORD`), read via
// process.env — NOT from .env.local, which only reaches the Next.js side
// and never reaches Convex's separate runtime.

import neo4j, { type Driver, type Session } from "neo4j-driver";

let driverInstance: Driver | null = null;

function getDriver(): Driver {
  if (driverInstance) return driverInstance;
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !username || !password) {
    throw new Error("NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD must be set on the Convex deployment (npx convex env set ...)");
  }
  driverInstance = neo4j.driver(uri, neo4j.auth.basic(username, password));
  return driverInstance;
}

function getDatabase(): string {
  return process.env.NEO4J_DATABASE ?? "neo4j";
}

/** Opens a session scoped to the configured database, runs `work`, and always closes it — the one place session lifecycle is handled so callers can't forget to close one. */
export async function withSession<T>(work: (session: Session) => Promise<T>): Promise<T> {
  const session = getDriver().session({ database: getDatabase() });
  try {
    return await work(session);
  } finally {
    await session.close();
  }
}
