import { InfoCircle, X } from "@mynaui/icons-react";

export default function WithActions() {
  return (
    <div
      className="flex w-full flex-col rounded bg-background px-4 py-3 font-medium shadow-sm ring-1 ring-border sm:w-96"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between">
        <div className="flex shrink-0 items-center gap-2">
          <InfoCircle className="size-5 text-muted-foreground" stroke={2} />
          <span className="truncate text-sm">New Update Available!</span>
        </div>
        <a href="#">
          <X className="size-4 shrink-0 text-muted-foreground" stroke={2} />
        </a>
      </div>
      <div className="ml-7 flex gap-4 pt-3 text-sm">
        <a href="#" className="text-blue-700">
          Update
        </a>
        <a href="#" className="text-muted-foreground">
          Ignore
        </a>
      </div>
    </div>
  );
}
