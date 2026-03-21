import { create } from "zustand";
import type { Todo, TodoItem } from "@/shared/contracts";

interface TodosState {
  todos: Todo[];
  isLoading: boolean;
  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  removeTodo: (id: string) => void;
  toggleTodoComplete: (id: string) => void;
  toggleItemComplete: (todoId: string, itemId: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useTodosStore = create<TodosState>((set) => ({
  todos: [],
  isLoading: false,

  setTodos: (todos) => set({ todos }),

  addTodo: (todo) =>
    set((state) => ({
      todos: [...state.todos, todo],
    })),

  updateTodo: (id, updates) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, ...updates } : todo
      ),
    })),

  removeTodo: (id) =>
    set((state) => ({
      todos: state.todos.filter((todo) => todo.id !== id),
    })),

  toggleTodoComplete: (id) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              completed: !todo.completed,
              completedAt: !todo.completed ? new Date().toISOString() : null,
            }
          : todo
      ),
    })),

  toggleItemComplete: (todoId, itemId) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              items: todo.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      completed: !item.completed,
                      completedAt: !item.completed
                        ? new Date().toISOString()
                        : null,
                    }
                  : item
              ),
            }
          : todo
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),
}));
