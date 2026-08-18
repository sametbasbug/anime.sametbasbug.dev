import type { CatalogueImage } from "../lib/catalogue-ui";

type Props = {
  art: "moon" | "blade" | "city" | "signal" | "garden" | "ember";
  palette: string;
  compact?: boolean;
  poster?: CatalogueImage;
  title?: string;
  priority?: boolean;
};

export default function AnimeArtwork({ art, palette, compact = false, poster, title, priority = false }: Props) {
  const captions = {
    moon: "夢 · dream",
    blade: "勇 · brave",
    city: "夜 · night",
    signal: "星 · signal",
    garden: "花 · bloom",
    ember: "炎 · spark",
  } as const;

  return (
    <div
      className={`art art--${palette} ${compact ? "art--compact" : ""} ${poster ? "art--poster" : ""}`}
      aria-hidden={poster ? undefined : "true"}
    >
      {poster && (
        <img
          className="art__poster"
          src={poster.medium ?? poster.large}
          srcSet={[
            poster.small && `${poster.small} 284w`,
            poster.medium && `${poster.medium} 390w`,
            `${poster.large} 550w`,
          ].filter(Boolean).join(", ")}
          sizes={compact ? "160px" : "(max-width: 760px) 50vw, 390px"}
          alt={`${title ?? "Anime"} poster görseli`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.parentElement?.classList.remove("art--poster");
            event.currentTarget.hidden = true;
          }}
        />
      )}
      <span className="art__grain" />
      <span className="art__spark art__spark--one">✦</span>
      <span className="art__spark art__spark--two">✧</span>
      {art === "moon" && <><span className="moon" /><span className="figure figure--moon"><i className="figure__eyes" /><i className="figure__blush" /></span><span className="kanji">月</span></>}
      {art === "blade" && <><span className="sun" /><span className="slash" /><span className="figure figure--blade"><i className="figure__eyes" /><i className="figure__blush" /></span><span className="kanji">境</span></>}
      {art === "city" && <><span className="city" /><span className="figure figure--city"><i className="figure__eyes" /><i className="figure__blush" /></span><span className="kanji">夜</span></>}
      {art === "signal" && <><span className="signal" /><span className="orbit" /><span className="figure figure--signal"><i className="figure__eyes" /><i className="figure__blush" /></span><span className="kanji">信</span></>}
      {art === "garden" && <><span className="glass" /><span className="flower" /><span className="figure figure--garden"><i className="figure__eyes" /><i className="figure__blush" /></span><span className="kanji">庭</span></>}
      {art === "ember" && <><span className="ember" /><span className="mountain" /><span className="figure figure--ember"><i className="figure__eyes" /><i className="figure__blush" /></span><span className="kanji">灰</span></>}
      <span className="art__caption">{captions[art]}</span>
    </div>
  );
}
