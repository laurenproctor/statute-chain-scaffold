import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

// ── Card Container ──────────────────────────────────────────────
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  flat?: boolean;  // flat = no border-radius, for grid/table layouts
}

function Card({ flat = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(flat ? "card-flat" : "card", className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Card Sub-components ─────────────────────────────────────────
function CardLabel({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("label mb-3", className)} {...props}>
      {children}
    </p>
  );
}

function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-md font-medium text-ink mb-2 leading-snug", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

function CardBody({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-base text-muted leading-relaxed", className)} {...props}>
      {children}
    </p>
  );
}

// ── Status Tag ──────────────────────────────────────────────────
type TagVariant = "default" | "conflict" | "positive" | "navy" | "gold";

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
}

const tagVariants: Record<TagVariant, string> = {
  default:  "tag",
  conflict: "tag tag-conflict",
  positive: "tag tag-positive",
  navy:     "tag tag-navy",
  gold:     "tag tag-gold",
};

function Tag({ variant = "default", className, children, ...props }: TagProps) {
  return (
    <span className={cn(tagVariants[variant], className)} {...props}>
      {children}
    </span>
  );
}

export { Card, CardLabel, CardTitle, CardBody, Tag };

/*
  Usage examples:

  // Search result card
  <Card>
    <CardLabel>Search Result</CardLabel>
    <CardTitle>NY Penal Law §220.65</CardTitle>
    <CardBody>Criminal sale of a controlled substance.</CardBody>
    <Tag className="mt-3">3 references</Tag>
  </Card>

  // Conflict card
  <Card>
    <CardLabel>Comparison</CardLabel>
    <CardTitle>Definition: Schedule II</CardTitle>
    <CardBody>Federal and NY definitions diverge on analogue classification.</CardBody>
    <Tag variant="conflict" className="mt-3">2 conflicts</Tag>
  </Card>

  // Flat card for grid layouts (compare page, stat rows)
  <Card flat>
    <CardLabel>Jurisdiction</CardLabel>
    <CardTitle>Federal — 21 USC §812</CardTitle>
  </Card>
*/
