import { useEffect, useState } from "react";
import {
  createPersonalEntry,
  personalStatusLabels,
  readPersonalList,
  removePersonalEntry,
  subscribeToPersonalList,
  writePersonalEntry,
  type PersonalListEntry,
  type PersonalStatus,
} from "../lib/personal-list";

type Props = {
  animeId: string;
  title: string;
  episodes: number;
};

export default function ListEditor({ animeId, title, episodes }: Props) {
  const [entry, setEntry] = useState<PersonalListEntry | null>(null);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setEntry(readPersonalList().entries[animeId] ?? null);
      setReady(true);
    };
    refresh();
    return subscribeToPersonalList(refresh);
  }, [animeId]);

  const persist = (next: PersonalListEntry) => setEntry(writePersonalEntry(next));

  const add = () => {
    setEntry(createPersonalEntry(animeId));
    setExpanded(true);
  };

  const changeStatus = (status: PersonalStatus) => {
    if (!entry) return;
    const progress = status === "COMPLETED" && episodes > 0 ? episodes : entry.progress;
    persist({ ...entry, status, progress });
  };

  const changeProgress = (value: number) => {
    if (!entry) return;
    const progress = Math.max(0, episodes > 0 ? Math.min(episodes, value) : value);
    const status = episodes > 0 && progress >= episodes
      ? "COMPLETED"
      : progress > 0 && entry.status === "PLANNED"
        ? "WATCHING"
        : entry.status;
    persist({ ...entry, progress, status });
  };

  const remove = () => {
    removePersonalEntry(animeId);
    setEntry(null);
    setExpanded(false);
  };

  return (
    <div className={`list-editor ${expanded ? "is-expanded" : ""}`}>
      {!entry ? (
        <div className="list-editor__start">
          <button onClick={add} disabled={!ready}>+ Listeme ekle</button>
          <span>{ready ? "Bu cihazdaki kişisel arşivine kaydet; giriş yaptıysan bulutla eşitlenir." : "Listen hazırlanıyor…"}</span>
        </div>
      ) : (
        <>
          <div className="list-editor__start">
            <button className="is-saved" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
              <span>✓ {personalStatusLabels[entry.status]}</span><b>{expanded ? "Kapat" : "Düzenle"}</b>
            </button>
            <span>Değişiklikler yerelde anında kaydedilir; hesabın varsa eşitlenir.</span>
          </div>

          {expanded && (
            <div className="list-editor__panel">
              <div className="list-editor__fields">
                <label>
                  Durum
                  <select name="list-status" value={entry.status} onChange={(event) => changeStatus(event.target.value as PersonalStatus)}>
                    {Object.entries(personalStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </label>

                <label>
                  Bölüm ilerlemesi
                  <div className="progress-input">
                    <button onClick={() => changeProgress(entry.progress - 1)} aria-label="Bir bölüm azalt">−</button>
                    <input
                      name="list-progress"
                      type="number"
                      min="0"
                      max={episodes || undefined}
                      value={entry.progress}
                      onChange={(event) => changeProgress(Number(event.target.value))}
                      aria-label={`${title} bölüm ilerlemesi`}
                    />
                    <span>/ {episodes || "?"}</span>
                    <button onClick={() => changeProgress(entry.progress + 1)} aria-label="Bir bölüm artır">+</button>
                  </div>
                </label>

                <label>
                  Kişisel puan
                  <select
                    name="list-score"
                    value={entry.score ?? ""}
                    onChange={(event) => persist({ ...entry, score: event.target.value ? Number(event.target.value) : null })}
                  >
                    <option value="">Henüz puanlamadım</option>
                    {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => <option value={score} key={score}>★ {score} / 10</option>)}
                  </select>
                </label>
              </div>

              <label className="list-editor__note">
                Kişisel not
                <textarea
                  name="list-note"
                  value={entry.note}
                  maxLength={600}
                  rows={4}
                  placeholder="Bu yapımı neden hatırlamak istiyorsun?"
                  onChange={(event) => persist({ ...entry, note: event.target.value })}
                />
                <small>{entry.note.length}/600 · özel kayıt</small>
              </label>

              <div className="list-editor__footer">
                <span aria-live="polite">Kaydedildi ✓</span>
                <button onClick={remove}>Listemden çıkar</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
