"use client";

import { Loader2 } from "lucide-react";

type ToolCallState = "partial-call" | "call" | "result";

interface ToolCallBadgeProps {
  toolName: string;
  args: unknown;
  state: ToolCallState;
  result?: unknown;
}

export function getToolCallLabel(
  toolName: string,
  args: unknown,
  state: ToolCallState
): string {
  const completed = state === "result";
  const safeArgs =
    typeof args === "object" && args !== null
      ? (args as Record<string, unknown>)
      : {};
  const rawPath = typeof safeArgs.path === "string" ? safeArgs.path : "";
  const basename = rawPath
    ? (rawPath.split(/[\\/]/).filter(Boolean).pop() ?? rawPath)
    : "";
  const name = basename ? ` ${basename}` : "";
  const command =
    typeof safeArgs.command === "string" ? safeArgs.command : "";

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return completed ? `Created${name}` : `Creating${name}`;
      case "str_replace":
        return completed ? `Edited${name}` : `Editing${name}`;
      case "insert":
        return completed ? `Inserted into${name}` : `Inserting into${name}`;
      case "view":
        return completed ? `Read${name}` : `Reading${name}`;
      case "undo_edit":
        return completed ? `Undid edit in${name}` : `Undoing edit in${name}`;
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename":
        return completed ? `Renamed${name}` : `Renaming${name}`;
      case "delete":
        return completed ? `Deleted${name}` : `Deleting${name}`;
    }
  }

  return toolName;
}

export function ToolCallBadge({
  toolName,
  args,
  state,
  result,
}: ToolCallBadgeProps) {
  const isCompleted = state === "result" && result != null;
  const label = getToolCallLabel(toolName, args, state);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isCompleted ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
