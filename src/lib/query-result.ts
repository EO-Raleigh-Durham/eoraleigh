export function requireQueryData<T>(
  result: { data: T[] | null; error: { message: string } | null },
  context: string,
): T[] {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  return result.data ?? [];
}
