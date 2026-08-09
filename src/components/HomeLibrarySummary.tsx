import { useEffect, useState } from "react";
import { personalStatusLabels, readPersonalList, subscribeToPersonalList, type PersonalStatus } from "../lib/personal-list";

export default function HomeLibrarySummary() {
  const [counts, setCounts] = useState<Record<PersonalStatus, number>>({
    WATCHING: 0,
    COMPLETED: 0,
    PLANNED: 0,
    DROPPED: 0,
  });

  useEffect(() => {
    const refresh = () => {
      const entries = Object.values(readPersonalList().entries);
      setCounts({
        WATCHING: entries.filter((entry) => entry.status === "WATCHING").length,
        COMPLETED: entries.filter((entry) => entry.status === "COMPLETED").length,
        PLANNED: entries.filter((entry) => entry.status === "PLANNED").length,
        DROPPED: entries.filter((entry) => entry.status === "DROPPED").length,
      });
    };
    refresh();
    return subscribeToPersonalList(refresh);
  }, []);

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <section className="library-summary" aria-label="Kişisel arşiv özeti">
      <div className="library-summary__copy">
        <span className="section-kicker">Kişisel arşivin</span>
        <h2>{total ? `${total} yapım seni bekliyor.` : "Rotanı oluşturmaya başla."}</h2>
        <p>{total ? "Kaldığın yere dön veya sıradaki yapımı seç." : "Beğendiğin animeleri kaydet; bölüm ilerlemen bu cihazda anında tutulsun."}</p>
      </div>
      <div className="library-summary__stats">
        {(Object.entries(personalStatusLabels) as [PersonalStatus, string][]).slice(0, 3).map(([status, label]) => (
          <span key={status}><b>{counts[status]}</b>{label}</span>
        ))}
      </div>
      <a href={total ? "/listem" : "/ara"}>{total ? "Listeme dön" : "Anime keşfet"}<span>→</span></a>
    </section>
  );
}
