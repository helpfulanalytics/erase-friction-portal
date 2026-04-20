'use client';

import type { TComment } from '@/components/ui/comment';

import { createPlatePlugin } from 'platejs/react';

import { BlockDiscussion } from '@/components/ui/block-discussion';

export type TDiscussion = {
  id: string;
  comments: TComment[];
  createdAt: Date;
  isResolved: boolean;
  userId: string;
  documentContent?: string;
};

// This plugin is UI-only. `users` + `currentUserId` are filled by `DiscussionUsersBootstrap`
// (see `components/editor/discussion-users-bootstrap.tsx`) from `/api/me` and `/api/users/lookup`.
export const discussionPlugin = createPlatePlugin({
  key: 'discussion',
  options: {
    currentUserId: '',
    discussions: [] as TDiscussion[],
    users: {} as Record<string, { id: string; avatarUrl: string; name: string }>,
  },
})
  .configure({
    render: { aboveNodes: BlockDiscussion },
  })
  .extendSelectors(({ getOption }) => ({
    currentUser: () => getOption('users')[getOption('currentUserId')],
    user: (id: string) => getOption('users')[id],
  }));

export const DiscussionKit = [discussionPlugin];
