import { describe, expect, it, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  CheckListField,
  CodeListField,
  ComboField,
  Form,
} from "@/pages/franchise/onboarding/formKit";
import { INDIA_PINCODE } from "@shared/geo/india";

/**
 * The controls step 2 gained when the territory stopped being a paragraph.
 *
 * Tested here rather than through the wizard because reaching step 2 means filling step 1's nine
 * identity fields first, and none of that has anything to do with what these do. What is worth
 * pinning down is the behaviour a reader would not guess from the markup: a district dropdown that
 * writes a one-item array, a list that stays sorted however it was clicked, and a pin code box that
 * refuses a bad token at the point of typing instead of adding a chip that is quietly wrong until
 * submit.
 *
 * `CheckListField` is the multi-select the district picker used to be. Step 2 asks for one district
 * and uses `ComboField` for it, so nothing renders `CheckListField` today.
 */

const DISTRICTS = ["Bengaluru (Bangalore) Urban", "Mysuru (Mysore)", "Ramanagara", "Udupi"];

type Values = { districts: string[]; pincodes: string[] };

function Host({ districts = DISTRICTS }: { districts?: readonly string[] }) {
  const form = useForm<Values>({
    defaultValues: { districts: [], pincodes: [] },
  });
  const picked = form.watch("districts");
  const codes = form.watch("pincodes");

  return (
    <Form {...form}>
      <form>
        <CheckListField
          form={form}
          name="districts"
          label="Districts"
          options={districts}
          searchPlaceholder="Search districts"
          emptyHint="Choose a state first."
        />
        <CodeListField
          form={form}
          name="pincodes"
          label="Pin codes"
          pattern={INDIA_PINCODE}
          invalidMessage="A pin code is six digits, and cannot start with a zero."
          optional
        />
        <output data-testid="value-districts">{JSON.stringify(picked)}</output>
        <output data-testid="value-pincodes">{JSON.stringify(codes)}</output>
      </form>
    </Form>
  );
}

/** Step 2's district control: one answer, held as a one-item array. */
function ComboHost() {
  const form = useForm<Values>({
    defaultValues: { districts: [], pincodes: [] },
  });
  const picked = form.watch("districts");

  return (
    <Form {...form}>
      <form>
        <ComboField
          form={form}
          name="districts"
          label="District"
          options={DISTRICTS.map((d) => ({ value: d, label: d }))}
          placeholder="Choose a district"
          searchPlaceholder="Search districts"
          asArray
        />
        <output data-testid="value-districts">{JSON.stringify(picked)}</output>
      </form>
    </Form>
  );
}

/** The wizard's own settings: a resolver, and `mode: "onBlur"`. Both matter to the test below. */
function ValidatedHost() {
  const form = useForm<Values>({
    resolver: zodResolver(
      z.object({
        districts: z.array(z.string()).min(1, "Choose at least one district"),
        pincodes: z.array(z.string()),
      }),
    ),
    defaultValues: { districts: [], pincodes: [] },
    mode: "onBlur",
  });

  return (
    <Form {...form}>
      <form>
        <CheckListField
          form={form}
          name="districts"
          label="Districts"
          options={DISTRICTS}
          searchPlaceholder="Search districts"
        />
      </form>
    </Form>
  );
}

function districtsValue() {
  return JSON.parse(screen.getByTestId("value-districts").textContent ?? "null");
}

function pincodesValue() {
  return JSON.parse(screen.getByTestId("value-pincodes").textContent ?? "null");
}

beforeEach(() => {
  cleanup();
});

/*
  `asArray` is the one thing about this control a reader would not guess: `proposedDistricts` is an
  array because a granted territory can be several districts, and an application asks for one. A
  plain string written into that field would fail the schema on submit rather than at the click.
*/
describe("ComboField, asArray", () => {
  it("writes the chosen district as a one-item array", async () => {
    const user = userEvent.setup();
    render(<ComboHost />);

    await user.click(screen.getByTestId("select-districts"));
    await user.click(screen.getByTestId("option-districts-Udupi"));

    expect(districtsValue()).toEqual(["Udupi"]);
    expect(screen.getByTestId("select-districts")).toHaveTextContent("Udupi");
  });

  it("replaces the answer rather than adding to it", async () => {
    const user = userEvent.setup();
    render(<ComboHost />);

    await user.click(screen.getByTestId("select-districts"));
    await user.click(screen.getByTestId("option-districts-Udupi"));
    await user.click(screen.getByTestId("select-districts"));
    await user.click(screen.getByTestId("option-districts-Ramanagara"));

    expect(districtsValue()).toEqual(["Ramanagara"]);
  });
});

