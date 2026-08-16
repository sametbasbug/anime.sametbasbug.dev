import { useEffect, useState } from "react";
import {
  personalStatusLabels,
  readPersonalList,
  subscribeToPersonalList,
  writePersonalEntry,
  type PersonalListEntry,
} from "../lib/personal-list";
import {
  MAX_JOURNAL_NOTE_LENGTH,
  createWatchJournalEntry,
  journalEpisodeLabel,
  todayForJournal,
} from "../lib/watch-journal";

type Props = {
  animeId: string;
  title: string;
  episodes: number;
};

export default function JournalComposer({ animeId, title, episodes }: Props) {
  const [listEntry, setListEntry] = useState<PersonalListEntry | null>(null);
  const [episodeStart, setEpisodeStart] = useState(1);
  const [episodeEnd, setEpisodeEnd] = useState(1);
  const [watchedOn, setWatchedOn] = useState(todayForJournal());
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const entry = readPersonalList().entries[animeId] ?? null;
      setListEntry(entry);
      setReady(true);
    };
    refresh();
    return subscribeToPersonalList(refresh);
  }, [animeId]);

  useEffect(() => {
    const nextEpisode = Math.max(1, (listEntry?.progress ?? 0) + 1);
    const bounded = episodes > 0 ? Math.min(nextEpisode, episodes) : nextEpisode;
    setEpisodeStart(bounded);
    setEpisodeEnd(bounded);
  }, [animeId, episodes, listEntry?.progress]);

  const clampEpisode = (value: number) => {
    const integer = Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
    return episodes > 0 ? Math.min(integer, episodes) : integer;
  };

  const changeStart = (value: number) => {
    const next = clampEpisode(value);
    setEpisodeStart(next);
    if (episodeEnd < next) setEpisodeEnd(next);
  };

  const changeEnd = (value: number) => {
    setEpisodeEnd(Math.max(episodeStart, clampEpisode(value)));
  };

  const save = () => {
    if (!ready) return;
    const nextProgress = episodes > 0 ? Math.min(episodeEnd, episodes) : episodeEnd;
    const current: PersonalListEntry = listEntry ?? {
      animeId,
      status: "WATCHING",
      progress: 0,
      score: null,
      note: "",
      updatedAt: new Date().toISOString(),
    };
    const progress = Math.max(current.progress, nextProgress);
    const status = episodes > 0 && progress >= episodes
      ? "COMPLETED"
      : current.status === "COMPLETED"
        ? current.status
        : "WATCHING";
    writePersonalEntry({ ...current, progress, status });

    const journalEntry = createWatchJournalEntry({
      animeId,
      episodeStart,
      episodeEnd,
      watchedOn,
      note: note.trim(),
    });
    setNote("");
    setFeedback(`${journalEpisodeLabel(journalEntry)} günlüğe eklendi; ilerlemen ${progress}. bölüme taşındı.`);
    const nextEpisode = episodes > 0 ? Math.min(progress + 1, episodes) : progress + 1;
    setEpisodeStart(Math.max(1, nextEpisode));
    setEpisodeEnd(Math.max(1, nextEpisode));
  };

  return (
    <section className="journal-composer" aria-label={`${title} izleme günlüğü`}>
      <header>
        <div><p>İZLEME GÜNLÜĞÜ</p><h2>Bugünkü izi bırak</h2></div>
        <a href="/gunluk">Günlüğü aç <span>↗</span></a>
      </header>
      <p className="journal-composer__intro">
        İzlediğin bölüm aralığını ve istersen kısa bir notu kaydet. Günlük kaydı ilerleme sayacını yalnız ileri taşır.
      </p>
      <div className="journal-composer__fields">
        <label>
          İlk bölüm
          <input type="number" min="1" max={episodes || undefined} value={episodeStart} onChange={(event) => changeStart(Number(event.target.value))} />
        </label>
        <label>
          Son bölüm
          <input type="number" min={episodeStart} max={episodes || undefined} value={episodeEnd} onChange={(event) => changeEnd(Number(event.target.value))} />
        </label>
        <label>
          İzleme tarihi
          <input type="date" value={watchedOn} max={todayForJournal()} onChange={(event) => setWatchedOn(event.target.value)} />
        </label>
      </div>
      <label className="journal-composer__note">
        Kısa bölüm notu
        <textarea
          rows={3}
          maxLength={MAX_JOURNAL_NOTE_LENGTH}
          value={note}
          placeholder="Bu bölümden aklında ne kaldı?"
          onChange={(event) => setNote(event.target.value)}
        />
        <small>{note.length}/{MAX_JOURNAL_NOTE_LENGTH} · özel günlük kaydı</small>
      </label>
      <footer>
        <span>{listEntry ? `${personalStatusLabels[listEntry.status]} · ${listEntry.progress} bölüm` : "Günlüğe ekleyince listene de alınır"}</span>
        <button type="button" onClick={save} disabled={!ready || !watchedOn}>Günlüğe ekle <b>＋</b></button>
      </footer>
      {feedback && <p className="journal-composer__feedback" role="status">{feedback}</p>}
    </section>
  );
}
