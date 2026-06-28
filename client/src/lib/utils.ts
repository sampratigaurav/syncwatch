import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getGradient(name: string) {
  const colors = [
    "from-teal-400 to-emerald-500",
    "from-indigo-400 to-cyan-400",
    "from-pink-400 to-rose-500",
    "from-amber-400 to-orange-500",
    "from-violet-400 to-fuchsia-500"
  ];
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
}
