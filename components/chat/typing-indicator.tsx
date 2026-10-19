import * as React from "react";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm w-fit shadow-xs">
      <div className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce [animation-delay:-0.3s]" />
      <div className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce [animation-delay:-0.15s]" />
      <div className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" />
    </div>
  );
}
