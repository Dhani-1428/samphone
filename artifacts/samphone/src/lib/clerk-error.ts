export function clerkErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const row = (err as { errors?: { longMessage?: string; message?: string }[] }).errors?.[0];
    if (row?.longMessage) return row.longMessage;
    if (row?.message) return row.message;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}
