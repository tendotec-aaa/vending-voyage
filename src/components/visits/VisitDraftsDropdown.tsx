import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Trash2, ChevronDown, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const DRAFTS_KEY = "visit-report-drafts";

export interface VisitDraft {
  id: string;
  savedAt: string;
  locationName: string;
  spotName: string;
  visitType: string;
  selectedLocation: string;
  selectedSpot: string;
  visitDate: string;
  slots: any[];
  hasObservationIssue: boolean;
  observationIssueLog: string;
  observationSeverity: string;
}

export function getDrafts(): VisitDraft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDraft(draft: VisitDraft) {
  const drafts = getDrafts();
  // Replace if same id exists, otherwise prepend
  const idx = drafts.findIndex((d) => d.id === draft.id);
  if (idx >= 0) {
    drafts[idx] = draft;
  } else {
    drafts.unshift(draft);
  }
  // Keep max 20 drafts
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, 20)));
}

export function deleteDraft(id: string) {
  const drafts = getDrafts().filter((d) => d.id !== id);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

interface VisitDraftsDropdownProps {
  onLoadDraft: (draft: VisitDraft) => void;
}

export function VisitDraftsDropdown({ onLoadDraft }: VisitDraftsDropdownProps) {
  const [drafts, setDrafts] = useState<VisitDraft[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) setDrafts(getDrafts());
  }, [open]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteDraft(id);
    setDrafts(getDrafts());
  };

  const handleLoad = (draft: VisitDraft) => {
    onLoadDraft(draft);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          Drafts
          {drafts.length > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
              {getDrafts().length}
            </span>
          )}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Saved Drafts</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {drafts.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No saved drafts
          </div>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="space-y-1 p-1">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex items-start gap-2 p-2.5 rounded-md hover:bg-accent cursor-pointer group transition-colors"
                  onClick={() => handleLoad(draft)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {draft.locationName || "No location"} — {draft.spotName || "No spot"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground capitalize">
                        {draft.visitType?.replace(/_/g, " ") || "Unknown type"}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(draft.savedAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDelete(e, draft.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
