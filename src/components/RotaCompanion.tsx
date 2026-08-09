type Props = {
  message?: string;
  mood?: "happy" | "curious" | "sleepy" | "syncing" | "celebrating" | "error";
  className?: string;
};

export default function RotaCompanion({
  message = "Bir bölüm daha?",
  mood = "happy",
  className = "",
}: Props) {
  return (
    <div
      className={`rota-companion rota-companion--${mood} ${className}`.trim()}
      aria-hidden="true"
    >
      <span className="rota-companion__bubble">
        <strong>Rota</strong>
        <span>{message}</span>
      </span>
      <span className="rota-companion__body">
        <i className="rota-companion__crest">✦</i>
        <i className="rota-companion__eyes" />
        <i className="rota-companion__blush" />
        <i className="rota-companion__mouth" />
        <b aria-hidden="true">✦</b>
        {mood === "syncing" && <em className="rota-companion__orbit">↻</em>}
        {mood === "celebrating" && <em className="rota-companion__confetti">✦♡✦</em>}
        {mood === "error" && <em className="rota-companion__bandage">×</em>}
      </span>
    </div>
  );
}
