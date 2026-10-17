const readPageButton = document.querySelector<HTMLButtonElement>('#read-page');
const result = document.querySelector<HTMLParagraphElement>('#result');

if (!readPageButton || !result) {
  throw new Error('Popup markup is missing the expected controls.');
}

readPageButton.addEventListener('click', async () => {
  result.textContent = 'Reading page...';

  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab?.id === undefined) {
      throw new Error('No active tab is available.');
    }

    result.textContent = tab.title || 'The current page has no title.';
  } catch (error) {
    console.error('Could not read the current page title.', error);
    result.textContent = 'Could not read this page. Try a regular webpage.';
  }
});
