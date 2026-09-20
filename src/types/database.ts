/**
 * Placeholder for Supabase-generated database types.
 *
 * When connected to a real Supabase project, generate types with:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
 *
 * For now, we use manual type definitions in ./index.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
