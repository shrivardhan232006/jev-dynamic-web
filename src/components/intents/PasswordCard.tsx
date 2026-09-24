"use client";

import { Check, Copy, RefreshCw, Shield } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { spring, tween } from "@/lib/motion";
import { generatePassword, type PasswordData } from "@/lib/parse/password";
import { Field, Meta } from "./shared";
import type { CardProps } from "./types";

export function PasswordCard({ data, interactive }: CardProps<PasswordData>) {
  const reduce = useReducedMotion();
  const key = JSON.stringify(data);
  const [state, setState] = useState(() => ({ key, rolls: 0, password: generatePassword(data) }));
  if (state.key !== key) setState({ key, rolls: 0, password: generatePassword(data) });

  const [copied, setCopied] = useState(false);

  const regenerate = useCallback(() => {
    setState((s) => ({ ...s, rolls: s.rolls + 1, password: generatePassword(data) }));
    setCopied(false);
  }, [data]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(state.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [state.password]);

  // Strength indicator
  const strength = data.length >= 20 && data.includeSymbols && data.includeNumbers ? "very strong" :
    data.length >= 16 ? "strong" :
    data.length >= 12 ? "good" :
    data.length >= 8 ? "fair" : "weak";

  const strengthColor = strength === "very strong" || strength === "strong" ? "text-emerald-500" :
    strength === "good" ? "text-amber-500" : "text-red-400";

  return (
    <div className="flex flex-col gap-3">
      <Field index={0} className="flex flex-col gap-2">
        <Meta>{data.label} · {data.length} characters</Meta>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`${state.rolls}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, filter: "blur(4px)", transition: tween.exit }}
            transition={reduce ? tween.fade : spring.snappy}
            className="select-all break-all rounded-lg bg-secondary px-4 py-3 font-mono text-[15px] leading-relaxed tracking-wide"
          >
            {state.password}
          </motion.div>
        </AnimatePresence>
      </Field>
      <Field index={1} className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[13px]">
          <Shield className="size-3.5" />
          <span className={strengthColor}>{strength}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={copyToClipboard} disabled={!interactive} className="gap-1.5 px-3">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" onClick={regenerate} disabled={!interactive} className="gap-1.5 px-3">
            <RefreshCw className="size-3.5" />
            Regenerate
          </Button>
        </div>
      </Field>
    </div>
  );
}
