import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { Materia, QuestaoLog } from "@/types/db";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";

const CORES = { grade: "#25405f", texto: "#6f849e", ouro: "#e0a83e", azul: "#4f9dde" };

const tooltipStyle = {
  background: "#152840",
  border: "1px solid #25405f",
  borderRadius: 10,
  fontSize: 12,
  color: "#e8eef6",
};
const tooltipLabelStyle = { color: "#9db0c7", fontWeight: 600, marginBottom: 2 };
const tooltipItemStyle = { color: "#e8eef6" };

/** % de acertos por dia. */
export function AcertosChart({ logs }: { logs: QuestaoLog[] }) {
  const dados = useMemo(() => {
    const porDia = new Map<string, { total: number; acertos: number }>();
    for (const l of logs) {
      const d = porDia.get(l.data) ?? { total: 0, acertos: 0 };
      d.total += l.total;
      d.acertos += l.acertos;
      porDia.set(l.data, d);
    }
    return [...porDia.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, d]) => ({
        dia: format(parseISO(data), "dd/MM"),
        pct: Math.round((d.acertos / d.total) * 100),
        questoes: d.total,
      }));
  }, [logs]);

  return (
    <Card>
      <CardHeader title="Taxa de acerto" subtitle="% por dia — últimos 30 dias" />
      <CardBody>
        {dados.length === 0 ? (
          <EmptyState icon="📈" title="Sem registros ainda" message="Registre questões acima para ver sua evolução." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
              <CartesianGrid stroke={CORES.grade} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" tick={{ fill: CORES.texto, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CORES.grade }} />
              <YAxis domain={[0, 100]} tick={{ fill: CORES.texto, fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(v, nome) =>
                  nome === "pct" ? [`${Number(v)}%`, "acerto"] : [Number(v), "questões"]
                }
              />
              <Line
                type="monotone"
                dataKey="pct"
                stroke={CORES.ouro}
                strokeWidth={2.5}
                dot={{ fill: CORES.ouro, r: 3.5 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}

/** Questões e acerto por matéria. */
export function PorMateriaChart({ logs, materias }: { logs: QuestaoLog[]; materias: Materia[] }) {
  const dados = useMemo(() => {
    const porMat = new Map<string, { total: number; acertos: number }>();
    for (const l of logs) {
      const chave = l.materia_id ?? "geral";
      const d = porMat.get(chave) ?? { total: 0, acertos: 0 };
      d.total += l.total;
      d.acertos += l.acertos;
      porMat.set(chave, d);
    }
    return [...porMat.entries()]
      .map(([id, d]) => {
        const m = materias.find((x) => x.id === id);
        return {
          nome: m ? `${m.icone} ${m.nome.length > 22 ? m.nome.slice(0, 21) + "…" : m.nome}` : "Geral",
          questoes: d.total,
          pct: Math.round((d.acertos / d.total) * 100),
        };
      })
      .sort((a, b) => b.questoes - a.questoes)
      .slice(0, 10);
  }, [logs, materias]);

  return (
    <Card>
      <CardHeader title="Por matéria" subtitle="Questões e % de acerto — últimos 30 dias" />
      <CardBody>
        {dados.length === 0 ? (
          <EmptyState icon="📊" title="Sem registros ainda" message="Os dados por matéria aparecem aqui." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, dados.length * 42)}>
            <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 8 }}>
              <CartesianGrid stroke={CORES.grade} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: CORES.texto, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CORES.grade }} />
              <YAxis
                type="category"
                dataKey="nome"
                width={170}
                tick={{ fill: "#9db0c7", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(v, nome) =>
                  nome === "questoes" ? [Number(v), "questões"] : [`${Number(v)}%`, "acerto"]
                }
              />
              <Bar dataKey="questoes" fill={CORES.azul} radius={[0, 6, 6, 0]} barSize={16}
                label={{ position: "right", fill: CORES.texto, fontSize: 11 }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}
