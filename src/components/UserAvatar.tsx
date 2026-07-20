import { useState } from "react";
import { getInitials } from "@/lib/avatar";

interface Props {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  className?: string;
  alt?: string;
}

/**
 * Universal user avatar. Falls back to the user's initials when no image is
 * available or the image URL fails to load (e.g. an expired signed URL).
 */
export function UserAvatar({ src, name, email, className = "h-9 w-9", alt = "Profile" }: Props) {
  const [broken, setBroken] = useState(false);
  const showImg = !!src && !broken;
  const initials = getInitials(name, email);
  return (
    <div
      className={`grid place-items-center overflow-hidden rounded-xl bg-gradient-primary text-primary-foreground ${className}`}
      aria-label={alt}
    >
      {showImg ? (
        <img
          src={src as string}
          alt={alt}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
          draggable={false}
        />
      ) : (
        <span className="select-none text-sm font-semibold tracking-wide">
          {initials}
        </span>
      )}
    </div>
  );
}
