export function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);

    if (code === "permission-denied" || code === "storage/unauthorized") {
      return "Permission denied. Publish the latest Firestore and Storage rules (firebase deploy --only firestore:rules,storage).";
    }
  }

  return error instanceof Error ? error.message : fallback;
}
