import { Marcellus, Manrope, Noto_Naskh_Arabic } from 'next/font/google';

// the website's own fonts: Marcellus for headings, Manrope for text
export const display = Marcellus({ weight: '400', subsets: ['latin', 'latin-ext'], variable: '--font-display', display: 'swap' });
export const body = Manrope({ subsets: ['latin', 'latin-ext', 'cyrillic'], variable: '--font-body', display: 'swap' });
export const arabic = Noto_Naskh_Arabic({ subsets: ['arabic'], variable: '--font-arabic', display: 'swap' });
export const fontVars = `${display.variable} ${body.variable} ${arabic.variable}`;
