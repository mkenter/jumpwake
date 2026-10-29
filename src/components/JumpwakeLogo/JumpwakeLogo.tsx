import clsx from 'clsx';
import styles from './JumpwakeLogo.module.css';

type JumpwakeLogoProps = {
  variant?: 'full' | 'compact';
  decorative?: boolean;
  className?: string | undefined;
};

// Custom serif outlines preserve the reference's tall lettering without fonts.
// The full and compact variants share this badge at exactly the same proportions.
function Badge() {
  return (
    <g data-part="badge">
      <g data-part="frame">
        <rect x="380" y="34" width="560" height="228" fill="#f5f4ef" />
        <path
          fill="#354248"
          fillRule="evenodd"
          d="M380 34H940V262H380ZM387 41V255H933V41Z"
        />
      </g>
      <g data-part="monogram" fill="#354248">
        <path d="M482 74H546V80C533 80 528 84 528 96V168C528 198 511 217 482 217C453 217 436 205 436 190C436 179 443 173 450 173C459 173 465 180 465 188C465 195 461 199 454 200C459 207 469 210 479 210C495 210 501 196 501 172V96C501 83 497 80 482 80Z" />
        <path d="M647 60H658L575 234H564Z" />
        <path d="M682 79H740V85C727 85 723 88 728 101L760 188L789 112L785 101C780 88 777 85 764 85V79H818V85C806 85 802 88 807 101L839 188L869 108C876 91 872 85 849 85V79H890V85C882 85 883 92 877 108L831 217H822L790 128L752 217H743L699 101C694 88 692 85 682 85Z" />
      </g>
    </g>
  );
}

// One wing is drawn explicitly, then reflected across the badge's centre.
// The closed plum curves form pointed leaves; the inner gold veins stay open.
function Wing() {
  return (
    <g data-part="wing">
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g stroke="#c59b6c">
          <path
            strokeWidth="7"
            d="M660 16H348C300 16 259 55 235 126V54M660 280H348C300 280 259 241 235 170V242"
          />
          <path
            strokeWidth="4.5"
            d="M353 73C326 82 305 103 292 124M353 223C326 214 305 193 292 172"
          />
        </g>
        <g stroke="#75566b" strokeWidth="6">
          <path d="M365 20C374 83 323 129 252 135C270 73 313 41 365 42Z" />
          <path d="M365 276C374 213 323 167 252 161C270 223 313 255 365 254Z" />
        </g>
      </g>
      <g data-part="star" fill="#c59b6c">
        <path d="M208 84C212 131 217 141 264 148C217 155 212 165 208 212C204 165 199 155 152 148C199 141 204 131 208 84Z" />
      </g>
      <g data-part="rays">
        <g fill="#75566b">
          <path d="M88 111L178 109Q183 112 178 115L88 113ZM88 183L178 181Q183 184 178 187L88 185Z" />
          <path d="M40 147L138 145Q143 148 138 151L40 149Z" />
        </g>
        <path
          fill="none"
          stroke="#c59b6c"
          strokeLinecap="round"
          strokeWidth="4"
          d="M60 130H158M60 166H158"
        />
        <circle cx="20" cy="148" r="9" fill="#c59b6c" />
      </g>
    </g>
  );
}

export function JumpwakeLogo({
  variant = 'full',
  decorative = false,
  className,
}: JumpwakeLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={variant === 'full' ? '0 0 1320 296' : '370 24 580 248'}
      className={clsx(styles.logo, className)}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'Jumpwake'}
      aria-hidden={decorative || undefined}
      focusable="false"
    >
      {!decorative && <title>Jumpwake J/W monogram</title>}
      {variant === 'full' && (
        <g data-part="ornament">
          <Wing />
          <g transform="translate(1320 0) scale(-1 1)">
            <Wing />
          </g>
        </g>
      )}
      <Badge />
    </svg>
  );
}
