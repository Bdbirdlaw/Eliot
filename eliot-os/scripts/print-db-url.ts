// Print the resolved Postgres connection string to stdout, for the build step.
//
// Used by the vercel-build script so that prisma generate / db push / seed see
// a DATABASE_URL even when the host injects it under a prefixed name such as
// Eliot_DATABASE_URL. Prints nothing if none is found, letting Prisma surface
// its own clear error.
import { resolveDatabaseUrl } from "../src/lib/db-url";

const url = resolveDatabaseUrl(process.env);
if (url) process.stdout.write(url);
