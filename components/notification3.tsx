import { Trash, X } from "@mynaui/icons-react";

export default function WithDescription() {
  return (
    <div
      className="flex w-full flex-col rounded bg-background px-4 py-3 font-medium shadow-sm ring-1 ring-border sm:w-96"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between">
        <div className="flex shrink-0 items-center gap-2">
          <Trash className="size-5 text-destructive" stroke={2} />
          <span className="truncate text-sm">Bookmark Deleted!</span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <a href="#" className="text-blue-600">
            Undo
          </a>
          <p aria-hidden="true" className="select-none text-border">
            |
          </p>
          <a href="#">
            <X className="size-4 text-muted-foreground" stroke={2} />
          </a>
        </div>
      </div>
      <p className="pt-4 text-sm font-normal text-muted-foreground">
        In id dolore irure sint nostrud Lorem est enim aliqua esse pariatur.
        Amet consectetur qui veniam.
      </p>
    </div>
  );
}
