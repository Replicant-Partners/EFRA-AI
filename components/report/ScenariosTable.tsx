"use client";

import { useState } from "react";
import type { ReportContent } from "@/src/shared/types";

type Scenario = ReportContent["scenarios"][number];

interface Props {
  analysisId: string;
  scenarios:  Scenario[];
  onSaved:    (scenarios: Scenario[]) => void;
}

export default function ScenariosTable({ analysisId, scenarios: initial, onSaved }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>(initial);
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  function updateField(index: number, field: keyof Scenario, value: string | number) {
    setScenarios((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function probSum() {
    return scenarios.reduce((acc, s) => acc + s.probability, 0);
  }

  async function handleSave() {
    const sum = probSum();
    if (Math.abs(sum - 1.0) > 0.01) {
      setError(`Probabilities must sum to 100% (currently ${(sum * 100).toFixed(0)}%)`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/report`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "update_scenarios", scenarios }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSaved(scenarios);
      setEditing(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  const colorFor = (type: string) =>
    type === "Bull" ? "text-[#7A9E6A]" : type === "Bear" ? "text-[#C84848]" : "text-[#C8804A]";

  const inp = "border border-[#EDE7E0] rounded px-2 py-1 text-[11px] bg-[#FAF8F4] font-[inherit] focus:outline-none focus:border-[#C8804A] w-full";

  if (scenarios.length === 0) {
    return <p className="text-[12px] text-[#A89E94] italic">No scenarios generated.</p>;
  }

  return (
    <div className="space-y-3">
      {scenarios.map((s, i) => (
        <div key={s.type} className="border border-[#EDE7E0] rounded p-3 space-y-2">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`text-[11px] font-semibold tracking-widest uppercase ${colorFor(s.type)}`}>
              {s.type}
            </span>
            {editing ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-[#A89E94]">Prob</span>
                <input
                  type="number" min="0" max="100" step="5"
                  value={Math.round(s.probability * 100)}
                  onChange={(e) => updateField(i, "probability", Number(e.target.value) / 100)}
                  className={`${inp} w-16`}
                />
                <span className="text-[10px] text-[#A89E94]">%</span>
                <span className="text-[10px] text-[#A89E94] ml-2">PT $</span>
                <input
                  type="number" min="0" step="0.5"
                  value={s.implied_pt}
                  onChange={(e) => updateField(i, "implied_pt", Number(e.target.value))}
                  className={`${inp} w-24`}
                />
              </div>
            ) : (
              <>
                <span className="text-[11px] text-[#A89E94]">{(s.probability * 100).toFixed(0)}%</span>
                <span className="text-[11px] font-semibold text-[#1E1A14]">PT ${s.implied_pt}</span>
              </>
            )}
          </div>

          {editing ? (
            <div className="space-y-2">
              <div>
                <div className="text-[9px] text-[#A89E94] mb-1 uppercase tracking-widest">Price Derivation</div>
                <input
                  type="text"
                  value={s.price_derivation}
                  onChange={(e) => updateField(i, "price_derivation", e.target.value)}
                  className={inp}
                />
              </div>
              <div>
                <div className="text-[9px] text-[#A89E94] mb-1 uppercase tracking-widest">Triggers</div>
                <textarea
                  value={s.triggers}
                  onChange={(e) => updateField(i, "triggers", e.target.value)}
                  rows={2}
                  className={`${inp} resize-y`}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {s.price_derivation && (
                <p className="text-[11px] font-mono text-[#8C7E70]">{s.price_derivation}</p>
              )}
              {s.triggers && (
                <p className="text-[11px] text-[#A89E94] italic leading-relaxed">{s.triggers}</p>
              )}
            </div>
          )}
        </div>
      ))}

      {error && <p className="text-[11px] text-[#C84848]">{error}</p>}

      <div className="flex items-center gap-4 pt-1">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-[11px] font-semibold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Scenarios"}
            </button>
            <button
              onClick={() => { setScenarios(initial); setEditing(false); setError(null); }}
              disabled={saving}
              className="text-[10px] text-[#A89E94] hover:text-[#6E6258] transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-[10px] text-[#A89E94] hover:text-[#C8804A] transition-colors"
          >
            Edit Scenarios
          </button>
        )}
      </div>
    </div>
  );
}
