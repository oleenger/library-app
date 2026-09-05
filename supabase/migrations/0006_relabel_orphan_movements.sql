-- Relabel 55 owned works off pre-strict-canon movements (Neo-Romanticism,
-- National Romanticism, Oulipo, Minimalism, Elizabethan / Jacobean drama,
-- Medieval romance) onto taxonomy-valid movements. Research-backed mapping,
-- owner-approved. Secondary lists cleaned of out-of-taxonomy values and any
-- value equal to the new primary. Keyed by id; idempotent.
--
-- Mirror of scripts/apply-0006-relabel.ts (the applier actually run).

update works set primary_movement = 'Postmodernism', secondary_movements = null where id = 'georges-perec--life-a-user-s-manual'; -- Georges Perec: Life A User's Manual
update works set primary_movement = 'Postmodernism', secondary_movements = null where id = 'georges-perec--livet-bruksanvisning'; -- Georges Perec: Livet Bruksanvisning
update works set primary_movement = 'Postmodernism', secondary_movements = null where id = 'georges-perec--w-or-the-memory-of-childhood'; -- Georges Perec: W or the Memory of Childhood
update works set primary_movement = 'Naturalism', secondary_movements = null where id = 'hans-e-kinck--doktor-gabriel-jahr'; -- Hans E. Kinck: Doktor Gabriel Jahr
update works set primary_movement = 'Naturalism', secondary_movements = null where id = 'hans-e-kinck--emigranter'; -- Hans E. Kinck: Emigranter
update works set primary_movement = 'Naturalism', secondary_movements = null where id = 'hans-e-kinck--fru-anny-porse'; -- Hans E. Kinck: Fru Anny Porse
update works set primary_movement = 'Realism', secondary_movements = null where id = 'hans-e-kinck--herman-ek'; -- Hans E. Kinck: Herman Ek
update works set primary_movement = 'Realism', secondary_movements = null where id = 'hans-e-kinck--huldren'; -- Hans E. Kinck: Huldren
update works set primary_movement = 'Naturalism', secondary_movements = null where id = 'hans-e-kinck--presten'; -- Hans E. Kinck: Presten
update works set primary_movement = 'Realism', secondary_movements = null where id = 'hans-e-kinck--sneskavlen-brast'; -- Hans E. Kinck: Sneskavlen brast
update works set primary_movement = 'Realism', secondary_movements = null where id = 'hans-e-kinck--ungt-folk'; -- Hans E. Kinck: Ungt folk
update works set primary_movement = 'Romanticism', secondary_movements = null where id = 'henrik-ibsen--catilina'; -- Henrik Ibsen: Catilina
update works set primary_movement = 'Romanticism', secondary_movements = null where id = 'henrik-ibsen--fru-inger-til-oestraat'; -- Henrik Ibsen: Fru Inger til Østråt
update works set primary_movement = 'Romanticism', secondary_movements = null where id = 'henrik-ibsen--gildet-paa-solhaug'; -- Henrik Ibsen: Gildet på Solhaug
update works set primary_movement = 'Romanticism', secondary_movements = null where id = 'henrik-ibsen--haermaendene-paa-helgeland'; -- Henrik Ibsen: Hærmændene på Helgeland
update works set primary_movement = 'Romanticism', secondary_movements = null where id = 'henrik-ibsen--kjaerlighedens-komedie'; -- Henrik Ibsen: Kjærlighedens komedie
update works set primary_movement = 'Romanticism', secondary_movements = null where id = 'henrik-ibsen--kongs-emnerne'; -- Henrik Ibsen: Kongs-emnerne
update works set primary_movement = null, secondary_movements = null where id = 'kjell-askildsen--alt-som-f-r'; -- Kjell Askildsen: Alt som før
update works set primary_movement = null, secondary_movements = null where id = 'kjell-askildsen--heretter-f-lger-jeg-deg-helt-hjem'; -- Kjell Askildsen: Heretter følger jeg deg helt hjem
update works set primary_movement = null, secondary_movements = null where id = 'kjell-askildsen--kulisser'; -- Kjell Askildsen: Kulisser
update works set primary_movement = 'Modernism', secondary_movements = null where id = 'knut-hamsun--aftenroede'; -- Knut Hamsun: Aftenrøde
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--august'; -- Knut Hamsun: August
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--benoni'; -- Knut Hamsun: Benoni
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--boern-av-tiden'; -- Knut Hamsun: Børn av tiden
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--den-siste-glaede'; -- Knut Hamsun: Den siste glæde
update works set primary_movement = 'Modernism', secondary_movements = null where id = 'knut-hamsun--det-vilde-kor'; -- Knut Hamsun: Det vilde kor
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--dronning-tamara'; -- Knut Hamsun: Dronning Tamara
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--en-vandrer-spiller-med-sordin'; -- Knut Hamsun: En vandrer spiller med sordin
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--konerne-ved-vandposten'; -- Knut Hamsun: Konerne ved vandposten
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--kratskog'; -- Knut Hamsun: Kratskog
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--landstrykere'; -- Knut Hamsun: Landstrykere
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--livet-ivold'; -- Knut Hamsun: Livet ivold
update works set primary_movement = 'Modernism', secondary_movements = null where id = 'knut-hamsun--livets-spil'; -- Knut Hamsun: Livets spil
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--markens-groede'; -- Knut Hamsun: Markens grøde
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--men-livet-lever'; -- Knut Hamsun: Men livet lever
update works set primary_movement = 'Modernism', secondary_movements = null where id = 'knut-hamsun--munken-vendt'; -- Knut Hamsun: Munken Vendt
update works set primary_movement = 'Modernism', secondary_movements = null where id = 'knut-hamsun--mysterier'; -- Knut Hamsun: Mysterier
update works set primary_movement = 'Modernism', secondary_movements = null where id = 'knut-hamsun--ny-jord'; -- Knut Hamsun: Ny jord
update works set primary_movement = 'Modernism', secondary_movements = null where id = 'knut-hamsun--pan'; -- Knut Hamsun: Pan
update works set primary_movement = 'Modernism', secondary_movements = null where id = 'knut-hamsun--redaktoer-lynge'; -- Knut Hamsun: Redaktør Lynge
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--ringen-sluttet'; -- Knut Hamsun: Ringen sluttet
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--rosa'; -- Knut Hamsun: Rosa
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--segelfoss-by'; -- Knut Hamsun: Segelfoss by
update works set primary_movement = 'Modernism', secondary_movements = null where id = 'knut-hamsun--siesta'; -- Knut Hamsun: Siesta
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--siste-kapitel'; -- Knut Hamsun: Siste kapitel
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--stridende-liv'; -- Knut Hamsun: Stridende liv
update works set primary_movement = 'Modernism', secondary_movements = null where id = 'knut-hamsun--sult'; -- Knut Hamsun: Sult
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--svaermere'; -- Knut Hamsun: Sværmere
update works set primary_movement = 'Realism', secondary_movements = null where id = 'knut-hamsun--under-hoeststjaernen'; -- Knut Hamsun: Under høststjærnen
update works set primary_movement = 'Modernism', secondary_movements = null where id = 'knut-hamsun--ved-rikets-port'; -- Knut Hamsun: Ved rikets port
update works set primary_movement = 'Modernism', secondary_movements = null where id = 'knut-hamsun--victoria'; -- Knut Hamsun: Victoria
update works set primary_movement = null, secondary_movements = null where id = 'murasaki-shikibu--the-tale-of-genji'; -- Murasaki Shikibu: The Tale of Genji
update works set primary_movement = null, secondary_movements = null where id = 'william-shakespeare--hamlet'; -- William Shakespeare: Hamlet
update works set primary_movement = null, secondary_movements = null where id = 'william-shakespeare--macbeth'; -- William Shakespeare: Macbeth
update works set primary_movement = null, secondary_movements = null where id = 'william-shakespeare--othello'; -- William Shakespeare: Othello
