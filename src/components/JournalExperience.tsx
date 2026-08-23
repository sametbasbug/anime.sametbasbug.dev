import { useEffect, useMemo, useState } from "react";
import type { CatalogueAnime } from "../lib/catalogue-ui";
import { loadBrowserCatalogue } from "../lib/catalogue-loader";
import { visualFor } from "../lib/catalogue-ui";
import {
  MAX_JOURNAL_NOTE_LENGTH,
  journalEpisodeLabel,
  isJournalDate,
  readWatchJournal,
  removeWatchJournalEntry,
  subscribeToWatchJournal,
  writeWatchJournalEntry,
  type WatchJournalEntry,
} from "../lib/watch-journal";
import AnimeArtwork from "./AnimeArtwork";
import RotaCompanion from "./RotaCompanion";

type Props = { dataVersion: string };
type JournalRecord = { anime: CatalogueAnime; entry: WatchJournalEntry };

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
const monthFormatter = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });

function localDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function monthKey(value: string) {
  return value.slice(0, 7);
}

function calendarDays(month: string, countByDate: Map<string, number>) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const leading = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = `${month}-${String(day).padStart(2, "0")}`;
      return { day, date, count: countByDate.get(date) ?? 0 };
    }),
  ];
}

export default function JournalExperience({ dataVersion }: Props) {
  const [catalogue, setCatalogue] = useState<CatalogueAnime[]>([]);
  const [entries, setEntries] = useState<WatchJournalEntry[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WatchJournalEntry | null>(null);

  useEffect(() => {
    const refresh = () => setEntries(
      Object.values(readWatchJournal().entries).sort((a, b) => b.watchedOn.localeCompare(a.watchedOn) || b.updatedAt.localeCompare(a.updatedAt)),
    );
    refresh();
    const unsubscribe = subscribeToWatchJournal(refresh);

    loadBrowserCatalogue(dataVersion)
      .then((items) => { setCatalogue(items); setLoadState("ready"); })
      .catch(() => setLoadState("error"));
    return unsubscribe;
  }, [dataVersion]);

  const records = useMemo(() => {
    const byId = new Map(catalogue.map((anime) => [anime.id, anime]));
    return entries
      .map((entry) => ({ entry, anime: byId.get(entry.animeId) }))
      .filter((record): record is JournalRecord => Boolean(record.anime));
  }, [catalogue, entries]);

  const months = useMemo(() => Array.from(new Set(records.map(({ entry }) => monthKey(entry.watchedOn)))).sort().reverse(), [records]);
  const activeMonth = selectedMonth && months.includes(selectedMonth) ? selectedMonth : months[0] ?? "";
  const visible = records.filter(({ entry }) => monthKey(entry.watchedOn) === activeMonth);
  const groupedByDate = new Map<string, JournalRecord[]>();
  visible.forEach((record) => groupedByDate.set(record.entry.watchedOn, [...(groupedByDate.get(record.entry.watchedOn) ?? []), record]));
  const grouped = [...groupedByDate.entries()].sort(([left], [right]) => right.localeCompare(left));
  const episodeCount = visible.reduce((total, { entry }) => total + entry.episodeEnd - entry.episodeStart + 1, 0);
  const animeCount = new Set(visible.map(({ entry }) => entry.animeId)).size;
  const countByDate = new Map<string, number>();
  visible.forEach(({ entry }) => countByDate.set(entry.watchedOn, (countByDate.get(entry.watchedOn) ?? 0) + 1));
  const days = activeMonth ? calendarDays(activeMonth, countByDate) : [];

  const startEditing = (entry: WatchJournalEntry) => {
    setEditingId(entry.id);
    setDraft({ ...entry });
  };

  const saveEditing = () => {
    if (!draft || !isJournalDate(draft.watchedOn) || draft.episodeStart < 1 || draft.episodeEnd < draft.episodeStart) return;
    writeWatchJournalEntry(draft);
    setEditingId(null);
    setDraft(null);
  };

  const remove = (record: JournalRecord) => {
    if (!window.confirm(`${record.anime.title} için ${journalEpisodeLabel(record.entry)} günlüğünden silinsin mi?`)) return;
    removeWatchJournalEntry(record.entry.id);
    if (editingId === record.entry.id) { setEditingId(null); setDraft(null); }
  };

  if (loadState === "loading") {
    return <div className="catalogue-loading companion-state"><RotaCompanion scene="journalLoading" mood="curious" className="rota-companion--state" /><span></span><p>Günlüğün sayfaları açılıyor…</p></div>;
  }
  if (loadState === "error") {
    return <div className="catalogue-empty companion-state"><RotaCompanion scene="listError" mood="error" className="rota-companion--state" /><span>!</span><h2>Günlük şu anda açılamadı.</h2><p>Katalog bağlantısını kontrol edip sayfayı yenile.</p></div>;
  }
  if (records.length === 0) {
    return <div className="my-list-empty journal-empty"><RotaCompanion scene="journalEmpty" mood="curious" className="rota-companion--empty" /><span>İLK SAYFA</span><h2>Bugün ne<br />izledin?</h2><p>Bir anime detayına git ve izlediğin bölüm aralığını kaydet. Günlüğün önce bu cihazda tutulur.</p><a href="/ara">Bir anime bul <span>↗</span></a></div>;
  }

  return (
    <>
      <section className="journal-month-bar">
        <div>
          <p>AYLIK ÖZET</p>
          <h2>{monthFormatter.format(localDate(`${activeMonth}-01`))}</h2>
        </div>
        <div className="journal-month-stats">
          <span><strong>{episodeCount}</strong><small>bölüm</small></span>
          <span><strong>{animeCount}</strong><small>anime</small></span>
          <span><strong>{countByDate.size}</strong><small>izleme günü</small></span>
        </div>
        <label>Ay seç<select value={activeMonth} onChange={(event) => setSelectedMonth(event.target.value)}>{months.map((month) => <option value={month} key={month}>{monthFormatter.format(localDate(`${month}-01`))}</option>)}</select></label>
      </section>

      <section className="journal-calendar" aria-label={`${activeMonth} izleme takvimi`}>
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => <b key={day}>{day}</b>)}
        {days.map((item, index) => item ? <span className={item.count ? "has-entry" : ""} key={item.date}><i>{item.day}</i>{item.count > 0 && <em>{item.count} kayıt</em>}</span> : <span className="is-empty" key={`empty-${index}`} />)}
      </section>

      <div className="journal-timeline">
        {grouped.map(([date, dateRecords]) => (
          <section className="journal-day" key={date}>
            <header><time dateTime={date}>{dateFormatter.format(localDate(date))}</time><span>{dateRecords?.length ?? 0} kayıt</span></header>
            <div className="journal-day__entries">
              {(dateRecords ?? []).map((record) => {
                const visual = visualFor(record.anime.id);
                const isEditing = editingId === record.entry.id && draft;
                return <article className="journal-entry" key={record.entry.id}>
                  <a className="journal-entry__art" href={`/anime/${record.anime.slug}`}><AnimeArtwork art={visual.art} palette={visual.palette} poster={record.anime.poster} title={record.anime.title} compact /></a>
                  <div className="journal-entry__body">
                    <p>{journalEpisodeLabel(record.entry)}</p>
                    <h3><a href={`/anime/${record.anime.slug}`}>{record.anime.title}</a></h3>
                    {isEditing ? <div className="journal-entry__edit">
                      <div><label>İlk bölüm<input type="number" min="1" value={draft.episodeStart} onChange={(event) => setDraft({ ...draft, episodeStart: Math.max(1, Number(event.target.value)), episodeEnd: Math.max(Number(event.target.value), draft.episodeEnd) })} /></label><label>Son bölüm<input type="number" min={draft.episodeStart} value={draft.episodeEnd} onChange={(event) => setDraft({ ...draft, episodeEnd: Math.max(draft.episodeStart, Number(event.target.value)) })} /></label><label>Tarih<input type="date" value={draft.watchedOn} onChange={(event) => setDraft({ ...draft, watchedOn: event.target.value })} /></label></div>
                      <label>Not<textarea rows={3} maxLength={MAX_JOURNAL_NOTE_LENGTH} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
                      <footer><button onClick={() => { setEditingId(null); setDraft(null); }}>Vazgeç</button><button className="is-primary" onClick={saveEditing} disabled={!isJournalDate(draft.watchedOn) || draft.episodeStart < 1 || draft.episodeEnd < draft.episodeStart}>Kaydet</button></footer>
                    </div> : <>{record.entry.note ? <blockquote>“{record.entry.note}”</blockquote> : <small>Bu kayıt için not bırakılmadı.</small>}<div className="journal-entry__actions"><button onClick={() => startEditing(record.entry)}>Düzenle</button><button onClick={() => remove(record)}>Sil</button></div></>}
                  </div>
                </article>;
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
