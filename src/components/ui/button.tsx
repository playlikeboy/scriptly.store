import * as React from "react";
import { cva, VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 font-medium tracking-tight whitespace-nowrap transition-[background-color,color,border-color,transform,box-shadow] duration-150 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Ink: the default action
        default: "bg-foreground text-background hover:bg-foreground/85 rounded-[10px]",
        // Ember: purchase / primary conversion only
        accent: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-[10px]",
        outline: "border border-input bg-card text-foreground hover:bg-secondary hover:border-foreground/25 rounded-[10px]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70 rounded-[10px]",
        ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground rounded-[10px]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-[10px]",
        link: "text-primary underline-offset-4 hover:underline active:scale-100 px-0",
      },
      size: {
        default: "h-10 px-4 text-sm",
        xs: "h-7 rounded-md px-2.5 text-xs gap-1 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-lg px-3 text-[13px] gap-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 px-5 text-sm",
        xl: "h-12 px-6 text-[15px]",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

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
