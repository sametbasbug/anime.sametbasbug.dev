import { useRef, useState } from "react";
import type { CatalogueAnime } from "../lib/catalogue-ui";
import {
  MAX_BACKUP_BYTES,
  RotaBackupError,
  createPersonalListCsv,
  mergePersonalListStores,
  mergeWatchJournalStores,
  parseRotaArchive,
  serializeRotaBackup,
} from "../lib/list-portability";
import { readPersonalList, replacePersonalList } from "../lib/personal-list";
import { mergePersonalCollectionStores, readPersonalCollections, replacePersonalCollections } from "../lib/personal-collections";
import { readWatchJournal, replaceWatchJournal } from "../lib/watch-journal";
import ExternalListImportPanel from "./ExternalListImportPanel";

type Props = {
  catalogue: CatalogueAnime[];
  catalogueLoading?: boolean;
  onImported?: () => void;
};

function dateStamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function download(name: string, type: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ArchivePortabilityPanel({ catalogue, catalogueLoading = false, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(false);

  const exportJson = () => {
    download(`equinox-rota-yedek-${dateStamp()}.json`, "application/json;charset=utf-8", serializeRotaBackup(readPersonalList(), undefined, readWatchJournal(), readPersonalCollections()));
    setError(false);
    setFeedback("Sürümlü Rota JSON yedeğin indirildi.");
  };

  const exportCsv = () => {
    download(`equinox-rota-liste-${dateStamp()}.csv`, "text/csv;charset=utf-8", createPersonalListCsv(readPersonalList(), catalogue));
    setError(false);
    setFeedback("Okunabilir CSV listen indirildi.");
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new RotaBackupError("Yedek dosyası 10 MB sınırını aşıyor.");
      const incoming = parseRotaArchive(await file.text());
      const incomingCount = Object.keys(incoming.list.entries).length;
      const deletionCount = Object.keys(incoming.list.tombstones).length;
      const journalCount = Object.keys(incoming.journal.entries).length;
      const journalDeletionCount = Object.keys(incoming.journal.tombstones).length;
      const collectionCount = Object.keys(incoming.collections.collections).length;
      const collectionDeletionCount = Object.keys(incoming.collections.tombstones).length;
      const approved = window.confirm(
        `${incomingCount} aktif liste kaydı, ${journalCount} günlük kaydı, ${collectionCount} koleksiyon ve toplam ${deletionCount + journalDeletionCount + collectionDeletionCount} silme kaydı mevcut arşivinle birleştirilecek. Daha yeni cihaz kayıtların korunacak. Devam edilsin mi?`,
      );
      if (!approved) {
        setError(false);
        setFeedback("Geri yükleme iptal edildi; arşivin değişmedi.");
        return;
      }

      const { store, summary } = mergePersonalListStores(readPersonalList(), incoming.list);
      const { store: journalStore, summary: journalSummary } = mergeWatchJournalStores(readWatchJournal(), incoming.journal);
      const { store: collectionStore, summary: collectionSummary } = mergePersonalCollectionStores(readPersonalCollections(), incoming.collections);
      replacePersonalList(store);
      replaceWatchJournal(journalStore);
      replacePersonalCollections(collectionStore);
      setError(false);
      setFeedback(`Liste: ${summary.added} yeni, ${summary.updated} güncellenen. Günlük: ${journalSummary.added} yeni, ${journalSummary.updated} güncellenen. Koleksiyon: ${collectionSummary.added} yeni, ${collectionSummary.updated} güncellenen. Toplam ${summary.deleted + journalSummary.deleted + collectionSummary.deleted} silme işlendi; ${summary.kept + journalSummary.kept + collectionSummary.kept} daha yeni cihaz kaydı korundu.`);
      onImported?.();
    } catch (caught) {
      setError(true);
      setFeedback(caught instanceof RotaBackupError ? caught.message : "Yedek okunamadı; dosya değişmeden bırakıldı.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <section className="archive-portability" aria-label="Rota yedekleme ve taşınabilirlik">
      <header>
        <div><p>ARŞİVİN SENİN</p><h2>Rota’nı yanında taşı</h2></div>
        <span aria-hidden="true">↗</span>
      </header>
      <p className="archive-portability__intro">Tam Rota JSON yedeği rafını, izleme günlüğünü, özel koleksiyonlarını ve güvenli silme geçmişini taşır; CSV ise rafını tablo olarak okumak içindir.</p>
      <div className="archive-portability__actions">
        <button type="button" onClick={exportJson}><span>JSON</span><b>Tam yedeği indir</b><small>Raf, günlük, koleksiyonlar ve güvenli silme geçmişi</small></button>
        <button type="button" onClick={exportCsv} disabled={catalogueLoading}><span>CSV</span><b>Okunabilir listeyi indir</b><small>{catalogueLoading ? "Katalog hazırlanıyor…" : "Başlıklar ve liste ayrıntıları"}</small></button>
        <button type="button" onClick={() => inputRef.current?.click()}><span>GERİ YÜKLE</span><b>Rota JSON’unu birleştir</b><small>Daha yeni cihaz kayıtlarını ezmez</small></button>
      </div>
      <input ref={inputRef} className="archive-portability__input" type="file" accept="application/json,.json" aria-hidden="true" tabIndex={-1} onChange={(event) => void importJson(event.target.files?.[0])} />
      <p className="archive-portability__note">Geri yükleme mevcut arşivi topluca silmez. Aynı anime için tarihçe karşılaştırılır ve daha yeni değişiklik korunur.</p>
      {feedback && <p className={`archive-portability__feedback${error ? " is-error" : ""}`} role="status">{feedback}</p>}
      <ExternalListImportPanel catalogue={catalogue} catalogueLoading={catalogueLoading} onImported={onImported} />
    </section>
  );
}
