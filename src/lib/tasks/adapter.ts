import type {
  CreateTaskInput,
  Task,
  TaskListFilters,
  UpdateTaskInput,
} from "@/types/task";

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
    },
  ): Promise<Task>;
  update(id: string, input: UpdateTaskInput): Promise<Task | null>;
  remove(id: string): Promise<boolean>;
}
