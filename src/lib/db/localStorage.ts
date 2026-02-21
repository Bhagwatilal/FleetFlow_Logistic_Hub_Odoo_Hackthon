
import { uuid, now, STORAGE_PREFIX, DEFAULTS } from './schema';
import { notifyChange } from './realtime';

// ── Storage helpers ───────────────────────────────────────────────────────────

function storageKey(table: string): string {
    return `${STORAGE_PREFIX}${table}`;
}

function loadTable<T = Record<string, unknown>>(table: string): T[] {
    try {
        const raw = localStorage.getItem(storageKey(table));
        return raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
        return [];
    }
}

function saveTable<T>(table: string, rows: T[]): void {
    localStorage.setItem(storageKey(table), JSON.stringify(rows));
}

// ── Join parser ───────────────────────────────────────────────────────────────
// Parses Supabase-style select strings like:
//   "*, vehicle:vehicles(*), driver:drivers(*)"
// Returns an array of join descriptors.

interface JoinSpec {
    alias: string;       // key to attach on the row, e.g. "vehicle"
    targetTable: string; // table to join from, e.g. "vehicles"
    fkGuesses: string[]; // candidate FK column names
}

function parseSelectJoins(select: string): JoinSpec[] {
    const joins: JoinSpec[] = [];
    const parts = select.split(',').map((s) => s.trim());
    for (const part of parts) {
        // Match patterns like:  vehicle:vehicles(*)  OR  driver:drivers(*)
        const m = part.match(/^(\w+):(\w+)\(\*\)$/);
        if (m) {
            const [, alias, targetTable] = m;
            // Common FK naming conventions to try
            joins.push({
                alias,
                targetTable,
                fkGuesses: [
                    `${alias}_id`,
                    `${targetTable.replace(/s$/, '')}_id`,
                    `${targetTable}_id`,
                ],
            });
        }
    }
    return joins;
}

function resolveJoins(
    rows: Record<string, unknown>[],
    joins: JoinSpec[]
): Record<string, unknown>[] {
    if (joins.length === 0) return rows;
    return rows.map((row) => {
        const enriched = { ...row };
        for (const { alias, targetTable, fkGuesses } of joins) {
            let fkValue: unknown = null;
            for (const fk of fkGuesses) {
                if (row[fk] !== undefined) {
                    fkValue = row[fk];
                    break;
                }
            }
            if (fkValue) {
                const related = loadTable(targetTable);
                enriched[alias] = related.find((r) => (r as Record<string, unknown>)['id'] === fkValue) ?? null;
            } else {
                enriched[alias] = null;
            }
        }
        return enriched;
    });
}

// ── Result type ───────────────────────────────────────────────────────────────

interface DbResult<T> {
    data: T | null;
    error: { message: string } | null;
}

// ── Query Builder ─────────────────────────────────────────────────────────────

type FilterMode = 'eq' | 'neq';
interface Filter {
    mode: FilterMode;
    col: string;
    val: unknown;
}

interface OrderSpec {
    col: string;
    ascending: boolean;
}

type Operation = 'select' | 'insert' | 'update' | 'delete';

class QueryBuilder {
    private _table: string;
    private _operation: Operation = 'select';
    private _selectStr: string = '*';
    private _payload: Record<string, unknown> = {};
    private _filters: Filter[] = [];
    private _orderSpec: OrderSpec | null = null;
    private _limitVal: number | null = null;
    private _single: boolean = false;

    constructor(table: string) {
        this._table = table;
    }

    // ── Terminal operations (kick off execution) ────────────────────────────────

    select(columns: string = '*'): this {
        this._operation = 'select';
        this._selectStr = columns;
        return this;
    }

    insert(payload: Record<string, unknown> | Record<string, unknown>[]): Promise<DbResult<Record<string, unknown>[]>> {
        this._operation = 'insert';
        const rows = Array.isArray(payload) ? payload : [payload];
        return this._executeInsert(rows);
    }

    update(payload: Record<string, unknown>): this {
        this._operation = 'update';
        this._payload = payload;
        return this;
    }

    delete(): this {
        this._operation = 'delete';
        return this;
    }

    // ── Filter chain ─────────────────────────────────────────────────────────────

    eq(col: string, val: unknown): this {
        this._filters.push({ mode: 'eq', col, val });
        return this;
    }

    neq(col: string, val: unknown): this {
        this._filters.push({ mode: 'neq', col, val });
        return this;
    }

    order(col: string, opts: { ascending?: boolean } = {}): this {
        this._orderSpec = { col, ascending: opts.ascending !== false };
        return this;
    }

    limit(n: number): this {
        this._limitVal = n;
        return this;
    }

    // ── Materialisation ──────────────────────────────────────────────────────────

