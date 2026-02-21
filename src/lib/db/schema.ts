
export const STORAGE_PREFIX = 'fleetflow_';

// ── Table names ───────────────────────────────────────────────────────────────
export const TABLES = {
    profiles: 'profiles',
    user_roles: 'user_roles',
    vehicles: 'vehicles',
    drivers: 'drivers',
    trips: 'trips',
    maintenance_logs: 'maintenance_logs',
    expenses: 'expenses',
    audit_logs: 'audit_logs',
} as const;

// ── Enum literals (match the SQL ENUMs exactly) ────────────────────────────
export type VehicleType = 'truck' | 'van' | 'bike';
export type VehicleStatus = 'available' | 'on_trip' | 'in_shop' | 'retired';
export type TripStatus = 'draft' | 'dispatched' | 'completed' | 'cancelled';
export type DriverStatus = 'on_duty' | 'off_duty' | 'suspended';
export type MaintenanceStatus = 'new' | 'in_progress' | 'resolved';
export type AppRole = 'fleet_manager' | 'dispatcher' | 'safety_officer' | 'financial_analyst';

// ── UUID v4 generator ─────────────────────────────────────────────────────────
export function uuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // polyfill for environments that lack crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

// ── Timestamp helper ──────────────────────────────────────────────────────────
export function now(): string {
    return new Date().toISOString();
}

// ── Default factory functions (mirror SQL DEFAULT values) ─────────────────────
export const DEFAULTS = {
    vehicles: () => ({
        type: 'truck' as VehicleType,
        max_capacity: 0,
        odometer: 0,
        status: 'available' as VehicleStatus,
    }),
    drivers: () => ({
        completion_rate: 100,
        safety_score: 100,
        complaints: 0,
        status: 'off_duty' as DriverStatus,
    }),
    trips: () => ({
        cargo_weight: 0,
        estimated_fuel_cost: 0,
        final_odometer: null as number | null,
        status: 'draft' as TripStatus,
        vehicle_id: null as string | null,
        driver_id: null as string | null,
    }),
    maintenance_logs: () => ({
        cost: 0,
        service_date: new Date().toISOString().slice(0, 10),
        status: 'new' as MaintenanceStatus,
    }),
    expenses: () => ({
        distance: 0,
        fuel_cost: 0,
        misc_expense: 0,
        driver_id: null as string | null,
    }),
    profiles: () => ({
        full_name: '',
        email: '',
    }),
    audit_logs: () => ({
        user_id: null as string | null,
        entity_id: null as string | null,
        details: null as Record<string, unknown> | null,
    }),
    user_roles: () => ({}),
} as const;