describe("CheckListField", () => {
  it("holds the selection sorted, whatever order it was clicked in", async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.click(screen.getByTestId("check-districts-Udupi"));
    await user.click(screen.getByTestId("check-districts-Ramanagara"));

    expect(districtsValue()).toEqual(["Ramanagara", "Udupi"]);
  });

  it("filters the list without dropping anything already chosen", async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.click(screen.getByTestId("check-districts-Udupi"));
    await user.type(screen.getByTestId("search-districts"), "mys");

    expect(screen.queryByTestId("check-districts-Ramanagara")).not.toBeInTheDocument();
    expect(screen.getByTestId("check-districts-Mysuru (Mysore)")).toBeInTheDocument();
    // Out of the filtered list, still on the record, and still removable from the chip.
    expect(districtsValue()).toEqual(["Udupi"]);
    expect(screen.getByTestId("chip-districts-Udupi")).toBeInTheDocument();
  });

  it("says so when the search matches nothing", async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.type(screen.getByTestId("search-districts"), "zzz");

    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument();
  });

  it("removes a district from its chip", async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.click(screen.getByTestId("check-districts-Udupi"));
    await user.click(screen.getByTestId("chip-districts-Udupi"));

    expect(districtsValue()).toEqual([]);
    expect(screen.queryByTestId("chips-districts")).not.toBeInTheDocument();
  });

  /*
    `mode: "onBlur"` does not revalidate on change, and there is no blur in ticking a box, so
    without the explicit `trigger` the complaint stays red over a list with something ticked in it.
  */
  it("drops the complaint as soon as something is ticked", async () => {
    const user = userEvent.setup();
    render(<ValidatedHost />);

    await user.click(screen.getByTestId("search-districts"));
    await user.tab();
    await waitFor(() =>
      expect(screen.getByText("Choose at least one district")).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("check-districts-Udupi"));
    await waitFor(() =>
      expect(screen.queryByText("Choose at least one district")).not.toBeInTheDocument(),
    );
  });

  it("shows the hint rather than an empty box when there are no options", () => {
    render(<Host districts={[]} />);

    expect(screen.getByText("Choose a state first.")).toBeInTheDocument();
    expect(screen.queryByTestId("search-districts")).not.toBeInTheDocument();
  });
});

describe("CodeListField", () => {
  it("turns a typed separator into a chip", async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.type(screen.getByTestId("input-pincodes"), "560001,");

    expect(pincodesValue()).toEqual(["560001"]);
    expect(screen.getByTestId("input-pincodes")).toHaveValue("");
  });

  it("takes a pasted list in one go, deduped and sorted", async () => {
    const user = userEvent.setup();
    render(<Host />);

    const box = screen.getByTestId("input-pincodes");
    await user.click(box);
    await user.paste("700032, 700019 700032");

    expect(pincodesValue()).toEqual(["700019", "700032"]);
  });

  /* A single-line input keeps only the first line of a multi-line paste, so the control reads the
     clipboard itself. Someone copying a column of pin codes out of a spreadsheet is the case. */
  it("takes a column pasted out of a spreadsheet", async () => {
    const user = userEvent.setup();
    render(<Host />);

    const box = screen.getByTestId("input-pincodes");
    await user.click(box);
    await user.paste("700032\n700019\n700029");

    expect(pincodesValue()).toEqual(["700019", "700029", "700032"]);
  });

  it("commits on Enter without submitting the form", async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.type(screen.getByTestId("input-pincodes"), "560001{Enter}");

    expect(pincodesValue()).toEqual(["560001"]);
  });

  it("keeps a bad code in the box and says what is wrong with it", async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.type(screen.getByTestId("input-pincodes"), "560001 05600 ");

    expect(pincodesValue()).toEqual(["560001"]);
    expect(screen.getByTestId("input-pincodes")).toHaveValue("05600");
    expect(screen.getByTestId("rejected-pincodes")).toHaveTextContent(
      "A pin code is six digits, and cannot start with a zero.",
    );
  });

  it("clears the complaint once the box is being retyped", async () => {
    const user = userEvent.setup();
    render(<Host />);

    const box = screen.getByTestId("input-pincodes");
    await user.type(box, "05600 ");
    expect(screen.getByTestId("rejected-pincodes")).toBeInTheDocument();

    await user.clear(box);
    await user.type(box, "5");
    expect(screen.queryByTestId("rejected-pincodes")).not.toBeInTheDocument();
  });

  it("commits what is left in the box on blur", async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.type(screen.getByTestId("input-pincodes"), "560001");
    await user.tab();

    expect(pincodesValue()).toEqual(["560001"]);
  });

  it("drops the last chip on Backspace in an empty box", async () => {
    const user = userEvent.setup();
    render(<Host />);

    const box = screen.getByTestId("input-pincodes");
    await user.type(box, "560001,560002,");
    expect(pincodesValue()).toEqual(["560001", "560002"]);

    await user.type(box, "{Backspace}");
    expect(pincodesValue()).toEqual(["560001"]);
  });
});
