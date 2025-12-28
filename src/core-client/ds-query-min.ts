// apply-data-core-query-min.ts
type DC = {
  select: (...fields: string[]) => DC;
  order: (key: string, ascending?: boolean) => DC;
  limit: (n: number) => DC;
  offset: (n: number) => DC;
  eq: (k: string, v: string | number) => DC;
  neq: (k: string, v: string | number) => DC;
  lt: (k: string, v: string) => DC;
  lte: (k: string, v: string) => DC;
  gt: (k: string, v: string) => DC;
  gte: (k: string, v: string) => DC;
  between: (k: string, a: string, b: string) => DC;
  notBetween: (k: string, a: string, b: string) => DC;
  ilike: (k: string, v: string) => DC;
  plfts: (k: string, v: string) => DC;
  cs: (k: string, v: string) => DC;
  like: (k: string, v: string) => DC;
  not_like: (k: string, v: string) => DC;
  startWith: (k: string, v: string) => DC;
  endWith: (k: string, v: string) => DC;
  in: (k: string, vals: (string | number)[]) => DC;
  contains: (k: string, vals: (string | number)[], negative?: boolean) => DC;
  isNull: (k: string) => DC;
  or: (conds: string[]) => DC;
  and: (conds: string[]) => DC;
};

const STRUCTURAL_KEYS = new Set(['select', 'order', 'limit', 'offset', 'or', 'and']);
const WILDCARD_REGEX = /^\*|\*$/g;

function splitTopLevelComma(s: string): string[] {
  const out: string[] = [];
  let depth = 0, braceDepth = 0, token = "";
  
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === "{") braceDepth++;
    else if (ch === "}") braceDepth = Math.max(0, braceDepth - 1);

    if (ch === "," && depth === 0 && braceDepth === 0) {
      const trimmed = token.trim();
      if (trimmed) out.push(trimmed);
      token = "";
    } else {
      token += ch;
    }
  }
  
  const trimmed = token.trim();
  if (trimmed) out.push(trimmed);
  return out;
}

const strip = (s: string, prefix: string, suffix: string): string =>
  s.startsWith(prefix) && s.endsWith(suffix) 
    ? s.slice(prefix.length, -suffix.length) 
    : s;

function parseBoolNumOrStr(v: string): string | number | boolean {
  const decoded = decodeURIComponent(v);
  if (decoded === "true") return true;
  if (decoded === "false") return false;
  const num = Number(decoded);
  return Number.isNaN(num) ? decoded : num;
}

function normalizeQueryString(input: string): string {
  try {
    if (input.includes("://")) {
      return new URL(input).search.slice(1);
    }
  } catch {}
  return input.startsWith("?") ? input.slice(1) : input;
}

function handleSelect(dc: DC, value: string): void {
  dc.select(...splitTopLevelComma(value).map(decodeURIComponent));
}

function handleOrder(dc: DC, values: string[]): void {
  for (const orderSpec of values) {
    const [col, dir = "asc"] = orderSpec.split(".");
    dc.order(decodeURIComponent(col), dir.toLowerCase() !== "desc");
  }
}

function handleLogicalOp(dc: DC, op: 'or' | 'and', value: string): void {
  dc[op](splitTopLevelComma(strip(value, "(", ")")));
}

function handleInOperator(dc: DC, key: string, value: string): boolean {
  if (!value.startsWith("in.(")) return false;
  const inner = strip(value, "in.(", ")");
  const list = splitTopLevelComma(inner).map(parseBoolNumOrStr);
  dc.in(key, list as (string | number)[]);
  return true;
}

function handleContainsOperator(dc: DC, key: string, value: string): boolean {
  if (!value.startsWith("cs.{") && !value.startsWith("not.cs.{")) return false;
  const isNegative = value.startsWith("not.cs.");
  const braces = value.replace(/^not\./, "").slice(3);
  const inner = strip(braces, ".{", "}");
  const list = splitTopLevelComma(inner).map(parseBoolNumOrStr);
  dc.contains(key, list as (string | number)[], isNegative);
  return true;
}

function handleRangeOperator(dc: DC, key: string, value: string): boolean {
  if (value.startsWith("between.")) {
    const [a, b] = splitTopLevelComma(value.slice(8));
    if (a && b) dc.between(key, decodeURIComponent(a), decodeURIComponent(b));
    return true;
  }
  if (value.startsWith("notbetween.")) {
    const [a, b] = splitTopLevelComma(value.slice(11));
    if (a && b) dc.notBetween(key, decodeURIComponent(a), decodeURIComponent(b));
    return true;
  }
  return false;
}

function handleLikeOperators(dc: DC, key: string, value: string): boolean {
  const likeHandlers: Record<string, (payload: string) => void> = {
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

function handleComparisonOperator(dc: DC, key: string, value: string): void {
  const dotIndex = value.indexOf(".");
  
  if (dotIndex === -1) {
    dc.eq(key, parseBoolNumOrStr(value) as any);
    return;
  }

  const op = value.slice(0, dotIndex);
  const payload = value.slice(dotIndex + 1);
  const decoded = decodeURIComponent(payload);

  const operators: Record<string, () => void> = {
    eq: () => dc.eq(key, parseBoolNumOrStr(payload) as any),
    neq: () => dc.neq(key, parseBoolNumOrStr(payload) as any),
    gt: () => dc.gt(key, decoded),
    gte: () => dc.gte(key, decoded),
    lt: () => dc.lt(key, decoded),
    lte: () => dc.lte(key, decoded)
  };

  (operators[op] ?? (() => dc.eq(key, parseBoolNumOrStr(payload) as any)))();
}

export function ApplyQuery(dc: DC, input: string): DC {
  const qs = normalizeQueryString(input);
  const params = new URLSearchParams(qs);

  // Handle structural parameters
  const selectValue = params.get("select");
  if (selectValue) handleSelect(dc, selectValue);

  const orderValues = params.getAll("order");
  if (orderValues.length) handleOrder(dc, orderValues);

  const limit = params.get("limit");
  if (limit && !isNaN(+limit)) dc.limit(+limit);

  const offset = params.get("offset");
  if (offset && !isNaN(+offset)) dc.offset(+offset);

  params.getAll("or").forEach(v => handleLogicalOp(dc, 'or', v));
  params.getAll("and").forEach(v => handleLogicalOp(dc, 'and', v));

  // Handle field filters
  for (const [key, value] of params.entries()) {
    if (STRUCTURAL_KEYS.has(key) || value == null) continue;

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
    if (handleInOperator(dc, key, value)) continue;
    if (handleContainsOperator(dc, key, value)) continue;
    if (handleRangeOperator(dc, key, value)) continue;
    if (handleLikeOperators(dc, key, value)) continue;

    // Default to comparison operators
    handleComparisonOperator(dc, key, value);
  }

  return dc;
}