'use client';

import * as React from 'react';

import { normalizeStaticValue } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';

import { EditorKit } from '@/components/editor/editor-kit';
import { SettingsDialog } from '@/components/editor/settings-dialog';
import { Editor, EditorContainer } from '@/components/ui/editor';

const DEFAULT_VALUE = normalizeStaticValue([
  { children: [{ text: '' }], type: 'p' },
]);

export function PlateEditor({
  value: initialValue,
  readOnly = false,
  documentId,
  onChange,
}: {
  value?: unknown;
  readOnly?: boolean;
  /** Stable id so the editor remounts when switching documents */
  documentId?: string;
  onChange?: (value: unknown) => void;
}) {
  const normalized = React.useMemo(
    () => normalizeStaticValue((initialValue ?? DEFAULT_VALUE) as never),
    [initialValue]
  );

  const editor = usePlateEditor({
    id: documentId ?? 'erase-friction-plate',
    plugins: EditorKit,
    value: normalized,
  });

  return (
    <Plate editor={editor} onChange={onChange ? ({ value }) => onChange(value) : undefined}>
      <EditorContainer className="rounded-b-lg bg-subtle">
        <div className="mx-auto max-w-[860px] min-h-[700px] bg-white dark:bg-zinc-950 shadow-sm ring-1 ring-border/40 my-4 rounded-lg">
          <Editor variant="demo" placeholder="Start writing…" readOnly={readOnly} />
        </div>
      </EditorContainer>

      {!readOnly && <SettingsDialog />}
    </Plate>
  );
}
