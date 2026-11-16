# Design decisions

## 1. Cancel the request, not only its displayed result

`createSearchController` in `src/search-controller.ts` owns an AbortController for the current search. Every input event calls `setQuery`, which aborts that controller and cancels queued debounce work immediately. It does not wait another 300 ms to cancel an old request. An empty query publishes an empty idle state and does not start a request.

`searchCountries` in `src/countries.ts` combines the caller signal with `AbortSignal.timeout(10000)` through `AbortSignal.any`. The combined signal is passed to the actual fetch. It also covers reading the response body.

`AbortError` means an intentional cancellation and stays silent. `TimeoutError` means the server took too long and produces a retryable error. Other unsuccessful HTTP statuses throw `HttpError`, which retains the status. HTTP 404 is handled before that error branch and returns an empty array. Network failures produce a connection message.

`retry` reads the latest query stored by the controller and starts it immediately. It does not capture the text from an older failed request.

The check of `request.signal.aborted` after awaiting is an additional safeguard for already resolved promises and non-cooperative asynchronous work. It is not the cancellation mechanism: AbortController really stops the fetch, as the tests and browser checks verify. A timestamp or boolean freshness check alone would leave obsolete network requests running and would not satisfy this task.

### Shared requests

`createCountrySearch` in `src/country-client.ts` gives each in-flight request its own internal controller. Each caller subscribes with a separate signal and receives a separate promise for its own result or cancellation.

Canceling one subscriber removes only that subscriber. The shared fetch continues while another subscriber still needs it. Canceling the last subscriber aborts the internal controller synchronously and removes the pending entry. Cleanup checks the entry identity so that an old canceled request cannot delete a newer request for the same query.

Only successful mapped responses, including an empty 404 result, enter the cache. Failed or canceled requests are not cached. Query keys are trimmed and lowercased. The cache lasts for the current page session; the deliberate limit is that it has no eviction policy. Add a size limit if the application needs long-lived sessions with many distinct queries, rather than introducing an unused LRU abstraction now.

## 2. Why debounce is 300 ms

A 300 ms delay is short enough to keep live search responsive while combining a burst of typing into one request. `debounce` in `src/debounce.ts` resets its timer on each call and uses the most recent arguments. Its `cancel` method prevents a queued search after the input is cleared or the controller is disposed.

Without debounce, every keystroke starts a network request. Most of those requests would immediately need cancellation. A much longer delay, such as 1500 ms, reduces traffic further but makes the page feel unresponsive after the user finishes typing.

History selection and Retry bypass debounce because the user has already selected a complete query. A cache hit still passes through the same controller state handling but makes no new fetch call.

## 3. Complexity

### Mapping

For `mapCountryResponse`, let L be the number of languages, B the number of border codes, C the number of currencies, and S the total length of the description and currency strings constructed for display.

- Time: O(L + B + C + S). Each relevant array is visited once, and string construction depends on the output length.
- Additional space: O(L + B + C + S), for the new arrays and constructed strings. The borders array is copied so modifying the view model does not mutate API data. Existing strings can be reused because JavaScript strings are immutable.

Mapping a response containing N countries adds the costs for those N countries.

### Cache and deduplication

For a query of length Q, trimming and lowercasing cost O(Q). The Map lookup and insertion are expected O(1) operations. A cache hit returns the existing mapped array rather than mapping or copying it again, so its total lookup cost is O(Q).

Joining or canceling one subscriber takes O(1) after the query-key lookup. Resolving a shared request with R subscribers requires O(R) subscriber callbacks, but the response is fetched and mapped only once.

Space is proportional to the cached country data, pending requests, and current subscribers. The cache is intentionally session-scoped and has no fixed capacity. Pending entries and abort listeners are removed when their work completes or is canceled.

### History

History is capped at five unique queries. In general, adding a query costs O(H + Q), where H is the total size of the small existing history and Q is the new query length. The configured bound keeps this work small. Parsing saved history costs O(J), where J is the stored JSON size; invalid entries are filtered out and only five unique strings are retained.

## 4. Concrete clean-code choices

- Single responsibility: `searchCountries` handles transport and HTTP semantics; `mapCountryResponse` handles data conversion; `getErrorMessage` handles error messages. None of them reads or changes the DOM.
- Separate state from presentation: `createSearchController` publishes typed states. `renderState` in `src/ui.ts` translates them into DOM elements. State and cancellation can therefore be tested without a browser.
- Reuse one cancellation path: `updateQuery` and `cancelPending` are shared by typing, history selection, Retry, and disposal. The same rules apply regardless of the source of a search.
- Reuse actual shared work: `country-client.ts` deduplicates requests, but it does not confuse the lifetime of one caller with the lifetime of the shared fetch.
- Use platform features: Map and Set handle lookup and deduplication; AbortController handles cancellation; the native dialog supplies Escape handling, modal focus, and background inertness. No framework, debounce library, or application bundler is needed.
- Keep rendering safe: text is assigned through textContent or native DOM properties. Dynamic HTML parsing is not used. Flag image URLs are restricted to HTTPS; missing fields have explicit fallback values.
- Keep optional storage optional: `src/history.ts` tolerates corrupt data, disabled storage, and quota errors. The app continues with in-memory history if persistence is unavailable.
- Comments explain reasons: for example, the cache limitation and why storage failures should not break searching. They do not narrate individual DOM operations.

## Tests and TDD

The four required areas each have a failing-tests commit followed by an implementation commit; their hashes are listed in README.md. The bonus cache and history also have red/green pairs.

Tests follow FIRST: fake timers keep timing tests fast, each test creates its own controller or client, all fetch calls are mocked, and assertions determine success without manual inspection or real network availability.

The separate race test schedules the earlier request's response after the newer request's response. Its fetch mock listens to the real supplied AbortSignal and rejects with AbortError when canceled. It asserts both actual cancellation before the next debounce and the final state belonging only to the newer query. Keeping the late scheduled response attempt checks that it cannot overwrite the result even after cancellation.

Pre-commit runs only lint-staged, allowing a deliberately red TDD commit. Pre-push runs the full test suite, preventing that red state from being pushed alone.
