import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { YamlEditor } from "./YamlEditor";

function ControlledYamlEditor({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState("module: old_fsm");

  return (
    <YamlEditor
      value={value}
      onChange={(nextValue) => {
        setValue(nextValue);
        onChange(nextValue);
      }}
    />
  );
}

describe("YamlEditor", () => {
  it("emits controlled source changes from the accessible textarea", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ControlledYamlEditor onChange={onChange} />);

    const source = screen.getByLabelText("YAML source");
    await user.clear(source);
    await user.type(source, "module: new_fsm");

    expect(onChange).toHaveBeenLastCalledWith("module: new_fsm");
  });
});
