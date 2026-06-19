import type { ReactNode } from "react";

type WideContainerProps = {
  children: ReactNode;
  className?: string;
};

export function WideContainer({ children, className = "" }: WideContainerProps) {
  return (
    <div
      className={`mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 xl:px-10 ${className}`}
    >
      {children}
    </div>
  );
}
