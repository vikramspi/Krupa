import { ServiceError } from "@/types";

export function getErrorMessage(error: unknown): string {
  if (error instanceof ServiceError) return error.message;
  return "Something went wrong on our side. Please try again.";
}

export function isServiceError(error: unknown, code?: ServiceError["code"]): error is ServiceError {
  return error instanceof ServiceError && (!code || error.code === code);
}
