import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatComponentName(name: string): string {
  if (!name) return "";
  if (name.includes("/")) {
    const parts = name.split("/");
    // If it's a file path, return just the filename and maybe its parent dir
    // for scoped npm packages like @scope/name, we want to keep them.
    if (name.startsWith("/") || parts.length > 2) {
       return parts.slice(-2).join("/"); // e.g. parent/filename
    }
  }
  return name;
}
