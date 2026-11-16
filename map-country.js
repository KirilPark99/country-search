function optionalNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? value
        : null;
}
export function mapCountryResponse(raw) {
    const name = raw.name || 'Unknown country';
    const location = raw.subregion || raw.region;
    const flag = raw.flags?.svg || raw.flags?.png || raw.flag || '';
    return {
        name,
        flag: flag.startsWith('https://') ? flag : '',
        capital: raw.capital || 'Not available',
        region: raw.region || 'Not available',
        population: optionalNumber(raw.population),
        languages: (raw.languages || []).flatMap((language) => language.name ? [language.name] : []),
        description: location
            ? `${name} is in ${location}.`
            : 'No regional description available.',
        area: optionalNumber(raw.area),
        borders: [...(raw.borders || [])],
        currencies: (raw.currencies || []).map((currency) => {
            if (currency.name && currency.code) {
                return `${currency.name} (${currency.code})`;
            }
            return (currency.name || currency.code || currency.symbol || 'Unknown currency');
        }),
    };
}
