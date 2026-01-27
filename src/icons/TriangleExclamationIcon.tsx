import { FC, SVGProps } from "react";

export const TriangleExclamationIcon: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg
    fill="none"
    height="1em"
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    width="1em"
    {...props}
  >
    <path d="M12 8.75V12.75M12 15.5V15.49M12.25 15.5C12.25 15.6381 12.1381 15.75 12 15.75C11.8619 15.75 11.75 15.6381 11.75 15.5C11.75 15.3619 11.8619 15.25 12 15.25C12.1381 15.25 12.25 15.3619 12.25 15.5Z" />
    <path d="M2.79766 16.2276L10.2816 3.64094C11.0568 2.33714 12.9445 2.33714 13.7197 3.64093L21.2037 16.2276C21.9964 17.5608 21.0357 19.2498 19.4847 19.2498H4.51673C2.9657 19.2498 2.00497 17.5608 2.79766 16.2276Z" />
  </svg>
);
