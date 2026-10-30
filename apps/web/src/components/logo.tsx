import type { SVGProps } from 'react';

/**
 * MIGO helmet mark, colored with theme tokens so it follows light and dark mode.
 * Keep the shapes in sync with `public/logo.svg`, the favicon.
 */
export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <path
        className="fill-primary"
        d="M4 32h8v4a20 20 0 0 0 20 20a20 20 0 0 0 20-20v-4h8v4a28 28 0 0 1-28 28a28 28 0 0 1-28-28z"
      />
      <g className="fill-highlight">
        <path d="M32 4C16.5 4 4 16.5 4 32h56C60 16.5 47.5 4 32 4z" />
        <path d="M6 22h52l6 6v4H0v-4z" />
        <circle cx="32" cy="5" r="5" />
      </g>
    </svg>
  );
}
