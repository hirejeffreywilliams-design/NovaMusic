import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const databaseUrl = process.env.DATABASE_URL;

export const db = databaseUrl
  ? drizzle(databaseUrl, { schema })
  : (null as unknown as ReturnType<typeof drizzle<typeof schema>>);
