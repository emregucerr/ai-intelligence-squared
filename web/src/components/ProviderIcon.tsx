import Image from "next/image";
import { PROVIDER_ICONS } from "@/lib/models";

interface ProviderIconProps {
  provider: string;
  size?: number;
  className?: string;
}

export function ProviderIcon({ provider, size = 32, className = "" }: ProviderIconProps) {
  const iconPath = PROVIDER_ICONS[provider];
  if (!iconPath) return null;

  return (
    <Image
      src={iconPath}
      alt={provider}
      width={size}
      height={size}
      className={`rounded-md ${className}`}
    />
  );
}
