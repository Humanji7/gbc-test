const SERVER_ONLY_IMPORT_ERROR =
  "Server-only modules cannot be imported from client-side code.";

if (typeof window !== "undefined") {
  throw new Error(SERVER_ONLY_IMPORT_ERROR);
}
