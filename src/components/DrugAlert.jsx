import { useMemo } from "react";
import { C, PATHS, Ic, Tag } from "./Styles";
import { MEDS } from "../data/MasterData";

const DrugAlert = ({ meds }) => {
  const warns = useMemo(() => {
    const ids = meds.map((m) => +m.mid).filter(Boolean);
    const out = [];
    ids.forEach((id) => {
      const med = MEDS.find((x) => x.id === id);
      med?.interactions.forEach((oid) => {
        if (ids.includes(oid)) {
          const key = [Math.min(id, oid), Math.max(id, oid)].join("-");
          if (!out.find((w) => w.key === key))
            out.push({
              key,
              a: med.name,
              b: MEDS.find((x) => x.id === oid)?.name,
              sev: id === 6 ? "HIGH" : "MODERATE",
            });
        }
      });
    });
    return out;
  }, [meds]);

  if (!warns.length) return null;

  return (
    <div
      style={{
        background: "#FFFBEB",
        border: `1.5px solid ${C.amber}60`,
        borderRadius: 11,
        padding: "13px 16px",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          color: C.amber,
          marginBottom: 8,
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <Ic d={PATHS.alert} s={15} c={C.amber} /> Drug Interaction Warning
      </div>
      {warns.map((w) => (
        <div
          key={w.key}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <Tag label={w.sev} color={w.sev === "HIGH" ? C.red : C.amber} />
          <span style={{ fontSize: 12, color: C.ink }}>
            <b>{w.a}</b> + <b>{w.b}</b> — {w.sev === "HIGH" ? "Serious adverse reaction possible" : "Requires monitoring"}.
          </span>
        </div>
      ))}
    </div>
  );
};

export default DrugAlert;