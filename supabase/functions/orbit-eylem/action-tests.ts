import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { findCatalogueAnime, parseCatalogue, searchCatalogue } from './catalogue.ts';
import {
  normalizeCollectionText,
  presentCollectionRows,
  validateCollectionAnimeIds,
  validateCollectionDetails,
} from './collection-actions.ts';
import { isJournalDate, presentJournalRows, validateJournalValues } from './journal-actions.ts';
import { prepareListMutation, presentListRows } from './personal-list-actions.ts';

const rawCatalogue = JSON.parse(await readFile('src/data/catalogue.json', 'utf8'));
const catalogue = parseCatalogue(rawCatalogue);
assert.ok(catalogue, 'production catalogue must satisfy the agent catalogue contract');
assert.equal(parseCatalogue(rawCatalogue.items)?.items.length, rawCatalogue.items.length,
  'the public /data/catalogue.json array shape must satisfy the agent catalogue contract');

assert.equal(findCatalogueAnime(catalogue, 'this-anime-does-not-exist'), null,
  'invented IDs must never resolve');
assert.equal(findCatalogueAnime(catalogue, '20')?.title, 'Naruto');
assert.equal(searchCatalogue(catalogue, 'Naruto', 10)[0]?.id, '20');
assert.equal(searchCatalogue(catalogue, 'kitsu:11', 10)[0]?.id, '20');

const malCatalogue = parseCatalogue({
  items: [{
    id: 'kitsu-11469', kitsuId: '11469', malId: '31964', slug: 'boku-no-hero-academia-kitsu-11469',
    title: 'Boku no Hero Academia', type: 'TV', episodes: 13, status: 'FINISHED', synonyms: ['My Hero Academia'],
    season: { season: 'SPRING', year: 2016 }, durationSeconds: 1440, score: 8,
    studios: ['Bones'], tags: ['action'], sources: ['https://kitsu.app/anime/11469'],
  }],
});
assert.ok(malCatalogue);
assert.equal(searchCatalogue(malCatalogue, 'mal:31964', 10)[0]?.id, 'kitsu-11469');
assert.equal(searchCatalogue(malCatalogue, 'My Hero Academia', 10)[0]?.id, 'kitsu-11469');

const naruto = findCatalogueAnime(catalogue, '20');
assert.ok(naruto);
assert.deepEqual(prepareListMutation({ durum: 'COMPLETED' }, naruto), {
  ok: true,
  values: { status: 'COMPLETED', progress: naruto.episodes },
});
assert.deepEqual(prepareListMutation({ durum: 'PLANNED', ilerleme: 1 }, naruto), {
  ok: true,
  values: { status: 'WATCHING', progress: 1 },
});
assert.equal(prepareListMutation({ durum: 'WATCHING', ilerleme: naruto.episodes + 1 }, naruto).ok, false);
assert.deepEqual(prepareListMutation({ durum: 'COMPLETED', puaniTemizle: true }, naruto), {
  ok: true,
  values: { status: 'COMPLETED', progress: naruto.episodes, score: null },
});
assert.equal(prepareListMutation({ durum: 'WATCHING', puan: 8, puaniTemizle: true }, naruto).ok, false);
assert.equal(prepareListMutation({ durum: 'WATCHING', puaniTemizle: 'evet' }, naruto).ok, false);

const listPage = presentListRows([
  { anime_id: '20', status: 'WATCHING', progress: 4, score: 8, note: 'Köprü bölümü.' },
  { anime_id: 'ghost', status: 'PLANNED', progress: 0, score: null, note: '' },
  { anime_id: '1', status: 'COMPLETED', progress: 1, score: null, note: 'Sessiz final.' },
], catalogue, 1, 1);
assert.equal(listPage.toplam, 2, 'pagination total must cover every valid active row');
assert.equal(listPage.donen, 1);
assert.equal(listPage.offset, 1);
assert.equal(listPage.dahaVar, false);
assert.deepEqual(listPage.gecersizKayitlar, [{ animeId: 'ghost' }]);
assert.equal((listPage.kayitlar as Array<{ not: string }>)[0]?.not, 'Sessiz final.');
const firstListPage = presentListRows([
  { anime_id: '20', status: 'WATCHING', progress: 4, score: 8, note: 'Köprü bölümü.' },
  { anime_id: '1', status: 'COMPLETED', progress: 1, score: null, note: 'Sessiz final.' },
], catalogue, 0, 1);
assert.equal(firstListPage.dahaVar, true);
assert.equal(firstListPage.sonrakiOffset, 1);

assert.equal(isJournalDate('2026-08-23'), true);
assert.equal(isJournalDate('2026-02-29'), false);
assert.equal(isJournalDate('23-08-2026'), false);
assert.equal(validateJournalValues({
  episodeStart: 1,
  episodeEnd: naruto.episodes,
  watchedOn: '2026-08-23',
  note: 'Maraton.',
}, naruto), null);
assert.match(validateJournalValues({
  episodeStart: 1,
  episodeEnd: naruto.episodes + 1,
  watchedOn: '2026-08-23',
  note: '',
}, naruto) ?? '', /bölüm sayısını aşamaz/u);
assert.match(validateJournalValues({
  episodeStart: 1,
  episodeEnd: 1,
  watchedOn: '2026-08-23',
  note: 'x'.repeat(281),
}, naruto) ?? '', /notu geçersiz/u);

