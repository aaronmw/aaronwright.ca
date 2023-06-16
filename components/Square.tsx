import { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';

export { Square };

function Square({ className, ...otherProps }: ComponentProps<'div'>) {
  return (
    <div
      className={twMerge(
        `
          h-2
          w-2
          transition-all
          duration-1000
        `,
        className
      )}
      {...otherProps}
    />
  );
}
