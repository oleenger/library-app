// Hand-written Database types for the Supabase client. Small enough that
// generating them via the Supabase CLI adds little; keeping them here means the
// data layer is fully typed without a codegen step in the build.
//
// The `Relationships: []` and Insert/Update shapes match what @supabase/supabase-js
// expects from generated types — omitting them collapses row inference to `never`.

export type WorksRow = {
  id: string;
  title: string;
  author: string;
  author_sort: string | null;
  first_published: number | null;
  original_language: string | null;
  period: string | null;
  primary_movement: string | null;
  secondary_movements: string | null;
  notes: string | null;
}

export type EditionsRow = {
  id: string;
  name: string;
  publisher: string | null;
  language: string | null;
  format: string;
}

export type WorkEditionsRow = {
  work_id: string;
  edition_id: string;
}

export type ReadStatusRow = {
  work_id: string;
  title: string | null;
  author: string | null;
  date_read: string | null;
  rating: number | null;
  source: string | null;
}

export type RecommendationsRow = {
  kind: "taste" | "canon";
  fingerprint: string;
  generated_at: string;
  model: string;
  based_on: number;
  items: unknown;
}

export type GoodreadsReadsRow = {
  title: string;
  author: string;
  year: number | null;
  date_read: string | null;
  rating: number | null;
  imported_at: string;
}

export interface Database {
  public: {
    Tables: {
      works: {
        Row: WorksRow;
        Insert: Omit<WorksRow, "author_sort"> & { author_sort?: string | null };
        Update: Partial<WorksRow>;
        Relationships: [];
      };
      editions: {
        Row: EditionsRow;
        Insert: EditionsRow;
        Update: Partial<EditionsRow>;
        Relationships: [];
      };
      work_editions: {
        Row: WorkEditionsRow;
        Insert: WorkEditionsRow;
        Update: Partial<WorkEditionsRow>;
        Relationships: [];
      };
      read_status: {
        Row: ReadStatusRow;
        Insert: ReadStatusRow;
        Update: Partial<ReadStatusRow>;
        Relationships: [];
      };
      recommendations: {
        Row: RecommendationsRow;
        Insert: RecommendationsRow;
        Update: Partial<RecommendationsRow>;
        Relationships: [];
      };
      goodreads_reads: {
        Row: GoodreadsReadsRow;
        Insert: Omit<GoodreadsReadsRow, "imported_at"> & { imported_at?: string };
        Update: Partial<GoodreadsReadsRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