const journalPage = presentJournalRows([
  {
    id: 'journal-2', anime_id: '20', episode_start: 3, episode_end: 4,
    watched_on: '2026-08-23', note: 'İkinci oturum.', client_updated_at: '2026-08-23T20:00:00Z',
  },
  {
    id: 'journal-1', anime_id: '1', episode_start: 1, episode_end: 1,
    watched_on: '2026-08-22', note: 'Final.', client_updated_at: '2026-08-22T20:00:00Z',
  },
], catalogue, 0, 1);
assert.equal(journalPage.toplam, 2);
assert.equal(journalPage.donen, 1);
assert.equal(journalPage.dahaVar, true);
assert.equal(journalPage.sonrakiOffset, 1);
assert.equal((journalPage.kayitlar as Array<{ baslik: string }>)[0]?.baslik, 'Naruto');

assert.equal(normalizeCollectionText('  Kısa   seriler  '), 'Kısa seriler');
assert.equal(validateCollectionDetails('Favoriler', '', 'lavender'), null);
assert.match(validateCollectionDetails(' ', '', 'lavender') ?? '', /adı geçersiz/u);
assert.match(validateCollectionDetails('Favoriler', '', 'karanlık') ?? '', /rengi geçersiz/u);
assert.deepEqual(validateCollectionAnimeIds(['20', '1'], catalogue), { ok: true, animeIds: ['20', '1'] });
assert.equal(validateCollectionAnimeIds(['20', '20'], catalogue).ok, false);
assert.equal(validateCollectionAnimeIds(['ghost'], catalogue).ok, false);
const collectionPage = presentCollectionRows([{
  id: 'collection-1', name: 'Ninjalar', description: 'Köy hikâyeleri', color: 'mint',
  anime_ids: ['20', 'ghost'], client_created_at: '2026-08-23T10:00:00Z', client_updated_at: '2026-08-23T11:00:00Z',
}], catalogue, 0, 40);
assert.equal(collectionPage.toplam, 1);
assert.equal((collectionPage.koleksiyonlar as Array<{ anime: Array<{ baslik: string | null }> }>)[0]?.anime[0]?.baslik, 'Naruto');
assert.equal((collectionPage.koleksiyonlar as Array<{ anime: Array<{ baslik: string | null }> }>)[0]?.anime[1]?.baslik, null);

const actionCatalogue = JSON.parse(await readFile('public/orbit-actions.json', 'utf8'));
const operationIds = actionCatalogue.operations.map((operation: { operationId: string }) => operation.operationId);
assert.deepEqual(operationIds, [
  'rota.listeyeEkle',
  'rota.listeyiOku',
  'rota.katalogdaAra',
  'rota.listedenSil',
  'rota.gunlugeEkle',
  'rota.gunluguOku',
  'rota.gunlukKaydiniDuzenle',
  'rota.gunlukKaydiniSil',
  'rota.koleksiyonOlustur',
  'rota.koleksiyonlariOku',
  'rota.koleksiyonuDuzenle',
  'rota.koleksiyonuSil',
  'rota.koleksiyonUyeliginiDegistir',
  'rota.koleksiyonuSirala',
  'rota.kisiselOneriler',
]);

const addOperation = actionCatalogue.operations.find((operation: { operationId: string }) => operation.operationId === 'rota.listeyeEkle');
assert.equal(addOperation.input.properties.puaniTemizle.type, 'boolean');
const readOperation = actionCatalogue.operations.find((operation: { operationId: string }) => operation.operationId === 'rota.listeyiOku');
assert.equal(readOperation.input.properties.offset.minimum, 0);
assert.equal(readOperation.output.properties.dahaVar.type, 'boolean');
const journalAddOperation = actionCatalogue.operations.find((operation: { operationId: string }) => operation.operationId === 'rota.gunlugeEkle');
assert.deepEqual(journalAddOperation.input.required, ['animeId', 'ilkBolum', 'sonBolum', 'tarih']);
const journalReadOperation = actionCatalogue.operations.find((operation: { operationId: string }) => operation.operationId === 'rota.gunluguOku');
assert.equal(journalReadOperation.input.properties.offset.maximum, 100000);

const journalMigration = await readFile('supabase/migrations/202608230003_orbit_agent_journal_actions.sql', 'utf8');
assert.match(journalMigration, /security definer/iu);
assert.match(journalMigration, /greatest\(current_progress, p_episode_end\)/u,
  'journal writes must never move list progress backwards');
assert.match(journalMigration, /revoke all on function public\.orbit_add_watch_journal_entry/u);
assert.match(journalMigration, /grant execute on function public\.orbit_add_watch_journal_entry/u);

const collectionOrderOperation = actionCatalogue.operations.find((operation: { operationId: string }) => operation.operationId === 'rota.koleksiyonuSirala');
assert.equal(collectionOrderOperation.input.properties.animeIdleri.items.maxLength, 300);
const collectionMigration = await readFile('supabase/migrations/202608230004_orbit_agent_collection_actions.sql', 'utf8');
assert.match(collectionMigration, /grant select, insert, update on public\.personal_collections to service_role/u);
assert.doesNotMatch(collectionMigration, /grant[^;]*delete[^;]*personal_collections/iu,
  'agent collection deletion must use tombstones, not physical DELETE authority');

const recommendationsOperation = actionCatalogue.operations.find((operation: { operationId: string }) => operation.operationId === 'rota.kisiselOneriler');
assert.deepEqual(recommendationsOperation.input.properties.yol.enum, [
  'FOR_YOU', 'SHORT', 'MOVIE', 'ONE_SEASON', 'CALM', 'ENERGY', 'EMOTIONAL', 'MYSTERY',
]);
assert.match(recommendationsOperation.summary, /yalnız Rota ile senkronize edilmiş/u);

console.log('Rota ajan sözleşmesi doğrulandı: liste, günlük, koleksiyon ve açıklanabilir kişisel öneriler hazır.');
