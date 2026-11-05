import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Slot } from 'radix-ui';

// Primary/secondary/on-dark/text, plus legacy aliases; disabled and keyboard focus states.
const buttonVariants = cva('ui-button', {
  variants: {
    variant: {
      default: '',
      primary: '',
      secondary: '',
      outline: '',
      'on-dark': '',
      text: '',
      destructive: '',
      ghost: '',
      link: '',
    },
    size: {
      default: '',
      xs: 'px-3 text-xs',
      sm: 'px-4 text-sm',
      lg: 'min-h-12 px-6',
      icon: 'min-w-11 px-0',
      'icon-xs': 'min-w-11 px-0',
      'icon-sm': 'min-w-11 px-0',
      'icon-lg': 'min-w-12 px-0',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
