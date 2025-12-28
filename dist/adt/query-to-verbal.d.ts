/**
 * Convert PostgREST query string to human-readable text for reports
 */
interface QueryVerbalOptions {
    fieldLabels?: Record<string, string>;
    valueLabels?: Record<string, Record<string, string>>;
    includeStructural?: boolean;
    conjunction?: 'and' | 'or';
}
export declare function QueryToVerbal(queryString: string, options?: QueryVerbalOptions): string;
export default QueryToVerbal;
