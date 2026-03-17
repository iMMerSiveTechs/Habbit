import { api } from "./api";
import type {
  Todo,
  TodoTemplate,
  TodoReminder,
  CreateTodoRequest,
  UpdateTodoRequest,
  CompleteTodoRequest,
  AddTodoItemRequest,
  UpdateTodoItemRequest,
  ArchiveTodoRequest,
  RepeatTodoRequest,
  SaveAsTemplateRequest,
  UseTemplateRequest,
  AddTodoReminderRequest,
} from "@/shared/contracts";

export const todosApi = {
  // Get all todos
  async getTodos(): Promise<{ todos: Todo[] }> {
    return api.get<{ todos: Todo[] }>("/api/todos");
  },

  // Create a new todo
  async createTodo(data: CreateTodoRequest): Promise<{ todo: Todo }> {
    return api.post<{ todo: Todo }>("/api/todos", data);
  },

  // Update a todo
  async updateTodo(
    id: string,
    data: UpdateTodoRequest
  ): Promise<{ todo: Todo }> {
    return api.patch<{ todo: Todo }>(`/api/todos/${id}`, data);
  },

  // Toggle todo completion
  async completeTodo(
    id: string,
    completed: boolean
  ): Promise<{ todo: Todo }> {
    return api.post<{ todo: Todo }>(`/api/todos/${id}/complete`, {
      completed,
    } as CompleteTodoRequest);
  },

  // Archive/unarchive a todo
  async archiveTodo(
    id: string,
    archived: boolean
  ): Promise<{ todo: Todo }> {
    return api.post<{ todo: Todo }>(`/api/todos/${id}/archive`, {
      archived,
    } as ArchiveTodoRequest);
  },

  // Repeat a todo (create a new one from existing)
  async repeatTodo(
    id: string,
    resetItems: boolean = true
  ): Promise<{ todo: Todo }> {
    return api.post<{ todo: Todo }>(`/api/todos/${id}/repeat`, {
      resetItems,
    } as RepeatTodoRequest);
  },

  // Save todo as template
  async saveAsTemplate(
    id: string,
    category: string = "general"
  ): Promise<{ template: TodoTemplate }> {
    return api.post<{ template: TodoTemplate }>(`/api/todos/${id}/save-template`, {
      category,
    } as SaveAsTemplateRequest);
  },

  // Reorder todos
  async reorderTodos(orderedIds: string[]): Promise<{ success: boolean }> {
    return api.post<{ success: boolean }>("/api/todos/reorder", { orderedIds });
  },

  // Delete a todo
  async deleteTodo(id: string): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(`/api/todos/${id}`);
  },

  // Add a checklist item to a todo
  async addTodoItem(
    todoId: string,
    data: AddTodoItemRequest
  ): Promise<{ item: Todo["items"][0] }> {
    return api.post<{ item: Todo["items"][0] }>(
      `/api/todos/${todoId}/items`,
      data
    );
  },

  // Update a checklist item
  async updateTodoItem(
    todoId: string,
    itemId: string,
    data: UpdateTodoItemRequest
  ): Promise<{ item: Todo["items"][0] }> {
    return api.patch<{ item: Todo["items"][0] }>(
      `/api/todos/${todoId}/items/${itemId}`,
      data
    );
  },

  // Delete a checklist item
  async deleteTodoItem(
    todoId: string,
    itemId: string
  ): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(
      `/api/todos/${todoId}/items/${itemId}`
    );
  },

  // Get reminders for a todo
  async getTodoReminders(
    todoId: string
  ): Promise<{ reminders: TodoReminder[] }> {
    return api.get<{ reminders: TodoReminder[] }>(
      `/api/todos/${todoId}/reminders`
    );
  },

  // Add a reminder to a todo
  async addTodoReminder(
    todoId: string,
    data: AddTodoReminderRequest
  ): Promise<{ reminder: TodoReminder }> {
    return api.post<{ reminder: TodoReminder }>(
      `/api/todos/${todoId}/reminders`,
      data
    );
  },

  // Delete a reminder from a todo
  async deleteTodoReminder(
    todoId: string,
    reminderId: string
  ): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(
      `/api/todos/${todoId}/reminders/${reminderId}`
    );
  },
};

export const templatesApi = {
  // Get all templates (system + user's own)
  async getTemplates(): Promise<{ templates: TodoTemplate[] }> {
    return api.get<{ templates: TodoTemplate[] }>("/api/templates");
  },

  // Use a template to create a todo
  async useTemplate(
    id: string,
    dueDate?: string
  ): Promise<{ todo: Todo }> {
    return api.post<{ todo: Todo }>(`/api/templates/${id}/use`, {
      dueDate,
    } as UseTemplateRequest);
  },

  // Delete a user's template
  async deleteTemplate(id: string): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(`/api/templates/${id}`);
  },
};
