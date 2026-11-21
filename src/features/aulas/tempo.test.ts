import { describe, expect, it } from "vitest";
import { formatarParei, idYoutube, lerParei, linkContinuar } from "./tempo";

describe("lerParei", () => {
  it("entende min:seg e h:min:seg", () => {
    expect(lerParei("12:34")).toBe(754);
    expect(lerParei("1:02:34")).toBe(3754);
    expect(lerParei("0:00")).toBe(0);
  });
  it("número sozinho vale minutos; vazio vale zero", () => {
    expect(lerParei("45")).toBe(2700);
    expect(lerParei("")).toBe(0);
  });
  it("entende h, m e s", () => {
    expect(lerParei("1h02")).toBe(3720);
    expect(lerParei("1h2m30s")).toBe(3750);
    expect(lerParei("45m")).toBe(2700);
    expect(lerParei("230s")).toBe(230);
    expect(lerParei("2m30")).toBe(150);
  });
  it("recusa o que não entende", () => {
    expect(lerParei("12:75")).toBeNull();
    expect(lerParei("abc")).toBeNull();
  });
});

describe("formatarParei", () => {
  it("mostra m:ss ou h:mm:ss", () => {
    expect(formatarParei(754)).toBe("12:34");
    expect(formatarParei(3754)).toBe("1:02:34");
    expect(formatarParei(0)).toBe("0:00");
  });
});

describe("YouTube", () => {
  it("acha o ID nas formas comuns", () => {
    expect(idYoutube("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toBe("dQw4w9WgXcQ");
    expect(idYoutube("https://youtu.be/dQw4w9WgXcQ?si=abc")).toBe("dQw4w9WgXcQ");
    expect(idYoutube("https://m.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(idYoutube("https://www.estrategiaconcursos.com.br/aula/1")).toBeNull();
  });
  it("abre no ponto em que parou", () => {
    expect(linkContinuar("https://youtu.be/dQw4w9WgXcQ", 754)).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=754s"
    );
    expect(linkContinuar("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123", 0)).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123"
    );
    expect(linkContinuar("site.com/aula", 60)).toBe("https://site.com/aula");
  });
});
