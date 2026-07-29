export function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response as {
      data?: {
        message?: string | string[];
      };
    };

    const message = response.data?.message;
    if (Array.isArray(message)) return message.join(". ");
    if (typeof message === "string" && message.trim()) return message;
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}
