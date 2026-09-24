"use client";

import { motion, useReducedMotion } from "motion/react";
import { CalendarPlus, Check, CheckCircle2, Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { TodoData } from "@/lib/parse/todo";
import { easeOut, spring, tween } from "@/lib/motion";
import { notify } from "@/lib/notify";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { Placeholder } from "./shared";
import type { CardProps } from "./types";

export function TodoList({ data, interactive }: CardProps<TodoData>) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [created, setCreated] = useState(false);
  const [creating, setCreating] = useState(false);
  const reduce = useReducedMotion();

  const handleSaveToCalendar = async () => {
    if (creating || data.items.length === 0) return;
    setCreating(true);
    sound.tick();
    try {
      const summary = `Tasks: ${data.items.slice(0, 3).join(", ")}${data.items.length > 3 ? "..." : ""}`;
      const description = `Todo Checklist:\n${data.items.map((it) => `- [ ] ${it}`).join("\n")}\n\nCreated by Shapeshift`;
      const res = await fetch("/api/mcp/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary,
          start: new Date(Date.now() + 3600 * 1000).toISOString(),
          durationMinutes: 60,
          description,
        }),
      });
      const result = await res.json();
      if (result.success && result.eventId) {
        sound.chime();
        setCreated(true);
        notify("Tasks added directly to your Google Calendar! 🎉");
      } else {
        notify(result.error || "Failed to add tasks to calendar");
      }
    } catch {
      notify("Failed to connect to Google Calendar API");
    } finally {
      setCreating(false);
    }
  };

  const total = data.items.length;
  const completedCount = data.items.filter((item) => done[item]).length;
  const allCompleted = total > 0 && completedCount === total;

  const toggleItem = (item: string, checked: boolean) => {
    sound.tick();
    const nextDone = { ...done, [item]: checked };
    setDone(nextDone);

    const newCompleted = data.items.filter((it) => nextDone[it]).length;
    if (newCompleted === total && total > 0) {
      sound.chime();
      notify("All items completed! 🎉");
    }
  };

  const handleCopyMarkdown = async () => {
    sound.tick();
    const md = data.items.map((it) => `- [${done[it] ? "x" : " "}] ${it}`).join("\n");
    await navigator.clipboard.writeText(md);
    setCopied(true);
    notify("Copied checklist as Markdown!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Progress header if multiple items */}
      {total > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
          <span className="font-medium">
            {completedCount} of {total} completed
          </span>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                animate={{ width: `${(completedCount / total) * 100}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>
            {allCompleted && <Sparkles className="size-3.5 text-amber-500" />}
          </div>
        </div>
      )}

      <ul className="flex flex-col">
        {data.items.map((item, i) => {
          const checked = Boolean(done[item]);
          const id = `todo-${i}-${item}`;
          return (
            <motion.li
              key={item + i}
              layout="position"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={reduce ? tween.fade : { ...spring.settle, delay: 0.04 + i * 0.04 }}
              className="flex min-h-10 items-center gap-3 border-b border-border/70 py-2 last:border-b-0"
            >
              <Checkbox
                id={id}
                checked={checked}
                disabled={!interactive}
                onCheckedChange={(v) => toggleItem(item, v === true)}
              />
              <label
                htmlFor={id}
                className={cn(
                  "relative cursor-pointer text-[15px] leading-[22px] transition-colors duration-200 select-none",
                  checked && "text-muted-foreground"
                )}
              >
                {item}
                <motion.span
                  aria-hidden
                  className="absolute top-1/2 right-0 left-0 h-px origin-left bg-current"
                  initial={false}
                  animate={{ scaleX: checked ? 1 : 0 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.22, ease: easeOut }}
                />
              </label>
            </motion.li>
          );
        })}
        <li className="flex h-10 items-center justify-between">
          <Placeholder insert=", ">Add item</Placeholder>
          {interactive && total > 0 && (
            <div className="flex items-center gap-1.5">
              {created ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Check className="size-3" />
                  Added to Calendar
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveToCalendar}
                  disabled={creating}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <CalendarPlus className="size-3" />
                  {creating ? "Saving..." : "Add to Calendar"}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyMarkdown}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                {copied ? "Copied" : "Copy Markdown"}
              </Button>
            </div>
          )}
        </li>
      </ul>
    </div>
  );
}
