const numbers = new Intl.NumberFormat('en-US');
function textElement(tag, text, className = '') {
    const element = document.createElement(tag);
    element.textContent = text;
    element.className = className;
    return element;
}
function formatNumber(value) {
    return value === null ? 'Not available' : numbers.format(value);
}
function countryFlag(country) {
    if (!country.flag)
        return textElement('span', 'Flag unavailable', 'flag-placeholder');
    const image = document.createElement('img');
    image.className = 'country-flag';
    image.src = country.flag;
    image.alt = `Flag of ${country.name}`;
    image.loading = 'lazy';
    image.addEventListener('error', () => {
        image.replaceWith(textElement('span', 'Flag unavailable', 'flag-placeholder'));
    }, { once: true });
    return image;
}
function cardField(label, value) {
    const field = textElement('span', '', 'card-field');
    field.append(textElement('span', label), textElement('strong', value));
    return field;
}
function countryCard(country, onOpen) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'country-card';
    card.setAttribute('aria-label', `View details for ${country.name}`);
    const content = textElement('span', '', 'card-content');
    content.append(textElement('span', country.region, 'country-region'), textElement('span', country.name, 'country-name'), cardField('Capital', country.capital), cardField('Population', formatNumber(country.population)), textElement('span', 'Explore country ↗', 'card-link'));
    card.append(countryFlag(country), content);
    card.addEventListener('click', onOpen);
    return card;
}
function createDetails() {
    const dialog = document.createElement('dialog');
    dialog.className = 'country-dialog';
    dialog.setAttribute('aria-labelledby', 'country-detail-title');
    const heading = textElement('div', '', 'dialog-heading');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'close-button';
    close.textContent = 'Close ✕';
    close.setAttribute('aria-label', 'Close country details');
    close.addEventListener('click', () => dialog.close());
    heading.append(textElement('span', 'COUNTRY PROFILE', 'eyebrow'), close);
    const content = document.createElement('div');
    dialog.append(heading, content);
    function show(country) {
        content.replaceChildren();
        const intro = textElement('div', '', 'detail-intro');
        const title = textElement('h2', country.name);
        title.id = 'country-detail-title';
        intro.append(countryFlag(country), title, textElement('p', country.region, 'country-region'));
        const details = document.createElement('dl');
        details.className = 'detail-grid';
        const fields = [
            ['Capital', country.capital],
            ['Population', formatNumber(country.population)],
            [
                'Area',
                country.area === null
                    ? 'Not available'
                    : `${formatNumber(country.area)} km²`,
            ],
            ['Border codes', country.borders.join(', ') || 'No land borders listed'],
            ['Languages', country.languages.join(', ') || 'Not available'],
            ['Currency', country.currencies.join(', ') || 'Not available'],
        ];
        for (const [label, value] of fields) {
            const pair = document.createElement('div');
            pair.append(textElement('dt', label), textElement('dd', value));
            details.append(pair);
        }
        content.append(intro, textElement('p', country.description, 'description'), details);
        dialog.showModal();
    }
    return { dialog, show };
}
export function createPage() {
    const header = document.createElement('header');
    header.className = 'site-header';
    const wordmark = textElement('div', '', 'wordmark');
    const logo = textElement('span', '◎', 'logo');
    logo.setAttribute('aria-hidden', 'true');
    wordmark.append(logo, textElement('span', 'Country Atlas'));
    header.append(wordmark, textElement('span', 'A world worth exploring', 'header-note'));
    const main = document.createElement('main');
    main.className = 'page';
    const hero = textElement('section', '', 'hero');
    hero.append(textElement('p', 'FOLLOW YOUR CURIOSITY', 'eyebrow'), textElement('h1', 'A little curiosity.\nA whole world.'), textElement('p', 'Discover countries, their capitals, and the details that make them unique.', 'hero-description'));
    const searchSection = textElement('section', '', 'search-section');
    searchSection.setAttribute('aria-label', 'Country search');
    const label = document.createElement('label');
    label.htmlFor = 'country-search';
    label.textContent = 'Where are you curious about?';
    const input = document.createElement('input');
    input.id = 'country-search';
    input.type = 'search';
    input.placeholder = 'Try Spain, Japan, or New Zealand…';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-describedby', 'search-hint');
    const hint = textElement('p', 'Start typing. We’ll take it from there.', 'search-hint');
    hint.id = 'search-hint';
    const history = textElement('div', '', 'history');
    history.setAttribute('aria-label', 'Recent searches');
    searchSection.append(label, input, hint, history);
    const resultsSection = textElement('section', '', 'results-section');
    resultsSection.setAttribute('aria-labelledby', 'results-title');
    const title = textElement('h2', 'Ready when you are');
    title.id = 'results-title';
    const status = textElement('div', '', 'status-panel');
    const symbol = textElement('span', '◎', 'empty-symbol');
    symbol.setAttribute('aria-hidden', 'true');
    const spinner = textElement('span', '', 'spinner');
    spinner.setAttribute('aria-hidden', 'true');
    const message = document.createElement('p');
    message.id = 'status-message';
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    message.setAttribute('aria-atomic', 'true');
    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.id = 'retry-search';
    retryButton.className = 'retry-button';
    retryButton.textContent = 'Try again';
    status.append(symbol, spinner, message, retryButton);
    const results = textElement('div', '', 'country-grid');
    results.id = 'country-results';
    resultsSection.append(title, status, results);
    const footer = textElement('footer', '', 'site-footer');
    const source = document.createElement('a');
    source.href = 'https://countries.dev';
    source.textContent = 'Country data by countries.dev ↗';
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    footer.append(textElement('span', 'Small searches. Bigger horizons.'), source);
    const details = createDetails();
    main.append(hero, searchSection, resultsSection);
    document.body.append(header, main, footer, details.dialog);
    function renderState(state) {
        results.replaceChildren();
        resultsSection.dataset.state = state.status;
        results.setAttribute('aria-busy', String(state.status === 'loading'));
        status.classList.toggle('is-error', state.status === 'error');
        retryButton.hidden = state.status !== 'error';
        spinner.hidden = state.status !== 'loading';
        symbol.hidden = !['idle', 'empty'].includes(state.status);
        switch (state.status) {
            case 'idle':
                title.textContent = 'Ready when you are';
                message.textContent = 'Your next discovery starts with a country name.';
                break;
            case 'waiting':
                title.textContent = 'A moment of curiosity…';
                message.textContent = 'Waiting for you to finish typing.';
                break;
            case 'loading':
                title.textContent = 'Looking around the world';
                message.textContent = `Searching for “${state.query}”…`;
                break;
            case 'success':
                title.textContent = `${state.countries.length} ${state.countries.length === 1 ? 'country' : 'countries'} to explore`;
                message.textContent = `Results for “${state.query}”. Select a country to learn more.`;
                for (const country of state.countries) {
                    results.append(countryCard(country, () => details.show(country)));
                }
                break;
            case 'empty':
                title.textContent = 'No countries found';
                message.textContent = `Nothing matched “${state.query}”. Try another spelling.`;
                break;
            case 'error':
                title.textContent = 'We couldn’t complete that search';
                message.textContent = state.error;
                break;
        }
    }
    function renderHistory(queries, onSelect) {
        history.replaceChildren();
        history.hidden = queries.length === 0;
        if (!queries.length)
            return;
        history.append(textElement('span', 'Recent', 'history-label'));
        for (const query of queries) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'history-button';
            button.textContent = query;
            button.addEventListener('click', () => onSelect(query));
            history.append(button);
        }
    }
    return { input, retryButton, renderState, renderHistory };
}
