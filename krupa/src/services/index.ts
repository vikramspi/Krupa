/**
 * The service layer is the only seam between the UI and data.
 *
 * `customerService` and `orderService` call our own API routes, which talk to
 * Supabase. The catalogue services (vendors, services, areas, reviews) still read
 * from `src/data/` — see README "Before real customers".
 */
export { customerService, type SignInChallenge, type VerifyResult } from "./customerService";
export { locationService } from "./locationService";
export { orderService, DEMO_FAILURE_PHONE } from "./orderService";
export { reviewService } from "./reviewService";
export { serviceCatalog } from "./serviceCatalog";
export { vendorService } from "./vendorService";
