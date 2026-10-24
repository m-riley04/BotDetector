import { useRef, useState } from 'preact/hooks';

interface TextListProps {
  id: string;
  value: string;
  onCommit: (text: string) => void;
}

/**
 * Keeps its own text so typing isn't overwritten, and saves shortly after typing stops because the popup can close at any moment.
 */
export function TextList({ id, value, onCommit }: TextListProps) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const commit = (value: string) => {
    clearTimeout(timer.current);
    onCommit(value);
  };
  return (
    <textarea
      id={id}
      rows={3}
      spellcheck={false}
      value={text}
      onInput={(e) => {
        const value = e.currentTarget.value;
        setText(value);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => commit(value), 500);
      }}
      onChange={(e) => commit(e.currentTarget.value)}
    />
  );
}
