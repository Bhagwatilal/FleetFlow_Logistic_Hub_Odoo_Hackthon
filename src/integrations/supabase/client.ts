import { createLocalClient } from '@/lib/db/client';

// Export as `supabase` for use throughout the app
export const supabase = createLocalClient();
