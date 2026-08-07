type Props = {
  art: "moon" | "blade" | "city" | "signal" | "garden" | "ember";
  palette: string;
  compact?: boolean;
};

export default function AnimeArtwork({ art, palette, compact = false }: Props) {
  return (
    <div className={`art art--${palette} ${compact ? "art--compact" : ""}`} aria-hidden="true">
      <span className="art__grain" />
      {art === "moon" && <><span className="moon" /><span className="figure figure--moon" /><span className="kanji">月</span></>}
      {art === "blade" && <><span className="sun" /><span className="slash" /><span className="figure figure--blade" /><span className="kanji">境</span></>}
      {art === "city" && <><span className="city" /><span className="figure figure--city" /><span className="kanji">夜</span></>}
      {art === "signal" && <><span className="signal" /><span className="orbit" /><span className="figure figure--signal" /><span className="kanji">信</span></>}
      {art === "garden" && <><span className="glass" /><span className="flower" /><span className="figure figure--garden" /><span className="kanji">庭</span></>}
      {art === "ember" && <><span className="ember" /><span className="mountain" /><span className="figure figure--ember" /><span className="kanji">灰</span></>}
    </div>
  );
}
