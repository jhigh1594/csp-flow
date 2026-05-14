import { getModifierKeyText } from "@/hooks/use-keyboard-shortcuts";

export const shortcuts = {
  new: {
    prefix: "n",
    project: "p",
    workspace: "w",
  },
  create: {
    key: "c",
  },
  sidebar: {
    prefix: getModifierKeyText(),
    toggle: "b",
  },
  palette: {
    prefix: getModifierKeyText(),
    open: "k",
  },
  search: {
    prefix: "/",
  },
  view: {
    prefix: "v",
    board: "b",
    gantt: "g",
    list: "l",
    backlog: "k",
  },
  go: {
    prefix: "g",
    home: "h",
    members: "m",
    settings: "s",
    workspace: "w",
  },
  taskDetails: {
    status: "s",
    priority: "p",
    assignee: "a",
    labels: "l",
    dueDate: "d",
  },
  help: {
    key: "?",
  },
} as const;
