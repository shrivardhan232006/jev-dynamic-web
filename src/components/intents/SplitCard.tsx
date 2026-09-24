"use client";

import { Check, Copy, MessageCircle, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAmount } from "@/lib/parse/common";
import type { SplitData } from "@/lib/parse/split";
import { notify } from "@/lib/notify";
import { sound } from "@/lib/sound";
import { AnimatedNumber, Field, HeroNumber, Meta } from "./shared";
import type { CardProps } from "./types";

const TIPS = [0, 5, 10, 15, 20];

export function SplitCard({ data, interactive }: CardProps<SplitData>) {
  const [people, setPeople] = useState<number | null>(null);
  const [total, setTotal] = useState<string | null>(null);
  const [tipPercent, setTipPercent] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const [prev, setPrev] = useState(data);
  if (prev.total !== data.total || prev.people !== data.people) {
    setPrev(data);
    setPeople(null);
    setTotal(null);
  }

  const n = people ?? data.people ?? 2;
  const baseAmount = total !== null ? Number(total.replace(/,/g, "")) || 0 : (data.total ?? 0);
  const tipAmount = (baseAmount * tipPercent) / 100;
  const grandTotal = baseAmount + tipAmount;
  const each = n > 0 ? grandTotal / n : 0;

  const handleShareWhatsApp = () => {
    sound.chime();
    const text = encodeURIComponent(
      `💸 Bill Split (${data.currency}${grandTotal.toFixed(0)} total between ${n} people):\n👉 Each person pays: ${data.currency}${each.toFixed(0)}${
        tipPercent > 0 ? ` (Includes ${tipPercent}% tip)` : ""
      }\nShared via Shapeshift`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    notify("Opening WhatsApp to share split!");
  };

  const handleCopyBreakdown = async () => {
    sound.tick();
    const text = `Bill Split Breakdown:\nTotal: ${data.currency}${grandTotal.toFixed(0)}\nPeople: ${n}\nEach: ${data.currency}${each.toFixed(0)}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    notify("Split breakdown copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <Field index={0} className="flex flex-col gap-1">
            <Meta>Total Bill</Meta>
            <div className="relative w-36">
              <span aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[15px] text-muted-foreground">{data.currency}</span>
              <Input
                inputMode="decimal"
                disabled={!interactive}
                aria-label="Total"
                placeholder="0"
                className="h-9 ps-7 text-base tabular-nums sm:text-[15px]"
                value={total ?? (data.total !== null ? String(data.total) : "")}
                onChange={(e) => setTotal(e.target.value)}
              />
            </div>
          </Field>
          <Field index={1} className="flex flex-col gap-1">
            <Meta>People</Meta>
            <div className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Fewer people"
                disabled={!interactive || n <= 1}
                onClick={() => {
                  sound.tick();
                  setPeople(Math.max(1, n - 1));
                }}
              >
                <Minus />
              </Button>
              <span className="w-8 text-center text-[17px] font-[550] tabular-nums">{n}</span>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="More people"
                disabled={!interactive || n >= 99}
                onClick={() => {
                  sound.tick();
                  setPeople(n + 1);
                }}
              >
                <Plus />
              </Button>
            </div>
          </Field>
        </div>
        <Field index={2} className="flex min-w-0 flex-col items-end gap-1 text-end">
          <Meta>Each person pays</Meta>
          <HeroNumber>
            <AnimatedNumber value={each} format={(v) => formatAmount(v, data.currency)} />
          </HeroNumber>
          {tipPercent > 0 && (
            <span className="text-xs text-muted-foreground">
              Total {data.currency}{grandTotal.toFixed(0)} ({tipPercent}% tip)
            </span>
          )}
        </Field>
      </div>

      {interactive && (
        <Field index={3} className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
          {/* Tip Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Tip:</span>
            <div className="flex items-center gap-1 rounded-full border border-border/80 bg-secondary/50 p-0.5 text-xs">
              {TIPS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    sound.tick();
                    setTipPercent(t);
                  }}
                  className={`rounded-full px-2 py-0.5 font-medium transition-all ${
                    tipPercent === t
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}%
                </button>
              ))}
            </div>
          </div>

          {/* Quick share buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={handleShareWhatsApp}
              className="h-7 gap-1 rounded-full text-xs font-medium border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <MessageCircle className="size-3.5" />
              WhatsApp
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyBreakdown}
              className="h-7 gap-1 rounded-full text-xs text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </Field>
      )}
    </div>
  );
}
