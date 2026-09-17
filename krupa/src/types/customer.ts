export type AddressLabel = "Home" | "Work" | "Other";

export interface SavedAddress {
  id: string;
  label: AddressLabel;
  line1: string;
  line2: string;
  landmark?: string;
  areaId: string;
  areaName: string;
  pincode: string;
  city: string;
}

/**
 * An account reachable by phone, by email, or both. Accounts created through
 * different doors are separate — there is no linking/merge flow yet.
 */
export interface Customer {
  id: string;
  name: string;
  /** Present only once verified by OTP. Required before an order can be placed. */
  phone: string | null;
  /** Present only once the emailed verification link has been clicked. */
  email: string | null;
  emailVerified: boolean;
  addresses: SavedAddress[];
  memberSince: string;
}

export interface PlatformReview {
  id: string;
  author: string;
  area: string;
  rating: number;
  text: string;
  service: string;
}
