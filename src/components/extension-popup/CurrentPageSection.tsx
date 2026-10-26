import { PageStats } from '../../common/messages';

interface CurrentPageSectionProps {
  pageStats?: PageStats;
  onClickedShowHidden: () => void;
}

export function CurrentPageSection({
  pageStats,
  onClickedShowHidden,
}: CurrentPageSectionProps) {
  return (
    <section id="page" aria-labelledby="page-title">
      <h2 id="page-title">This page</h2>
      <p id="stats" class="help">
        {pageStats
          ? `${pageStats.flagged} likely bot${
              pageStats.flagged === 1 ? '' : 's'
            } found, ${pageStats.hidden} hidden, ${pageStats.badges} badged.`
          : 'Open x.com to see results.'}
      </p>
      <button
        id="show-hidden"
        type="button"
        class="secondary"
        disabled={!pageStats?.hidden}
        onClick={onClickedShowHidden}
      >
        Show hidden posts
      </button>
    </section>
  );
}
