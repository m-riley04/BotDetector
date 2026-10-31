import { GenericEventHandler, KeyboardEventHandler } from 'preact';
import { useCallback, useRef, useState } from 'preact/hooks';

/**
 * Which key (besides Enter) finishes a tag.
 * - `' '`: handles, which can't contain spaces
 * - `','`: phrases like "free money", which can
 */
export type TextListSeparator = ' ' | ',';

// Where to split pasted or stored text into tags. Newlines always count, since that's how
// the lists are stored (see combineLines) and both parseHandleList and parseKeywordList split on them.
const SPLIT_PATTERNS: Record<TextListSeparator, RegExp> = {
  ' ': /[\s,]+/,
  ',': /[\n,]+/,
};

function splitItems(text: string, separator: TextListSeparator): string[] {
  return text
    .split(SPLIT_PATTERNS[separator])
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

// newline-joined, so the parent's parser reads it back the same way whichever separator is used
const joinTextList = (items: string[]): string => items.join('\n');

interface TextListItemProps {
  value: string;
  onClose: (removedValue: string) => void;
}

function TextListItem({ value, onClose }: TextListItemProps) {
  return (
    <div class="item">
      {value}
      <button
        type="button"
        onClick={() => onClose(value)}
        title="Remove item"
        aria-label={`Remove ${value}`}
      >
        ×
      </button>
    </div>
  );
}

interface TextListProps {
  id: string;
  value: string;
  onCommit: (text: string) => void;
  separator?: TextListSeparator;
}

/**
 * Keeps its own text so typing isn't overwritten, and saves shortly after typing stops because the popup can close at any moment.
 */
export function TextList({
  id,
  value,
  onCommit,
  separator = ' ',
}: TextListProps) {
  const [items, setItems] = useState(() => splitItems(value, separator));
  const [currentItem, setCurrentItem] = useState('');

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const commit = useCallback(
    (value: string) => {
      clearTimeout(timer.current);
      onCommit(value);
    },
    [onCommit]
  );

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === separator) {
        e.preventDefault();
        // pasted text can hold several items at once
        const added = splitItems(currentItem, separator).filter(
          (item) => !items.includes(item)
        );
        // also clears a duplicate or whitespace-only entry, so the key visibly did something
        setCurrentItem('');
        if (added.length === 0) return;

        const newItems = [...new Set([...items, ...added])];
        setItems(newItems);
        commit(joinTextList(newItems));
      } else if (
        e.key === 'Backspace' &&
        currentItem === '' &&
        items.length > 0
      ) {
        e.preventDefault();
        // Remove the last tag if the input is empty, BUT put it in the input for editing.
        // It's still saved until the debounced commit in handleInput, so closing the popup now loses nothing.
        setItems(items.slice(0, -1));
        setCurrentItem(items.at(-1) ?? '');
      }
    },
    [currentItem, items, separator, commit]
  );

  const removeTag = useCallback(
    (item: string) => {
      const next = items.filter((v) => v !== item);
      setItems(next);
      commit(joinTextList(next));
    },
    [items, commit]
  );

  const handleInput: GenericEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const value = e.currentTarget.value;
      setCurrentItem(value);
      clearTimeout(timer.current);
      // include what's being typed, so it isn't lost if the popup closes before Enter
      timer.current = setTimeout(
        () => commit(joinTextList([...items, ...splitItems(value, separator)])),
        500
      );
    },
    [items, separator, commit]
  );

  return (
    <div class="text-list">
      <input
        id={id}
        type="text"
        value={currentItem}
        spellcheck={false}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
      />
      <div class="item-container">
        {items.map((v) => (
          <TextListItem onClose={removeTag} value={v} key={v} />
        ))}
      </div>
    </div>
  );
}
