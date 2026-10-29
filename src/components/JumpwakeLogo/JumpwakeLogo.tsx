import clsx from 'clsx';
import styles from './JumpwakeLogo.module.css';

type JumpwakeLogoProps = {
  variant?: 'full' | 'compact';
  decorative?: boolean;
  className?: string;
};

// Hand-drawn outlines keep the lettering independent of installed fonts.
// Both variants and the exported SVG assets use this same badge geometry.
function Badge() {
  return (
    <g data-part="badge">
      <g data-part="frame">
        <rect x="300" y="140" width="700" height="300" fill="#f5f4ef" />
        <path
          fill="#354248"
          fillRule="evenodd"
          d="M295 135H1005V445H295ZM305 145V435H995V145Z"
        />
      </g>
      <g data-part="monogram" fill="#354248">
        <path d="M444 217H500V222C487 222 483 226 483 238V315C483 346 468 364 443 364C421 364 407 354 407 339C407 329 412 324 418 324C425 324 430 329 430 336C430 343 426 345 421 346C424 353 431 357 440 357C453 357 461 344 461 321V239C461 226 458 222 444 222Z" />
        <path d="M642 202H652L568 388H558Z" />
        <path d="M680 217H738V222C725 222 721 225 725 237L760 331L792 250L787 237C783 226 780 222 769 222V217H825V222C812 222 807 225 811 237L847 332L879 245C886 228 882 222 861 222V217H908V222C895 222 891 228 884 245L839 365H830L796 262L756 365H747L699 238C694 225 692 222 680 222Z" />
      </g>
    </g>
  );
}

function CelestialStar({ transform }: { transform: string }) {
  return (
    <g transform={transform} fill="#c59b6c">
      <path d="M0-76Q5-23 14-12Q29-4 60 0Q29 4 14 12Q5 23 0 76Q-5 23-14 12Q-29 4-60 0Q-29-4-14-12Q-5-23 0-76Z" />
      <path fill="#ae865f" d="M0-76Q-5-23-14-12L0 0ZM0 76Q5 23 14 12L0 0Z" />
      <path fill="#d6af7e" d="M0 0L14-12Q29-4 60 0ZM0 0L-14 12Q-5 23 0 76Z" />
    </g>
  );
}

function Orbits() {
  return (
    <g data-part="orbits">
      {/* Filled Bézier ribbons taper to fine points, rather than uniform ellipses. */}
      <g fill="#75566b">
        <path d="M540 130C792 42 1067-5 1192 46C1285 84 1282 146 1193 224C1260 145 1263 96 1186 61C1064 6 794 54 540 130Z" />
        <path d="M197 275C270 225 365 178 465 141L470 145C367 184 274 233 201 282Z" />
        <path d="M654 458C386 555 141 582 55 531C-9 493 22 415 128 326L136 331C35 417 9 486 62 519C146 571 386 543 654 458Z" />
        <path d="M1000 361C1034 343 1073 323 1105 302C1078 329 1038 353 1000 373Z" />
      </g>
      <g fill="#c59b6c">
        <path d="M704 110C887 61 1035 52 1113 89C1159 111 1166 147 1148 190C1156 145 1146 118 1107 101C1025 65 887 71 704 110Z" />
        <path d="M228 305C249 288 275 271 300 256V265C273 281 251 295 239 306Z" />
        <path d="M168 364C130 410 126 447 166 475C223 517 353 520 472 485C339 527 216 526 159 488C114 457 126 412 168 364Z" />
        <path d="M1000 319C1033 302 1064 285 1086 271C1062 293 1031 314 1000 329Z" />
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
      viewBox={variant === 'full' ? '0 0 1280 570' : '285 125 730 330'}
      className={clsx(styles.logo, className)}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'Jumpwake'}
      aria-hidden={decorative || undefined}
      focusable="false"
    >
      {!decorative && <title>Jumpwake J/W monogram</title>}
      {variant === 'full' && <Orbits />}
      {/* The opaque ivory badge occludes the sweeps, including at its edges. */}
      <Badge />
      {variant === 'full' && (
        <g data-part="stars">
          <CelestialStar transform="translate(180 315)" />
          <CelestialStar transform="translate(1140 258) scale(1.15 .85)" />
        </g>
      )}
    </svg>
  );
}
