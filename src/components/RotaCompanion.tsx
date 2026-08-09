type Props = {
  message?: string;
  mood?: "happy" | "curious" | "sleepy";
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
      <span className="rota-companion__bubble">{message}</span>
      <span className="rota-companion__body">
        <i className="rota-companion__eyes" />
        <i className="rota-companion__blush" />
        <i className="rota-companion__mouth" />
        <b>✦</b>
      </span>
    </div>
  );
}
