import { from } from './localStorage';
import { localAuth } from './auth';
import { createChannel, removeChannel } from './realtime';

export function createLocalClient() {
    return {
        /** Query builder — mirrors supabase.from() */
        from: (table: string) => from(table),

        /** Auth — mirrors supabase.auth.* */
        auth: localAuth,

        /** Realtime channel — mirrors supabase.channel() */
        channel: (name: string) => createChannel(name),

        /** Remove channel — mirrors supabase.removeChannel() */
        removeChannel: (ch: ReturnType<typeof createChannel>) => removeChannel(ch),
    };
}

export type LocalClient = ReturnType<typeof createLocalClient>;
