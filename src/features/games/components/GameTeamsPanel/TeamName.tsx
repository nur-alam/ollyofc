import { useEffect, useState } from "react";
import { PencilIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

type TeamNameProps = {
  name: string;
  canEdit: boolean;
  onSave: (name: string) => Promise<void>;
};

export function TeamName({ name, canEdit, onSave }: TeamNameProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(name);
  }, [name]);

  const save = async () => {
    const nextName = value.trim() || name;

    if (nextName === name) {
      setEditing(false);
      setValue(name);
      return;
    }

    setSaving(true);

    try {
      await onSave(nextName);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return <h3 className="truncate text-sm font-semibold">{name}</h3>;
  }

  if (editing) {
    return (
      <Input
        value={value}
        autoFocus
        disabled={saving}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          void save();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void save();
          }

          if (event.key === "Escape") {
            setValue(name);
            setEditing(false);
          }
        }}
        className="h-7 max-w-40 font-semibold"
      />
    );
  }

  return (
    <button
      type="button"
      className="flex min-w-0 items-center gap-1 text-left"
      onClick={() => setEditing(true)}
    >
      <h3 className="truncate text-sm font-semibold">{name}</h3>
      <PencilIcon className="size-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}
