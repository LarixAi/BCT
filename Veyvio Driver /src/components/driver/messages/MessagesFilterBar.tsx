import { FilterChipBar } from "@/components/driver/shared/FilterChipBar";
import type { MessageFilter } from "@/types/messages";
import { filterLabel } from "@/domain/messages/message-helpers";

const filters: MessageFilter[] = ["all", "trips", "operations", "updates"];

export function MessagesFilterBar({
  active,
  onChange,
}: {
  active: MessageFilter;
  onChange: (filter: MessageFilter) => void;
}) {
  return (
    <FilterChipBar
      label="Message filters"
      options={filters.map((filter) => ({ id: filter, label: filterLabel(filter) }))}
      active={active}
      onChange={onChange}
    />
  );
}
