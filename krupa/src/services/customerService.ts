/**
 * customerService — sign-in, profile and saved addresses.
 *
 * Backed by real API routes; the session is a signed httpOnly cookie set after OTP
 * verification, so the browser holds no identity of its own.
 *
 *   register(input)                  → POST   /api/auth/register
 *   login(email, password)           → POST   /api/auth/login
 *   forgotPassword(email)            → POST   /api/auth/password/forgot
 *   resetPassword(token, password)   → POST   /api/auth/password/reset
 *   requestOtp(phone)                → POST   /api/auth/otp
 *   verifyOtp(phone, code, name?)    → POST   /api/auth/otp/verify      (sets the session cookie)
 *   getSession()                     → GET    /api/auth/session
 *   signOut()                        → DELETE /api/auth/session
 *   updateProfile(patch)             → PATCH  /api/customers/me
 *   saveAddress(address)             → POST   /api/customers/me/addresses
 *   deleteAddress(addressId)         → DELETE /api/customers/me/addresses/{id}
 */
import type { Customer, SavedAddress } from "@/types";
import { apiRequest } from "./apiClient";

export interface SignInChallenge {
  codeRequired: boolean;
  channel: "sms";
  expiresInMinutes: number;
  isExistingCustomer: boolean;
  hasName: boolean;
  /** True when no SMS provider is configured — the code is on the server console (development only). */
  devDelivery: boolean;
  /** Local development without SMS only — never sent in production. */
  devCode?: string;
}

export interface VerifyResult {
  customer: Customer;
  /** The customer has no name yet; collect one before continuing. */
  needsName: boolean;
}

export const customerService = {
  /** Creates an email account. It can't log in until the emailed link is clicked. */
  async register(input: { email: string; password: string; name: string }): Promise<{ message: string }> {
    return apiRequest<{ message: string }>("/api/auth/register", { method: "POST", body: JSON.stringify(input) });
  },

  async login(email: string, password: string): Promise<Customer> {
    const { customer } = await apiRequest<{ customer: Customer }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return customer;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>("/api/auth/password/forgot", { method: "POST", body: JSON.stringify({ email }) });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await apiRequest("/api/auth/password/reset", { method: "POST", body: JSON.stringify({ token, password }) });
  },

  async resendVerification(email: string): Promise<{ ok: true; message: string }> {
    return apiRequest("/api/auth/verify-email/resend", { method: "POST", body: JSON.stringify({ email }) });
  },

  async requestOtp(phone: string): Promise<SignInChallenge> {
    return apiRequest<SignInChallenge>("/api/auth/otp", { method: "POST", body: JSON.stringify({ phone }) });
  },

  /** Hands the MSG91 widget's access token to the server, which confirms it with MSG91. */
  async verifyWidgetToken(phone: string, accessToken: string, name?: string): Promise<VerifyResult> {
    return apiRequest<VerifyResult>("/api/auth/otp/widget", {
      method: "POST",
      body: JSON.stringify({ phone, accessToken, name }),
    });
  },

  async verifyOtp(phone: string, code: string, name?: string): Promise<VerifyResult> {
    return apiRequest<VerifyResult>("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code, name }),
    });
  },

  async getSession(): Promise<Customer | null> {
    const { customer } = await apiRequest<{ customer: Customer | null }>("/api/auth/session");
    return customer;
  },

  async signOut(): Promise<void> {
    await apiRequest("/api/auth/session", { method: "DELETE" });
  },

  async updateProfile(patch: { name: string }): Promise<Customer> {
    const { customer } = await apiRequest<{ customer: Customer }>("/api/customers/me", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    return customer;
  },

  async saveAddress(address: Omit<SavedAddress, "id"> & { id?: string }): Promise<SavedAddress> {
    const { address: saved } = await apiRequest<{ address: SavedAddress }>("/api/customers/me/addresses", {
      method: "POST",
      body: JSON.stringify(address),
    });
    return saved;
  },

  async deleteAddress(addressId: string): Promise<void> {
    await apiRequest(`/api/customers/me/addresses/${encodeURIComponent(addressId)}`, { method: "DELETE" });
  },
};
