import { debounce } from './debounce.js';
import { getErrorMessage } from './errors.js';
export const DEBOUNCE_MS = 300;
export function createSearchController(search, onChange) {
    let activeRequest;
    let latestQuery = '';
    let disposed = false;
    function publish(status, query, countries = [], error = '') {
        onChange({ status, query, countries, error });
    }
    async function run(query) {
        const request = new AbortController();
        activeRequest = request;
        publish('loading', query);
        try {
            const countries = await search(query, request.signal);
            if (request.signal.aborted)
                return;
            publish(countries.length ? 'success' : 'empty', query, countries);
        }
        catch (error) {
            if (request.signal.aborted)
                return;
            const message = getErrorMessage(error);
            if (message !== null)
                publish('error', query, [], message);
        }
        finally {
            if (activeRequest === request)
                activeRequest = undefined;
        }
    }
    const delayedSearch = debounce((query) => void run(query), DEBOUNCE_MS);
    function cancelPending() {
        activeRequest?.abort();
        activeRequest = undefined;
        delayedSearch.cancel();
    }
    function updateQuery(query, immediate) {
        if (disposed)
            return;
        cancelPending();
        latestQuery = query.trim();
        if (!latestQuery) {
            publish('idle', '');
        }
        else if (immediate) {
            void run(latestQuery);
        }
        else {
            publish('waiting', latestQuery);
            delayedSearch(latestQuery);
        }
    }
    publish('idle', '');
    return {
        setQuery: (query) => updateQuery(query, false),
        searchNow: (query) => updateQuery(query, true),
        retry: () => updateQuery(latestQuery, true),
        dispose: () => {
            disposed = true;
            cancelPending();
        },
    };
}
