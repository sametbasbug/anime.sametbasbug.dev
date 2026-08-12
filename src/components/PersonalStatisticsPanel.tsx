import { formatWatchTime, type RotaStatistics } from "../lib/personal-statistics";

type Props = {
  statistics: RotaStatistics;
  mode?: "owner" | "shared";
  loading?: boolean;
};

function Ranking({ title, items }: { title: string; items: RotaStatistics["topGenres"] }) {
  return (
    <div className="personal-statistics__ranking">
      <p>{title}</p>
      {items.length > 0 ? (
        <ol>{items.map((item) => <li key={item.label}><span>{item.label}</span><b>{item.count}</b></li>)}</ol>
      ) : <small>Rota biraz daha ilerleyince burada bir eğilim belirecek.</small>}
    </div>
  );
}

export default function PersonalStatisticsPanel({ statistics, mode = "owner", loading = false }: Props) {
  return (
    <section className={`personal-statistics personal-statistics--${mode}`} aria-label={mode === "owner" ? "Kişisel Rota istatistikleri" : "Paylaşılan Rota istatistikleri"}>
      <header>
        <div><p>{mode === "owner" ? "ROTA GÜNLÜĞÜ" : "YOLCULUK İSTATİSTİKLERİ"}</p><h2>{mode === "owner" ? "Yolculuğunun ritmi" : "Bu rotanın ritmi"}</h2></div>
        <span aria-hidden="true">✦</span>
      </header>
      {loading ? <p className="personal-statistics__loading">Katalogla rafın buluşturuluyor…</p> : (
        <>
          <div className="personal-statistics__metrics">
            <div><strong>{statistics.totalAnime}</strong><span>toplam anime</span></div>
            <div><strong>{statistics.watchedEpisodes}</strong><span>izlenen bölüm</span></div>
            <div><strong>{formatWatchTime(statistics.watchSeconds)}</strong><span>yaklaşık süre</span></div>
            <div><strong>{statistics.completionRate === null ? "—" : `%${Math.round(statistics.completionRate)}`}</strong><span>tamamlama oranı</span></div>
            <div><strong>{statistics.averageScore === null ? "—" : statistics.averageScore.toFixed(1)}</strong><span>ortalama puan</span></div>
          </div>
          <div className="personal-statistics__rankings">
            <Ranking title="EN ÇOK İZLENEN TÜRLER" items={statistics.topGenres} />
            <Ranking title="EN ÇOK İZLENEN STÜDYOLAR" items={statistics.topStudios} />
          </div>
          <p className="personal-statistics__note">Süre, katalogdaki bölüm sürelerinden yaklaşık hesaplanır. Tamamlama oranında henüz başlanmamış planlar paydaya katılmaz.</p>
        </>
      )}
    </section>
  );
}
