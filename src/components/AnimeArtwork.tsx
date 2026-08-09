type Props = {
  art: "moon" | "blade" | "city" | "signal" | "garden" | "ember";
  palette: string;
  compact?: boolean;
};

export default function AnimeArtwork({ art, palette, compact = false }: Props) {
  const captions = {
    moon: "夢 · dream",
    blade: "勇 · brave",
    city: "夜 · night",
    signal: "星 · signal",
    garden: "花 · bloom",
    ember: "炎 · spark",
  } as const;

  return (
    <div className={`art art--${palette} ${compact ? "art--compact" : ""}`} aria-hidden="true">
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