    /** Resolve the query and return { data, error } */
    then<TResult>(
        onfulfilled?: ((value: DbResult<Record<string, unknown>[]>) => TResult) | null,
        onrejected?: ((reason: unknown) => TResult) | null
    ): Promise<TResult> {
        return this._execute().then(onfulfilled as any, onrejected as any);
    }

    /** await-able shorthand */
    [Symbol.toStringTag] = 'QueryBuilder';

    /** Single row or null */
    async maybeSingle(): Promise<DbResult<Record<string, unknown>>> {
        const result = await this._execute();
        if (result.error) return { data: null, error: result.error };
        return {
            data: (result.data && result.data.length > 0) ? result.data[0] : null,
            error: null,
        };
    }

    // ── Private execution ─────────────────────────────────────────────────────────

    private async _execute(): Promise<DbResult<Record<string, unknown>[]>> {
        try {
            if (this._operation === 'select') return this._executeSelect();
            if (this._operation === 'update') return this._executeUpdate();
            if (this._operation === 'delete') return this._executeDelete();
            return { data: [], error: null };
        } catch (e: unknown) {
            return { data: null, error: { message: String(e) } };
        }
    }

    private _executeSelect(): DbResult<Record<string, unknown>[]> {
        let rows = loadTable<Record<string, unknown>>(this._table);

        // Apply filters
        rows = this._applyFilters(rows);

        // Apply ordering
        if (this._orderSpec) {
            const { col, ascending } = this._orderSpec;
            rows = rows.slice().sort((a, b) => {
                const av = a[col] as string | number;
                const bv = b[col] as string | number;
                if (av < bv) return ascending ? -1 : 1;
                if (av > bv) return ascending ? 1 : -1;
                return 0;
            });
        }

        // Apply limit
        if (this._limitVal !== null) {
            rows = rows.slice(0, this._limitVal);
        }

        // Resolve joins
        const joins = parseSelectJoins(this._selectStr);
        if (joins.length > 0) {
            rows = resolveJoins(rows, joins);
        }

        return { data: rows, error: null };
    }

    private async _executeInsert(payloads: Record<string, unknown>[]): Promise<DbResult<Record<string, unknown>[]>> {
        try {
            const table = this._table;
            const existing = loadTable<Record<string, unknown>>(table);
            const defaults = (DEFAULTS as Record<string, () => Record<string, unknown>>)[table]?.() ?? {};

            const inserted: Record<string, unknown>[] = [];
            for (const payload of payloads) {
                const ts = now();
                const row: Record<string, unknown> = {
                    ...defaults,
                    ...payload,
                    id: (payload['id'] as string) || uuid(),
                    created_at: ts,
                };
                // Attach updated_at only for tables that have it
                if (!['expenses', 'audit_logs', 'user_roles'].includes(table)) {
                    row['updated_at'] = ts;
                }
                existing.push(row);
                inserted.push(row);
            }
            saveTable(table, existing);
            notifyChange(table);
            return { data: inserted, error: null };
        } catch (e: unknown) {
            return { data: null, error: { message: String(e) } };
        }
    }

    private _executeUpdate(): DbResult<Record<string, unknown>[]> {
        const table = this._table;
        let rows = loadTable<Record<string, unknown>>(table);
        const updated: Record<string, unknown>[] = [];

        rows = rows.map((row) => {
            if (this._matchesFilters(row)) {
                const ts = now();
                const newRow: Record<string, unknown> = { ...row, ...this._payload };
                if (!['expenses', 'audit_logs', 'user_roles'].includes(table)) {
                    newRow['updated_at'] = ts;
                }
                updated.push(newRow);
                return newRow;
            }
            return row;
        });

        saveTable(table, rows);
        notifyChange(table);
        return { data: updated, error: null };
    }

    private _executeDelete(): DbResult<Record<string, unknown>[]> {
        const table = this._table;
        const rows = loadTable<Record<string, unknown>>(table);
        const deleted: Record<string, unknown>[] = [];
        const remaining = rows.filter((row) => {
            if (this._matchesFilters(row)) {
                deleted.push(row);
                return false;
            }
            return true;
        });

        saveTable(table, remaining);
        notifyChange(table);
        return { data: deleted, error: null };
    }

    private _applyFilters(rows: Record<string, unknown>[]): Record<string, unknown>[] {
        return rows.filter((row) => this._matchesFilters(row));
    }

    private _matchesFilters(row: Record<string, unknown>): boolean {
        return this._filters.every(({ mode, col, val }) => {
            if (mode === 'eq') return row[col] === val;
            if (mode === 'neq') return row[col] !== val;
            return true;
        });
    }
}

// ── Main DB factory ───────────────────────────────────────────────────────────

export function from(table: string): QueryBuilder {
    return new QueryBuilder(table);
}

export { saveTable, loadTable };
