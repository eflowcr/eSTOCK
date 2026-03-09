import { cva, type VariantProps } from 'class-variance-authority';

export const dialogVariants = cva(
  'z-50 grid w-full gap-4 border bg-background p-6 shadow-lg rounded-lg max-w-[calc(100%-2rem)] sm:max-w-[425px]',
);
export type ZardDialogVariants = VariantProps<typeof dialogVariants>;
