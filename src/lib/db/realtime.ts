
export const REALTIME_EVENT = 'fleetflow:db:change';

export interface ChannelConfig {
    event: string;
    schema?: string;
    table?: string;
}

type ChannelCallback = (payload?: unknown) => void;

export interface RealtimeChannel {
    name: string;
    on(event: string, config: ChannelConfig, callback: ChannelCallback): RealtimeChannel;
    subscribe(): RealtimeChannel;
    _handlers: Array<{ table?: string; callback: ChannelCallback }>;
}

// Global registry so removeChannel can clean up listeners
const channelRegistry = new Map<string, { channel: RealtimeChannel; listener: EventListener }>();

export function createChannel(name: string): RealtimeChannel {
    const handlers: Array<{ table?: string; callback: ChannelCallback }> = [];

    const channel: RealtimeChannel = {
        name,
        _handlers: handlers,
        on(_event: string, config: ChannelConfig, callback: ChannelCallback) {
            handlers.push({ table: config.table, callback });
            return channel;
        },
        subscribe() {
            // Attach a DOM event listener for data change events
            const listener = ((e: CustomEvent) => {
                const changedTable = e.detail?.table as string | undefined;
                handlers.forEach(({ table, callback }) => {
                    if (!table || table === changedTable) {
                        callback(e.detail);
                    }
                });
            }) as EventListener;

            window.addEventListener(REALTIME_EVENT, listener);
            channelRegistry.set(name, { channel, listener });
            return channel;
        },
    };

    return channel;
}

export function removeChannel(channel: RealtimeChannel): void {
    const entry = channelRegistry.get(channel.name);
    if (entry) {
        window.removeEventListener(REALTIME_EVENT, entry.listener);
        channelRegistry.delete(channel.name);
    }
}

/** Called by the DB engine after any mutation to notify subscribers. */
export function notifyChange(table: string): void {
    window.dispatchEvent(
        new CustomEvent(REALTIME_EVENT, { detail: { table, event: '*', schema: 'public' } })
    );
}
