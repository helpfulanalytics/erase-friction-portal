'use client';

import { cn } from '@/lib/utils';

import { Toolbar } from './toolbar';

export function FixedToolbar(props: React.ComponentProps<typeof Toolbar>) {
  return (
    <Toolbar
      {...props}
      className={cn(
        'scrollbar-hide sticky top-0 left-0 z-50 w-full justify-between overflow-x-auto rounded-t-lg border-b border-b-border bg-background/98 px-2 py-1.5 backdrop-blur supports-backdrop-blur:bg-background/80 shadow-sm',
        props.className
      )}
    />
  );
}
