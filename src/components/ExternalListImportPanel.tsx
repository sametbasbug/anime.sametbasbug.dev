import { useRef, useState } from "react";
import type { CatalogueAnime } from "../lib/catalogue-ui";
import {
  ExternalListImportError,
  MAX_EXTERNAL_LIST_BYTES,
  createExternalListPreview,
  type ExternalListPreview,
  type ExternalListSource,
} from "../lib/external-list-import";
import { mergePersonalListStores } from "../lib/list-portability";
import { readPersonalList, replacePersonalList } from "../lib/personal-list";

type Props = {
  catalogue: CatalogueAnime[];
  catalogueLoading: boolean;
  onImported?: () => void;
};

async function boundedStreamText(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_EXTERNAL_LIST_BYTES) {
      await reader.cancel();
      throw new ExternalListImportError("Açılmış liste dosyası 10 MB sınırını aşıyor.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function readListFile(file: File) {
  if (file.size > MAX_EXTERNAL_LIST_BYTES) throw new ExternalListImportError("Liste dosyası 10 MB sınırını aşıyor.");
  if (!file.name.toLocaleLowerCase("en-US").endsWith(".gz")) return file.text();
  if (typeof DecompressionStream === "undefined") throw new ExternalListImportError("Bu tarayıcı GZIP açamıyor; MAL XML dosyasını arşivden çıkarıp yeniden seç.");
  try {
    return await boundedStreamText(file.stream().pipeThrough(new DecompressionStream("gzip")));
  } catch (error) {
    if (error instanceof ExternalListImportError) throw error;
    throw new ExternalListImportError("MAL GZIP dosyası açılamadı.");
  }
}

export default function ExternalListImportPanel({ catalogue, catalogueLoading, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<ExternalListSource>("MAL");
  const [preview, setPreview] = useState<ExternalListPreview | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(false);
  const [reading, setReading] = useState(false);

  const chooseFile = (nextSource: ExternalListSource) => {
    setSource(nextSource);
    setPreview(null);
    setFeedback("");
    inputRef.current?.click();
  };

  const inspectFile = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    try {
      const next = createExternalListPreview(source, await readListFile(file), catalogue, readPersonalList());
      setPreview(next);
      setError(false);
      setFeedback("");
    } catch (caught) {
      setPreview(null);
      setError(true);
      setFeedback(caught instanceof ExternalListImportError ? caught.message : "Liste dosyası okunamadı; Rota’n değişmedi.");
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const applyImport = () => {
    if (!preview) return;
    const { store, summary } = mergePersonalListStores(readPersonalList(), preview.incoming);
    replacePersonalList(store);
    setPreview(null);
    setError(false);
    setFeedback(`${summary.added} anime eklendi, ${summary.updated} anime güncellendi; ${summary.kept} daha yeni Rota kaydı veya silme geçmişi korundu.`);
    onImported?.();
  };

  return (
    <div className="external-list-import">
      <div className="external-list-import__heading">
        <div><p>DIŞARIDAN GETİR</p><h3>MAL veya AniList listeni taşı</h3></div>
        <small>Dosya yalnızca bu cihazda okunur.</small>
      </div>
      <div className="external-list-import__actions">
        <button type="button" disabled={catalogueLoading || reading} onClick={() => chooseFile("MAL")}><b>MyAnimeList</b><small>Resmî XML veya XML.GZ dışa aktarımı</small></button>
        <button type="button" disabled={catalogueLoading || reading} onClick={() => chooseFile("ANILIST")}><b>AniList</b><small>Hesap ayarlarındaki GDPR Data Download JSON’u</small></button>
      </div>
      <input
        ref={inputRef}
        className="archive-portability__input"
        type="file"
        accept={source === "MAL" ? ".xml,.xml.gz,.gz,application/xml,text/xml,application/gzip" : ".json,application/json"}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => void inspectFile(event.target.files?.[0])}
      />
      {reading && <p className="external-list-import__status" role="status">Liste cihazında inceleniyor…</p>}
      {preview && (
        <div className="external-list-import__preview" role="status">
          <p><b>{preview.matchedCount}</b> anime Rota kataloğuyla eşleşti; <b>{preview.unmatched.length}</b> kayıt eşleşmedi, <b>{preview.ambiguous.length}</b> kayıt birden fazla animeye işaret ettiği için ayrıldı.</p>
          <p>{preview.summary.added} yeni, {preview.summary.updated} güncellenecek; {preview.summary.kept} daha yeni yerel kayıt veya silme geçmişi korunacak.</p>
          {preview.skippedCount > 0 && <p>{preview.skippedCount} geçersiz ya da desteklenmeyen kayıt atlandı.</p>}
          {preview.unmatched.length > 0 && <details><summary>Eşleşmeyenlerden ilk 8’i</summary><ul>{preview.unmatched.slice(0, 8).map((item) => <li key={item.externalId}>{item.title} ({item.externalId})</li>)}</ul></details>}
          {preview.ambiguous.length > 0 && <details><summary>Belirsiz eşleşmelerden ilk 8’i</summary><ul>{preview.ambiguous.slice(0, 8).map((item) => <li key={item.externalId}>{item.title} ({item.externalId})</li>)}</ul></details>}
          <div><button type="button" onClick={applyImport}>Önizlemeyi Rota’ya aktar</button><button type="button" onClick={() => setPreview(null)}>İptal</button></div>
        </div>
      )}
      {feedback && <p className={`archive-portability__feedback${error ? " is-error" : ""}`} role="status">{feedback}</p>}
    </div>
  );
}
