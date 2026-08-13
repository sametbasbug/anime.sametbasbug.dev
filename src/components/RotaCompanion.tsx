import { useEffect, useMemo, useState } from "react";
import { rotaDialogue, type RotaDialogueScene } from "../lib/rota-dialogue";

type Props = {
  message?: string;
  scene?: RotaDialogueScene;
  mood?: "happy" | "curious" | "sleepy" | "syncing" | "celebrating" | "error";
  className?: string;
};

export default function RotaCompanion({
  message = "Bir bölüm daha?",
  scene,
  mood = "happy",
  className = "",
}: Props) {
  const messages = useMemo(() => scene ? rotaDialogue[scene] : [message], [message, scene]);
  const [activeMessage, setActiveMessage] = useState(messages[0] ?? message);

  useEffect(() => {
    if (!scene || messages.length < 2) {
      setActiveMessage(messages[0] ?? message);
      return;
    }

    const storageKey = `rota.dialogue.${scene}`;
    let previous = -1;
    try {
      previous = Number.parseInt(window.sessionStorage.getItem(storageKey) ?? "-1", 10);
    } catch {
      // Storage kapalı olsa da Rota konuşmaya devam eder; yalnız tekrar
      // önleme hafızası bu sayfa yüklemesiyle sınırlı kalır.
    }
    const candidates = messages.map((_, index) => index).filter((index) => index !== previous);
    const randomIndex = new Uint32Array(1);
    window.crypto.getRandomValues(randomIndex);
    const next = candidates[randomIndex[0] % candidates.length] ?? 0;
    try {
      window.sessionStorage.setItem(storageKey, String(next));
    } catch {
      // Private/katı tarayıcı modunda sessionStorage yazımı zorunlu değil.
    }
    setActiveMessage(messages[next] ?? messages[0] ?? message);
  }, [message, messages, scene]);

  return (
    <div
      className={`rota-companion rota-companion--${mood} ${className}`.trim()}
      aria-hidden="true"
    >
      <span className="rota-companion__bubble">
        <strong>Rota</strong>
        <span>{activeMessage}</span>
      </span>
      <span className="rota-companion__figure">
        <i className="rota-companion__ears" />
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
      </span>
    </div>
  );
}
