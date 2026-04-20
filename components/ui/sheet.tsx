"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function Sheet(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root {...props} />;
}

function SheetTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger {...props} />;
}

function SheetClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close {...props} />;
}

function SheetContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props & { side?: "right" | "left" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        )}
      />
      <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex justify-end">
        <DialogPrimitive.Popup
          className={cn(
            "relative h-full w-[480px] max-w-[calc(100vw-2rem)] border-l border-border bg-surface shadow-card outline-none",
            "data-open:animate-in data-open:slide-in-from-right",
            "data-closed:animate-out data-closed:slide-out-to-right",
            className
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close
            className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-subtle hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-border px-6 py-5", className)} {...props} />;
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn("font-headingAlt text-lg font-bold text-ink", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-1 font-ui text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
};

