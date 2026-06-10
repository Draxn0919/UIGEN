import { test, expect, afterEach, describe } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolCallLabel, ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// getToolCallLabel — pure function tests
// ---------------------------------------------------------------------------

describe("getToolCallLabel — str_replace_editor", () => {
  const path = "/src/Button.tsx";

  test("create in-progress", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "create", path }, "call")).toBe("Creating Button.tsx");
  });

  test("create completed", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "create", path }, "result")).toBe("Created Button.tsx");
  });

  test("str_replace in-progress", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path }, "call")).toBe("Editing Button.tsx");
  });

  test("str_replace completed", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path }, "result")).toBe("Edited Button.tsx");
  });

  test("insert in-progress", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "insert", path }, "call")).toBe("Inserting into Button.tsx");
  });

  test("insert completed", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "insert", path }, "result")).toBe("Inserted into Button.tsx");
  });

  test("view in-progress", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "view", path }, "call")).toBe("Reading Button.tsx");
  });

  test("view completed", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "view", path }, "result")).toBe("Read Button.tsx");
  });

  test("undo_edit in-progress", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "undo_edit", path }, "call")).toBe("Undoing edit in Button.tsx");
  });

  test("undo_edit completed", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "undo_edit", path }, "result")).toBe("Undid edit in Button.tsx");
  });
});

describe("getToolCallLabel — file_manager", () => {
  const path = "/src/old.tsx";

  test("rename in-progress", () => {
    expect(getToolCallLabel("file_manager", { command: "rename", path }, "call")).toBe("Renaming old.tsx");
  });

  test("rename completed", () => {
    expect(getToolCallLabel("file_manager", { command: "rename", path }, "result")).toBe("Renamed old.tsx");
  });

  test("delete in-progress", () => {
    expect(getToolCallLabel("file_manager", { command: "delete", path }, "call")).toBe("Deleting old.tsx");
  });

  test("delete completed", () => {
    expect(getToolCallLabel("file_manager", { command: "delete", path }, "result")).toBe("Deleted old.tsx");
  });
});

describe("getToolCallLabel — edge cases", () => {
  test("extracts basename from nested path", () => {
    const label = getToolCallLabel(
      "str_replace_editor",
      { command: "create", path: "/src/components/ui/Card.tsx" },
      "call"
    );
    expect(label).toBe("Creating Card.tsx");
  });

  test("partial-call with missing path shows verb only", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "create" }, "partial-call")).toBe("Creating");
  });

  test("partial-call with null args falls back to toolName", () => {
    expect(getToolCallLabel("str_replace_editor", null, "partial-call")).toBe("str_replace_editor");
  });

  test("empty args object falls back to toolName", () => {
    expect(getToolCallLabel("str_replace_editor", {}, "call")).toBe("str_replace_editor");
  });

  test("unknown toolName returns toolName as-is", () => {
    expect(getToolCallLabel("custom_tool", {}, "call")).toBe("custom_tool");
  });

  test("partial-call state produces present tense, not past", () => {
    const label = getToolCallLabel(
      "str_replace_editor",
      { command: "create", path: "/src/Button.tsx" },
      "partial-call"
    );
    expect(label).toBe("Creating Button.tsx");
  });
});

// ---------------------------------------------------------------------------
// ToolCallBadge — component render tests
// ---------------------------------------------------------------------------

describe("ToolCallBadge — visual state", () => {
  test("shows spinner when state is 'call'", () => {
    const { container } = render(
      <ToolCallBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/src/Button.tsx" }}
        state="call"
      />
    );
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(container.querySelector(".bg-emerald-500")).toBeNull();
  });

  test("shows green dot when state is 'result' and result is present", () => {
    const { container } = render(
      <ToolCallBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/src/Button.tsx" }}
        state="result"
        result="Success"
      />
    );
    expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
    expect(container.querySelector(".animate-spin")).toBeNull();
  });

  test("shows spinner when state is 'partial-call'", () => {
    const { container } = render(
      <ToolCallBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/src/Button.tsx" }}
        state="partial-call"
      />
    );
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(container.querySelector(".bg-emerald-500")).toBeNull();
  });

  test("shows spinner when state is 'result' but result is undefined", () => {
    const { container } = render(
      <ToolCallBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/src/Button.tsx" }}
        state="result"
        result={undefined}
      />
    );
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(container.querySelector(".bg-emerald-500")).toBeNull();
  });
});

describe("ToolCallBadge — label and structure", () => {
  test("renders correct label text", () => {
    render(
      <ToolCallBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/src/Button.tsx" }}
        state="call"
      />
    );
    expect(screen.getByText("Creating Button.tsx")).toBeDefined();
  });

  test("badge has correct base classes", () => {
    const { container } = render(
      <ToolCallBadge
        toolName="str_replace_editor"
        args={{}}
        state="call"
      />
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("inline-flex");
    expect(badge.className).toContain("bg-neutral-50");
    expect(badge.className).toContain("rounded-lg");
  });
});
