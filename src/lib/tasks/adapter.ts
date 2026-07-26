import type {
  CreateTaskInput,
  Task,
  TaskListFilters,
  UpdateTaskInput,
} from "@/types/task";
import type { HubReactionKind } from "@/types/hub-social";

export interface TaskAdapter {
  list(filters: TaskListFilters): Promise<Task[]>;
  getById(id: string): Promise<Task | null>;
  create(
    input: CreateTaskInput,
    meta: {
      unionId: string;
      localId: string;
      bargainingUnitId?: string;
      createdById: string;
      assigneeId: string;
      mentionedUserIds?: string[];
    },
  ): Promise<Task>;
  update(id: string, input: UpdateTaskInput): Promise<Task | null>;
  remove(id: string): Promise<boolean>;
  toggleReaction(
    id: string,
    kind: HubReactionKind,
    userId: string,
  ): Promise<Task | null>;
}
