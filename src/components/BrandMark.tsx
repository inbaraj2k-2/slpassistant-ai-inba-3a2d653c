type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className = "h-full w-full" }: BrandMarkProps) {
  return (
    <img
      src="/slp-header-logo.png"
      alt="SLP Assist AI"
      className={className}
      draggable={false}
    />
  );
}