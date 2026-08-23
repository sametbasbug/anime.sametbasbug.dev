import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { findCatalogueAnime, parseCatalogue, searchCatalogue } from './catalogue.ts';

const rawCatalogue = JSON.parse(await readFile('src/data/catalogue.json', 'utf8'));
const catalogue = parseCatalogue(rawCatalogue);
assert.ok(catalogue, 'production catalogue must satisfy the agent catalogue contract');

assert.equal(findCatalogueAnime(catalogue, 'this-anime-does-not-exist'), null,
  'invented IDs must never resolve');
assert.equal(findCatalogueAnime(catalogue, '20')?.title, 'Naruto');
assert.equal(searchCatalogue(catalogue, 'Naruto', 10)[0]?.id, '20');
assert.equal(searchCatalogue(catalogue, 'kitsu:11', 10)[0]?.id, '20');

const malCatalogue = parseCatalogue({
  items: [{
    id: 'kitsu-11469', kitsuId: '11469', malId: '31964', slug: 'boku-no-hero-academia-kitsu-11469',
    title: 'Boku no Hero Academia', type: 'TV', episodes: 13, status: 'FINISHED', synonyms: ['My Hero Academia'],
  }],
});
assert.ok(malCatalogue);
assert.equal(searchCatalogue(malCatalogue, 'mal:31964', 10)[0]?.id, 'kitsu-11469');
assert.equal(searchCatalogue(malCatalogue, 'My Hero Academia', 10)[0]?.id, 'kitsu-11469');

const actionCatalogue = JSON.parse(await readFile('public/orbit-actions.json', 'utf8'));
const operationIds = actionCatalogue.operations.map((operation: { operationId: string }) => operation.operationId);
assert.deepEqual(operationIds, [
  'rota.listeyeEkle',
  'rota.listeyiOku',
  'rota.katalogdaAra',
  'rota.listedenSil',
]);

console.log('Rota ajan katalog sözleşmesi doğrulandı: hayalet ID reddi, başlık/dış kimlik araması ve silme işlemi hazır.');
