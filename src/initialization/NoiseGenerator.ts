/**
 * Generates CSS noise texture for block icons
 */
export class NoiseGenerator {
  static generate(): void {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    for (let i = 0; i < 64 * 64; i++) {
      const x = i % 64;
      const y = Math.floor(i / 64);
      const v = Math.floor(Math.random() * 50 + 200); // Light noise
      ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
      ctx.fillRect(x, y, 1, 1);
    }

    document.body.style.setProperty("--noise-url", `url(${canvas.toDataURL()})`);
  }
}
