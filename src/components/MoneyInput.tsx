import { useState } from "react";
import { parseDollarsToCents } from "../domain/money";

type Props = {
  placeholder?: string;
  buttonLabel: string;
  onSubmit: (cents: number) => void;
};

/** A dollar-amount text field with inline validation. Calls onSubmit with integer cents. */
export function MoneyInput({ placeholder = "0.00", buttonLabel, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const cents = parseDollarsToCents(value);
    if (cents === null || cents === 0) {
      setError("Enter a positive dollar amount");
      return;
    }
    onSubmit(cents);
    setValue("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          inputMode="decimal"
          className="min-h-11 w-24 rounded border border-gray-300 px-2 py-2 text-base"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          type="button"
          className="min-h-11 rounded bg-emerald-600 px-3 py-2 text-base text-white"
          onClick={submit}
        >
          {buttonLabel}
        </button>
      </div>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
