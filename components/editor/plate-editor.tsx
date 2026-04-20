'use client';

import * as React from 'react';

import { normalizeStaticValue } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';

import {
  DiscussionUsersBootstrap,
  type DiscussionUsersInput,
} from '@/components/editor/discussion-users-bootstrap';
import { EditorKit } from '@/components/editor/editor-kit';
import { SettingsDialog } from '@/components/editor/settings-dialog';
import { Editor, EditorContainer } from '@/components/ui/editor';

const EMPTY_ROOT: Array<{ type: string; children: Array<{ text: string }> }> = [
  { type: 'p', children: [{ text: '' }] },
];

/** Plate `Value` is always a top-level array of blocks; DB may store a single node object. */
function coercePlateRoot(value: unknown): typeof EMPTY_ROOT | unknown[] {
  if (value == null) return EMPTY_ROOT;
  if (Array.isArray(value)) {
    return value.length > 0 ? value : EMPTY_ROOT;
  }
  if (typeof value === 'object' && ('type' in (value as object) || 'children' in (value as object))) {
    return [value];
  }
  return EMPTY_ROOT;
}

export function PlateEditor({
  value: initialValue,
  readOnly = false,
  documentId,
  onChange,
  discussionUsers: discussionUsersPrefetched,
}: {
  value?: unknown;
  readOnly?: boolean;
  /** Stable id so the editor remounts when switching documents */
  documentId?: string;
  onChange?: (value: unknown) => void;
  /** Optional Firestore-backed profiles (uid → name/avatar); merged with `/api/me` and author lookup */
  discussionUsers?: DiscussionUsersInput;
}) {
  const normalized = React.useMemo(
    () => normalizeStaticValue(coercePlateRoot(initialValue) as never),
    [initialValue]
  );

  const editor = usePlateEditor({
    id: documentId ?? 'erase-friction-plate',
    plugins: EditorKit,
    value: normalized,
  });

  return (
    <Plate editor={editor} onChange={onChange ? ({ value }) => onChange(value) : undefined}>
      <DiscussionUsersBootstrap prefetchedUsers={discussionUsersPrefetched} />
      <EditorContainer className="rounded-b-lg bg-subtle">
        <div className="mx-auto max-w-[860px] min-h-[700px] bg-white dark:bg-zinc-950 shadow-sm ring-1 ring-border/40 my-4 rounded-lg">
          <Editor variant="demo" placeholder="Start writing…" readOnly={readOnly} />
        </div>
      </EditorContainer>

      {!readOnly && <SettingsDialog />}
    </Plate>
  );
}
