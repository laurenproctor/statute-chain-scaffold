import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?:    ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:     "btn btn-primary",
  secondary:   "btn btn-secondary",
  ghost:       "btn btn-ghost",
  destructive: "btn btn-destructive",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-2",
  md: "",          // default btn sizing from globals.css
  lg: "text-base px-6 py-3",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };

/*
  Usage examples:

  <Button>Compare Laws</Button>
  <Button variant="secondary">View Source</Button>
  <Button variant="ghost">Cancel</Button>
  <Button variant="destructive">Flag Conflict</Button>
  <Button size="sm" variant="secondary">Filter</Button>
*/
