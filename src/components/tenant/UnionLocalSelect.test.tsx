import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import {
  UnionLocalSelect,
  emptyUnionLocalSelectValue,
} from "./UnionLocalSelect";

function SelectorHarness() {
  const [value, setValue] = useState(emptyUnionLocalSelectValue);
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <UnionLocalSelect
        mode="platform"
        unions={[{ id: "union-a", name: "Union A" }, { id: "union-b", name: "Union B" }]}
        locals={[
          { id: "local-243", unionId: "union-a", divisionId: "division-s", localNumber: "243" },
          { id: "local-404", unionId: "union-a", divisionId: "division-a", localNumber: "404" },
          { id: "local-7", unionId: "union-b", divisionId: "division-b", localNumber: "7" },
        ]}
        collectives={[
          { id: "division-s", unionId: "union-a", code: "S", name: "Support" },
          { id: "division-a", unionId: "union-a", code: "A", name: "Academic" },
          { id: "division-b", unionId: "union-b", code: "B", name: "Other union" },
        ]}
        subGroups={[
          { id: "unit-ft-243", localId: "local-243", code: "FT", name: "Full time" },
          { id: "unit-pt-243", localId: "local-243", code: "PT", name: "Part time" },
        ]}
        value={value}
        onChange={setValue}
      />
      <output data-testid="selection">{JSON.stringify(value)}</output>
    </NextIntlClientProvider>
  );
}

describe("UnionLocalSelect", () => {
  afterEach(cleanup);

  it("chooses union, collective, then a matching local without crossing unions", () => {
    render(<SelectorHarness />);
    fireEvent.change(screen.getByLabelText("Union"), { target: { value: "union-a" } });

    const collective = screen.getByLabelText("Bargaining collective") as HTMLSelectElement;
    expect(collective.textContent).toContain("S — Support");
    expect(collective.textContent).not.toContain("B — Other union");
    const support = Array.from(collective.options).find((option) =>
      option.textContent === "S — Support"
    );
    fireEvent.change(collective, { target: { value: support?.value } });

    const local = screen.getByLabelText("Local") as HTMLSelectElement;
    expect(local.textContent).toContain("243");
    expect(local.textContent).not.toContain("404");
    fireEvent.change(local, { target: { value: "local-243" } });
    expect(screen.getByTestId("selection").textContent).toContain('"divisionId":"division-s"');
    expect(screen.getByTestId("selection").textContent).toContain('"bargainingUnitId":""');
    fireEvent.change(screen.getByLabelText("Sub-group"), { target: { value: "unit-ft-243" } });
    expect(screen.getByTestId("selection").textContent).toContain('"bargainingUnitId":"unit-ft-243"');

    fireEvent.change(collective, { target: { value: "__other_collective__" } });
    expect(screen.getByTestId("selection").textContent).toContain('"divisionId":""');
    expect(screen.getByTestId("selection").textContent).toContain('"bargainingUnitId":""');
  });
});
