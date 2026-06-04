import { useState } from "react";
import { parseDollarsToCents } from "../domain/money";
import { PlusIcon } from "./icons";

type Props = {
  placeholder?: string;
  buttonLabel?: string;
  onSubmit: (cents: number) => void;
};

/** A dollar-amount text field with inline validation. Calls onSubmit with integer cents. */
export function MoneyInput({ placeholder = "0.00", buttonLabel = "Add", onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const cents = parseDollarsToCents(value);
    if (cents === null || cents === 0) {
      setError("Enter a positive amount");
      return;
    }
    onSubmit(cents);
    setValue("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
            $
          </span>
          <input
            inputMode="decimal"
            className="field tnum pl-7"
            style={{ minHeight: "2.75rem" }}
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <button
          type="button"
          onClick={submit}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl bg-accent/15 px-4 font-semibold text-accent ring-1 ring-accent/30 transition active:scale-[0.98]"
        >
          <PlusIcon className="h-4 w-4" />
          {buttonLabel}
        </button>
      </div>
      {error && <span className="pl-1 text-sm text-neg">{error}</span>}
    </div>
  );
}
