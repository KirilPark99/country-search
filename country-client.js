import { searchCountries } from './countries.js';
import { mapCountryResponse } from './map-country.js';
function subscribe(request, signal, onLastCancel) {
    request.subscribers++;
    return new Promise((resolve, reject) => {
        let finished = false;
        function release() {
            finished = true;
            signal.removeEventListener('abort', onAbort);
            request.subscribers--;
        }
        function onAbort() {
            if (finished)
                return;
            release();
            if (request.subscribers === 0 && !request.settled)
                onLastCancel();
            reject(signal.reason);
        }
        signal.addEventListener('abort', onAbort, { once: true });
        request.promise.then((countries) => {
            if (finished)
                return;
            release();
            resolve(countries);
        }, (error) => {
            if (finished)
                return;
            release();
            reject(error);
        });
        if (signal.aborted)
            onAbort();
    });
}
export function createCountrySearch() {
    // ponytail: session-only cache; add an eviction limit for long-lived usage.
    const cache = new Map();
    const pending = new Map();
    return async (query, signal) => {
        signal.throwIfAborted();
        const key = query.trim().toLowerCase();
        if (!key)
            return [];
        const cached = cache.get(key);
        if (cached)
            return cached;
        let request = pending.get(key);
        if (!request) {
            const controller = new AbortController();
            const created = {
                controller,
                subscribers: 0,
                settled: false,
                promise: searchCountries(key, controller.signal)
                    .then((raw) => {
                    controller.signal.throwIfAborted();
                    const countries = raw.map(mapCountryResponse);
                    cache.set(key, countries);
                    return countries;
                })
                    .finally(() => {
                    created.settled = true;
                    if (pending.get(key) === created)
                        pending.delete(key);
                }),
            };
            request = created;
            pending.set(key, request);
        }
        const current = request;
        return subscribe(current, signal, () => {
            if (pending.get(key) === current)
                pending.delete(key);
            current.controller.abort();
        });
    };
}
