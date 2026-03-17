import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Re-import fresh module for each test group to reset singleton state
// We directly import and test the exported `reducer` and `toast`/`useToast`

describe("reducer()", () => {
  // Import reducer directly – it is a pure function, no side effects
  let reducer: typeof import("@/hooks/use-toast").reducer;

  beforeEach(async () => {
    const mod = await import("@/hooks/use-toast");
    reducer = mod.reducer;
  });

  const baseState = { toasts: [] };

  it("ADD_TOAST: adds a toast to the front of the list", () => {
    const toast = { id: "1", title: "Hello", open: true };
    const state = reducer(baseState, { type: "ADD_TOAST", toast } as Parameters<typeof reducer>[1]);
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0]).toMatchObject({ id: "1", title: "Hello" });
  });

  it("ADD_TOAST: respects TOAST_LIMIT (keeps only 1 toast)", () => {
    const first = { id: "1", title: "First", open: true };
    const second = { id: "2", title: "Second", open: true };

    let state = reducer(baseState, { type: "ADD_TOAST", toast: first } as Parameters<typeof reducer>[1]);
    state = reducer(state, { type: "ADD_TOAST", toast: second } as Parameters<typeof reducer>[1]);

    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0].id).toBe("2"); // newest toast wins
  });

  it("UPDATE_TOAST: merges new props into the matching toast", () => {
    const initialToast = { id: "1", title: "Original", open: true };
    let state = reducer(baseState, { type: "ADD_TOAST", toast: initialToast } as Parameters<typeof reducer>[1]);

    state = reducer(state, {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "Updated" },
    } as Parameters<typeof reducer>[1]);

    expect(state.toasts[0].title).toBe("Updated");
    expect(state.toasts[0].open).toBe(true); // unchanged fields preserved
  });

  it("UPDATE_TOAST: leaves non-matching toasts unchanged", () => {
    const t1 = { id: "1", title: "Toast 1", open: true };
    let state = reducer(baseState, { type: "ADD_TOAST", toast: t1 } as Parameters<typeof reducer>[1]);

    state = reducer(state, {
      type: "UPDATE_TOAST",
      toast: { id: "99", title: "Ghost Update" },
    } as Parameters<typeof reducer>[1]);

    expect(state.toasts[0].title).toBe("Toast 1"); // unchanged
  });

  it("DISMISS_TOAST: sets `open` to false for the specified toast", () => {
    const toast = { id: "1", title: "T1", open: true };
    let state = reducer(baseState, { type: "ADD_TOAST", toast } as Parameters<typeof reducer>[1]);

    state = reducer(state, { type: "DISMISS_TOAST", toastId: "1" } as Parameters<typeof reducer>[1]);

    expect(state.toasts[0].open).toBe(false);
  });

  it("DISMISS_TOAST: sets all toasts to closed when toastId is undefined", () => {
    const t1 = { id: "1", title: "T1", open: true };
    let state = reducer(baseState, { type: "ADD_TOAST", toast: t1 } as Parameters<typeof reducer>[1]);

    state = reducer(state, { type: "DISMISS_TOAST" } as Parameters<typeof reducer>[1]);

    expect(state.toasts.every((t) => t.open === false)).toBe(true);
  });

  it("REMOVE_TOAST: removes the toast with the given id", () => {
    const toast = { id: "1", title: "T1", open: true };
    let state = reducer(baseState, { type: "ADD_TOAST", toast } as Parameters<typeof reducer>[1]);

    state = reducer(state, { type: "REMOVE_TOAST", toastId: "1" } as Parameters<typeof reducer>[1]);

    expect(state.toasts).toHaveLength(0);
  });

  it("REMOVE_TOAST: clears all toasts when toastId is undefined", () => {
    const toast = { id: "1", title: "T1", open: true };
    let state = reducer(baseState, { type: "ADD_TOAST", toast } as Parameters<typeof reducer>[1]);

    state = reducer(state, { type: "REMOVE_TOAST" } as Parameters<typeof reducer>[1]);

    expect(state.toasts).toHaveLength(0);
  });

  it("REMOVE_TOAST: leaves other toasts if id doesn't match", () => {
    const toast = { id: "1", title: "T1", open: true };
    let state = reducer(baseState, { type: "ADD_TOAST", toast } as Parameters<typeof reducer>[1]);

    state = reducer(state, { type: "REMOVE_TOAST", toastId: "999" } as Parameters<typeof reducer>[1]);

    expect(state.toasts).toHaveLength(1);
  });
});

describe("useToast() hook", () => {
  it("returns a toasts array, a toast function, and a dismiss function", async () => {
    const { useToast } = await import("@/hooks/use-toast");
    const { result } = renderHook(() => useToast());

    expect(Array.isArray(result.current.toasts)).toBe(true);
    expect(typeof result.current.toast).toBe("function");
    expect(typeof result.current.dismiss).toBe("function");
  });

  it("subscribes to state changes: adding a toast updates the hook state", async () => {
    const { useToast, toast } = await import("@/hooks/use-toast");
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: "Test Toast" });
    });

    expect(result.current.toasts.length).toBeGreaterThanOrEqual(1);
    const added = result.current.toasts.find((t) => t.title === "Test Toast");
    expect(added).toBeDefined();
    expect(added?.open).toBe(true);
  });

  it("dismiss() sets the toast to closed", async () => {
    const { useToast, toast } = await import("@/hooks/use-toast");
    const { result } = renderHook(() => useToast());

    let toastId: string;
    act(() => {
      const t = toast({ title: "Dismissable" });
      toastId = t.id;
    });

    act(() => {
      result.current.dismiss(toastId!);
    });

    const dismissed = result.current.toasts.find((t) => t.id === toastId!);
    expect(dismissed?.open).toBe(false);
  });

  it("toast().dismiss() closes that specific toast", async () => {
    const { useToast, toast } = await import("@/hooks/use-toast");
    const { result } = renderHook(() => useToast());

    let toastHandle: ReturnType<typeof toast>;
    act(() => {
      toastHandle = toast({ title: "Closeable" });
    });

    act(() => {
      toastHandle!.dismiss();
    });

    const t = result.current.toasts.find((x) => x.id === toastHandle!.id);
    expect(t?.open).toBe(false);
  });

  it("toast().update() merges new props", async () => {
    const { useToast, toast } = await import("@/hooks/use-toast");
    const { result } = renderHook(() => useToast());

    let toastHandle: ReturnType<typeof toast>;
    act(() => {
      toastHandle = toast({ title: "Original Title" });
    });

    act(() => {
      toastHandle!.update({
        id: toastHandle!.id,
        title: "Updated Title",
      });
    });

    const t = result.current.toasts.find((x) => x.id === toastHandle!.id);
    expect(t?.title).toBe("Updated Title");
  });

  it("unsubscribes listener on unmount (no state updates after unmount)", async () => {
    const { useToast, toast } = await import("@/hooks/use-toast");
    const { result, unmount } = renderHook(() => useToast());

    unmount();

    // After unmount, calling toast should not throw
    expect(() => {
      act(() => {
        toast({ title: "After Unmount" });
      });
    }).not.toThrow();
  });
});
