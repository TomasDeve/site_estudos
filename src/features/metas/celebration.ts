import confetti from "canvas-confetti";

/** Festa ao concluir o dia: rajada central + fogos laterais + chuva dourada. */
export function celebrar() {
  const base = { zIndex: 9999, disableForReducedMotion: true };
  const cores = ["#e0a83e", "#f0c874", "#4f9dde", "#3fbf7f", "#e8eef6"];

  confetti({ ...base, particleCount: 90, spread: 70, origin: { y: 0.65 }, colors: cores });
  setTimeout(
    () =>
      confetti({
        ...base,
        particleCount: 70,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: cores,
      }),
    200
  );
  setTimeout(
    () =>
      confetti({
        ...base,
        particleCount: 70,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: cores,
      }),
    200
  );
  setTimeout(
    () =>
      confetti({
        ...base,
        particleCount: 140,
        spread: 120,
        startVelocity: 45,
        scalar: 1.1,
        origin: { y: 0.4 },
        colors: cores,
      }),
    450
  );
}
