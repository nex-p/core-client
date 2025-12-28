/**
 * Convert PostgREST query string to human-readable text for reports
 */
const OPERATOR_LABELS = {
    eq: 'equals',
    neq: 'does not equal',
    gt: 'is greater than',
    gte: 'is greater than or equal to',
    lt: 'is less than',
    lte: 'is less than or equal to',
    like: 'matches pattern',
    ilike: 'contains',
    'not.like': 'does not match pattern',
    'not.ilike': 'does not contain',
    in: 'is one of',
    'not.in': 'is not one of',
    cs: 'contains',
    'not.cs': 'does not contain',
    'is.null': 'is empty',
    'not.is.null': 'is not empty',
    phfts: 'matches search',
    plfts: 'matches search',
    wfts: 'matches search',
};
function formatFieldName(field, labels) {
    if (labels && labels[field]) {
        return labels[field];
    }
    // Convert snake_case to Title Case
    return field
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
function formatValue(field, value, valueLabels) {
    if (Array.isArray(value)) {
        const formatted = value.map(v => {
            if (valueLabels && valueLabels[field] && valueLabels[field][v]) {
                return valueLabels[field][v];
            }
            return v;
        });
        if (formatted.length === 1)
            return formatted[0];
        if (formatted.length === 2)
            return `${formatted[0]} or ${formatted[1]}`;
        return `${formatted.slice(0, -1).join(', ')}, or ${formatted[formatted.length - 1]}`;
    }
    if (valueLabels && valueLabels[field] && valueLabels[field][value]) {
        return valueLabels[field][value];
    }
    return value;
}
function parseFilterToVerbal(field, value, options) {
    const fieldLabel = formatFieldName(field, options.fieldLabels);
    // Handle null checks
    if (value === 'is.null') {
        return `${fieldLabel} is empty`;
    }
    if (value === 'not.is.null') {
        return `${fieldLabel} is not empty`;
    }
    // Parse operator.value format
    const dotIndex = value.indexOf('.');
    if (dotIndex === -1) {
        // No operator, default to equals
        const formattedValue = formatValue(field, value, options.valueLabels);
        return `${fieldLabel} equals ${formattedValue}`;
    }
    let operator = value.slice(0, dotIndex);
    let operatorValue = value.slice(dotIndex + 1);
    // Handle like patterns
    if (operator === 'like' || operator === 'ilike' || operator === 'not.like' || operator === 'not.ilike') {
        const cleanValue = operatorValue.replace(/^\*|\*$/g, '');
        const formattedValue = formatValue(field, cleanValue, options.valueLabels);
        if (operatorValue.startsWith('*') && operatorValue.endsWith('*')) {
            return operator.startsWith('not')
                ? `${fieldLabel} does not contain "${formattedValue}"`
                : `${fieldLabel} contains "${formattedValue}"`;
        }
        else if (operatorValue.startsWith('*')) {
            return operator.startsWith('not')
                ? `${fieldLabel} does not end with "${formattedValue}"`
                : `${fieldLabel} ends with "${formattedValue}"`;
        }
        else if (operatorValue.endsWith('*')) {
            return operator.startsWith('not')
                ? `${fieldLabel} does not start with "${formattedValue}"`
                : `${fieldLabel} starts with "${formattedValue}"`;
        }
    }
    // Handle IN operator
    if (operator === 'in' || operator === 'not.in') {
        const match = operatorValue.match(/^\((.+)\)$/);
        if (match) {
            const values = match[1].split(',').map(v => decodeURIComponent(v.trim()));
            const formattedValue = formatValue(field, values, options.valueLabels);
            const operatorLabel = operator === 'in' ? 'is one of' : 'is not one of';
            return `${fieldLabel} ${operatorLabel}: ${formattedValue}`;
        }
    }
    // Handle CS (contains) operator
    if (operator === 'cs' || operator === 'not.cs') {
        const match = operatorValue.match(/^\{(.+)\}$/);
        if (match) {
            const values = match[1].split(',').map(v => decodeURIComponent(v.trim()));
            const formattedValue = formatValue(field, values, options.valueLabels);
            const operatorLabel = operator === 'cs' ? 'contains' : 'does not contain';
            return `${fieldLabel} ${operatorLabel}: ${formattedValue}`;
        }
    }
    // Handle full-text search
    if (operator.startsWith('phfts') || operator.startsWith('plfts') || operator.startsWith('wfts')) {
        const searchValue = operatorValue.replace(/^english\./, '');
        return `${fieldLabel} matches search: "${decodeURIComponent(searchValue)}"`;
    }
    // Handle standard operators
    const operatorLabel = OPERATOR_LABELS[operator] || operator;
    const formattedValue = formatValue(field, decodeURIComponent(operatorValue), options.valueLabels);
    return `${fieldLabel} ${operatorLabel} ${formattedValue}`;
}
export function QueryToVerbal(queryString, options = {}) {
    const { includeStructural = true, conjunction = 'and', } = options;
    if (!queryString || queryString.trim() === '') {
        return 'No filters applied';
    }
    try {
        const params = new URLSearchParams(queryString);
        const parts = [];
        const filters = [];
        const structural = [];
        params.forEach((value, key) => {
            // Handle structural parameters
            if (key === 'select') {
                if (includeStructural) {
                    const fields = value.split(',').map(f => {
                        // Handle nested selections like "user(name,email)"
                        if (f.includes('(')) {
                            return f.replace(/\(.*\)/, ' with related data');
                        }
                        return formatFieldName(f, options.fieldLabels);
                    });
                    structural.push(`Showing fields: ${fields.join(', ')}`);
                }
                return;
            }
            if (key === 'order') {
                const orders = params.getAll('order');
                const orderParts = orders.map(o => {
                    const match = o.match(/^([^.]+)\.(asc|desc)$/);
                    if (match) {
                        const fieldLabel = formatFieldName(match[1], options.fieldLabels);
                        const direction = match[2] === 'asc' ? 'ascending' : 'descending';
                        return `${fieldLabel} (${direction})`;
                    }
                    return o;
                });
                if (includeStructural) {
                    structural.push(`Sorted by: ${orderParts.join(', then ')}`);
                }
                return;
            }
            if (key === 'limit') {
                if (includeStructural) {
                    structural.push(`Limited to ${value} results`);
                }
                return;
            }
            if (key === 'offset') {
                if (includeStructural) {
                    structural.push(`Starting from result ${parseInt(value) + 1}`);
                }
                return;
            }
            // Handle logical operators
            if (key === 'or' || key === 'and') {
                const match = value.match(/^\((.+)\)$/);
                if (match) {
                    const conditions = match[1].split(',');
                    const logicalParts = conditions.map(cond => {
                        const [field, ...rest] = cond.split('.');
                        return parseFilterToVerbal(field, rest.join('.'), options);
                    }).filter(Boolean);
                    const joinWord = key === 'or' ? 'OR' : 'AND';
                    filters.push(`(${logicalParts.join(` ${joinWord} `)})`);
                }
                return;
            }
            // Regular field filters
            const verbal = parseFilterToVerbal(key, value, options);
            if (verbal) {
                filters.push(verbal);
            }
        });
        // Build the final verbal description
        if (filters.length > 0) {
            const joinWord = conjunction === 'or' ? ' OR ' : ' and ';
            parts.push(`Filtered where: ${filters.join(joinWord)}`);
        }
        if (structural.length > 0) {
            parts.push(...structural);
        }
        return parts.length > 0 ? parts.join('. ') + '.' : 'No filters applied';
    }
    catch (error) {
        console.error('Failed to convert query to verbal:', error);
        return 'Invalid query format';
    }
}
// Export for use in reports
export default QueryToVerbal;
