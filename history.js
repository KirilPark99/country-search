export const HISTORY_KEY = 'country-search.history';
export const HISTORY_LIMIT = 5;
export function loadHistory(storage) {
    if (!storage)
        return [];
    try {
        const saved = JSON.parse(storage.getItem(HISTORY_KEY) || '[]');
        if (!Array.isArray(saved))
            return [];
        const queries = saved
            .filter((value) => typeof value === 'string')
            .map((query) => query.trim().toLowerCase())
            .filter(Boolean);
        return [...new Set(queries)].slice(0, HISTORY_LIMIT);
    }
    catch {
        return [];
    }
}
export function addToHistory(history, query) {
    const key = query.trim().toLowerCase();
    if (!key)
        return [...history];
    return [key, ...history.filter((item) => item !== key)].slice(0, HISTORY_LIMIT);
}
export function saveHistory(storage, history) {
    try {
        storage?.setItem(HISTORY_KEY, JSON.stringify(history));
    }
    catch {
        // Storage can be disabled or full; the in-memory history still works.
    }
}
