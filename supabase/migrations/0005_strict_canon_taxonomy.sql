-- Strict-canon taxonomy — relabel owned works off movements that are no longer
-- in the taxonomy.
--
-- The movement vocabulary (lib/taxonomy.ts) is now exactly the set assigned in
-- data/all-books.tsv (the authoritative canon). Twelve labels were dropped from
-- the taxonomy; owned works still carrying them are relabelled here so no work
-- holds a movement the app can no longer produce or validate.
--
-- Policy: a real sub-movement folds into its canon parent; a genre (crime, SF,
-- dystopian, …) is NOT a movement and collapses to NULL, keeping only its period.
--
--   Stream of consciousness, Lost Generation -> Modernism
--   Metafiction, Nouveau Roman               -> Postmodernism
--   Contemporary literary fiction, Crime fiction, Autofiction, Satire,
--   Dystopian fiction, Science fiction, Epic poetry, Enlightenment -> NULL
--
-- Period columns are left untouched. Re-running is a no-op (the removed labels
-- are gone after the first run, so every WHERE below matches nothing).

-- 1. Primary movement: fold sub-movements into their canon parent.
update works set primary_movement = 'Modernism'
 where primary_movement in ('Stream of consciousness', 'Lost Generation');

update works set primary_movement = 'Postmodernism'
 where primary_movement in ('Metafiction', 'Nouveau Roman');

-- 2. Primary movement: genres / era labels with no canon home -> NULL.
update works set primary_movement = null
 where primary_movement in (
   'Contemporary literary fiction', 'Crime fiction', 'Autofiction', 'Satire',
   'Dystopian fiction', 'Science fiction', 'Epic poetry', 'Enlightenment'
 );

-- 3. Secondary movements ('|'-delimited TEXT): remap the sub-movements, drop the
--    genres, de-duplicate, and drop any entry that now equals the primary. Runs
--    after step 1/2 so the primary comparison sees the final value. Empty result
--    collapses to NULL.
update works w
   set secondary_movements = nullif(
     (
       select string_agg(distinct mapped, '|' order by mapped)
         from (
           select case trim(s)
                    when 'Stream of consciousness' then 'Modernism'
                    when 'Lost Generation'         then 'Modernism'
                    when 'Metafiction'             then 'Postmodernism'
                    when 'Nouveau Roman'           then 'Postmodernism'
                    else trim(s)
                  end as mapped
             from unnest(string_to_array(w.secondary_movements, '|')) as s
            where trim(s) <> ''
              and trim(s) not in (
                'Contemporary literary fiction', 'Crime fiction', 'Autofiction',
                'Satire', 'Dystopian fiction', 'Science fiction', 'Epic poetry',
                'Enlightenment'
              )
         ) t
        where t.mapped <> coalesce(w.primary_movement, '')
     ),
     ''
   )
 where w.secondary_movements ~
   '(Stream of consciousness|Lost Generation|Metafiction|Nouveau Roman|Contemporary literary fiction|Crime fiction|Autofiction|Satire|Dystopian fiction|Science fiction|Epic poetry|Enlightenment)';
