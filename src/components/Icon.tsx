import type { IconName } from '@/lib/icons';

interface IconProps {
  name: IconName;
  /** Pixel size of the leaf. Below 28 the glyph loses detail. */
  size?: number;
  /** Only set when the icon is the sole content, so it needs a name. Otherwise it is decorative. */
  label?: string;
  className?: string;
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function Icon({ name, size = 28, label, className = '' }: IconProps) {
  return (
    // A plain <img>: these are small static files and the GitHub Pages base path is added by hand.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE_PATH}/icons/${name}.svg`}
      width={size}
      height={size}
      alt={label ?? ''}
      className={`inline-block flex-shrink-0 align-middle ${className}`}
    />
  );
}
