import { useRef, useEffect } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTheme } from '../../hooks/useTheme';

interface ScriptEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: 'shell' | 'python' | 'node';
  readonly?: boolean;
}

function getLanguageExtension(language: string) {
  switch (language) {
    case 'python':
      return python();
    case 'node':
      return javascript();
    default:
      return [];
  }
}

const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#1e293b',
  },
  '.cm-gutters': {
    backgroundColor: '#fafafa',
    borderRight: '1px solid #e2e8f0',
    color: '#94a3b8',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#f0f2f5',
  },
  '.cm-activeLine': {
    backgroundColor: '#f8fafc',
  },
  '.cm-cursor': {
    borderLeftColor: '#1e293b',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#dbeafe',
  },
});

export default function ScriptEditor({ value, onChange, language = 'shell', readonly = false }: ScriptEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { mode } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      bracketMatching(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      getLanguageExtension(language),
      EditorView.lineWrapping,
      mode === 'dark' ? oneDark : lightTheme,
    ];

    if (readonly) {
      extensions.push(EditorState.readOnly.of(true));
    } else if (onChange) {
      extensions.push(EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }));
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Recreate editor when language or theme changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, mode, readonly]);

  // Sync external value changes without recreating editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      style={{
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        overflow: 'hidden',
        fontSize: 14,
        fontFamily: 'var(--font-mono)',
      }}
    />
  );
}
