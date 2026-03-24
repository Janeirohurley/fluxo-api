export function toPostgresCliConnectionString(databaseUrl: string) {
  const parsed = new URL(databaseUrl);

  parsed.searchParams.delete('schema');

  return parsed.toString();
}
