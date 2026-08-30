// Next.js Data Cache tags. The catalogue is cached indefinitely and only
// re-read from Supabase when one of these tags is revalidated — by a mutation
// route (the owner edited something) or by an explicit pull-to-refresh.
export const CATALOGUE_TAG = "catalogue";
export const RECOMMENDATIONS_TAG = "recommendations";
