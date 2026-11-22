import { CHAPTER_NAME } from "@/kernel/config/chapter";

type LogoProps = {
  inverted?: boolean;
  size?: "sm" | "md" | "lg";
};

export function Logo({ inverted = false, size = "md" }: LogoProps) {
  const src = inverted ? "/logo/white.svg" : "/logo/primary.svg";
  const sizeClass =
    size === "sm" ? "eo-logo-img--sm" : size === "lg" ? "eo-logo-img--lg" : "";

  return (
    <img
      src={src}
      alt={CHAPTER_NAME}
      className={`eo-logo-img ${sizeClass}`.trim()}
    />
  );
}
