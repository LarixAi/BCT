import { Button } from "@/components/ui/button";

export function QuickReplies({
  replies,
  onSelect,
  disabled,
}: {
  replies: string[];
  onSelect: (reply: string) => void;
  disabled?: boolean;
}) {
  if (disabled) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {replies.map((reply) => (
        <Button
          key={reply}
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => onSelect(reply)}
        >
          {reply}
        </Button>
      ))}
    </div>
  );
}
