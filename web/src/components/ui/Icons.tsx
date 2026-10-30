/**
 * Tiny inline SVG icons (no icon library needed). All are 24x24, stroke-based,
 * and inherit the text colour. Each is decorative: the button that holds it
 * carries the accessible label.
 */
import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;

function Svg(props: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

export const MenuIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const CloseIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const SendIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Svg>
);

export const PlusIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const CopyIcon = (p: Props) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a1 1 0 0 1 1-1h10" />
  </Svg>
);

export const ShareIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
  </Svg>
);

export const ThumbUpIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M7 11v9M7 11l4-8a2 2 0 0 1 3 2l-1 4h5a2 2 0 0 1 2 2l-1.5 7a2 2 0 0 1-2 2H7M3 11h4v9H3z" />
  </Svg>
);

export const ThumbDownIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M17 13V4M17 13l-4 8a2 2 0 0 1-3-2l1-4H6a2 2 0 0 1-2-2l1.5-7a2 2 0 0 1 2-2H17M21 13h-4V4h4z" />
  </Svg>
);

export const EditIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M4 20h4l10-10-4-4L4 16v4zM13 7l4 4" />
  </Svg>
);

export const TrashIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Svg>
);

export const CheckIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M5 13l4 4L19 7" />
  </Svg>
);

export const RetryIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
  </Svg>
);

export const AlertIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </Svg>
);

export const InfoIcon = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M11 12h1v4h1" />
  </Svg>
);

export const PhoneIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </Svg>
);
