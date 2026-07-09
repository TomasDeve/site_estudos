import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { minutosPorDia, useSessoesJanela } from "@/api/sessoes";
import { hojeISO, semanaAtualISO, fmtMinutos } from "@/lib/dates";
import { Card, CardBody, CardHeader } from "@/components/Card";

export function WeekStudyChart() {
  const semana = semanaAtualISO();
  const { data: sessoes } = useSessoesJanela(semana[0], semana[6]);
  const hoje = hojeISO();

  const dados = useMemo(() => {
    const mapa = minutosPorDia(sessoes);
    return semana.map((iso) => ({
      dia: format(parseISO(iso), "EEEEEE", { locale: ptBR }),
      minutos: mapa.get(iso) ?? 0,
      ehHoje: iso === hoje,
    }));
  }, [sessoes, semana, hoje]);

  const totalSemana = dados.reduce((s, d) => s + d.minutos, 0);

  return (
    <Card>
      <CardHeader
        title="Tempo de estudo — semana"
        subtitle={
          totalSemana > 0 ? `${fmtMinutos(totalSemana)} acumulados` : "Conclua blocos nas Metas para alimentar este gráfico"
        }
      />
      <CardBody>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="#25405f" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="dia"
              tick={{ fill: "#6f849e", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#25405f" }}
            />
            <YAxis
              tick={{ fill: "#6f849e", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${Math.round(v / 60 * 10) / 10}h`}
            />
            <Tooltip
              cursor={{ fill: "rgba(224,168,62,0.06)" }}
              contentStyle={{
                background: "#152840",
                border: "1px solid #25405f",
                borderRadius: 10,
                fontSize: 12,
                color: "#e8eef6",
              }}
              labelStyle={{ color: "#9db0c7", fontWeight: 600, marginBottom: 2 }}
              itemStyle={{ color: "#e8eef6" }}
              formatter={(v) => [fmtMinutos(Number(v)), "estudado"]}
            />
            <Bar dataKey="minutos" radius={[6, 6, 0, 0]}>
              {dados.map((d, i) => (
                // hoje em dourado, resto em azul
                <Cell key={i} fill={d.ehHoje ? "#e0a83e" : "#4f9dde"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
