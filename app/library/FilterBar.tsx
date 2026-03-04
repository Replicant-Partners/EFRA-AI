"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function FilterBar() {
  const router = useRouter();
  const sp     = useSearchParams();

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("offset"); // reset pagination on filter change
    router.push(`/library?${params.toString()}`);
  }, [router, sp]);

  const inputCls = "bg-transparent border-b border-[#D8D0C8] text-[11px] text-[#1E1A14] placeholder-[#D8D0C8] focus:outline-none focus:border-[#C8804A] transition-colors pb-0.5 w-28";
  const selectCls = "bg-transparent border-b border-[#D8D0C8] text-[11px] text-[#6E6258] focus:outline-none focus:border-[#C8804A] transition-colors pb-0.5 cursor-pointer";

  return (
    <div className="flex items-center gap-6 mb-6">
      <input
        type="text"
        placeholder="Ticker…"
        defaultValue={sp.get("ticker") ?? ""}
        onBlur={e => update("ticker", e.target.value.trim().toUpperCase())}
        onKeyDown={e => e.key === "Enter" && update("ticker", (e.target as HTMLInputElement).value.trim().toUpperCase())}
        className={inputCls}
      />
      <select
        defaultValue={sp.get("rating") ?? ""}
        onChange={e => update("rating", e.target.value)}
        className={selectCls}
      >
        <option value="">All ratings</option>
        <option value="BUY">BUY</option>
        <option value="HOLD">HOLD</option>
        <option value="UNDERPERFORM">UNDERPERFORM</option>
      </select>
      <select
        defaultValue={sp.get("status") ?? ""}
        onChange={e => update("status", e.target.value)}
        className={selectCls}
      >
        <option value="">All statuses</option>
        <option value="COMPLETED">COMPLETED</option>
        <option value="DROPPED">DROPPED</option>
        <option value="COMPLIANCE_HALT">COMPLIANCE HALT</option>
      </select>
    </div>
  );
}
