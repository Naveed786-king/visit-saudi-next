// Brand of the client dashboard (the Abu Dhabi Golden Visa dashboard design, run for Visit Saudi).
export const DEFAULT_BRAND: string = 'Abu Dhabi Golden Visa';
export const BRAND_NAME: string = 'Visit Saudi';
export const BRAND_CODE = 'VSA';
export const BRAND_PX = 'vsa';
export const BRAND_DIR = '/brand';
export const brandText = (s: string) => s.split(DEFAULT_BRAND).join(BRAND_NAME);
