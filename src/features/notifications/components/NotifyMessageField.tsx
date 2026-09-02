import { Label } from "@/components/ui/label";
import { MAX_MESSAGE_LENGTH } from "@/features/notifications/notification.constants";
import { cn } from "@/lib/utils";

type NotifyMessageFieldProps = {
  id: string;
  value: string;
  disabled: boolean;
  placeholder: string;
  onChange: (value: string) => void;
};

export function NotifyMessageField({
  id,
  value,
  disabled,
  placeholder,
  onChange,
}: NotifyMessageFieldProps) {
  const length = value.trim().length;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Message</Label>
      <textarea
        id={id}
        value={value}
        maxLength={MAX_MESSAGE_LENGTH}
        rows={5}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "min-h-28 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors",
          "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        )}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        {length}/{MAX_MESSAGE_LENGTH}
      </p>
    </div>
  );
}
