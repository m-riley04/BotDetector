/**
 * Hook that shows the live value while dragging, and only reports it once the drag is released.
 * TODO: move this out of `./components` and into a more appropriate location (i.e. `./hooks`).
 */
import { useState } from 'preact/hooks';

export function useSlider(value: number, onCommit: (value: number) => void) {
  const [live, setLive] = useState<number>();
  const shown = live ?? value;
  return {
    shown,
    props: {
      value: shown,
      onInput: (e: Event) =>
        setLive(Number((e.currentTarget as HTMLInputElement).value)),
      onChange: (e: Event) => {
        setLive(undefined);
        onCommit(Number((e.currentTarget as HTMLInputElement).value));
      },
    },
  };
}
