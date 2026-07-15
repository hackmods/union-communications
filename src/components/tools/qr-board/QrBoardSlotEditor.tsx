"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { SavedLink } from "@/lib/utils/local-links";

export interface QrBoardSlotEditorProps {
  index: number;
  title: string;
  destination: string;
  canRemove: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  savedLinks: SavedLink[];
  labels: {
    slotLabel: string;
    title: string;
    destination: string;
    savedLinks: string;
    savedLinksPlaceholder: string;
    moveUp: string;
    moveDown: string;
    remove: string;
  };
  onTitleChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export function QrBoardSlotEditor({
  index,
  title,
  destination,
  canRemove,
  canMoveUp,
  canMoveDown,
  savedLinks,
  labels,
  onTitleChange,
  onDestinationChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: QrBoardSlotEditorProps) {
  const titleId = `qr-board-slot-title-${index}`;
  const destId = `qr-board-slot-dest-${index}`;
  const savedId = `qr-board-slot-saved-${index}`;

  return (
    <fieldset className="space-y-3 rounded-md border border-gray-200 p-3">
      <legend className="px-1 text-sm font-medium text-gray-800">
        {labels.slotLabel}
      </legend>

      <Input
        id={titleId}
        label={labels.title}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
      />
      <Input
        id={destId}
        label={labels.destination}
        value={destination}
        onChange={(e) => onDestinationChange(e.target.value)}
        placeholder="https://"
      />

      {savedLinks.length > 0 ? (
        <div>
          <label htmlFor={savedId} className="mb-1 block text-sm font-medium">
            {labels.savedLinks}
          </label>
          <select
            id={savedId}
            value=""
            onChange={(e) => {
              const url = e.target.value;
              if (url) onDestinationChange(url);
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">{labels.savedLinksPlaceholder}</option>
            {savedLinks.map((link) => (
              <option key={link.id} value={link.url}>
                {link.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onMoveUp}
          disabled={!canMoveUp}
        >
          {labels.moveUp}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onMoveDown}
          disabled={!canMoveDown}
        >
          {labels.moveDown}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRemove}
          disabled={!canRemove}
        >
          {labels.remove}
        </Button>
      </div>
    </fieldset>
  );
}
