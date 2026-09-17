export * from "./catalog";
export * from "./customer";
export * from "./location";
export * from "./order";
export * from "./vendor";

/** Standard shape for mock-service failures, so callers can render real error states. */
export class ServiceError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "unavailable" | "validation" | "network" | "unauthorised",
    /** The API's own, more specific code (e.g. "email_unverified"), when there is one. */
    readonly apiCode?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
