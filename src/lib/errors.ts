export function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);

    if (code === "permission-denied") {
      return "Permission denied. Publish the latest firestore.rules in Firebase Console or run firebase deploy --only firestore:rules.";
    }
  }

  return error instanceof Error ? error.message : fallback;
}
