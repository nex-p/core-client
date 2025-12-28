const STRUCTURAL_KEYS = new Set(['select', 'order', 'limit', 'offset', 'or', 'and']);
const WILDCARD_REGEX = /^\*|\*$/g;
function splitTopLevelComma(s) {
    const out = [];
    let depth = 0, braceDepth = 0, token = "";
    for (const ch of s) {
        if (ch === "(")
            depth++;
        else if (ch === ")")
            depth = Math.max(0, depth - 1);
        else if (ch === "{")
            braceDepth++;
        else if (ch === "}")
            braceDepth = Math.max(0, braceDepth - 1);
        if (ch === "," && depth === 0 && braceDepth === 0) {
            const trimmed = token.trim();
            if (trimmed)
                out.push(trimmed);
            token = "";
        }
        else {
            token += ch;
        }
    }
    const trimmed = token.trim();
    if (trimmed)
        out.push(trimmed);
    return out;
}
const strip = (s, prefix, suffix) => s.startsWith(prefix) && s.endsWith(suffix)
    ? s.slice(prefix.length, -suffix.length)
    : s;
function parseBoolNumOrStr(v) {
    const decoded = decodeURIComponent(v);
    if (decoded === "true")
        return true;
    if (decoded === "false")
        return false;
    const num = Number(decoded);
    return Number.isNaN(num) ? decoded : num;
}
function normalizeQueryString(input) {
    try {
        if (input.includes("://")) {
            return new URL(input).search.slice(1);
        }
    }
    catch (_a) { }
    return input.startsWith("?") ? input.slice(1) : input;
}
function handleSelect(dc, value) {
    dc.select(...splitTopLevelComma(value).map(decodeURIComponent));
}
function handleOrder(dc, values) {
    for (const orderSpec of values) {
        const [col, dir = "asc"] = orderSpec.split(".");
        dc.order(decodeURIComponent(col), dir.toLowerCase() !== "desc");
    }
}
function handleLogicalOp(dc, op, value) {
    dc[op](splitTopLevelComma(strip(value, "(", ")")));
}
function handleInOperator(dc, key, value) {
    if (!value.startsWith("in.("))
        return false;
    const inner = strip(value, "in.(", ")");
    const list = splitTopLevelComma(inner).map(parseBoolNumOrStr);
    dc.in(key, list);
    return true;
}
function handleContainsOperator(dc, key, value) {
    if (!value.startsWith("cs.{") && !value.startsWith("not.cs.{"))
        return false;
    const isNegative = value.startsWith("not.cs.");
    const braces = value.replace(/^not\./, "").slice(3);
    const inner = strip(braces, ".{", "}");
    const list = splitTopLevelComma(inner).map(parseBoolNumOrStr);
    dc.contains(key, list, isNegative);
    return true;
}
function handleRangeOperator(dc, key, value) {
    if (value.startsWith("between.")) {
        const [a, b] = splitTopLevelComma(value.slice(8));
        if (a && b)
            dc.between(key, decodeURIComponent(a), decodeURIComponent(b));
        return true;
    }
    if (value.startsWith("notbetween.")) {
        const [a, b] = splitTopLevelComma(value.slice(11));
        if (a && b)
            dc.notBetween(key, decodeURIComponent(a), decodeURIComponent(b));
        return true;
    }
    return false;
}
function handleLikeOperators(dc, key, value) {
    const likeHandlers = {
        "like.": (p) => dc.like(key, decodeURIComponent(p.replace(WILDCARD_REGEX, ""))),
        "not.like.": (p) => dc.not_like(key, decodeURIComponent(p.replace(WILDCARD_REGEX, ""))),
        "ilike.": (p) => dc.ilike(key, decodeURIComponent(p.replace(WILDCARD_REGEX, ""))),
        "starts.": (p) => dc.startWith(key, decodeURIComponent(p)),
        "ends.": (p) => dc.endWith(key, decodeURIComponent(p))
    };
    for (const [prefix, handler] of Object.entries(likeHandlers)) {
        if (value.startsWith(prefix)) {
            handler(value.slice(prefix.length));
            return true;
        }
    }
    return false;
}
function handleComparisonOperator(dc, key, value) {
    var _a;
    const dotIndex = value.indexOf(".");
    if (dotIndex === -1) {
        dc.eq(key, parseBoolNumOrStr(value));
        return;
    }
    const op = value.slice(0, dotIndex);
    const payload = value.slice(dotIndex + 1);
    const decoded = decodeURIComponent(payload);
    const operators = {
        eq: () => dc.eq(key, parseBoolNumOrStr(payload)),
        neq: () => dc.neq(key, parseBoolNumOrStr(payload)),
        gt: () => dc.gt(key, decoded),
        gte: () => dc.gte(key, decoded),
        lt: () => dc.lt(key, decoded),
        lte: () => dc.lte(key, decoded)
    };
    ((_a = operators[op]) !== null && _a !== void 0 ? _a : (() => dc.eq(key, parseBoolNumOrStr(payload))))();
}
export function ApplyQuery(dc, input) {
    const qs = normalizeQueryString(input);
    const params = new URLSearchParams(qs);
    // Handle structural parameters
    const selectValue = params.get("select");
    if (selectValue)
        handleSelect(dc, selectValue);
    const orderValues = params.getAll("order");
    if (orderValues.length)
        handleOrder(dc, orderValues);
    const limit = params.get("limit");
    if (limit && !isNaN(+limit))
        dc.limit(+limit);
    const offset = params.get("offset");
    if (offset && !isNaN(+offset))
        dc.offset(+offset);
    params.getAll("or").forEach(v => handleLogicalOp(dc, 'or', v));
    params.getAll("and").forEach(v => handleLogicalOp(dc, 'and', v));
    // Handle field filters
    for (const [key, value] of params.entries()) {
        if (STRUCTURAL_KEYS.has(key) || value == null)
            continue;
        // Unary operators
        if (value === "is.null") {
            dc.isNull(key);
            continue;
        }
        // Full-text search
        if (value.startsWith("phfts(english).")) {
            dc.plfts(key, decodeURIComponent(value.slice(15)));
            continue;
        }
        // Try specialized handlers
        if (handleInOperator(dc, key, value))
            continue;
        if (handleContainsOperator(dc, key, value))
            continue;
        if (handleRangeOperator(dc, key, value))
            continue;
        if (handleLikeOperators(dc, key, value))
            continue;
        // Default to comparison operators
        handleComparisonOperator(dc, key, value);
    }
    return dc;
}
