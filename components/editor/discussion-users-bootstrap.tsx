'use client';

import * as React from 'react';

import { useEditorRef, usePluginOption } from 'platejs/react';

import { discussionPlugin } from '@/components/editor/plugins/discussion-kit';
import { resolveUserAvatarUrl } from '@/lib/user-avatar-url';
import type { UserAvatarGender } from '@/types/models';

export type DiscussionUsersInput = Record<
  string,
  { name: string; avatar?: string; avatarGender?: UserAvatarGender }
>;

type Me = {
  uid: string;
  email: string;
  name: string;
  avatar: string;
  avatarGender?: UserAvatarGender;
};

function toDiscussionUser(
  id: string,
  name: string,
  avatar?: string,
  avatarGender?: UserAvatarGender
): { id: string; name: string; avatarUrl: string } {
  return {
    id,
    name: name.trim() || 'User',
    avatarUrl: resolveUserAvatarUrl(avatar, id, { gender: avatarGender }),
  };
}

/**
 * Sets discussion plugin `currentUserId` + `users` from `/api/me`, merges optional prefetched
 * profiles, and batch-loads missing authors from `/api/users/lookup`.
 */
export function DiscussionUsersBootstrap({
  prefetchedUsers,
}: {
  prefetchedUsers?: DiscussionUsersInput;
}) {
  const editor = useEditorRef();
  const discussions = usePluginOption(discussionPlugin, 'discussions');

  const [me, setMe] = React.useState<Me | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (!res.ok || cancelled) return;
      setMe((await res.json()) as Me);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!me) return;

    const base: Record<string, { id: string; name: string; avatarUrl: string }> = {};

    if (prefetchedUsers) {
      for (const [id, u] of Object.entries(prefetchedUsers)) {
        if (!id) continue;
        base[id] = toDiscussionUser(id, u.name, u.avatar, u.avatarGender);
      }
    }

    base[me.uid] = toDiscussionUser(me.uid, me.name, me.avatar, me.avatarGender);

    const ids = new Set<string>();
    for (const d of discussions) {
      if (d.userId) ids.add(d.userId);
      for (const c of d.comments) {
        if (c.userId) ids.add(c.userId);
      }
    }

    const missing = [...ids].filter((id) => id && !base[id]);

    editor.setOption(discussionPlugin, 'currentUserId', me.uid);
    editor.setOption(discussionPlugin, 'users', base);

    if (missing.length === 0) return;

    let cancelled = false;

    (async () => {
      const res = await fetch('/api/users/lookup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: missing }),
      });
      if (!res.ok || cancelled) return;

      const data = (await res.json()) as {
        users: Record<string, { name: string; avatar: string; avatarGender?: UserAvatarGender }>;
      };

      const prev = editor.getOption(discussionPlugin, 'users');
      const merged = { ...prev };
      for (const [id, u] of Object.entries(data.users ?? {})) {
        merged[id] = toDiscussionUser(id, u.name, u.avatar, u.avatarGender);
      }

      editor.setOption(discussionPlugin, 'users', merged);
    })();

    return () => {
      cancelled = true;
    };
  }, [editor, me, discussions, prefetchedUsers]);

  return null;
}
