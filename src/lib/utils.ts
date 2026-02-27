import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export const GITHUB_URL = 'https://github.com/GODLOCAL/godlocal';
export const TWITTER_URL = 'https://x.com/GodLocal';
export const TWITTER_RU_URL = 'https://x.com/GodLocalRU';
export const TWITTER_DEV_URL = 'https://x.com/GodLocalDev';
