import type { ServiceArea } from "@/types";

/**
 * Mock service-area coverage for Mumbai.
 * Read only through `locationService`; never import this into components.
 */
export const serviceAreas: ServiceArea[] = [
  // South Mumbai
  { id: "colaba", name: "Colaba", zone: "South Mumbai", city: "Mumbai", pincodes: ["400005"], coordinates: { lat: 18.9067, lng: 72.8147 }, coverage: "supported" },
  { id: "fort", name: "Fort & Churchgate", zone: "South Mumbai", city: "Mumbai", pincodes: ["400001", "400020"], coordinates: { lat: 18.9322, lng: 72.8264 }, coverage: "supported" },
  { id: "tardeo", name: "Tardeo", zone: "South Mumbai", city: "Mumbai", pincodes: ["400034"], coordinates: { lat: 18.969, lng: 72.812 }, coverage: "supported" },

  // Central Mumbai
  { id: "lower-parel", name: "Lower Parel", zone: "Central Mumbai", city: "Mumbai", pincodes: ["400013"], coordinates: { lat: 18.9953, lng: 72.83 }, coverage: "supported" },
  { id: "worli", name: "Worli", zone: "Central Mumbai", city: "Mumbai", pincodes: ["400018", "400030"], coordinates: { lat: 19.01, lng: 72.818 }, coverage: "supported" },
  { id: "prabhadevi", name: "Prabhadevi", zone: "Central Mumbai", city: "Mumbai", pincodes: ["400025"], coordinates: { lat: 19.0166, lng: 72.8295 }, coverage: "supported" },
  { id: "dadar", name: "Dadar", zone: "Central Mumbai", city: "Mumbai", pincodes: ["400014", "400028"], coordinates: { lat: 19.0178, lng: 72.8478 }, coverage: "supported" },
  { id: "mahim", name: "Mahim", zone: "Central Mumbai", city: "Mumbai", pincodes: ["400016"], coordinates: { lat: 19.038, lng: 72.84 }, coverage: "supported" },
  { id: "matunga", name: "Matunga", zone: "Central Mumbai", city: "Mumbai", pincodes: ["400019"], coordinates: { lat: 19.027, lng: 72.857 }, coverage: "supported" },
  { id: "sion", name: "Sion", zone: "Central Mumbai", city: "Mumbai", pincodes: ["400022"], coordinates: { lat: 19.039, lng: 72.8619 }, coverage: "supported" },

  // Western Suburbs
  { id: "bandra-west", name: "Bandra West", zone: "Western Suburbs", city: "Mumbai", pincodes: ["400050"], coordinates: { lat: 19.0596, lng: 72.8295 }, coverage: "supported" },
  { id: "bandra-east", name: "Bandra East & BKC", zone: "Western Suburbs", city: "Mumbai", pincodes: ["400051"], coordinates: { lat: 19.0653, lng: 72.865 }, coverage: "supported" },
  { id: "khar-west", name: "Khar West", zone: "Western Suburbs", city: "Mumbai", pincodes: ["400052"], coordinates: { lat: 19.0718, lng: 72.8367 }, coverage: "supported" },
  { id: "santacruz-west", name: "Santacruz West", zone: "Western Suburbs", city: "Mumbai", pincodes: ["400054"], coordinates: { lat: 19.0843, lng: 72.836 }, coverage: "supported" },
  { id: "juhu", name: "Juhu", zone: "Western Suburbs", city: "Mumbai", pincodes: ["400049"], coordinates: { lat: 19.1075, lng: 72.8263 }, coverage: "supported" },
  { id: "andheri-west", name: "Andheri West", zone: "Western Suburbs", city: "Mumbai", pincodes: ["400053", "400058"], coordinates: { lat: 19.1364, lng: 72.8296 }, coverage: "supported" },
  { id: "versova", name: "Versova", zone: "Western Suburbs", city: "Mumbai", pincodes: ["400061"], coordinates: { lat: 19.131, lng: 72.815 }, coverage: "supported" },
  { id: "andheri-east", name: "Andheri East", zone: "Western Suburbs", city: "Mumbai", pincodes: ["400069", "400059", "400093"], coordinates: { lat: 19.1136, lng: 72.8697 }, coverage: "supported" },
  { id: "goregaon-west", name: "Goregaon West", zone: "Western Suburbs", city: "Mumbai", pincodes: ["400062", "400104"], coordinates: { lat: 19.1663, lng: 72.8526 }, coverage: "supported" },
  { id: "malad-west", name: "Malad West", zone: "Western Suburbs", city: "Mumbai", pincodes: ["400064"], coordinates: { lat: 19.1864, lng: 72.8485 }, coverage: "supported" },
  { id: "kandivali-west", name: "Kandivali West", zone: "Western Suburbs", city: "Mumbai", pincodes: ["400067"], coordinates: { lat: 19.2047, lng: 72.8526 }, coverage: "supported" },
  { id: "borivali-west", name: "Borivali West", zone: "Western Suburbs", city: "Mumbai", pincodes: ["400092"], coordinates: { lat: 19.2307, lng: 72.8567 }, coverage: "supported" },
  // Supported on paper, but no partner currently operates within range — exercises the "no vendors found" state.
  { id: "gorai", name: "Gorai", zone: "Western Suburbs", city: "Mumbai", pincodes: ["400091"], coordinates: { lat: 19.245, lng: 72.785 }, coverage: "supported" },

  // Eastern Suburbs
  { id: "kurla", name: "Kurla", zone: "Eastern Suburbs", city: "Mumbai", pincodes: ["400070"], coordinates: { lat: 19.0726, lng: 72.8845 }, coverage: "supported" },
  { id: "chembur", name: "Chembur", zone: "Eastern Suburbs", city: "Mumbai", pincodes: ["400071", "400089"], coordinates: { lat: 19.0522, lng: 72.9005 }, coverage: "supported" },
  { id: "ghatkopar", name: "Ghatkopar", zone: "Eastern Suburbs", city: "Mumbai", pincodes: ["400077", "400086"], coordinates: { lat: 19.079, lng: 72.908 }, coverage: "supported" },
  { id: "powai", name: "Powai", zone: "Eastern Suburbs", city: "Mumbai", pincodes: ["400076"], coordinates: { lat: 19.1176, lng: 72.906 }, coverage: "supported" },
  { id: "vikhroli", name: "Vikhroli", zone: "Eastern Suburbs", city: "Mumbai", pincodes: ["400079", "400083"], coordinates: { lat: 19.111, lng: 72.9279 }, coverage: "supported" },

  // Coming soon — Mumbai Metropolitan Region
  { id: "thane", name: "Thane", zone: "Thane", city: "Thane", pincodes: ["400601", "400602", "400604", "400606", "400607", "400610"], coordinates: { lat: 19.2183, lng: 72.9781 }, coverage: "coming_soon" },
  { id: "mulund", name: "Mulund", zone: "Eastern Suburbs", city: "Mumbai", pincodes: ["400080", "400081"], coordinates: { lat: 19.1726, lng: 72.9565 }, coverage: "coming_soon" },
  { id: "vashi", name: "Vashi", zone: "Navi Mumbai", city: "Navi Mumbai", pincodes: ["400703", "400705"], coordinates: { lat: 19.0771, lng: 72.9986 }, coverage: "coming_soon" },
  { id: "nerul", name: "Nerul", zone: "Navi Mumbai", city: "Navi Mumbai", pincodes: ["400706"], coordinates: { lat: 19.0338, lng: 73.0196 }, coverage: "coming_soon" },
  { id: "airoli", name: "Airoli", zone: "Navi Mumbai", city: "Navi Mumbai", pincodes: ["400708"], coordinates: { lat: 19.1551, lng: 72.9953 }, coverage: "coming_soon" },
  { id: "kharghar", name: "Kharghar", zone: "Navi Mumbai", city: "Navi Mumbai", pincodes: ["410210"], coordinates: { lat: 19.0473, lng: 73.0699 }, coverage: "coming_soon" },
  { id: "mira-road", name: "Mira Road", zone: "Mira–Bhayandar", city: "Mira–Bhayandar", pincodes: ["401107"], coordinates: { lat: 19.2813, lng: 72.8557 }, coverage: "coming_soon" },
  { id: "vasai", name: "Vasai", zone: "Vasai–Virar", city: "Vasai–Virar", pincodes: ["401201", "401202"], coordinates: { lat: 19.3919, lng: 72.8397 }, coverage: "coming_soon" },
  { id: "kalyan", name: "Kalyan", zone: "Kalyan–Dombivli", city: "Kalyan", pincodes: ["421301"], coordinates: { lat: 19.2403, lng: 73.1305 }, coverage: "coming_soon" },
  { id: "dombivli", name: "Dombivli", zone: "Kalyan–Dombivli", city: "Dombivli", pincodes: ["421201"], coordinates: { lat: 19.2183, lng: 73.0867 }, coverage: "coming_soon" },
];

/** Areas surfaced as quick picks in location inputs. */
export const popularAreaIds = ["bandra-west", "andheri-west", "powai", "lower-parel", "dadar", "chembur"];
