import { createCountrySearch } from './country-client.js';
import { addToHistory, loadHistory, saveHistory } from './history.js';
import type { HistoryStorage } from './history.js';
import { createSearchController } from './search-controller.js';
import { createPage } from './ui.js';

const page = createPage();
let storage: HistoryStorage | null = null;
try {
  storage = window.localStorage;
} catch {
  // Private browsing policies can prevent access to the storage object itself.
}
let history = loadHistory(storage);

function renderHistory() {
  page.renderHistory(history, (query) => {
    page.input.value = query;
    page.input.focus();
    controller.searchNow(query);
  });
}

const controller = createSearchController(createCountrySearch(), (state) => {
  page.renderState(state);
  if (state.status === 'loading') {
    history = addToHistory(history, state.query);
    saveHistory(storage, history);
    renderHistory();
  }
});

renderHistory();
page.input.addEventListener('input', () =>
  controller.setQuery(page.input.value),
);
page.retryButton.addEventListener('click', () => controller.retry());
window.addEventListener('pagehide', (event) => {
  if (!event.persisted) controller.dispose();
});
