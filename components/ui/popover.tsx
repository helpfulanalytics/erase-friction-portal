'use client';

import * as React from 'react';

import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/lib/utils';

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  render,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger> & {
  render?: React.ReactElement;
}) {
  if (render && React.isValidElement(render)) {
    return (
      <PopoverPrimitive.Trigger asChild data-slot="popover-trigger" {...props}>
        {React.cloneElement(render, undefined, children)}
      </PopoverPrimitive.Trigger>
    );
  }
  return (
    <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props}>
      {children}
    </PopoverPrimitive.Trigger>
  );
}

function PopoverContent({
  align = 'center',
  className,
  sideOffset = 4,
  render,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  render?: React.ReactElement;
}) {
  const body =
    render && React.isValidElement(render)
      ? React.cloneElement(render, undefined, children)
      : children;
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        className={cn(
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in',
          className
        )}
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        {...props}
      >
        {body}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
