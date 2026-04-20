import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveUserAvatarUrl } from "@/lib/user-avatar-url";
import { X } from "@mynaui/icons-react";

export default function WithAvatars() {
  return (
    <div
      className="flex w-full items-center justify-between rounded bg-background font-medium shadow-sm ring-1 ring-border sm:w-96"
      aria-live="assertive"
    >
      <a
        href="#"
        className="flex flex-1 gap-4 px-4 py-3 transition hover:bg-muted"
      >
        <Avatar>
          <AvatarImage
            src={resolveUserAvatarUrl(undefined, "demo-user-joey")}
            alt=""
          />
          <AvatarFallback>JY</AvatarFallback>
        </Avatar>
        <div className="flex flex-col text-sm">
          <span className="truncate">Joey</span>
          <span className="truncate font-normal text-muted-foreground">
            How you doin?
          </span>
        </div>
      </a>
      <a href="#" className="group flex shrink-0 px-4 py-3">
        <X
          className="size-4 shrink-0 text-muted-foreground transition group-hover:text-foreground"
          stroke={2}
        />
      </a>
    </div>
  );
}
