import {
  BedDouble,
  Footprints,
  Gem,
  Layers,
  Shirt,
  Sparkles,
  Waves,
  WashingMachine,
  Wind,
  Home,
  type LucideIcon,
} from "lucide-react";
import type { IconKey, ServiceCategory, ServiceOfferingId } from "@/types";

const iconMap: Record<IconKey, LucideIcon> = {
  "wash-fold": WashingMachine,
  "wash-iron": Shirt,
  ironing: Wind,
  "dry-cleaning": Sparkles,
  premium: Gem,
  bedsheet: BedDouble,
  blanket: Layers,
  shoes: Footprints,
  shirt: Shirt,
  household: Home,
  towel: Waves,
};

const offeringIconKey: Record<ServiceOfferingId, IconKey> = {
  "wash-fold": "wash-fold",
  "wash-iron": "wash-iron",
  ironing: "ironing",
  "dry-cleaning": "dry-cleaning",
  premium: "premium",
  bedsheets: "bedsheet",
  blankets: "blanket",
  shoes: "shoes",
};

export const categoryIconKey: Record<ServiceCategory, IconKey> = {
  everyday: "shirt",
  household: "household",
  specialty: "premium",
};

export function ServiceIcon({ icon, className }: { icon: IconKey; className?: string }) {
  const Icon = iconMap[icon];
  return <Icon className={className} aria-hidden="true" strokeWidth={1.75} />;
}

export function OfferingIcon({ offeringId, className }: { offeringId: ServiceOfferingId; className?: string }) {
  return <ServiceIcon icon={offeringIconKey[offeringId]} className={className} />;
}
