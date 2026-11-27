import { describe, it, expect } from "vitest";
import { describeNoteEditor, type NoteEditorInput } from "../index";

const NOW = Date.parse("2026-11-27T12:00:00Z");

function view(overrides: Partial<NoteEditorInput> = {}) {
  return describeNoteEditor({
    draft: "",
    saved: null,
    isSaving: false,
    error: undefined,
    maxLength: 10,
    now: NOW,
    ...overrides,
  });
}

const savedAt = (msAgo: number) => new Date(NOW - msAgo).toISOString();

describe("describeNoteEditor", () => {
  it("disables Save and shows no status for an empty, never-saved note", () => {
    const result = view();
    expect(result.canSave).toBe(false);
    expect(result.saveLabel).toBe("Save note");
    expect(result.status).toEqual({ tone: "none" });
    expect(result.counter).toBe("0 / 10");
    expect(result.overLimit).toBe(false);
  });

  it("disables Save for a whitespace-only draft", () => {
    expect(view({ draft: "   " }).canSave).toBe(false);
  });

  it("enables Save and flags unsaved changes once the draft differs", () => {
    const result = view({ draft: "hello" });
    expect(result.canSave).toBe(true);
    expect(result.status).toEqual({ tone: "muted", text: "Unsaved changes" });
    expect(result.counter).toBe("5 / 10");
  });

  it("disables Save when the draft matches the saved note", () => {
    const result = view({
      draft: "hello",
      saved: { body: "hello", updatedAt: savedAt(5 * 60_000) },
    });
    expect(result.canSave).toBe(false);
    expect(result.status).toEqual({ tone: "muted", text: "Saved 5m ago" });
  });

  it("allows a draft exactly at the limit", () => {
    const result = view({ draft: "x".repeat(10) });
    expect(result.overLimit).toBe(false);
    expect(result.canSave).toBe(true);
  });

  it("disables Save and flags the counter when the draft is over the limit", () => {
    const result = view({ draft: "x".repeat(11) });
    expect(result.overLimit).toBe(true);
    expect(result.canSave).toBe(false);
  });

  it("disables Save and hides the status while saving", () => {
    const result = view({ draft: "hello", isSaving: true });
    expect(result.canSave).toBe(false);
    expect(result.saveLabel).toBe("Saving...");
    expect(result.status).toEqual({ tone: "none" });
  });

  it("shows the server's error ahead of anything else", () => {
    const result = view({
      draft: "hello",
      saved: { body: "old", updatedAt: savedAt(0) },
      error: "Too long",
    });
    expect(result.status).toEqual({ tone: "error", text: "Too long" });
  });

  it.each([
    [0, "Saved just now"],
    [59_999, "Saved just now"],
    [60_000, "Saved 1m ago"],
    [59 * 60_000, "Saved 59m ago"],
    [60 * 60_000, "Saved 1h ago"],
    [23 * 3_600_000, "Saved 23h ago"],
    [24 * 3_600_000, "Saved 1d ago"],
    [40 * 86_400_000, "Saved 40d ago"],
  ])("describes a note saved %ims ago as %s", (msAgo, text) => {
    const result = view({
      draft: "a",
      saved: { body: "a", updatedAt: savedAt(msAgo) },
    });
    expect(result.status).toEqual({ tone: "muted", text });
  });

  it("falls back to 'just now' for an unparseable timestamp", () => {
    const result = view({
      draft: "a",
      saved: { body: "a", updatedAt: "not a date" },
    });
    expect(result.status).toEqual({ tone: "muted", text: "Saved just now" });
  });

  it("says only 'Saved' before the client knows the time", () => {
    const result = view({
      draft: "a",
      saved: { body: "a", updatedAt: savedAt(5 * 60_000) },
      now: null,
    });
    expect(result.status).toEqual({ tone: "muted", text: "Saved" });
  });
});
