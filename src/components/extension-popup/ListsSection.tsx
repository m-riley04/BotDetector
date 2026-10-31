import { combineLines } from '../../common/helpers';
import { parseHandleList, Settings } from '../../common/settings';
import type { UpdateSettings } from './ExtensionPopup';
import { TextList } from './TextList';

interface ListsSectionProps {
  settings: Settings;
  version: number;
  update: UpdateSettings;
}

export function ListsSection({ settings, version, update }: ListsSectionProps) {
  return (
    <section id="lists" aria-labelledby="lists-title">
      <h2 id="lists-title">Lists</h2>
      <div class="field">
        <label for="allowlist">Always treat as human</label>
        <TextList
          key={version}
          id="allowlist"
          value={combineLines(settings.allowlist)}
          onCommit={(text) => update({ allowlist: parseHandleList(text) })}
        />
      </div>
      <div class="field">
        <label for="blocklist">Always hide</label>
        <TextList
          key={version}
          id="blocklist"
          value={combineLines(settings.blocklist)}
          onCommit={(text) => update({ blocklist: parseHandleList(text) })}
        />
        <p class="help">Press Enter or Space after each @handle.</p>
      </div>
    </section>
  );
}
