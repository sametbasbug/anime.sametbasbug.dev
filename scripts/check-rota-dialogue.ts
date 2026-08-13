import assert from "node:assert/strict";
import { rotaDialogue } from "../src/lib/rota-dialogue";

const entries = Object.entries(rotaDialogue);
assert.ok(entries.length >= 16, "Rota için ana sayfa ve ürün durumlarını kapsayan yeterli sahne bulunmalı.");

for (const [scene, lines] of entries) {
  assert.ok(lines.length >= 6, `${scene} sahnesinde en az altı replik olmalı.`);
  assert.equal(new Set(lines).size, lines.length, `${scene} sahnesinde yinelenen replik var.`);

  for (const line of lines) {
    assert.equal(line.trim(), line, `${scene} sahnesinde başta veya sonda boşluk var.`);
    assert.ok(line.length >= 8, `${scene} sahnesindeki replik karakter taşımayacak kadar kısa: ${line}`);
    assert.ok(line.length <= 55, `${scene} sahnesindeki replik konuşma balonuna sığmayacak kadar uzun: ${line}`);
  }
}

const lineCount = entries.reduce((total, [, lines]) => total + lines.length, 0);
assert.ok(lineCount >= 100, "Rota'nın toplam replik havuzu en az 100 satır olmalı.");

console.log(`Rota'nın ${entries.length} sahnedeki ${lineCount} repliği doğrulandı.`);

