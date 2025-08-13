import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

/* -------------------- Card (container) -------------------- */

const cardVariants = cva(
    "border bg-card text-card-foreground shadow-sm",
    {
        variants: {
            radius: {
                sm: "rounded-lg",
                md: "rounded-xl",
                lg: "rounded-2xl",
            },
            interactive: {
                false: "",
                true:
                    "transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            },
        },
        defaultVariants: {
            radius: "md",
            interactive: false,
        },
    }
)

type CardProps = React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof cardVariants> & {
    /** Render the card as its child element (e.g., <a> or <button>) */
    asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, radius, interactive, asChild, ...props }, ref) => {
        const Comp = asChild ? (Slot as any) : "div"
        return (
            <Comp
                ref={ref}
                className={cn(cardVariants({ radius, interactive }), className)}
                {...props}
            />
        )
    }
)
Card.displayName = "Card"

/* -------------------- Sections -------------------- */

const sectionPadding = cva("", {
    variants: {
        size: {
            sm: "p-4",
            md: "p-6",
            lg: "p-8",
        },
    },
    defaultVariants: { size: "md" },
})

type SectionProps = React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof sectionPadding>

const CardHeader = React.forwardRef<HTMLDivElement, SectionProps>(
    ({ className, size, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("flex flex-col gap-1.5", sectionPadding({ size }), className)}
            {...props}
        />
    )
)
CardHeader.displayName = "CardHeader"

const CardContent = React.forwardRef<HTMLDivElement, SectionProps>(
    ({ className, size, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(sectionPadding({ size }), "pt-0", className)}
            {...props}
        />
    )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, SectionProps>(
    ({ className, size, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("flex items-center", sectionPadding({ size }), "pt-0", className)}
            {...props}
        />
    )
)
CardFooter.displayName = "CardFooter"

/* -------------------- Typography -------------------- */

type AsChildProps = { asChild?: boolean }

const CardTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement> & AsChildProps
>(({ className, asChild, ...props }, ref) => {
    const Comp: any = asChild ? Slot : "h3"
    return (
        <Comp
            ref={ref}
            className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
            {...props}
        />
    )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement> & AsChildProps
>(({ className, asChild, ...props }, ref) => {
    const Comp: any = asChild ? Slot : "p"
    return (
        <Comp ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
    )
})
CardDescription.displayName = "CardDescription"

/* ---------- Stat Tile Helper (centered KPI tiles) ---------- */

type Tone = "blue" | "green" | "purple" | "orange" | "gray" | "red" | "teal"

const toneMap: Record<
    Tone,
    { bg: string; value: string; label: string; ring: string; dark?: string }
> = {
    blue:   { bg: "bg-blue-50",   value: "text-blue-700",   label: "text-blue-900/70",   ring: "ring-1 ring-blue-100",   dark: "dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900/40" },
    green:  { bg: "bg-green-50",  value: "text-green-700",  label: "text-green-900/70",  ring: "ring-1 ring-green-100",  dark: "dark:bg-green-950/30 dark:text-green-300 dark:ring-green-900/40" },
    purple: { bg: "bg-purple-50", value: "text-purple-700", label: "text-purple-900/70", ring: "ring-1 ring-purple-100", dark: "dark:bg-purple-950/30 dark:text-purple-300 dark:ring-purple-900/40" },
    orange: { bg: "bg-orange-50", value: "text-orange-700", label: "text-orange-900/70", ring: "ring-1 ring-orange-100", dark: "dark:bg-orange-950/30 dark:text-orange-300 dark:ring-orange-900/40" },
    gray:   { bg: "bg-gray-50",   value: "text-gray-800",   label: "text-gray-600",      ring: "ring-1 ring-gray-100",   dark: "dark:bg-gray-900/40 dark:text-gray-200 dark:ring-gray-800" },
    red:    { bg: "bg-red-50",    value: "text-red-700",    label: "text-red-900/70",    ring: "ring-1 ring-red-100",    dark: "dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900/40" },
    teal:   { bg: "bg-teal-50",   value: "text-teal-700",   label: "text-teal-900/70",   ring: "ring-1 ring-teal-100",   dark: "dark:bg-teal-950/30 dark:text-teal-300 dark:ring-teal-900/40" },
}

interface CardStatProps extends React.HTMLAttributes<HTMLDivElement> {
    value: React.ReactNode
    label: string
    tone?: Tone
    /** Compact tile (shorter and smaller text) */
    compact?: boolean
    /** If false, do not truncate value text. */
    truncateValue?: boolean
    /** Extra classes to tweak value typography per-tile (e.g., clamp font size). */
    valueClassName?: string
    /** Optional left icon */
    icon?: React.ElementType<{ className?: string }>
}

const CardStat = React.forwardRef<HTMLDivElement, CardStatProps>(
    (
        {
            value,
            label,
            tone = "gray",
            compact = false,
            className,
            truncateValue = true,
            valueClassName,
            icon: Icon,
            ...props
        },
        ref
    ) => {
        const t = toneMap[tone]
        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-xl w-full px-3 ring-inset",
                    compact ? "h-16" : "h-20 md:h-24",
                    "flex items-center justify-center text-center",
                    "shadow-sm",
                    t.bg, t.ring, t.dark,
                    className
                )}
                {...props}
            >
                <div className="flex items-center gap-2">
                    {Icon ? <Icon className={cn("h-4 w-4 md:h-5 md:w-5", t.value)} /> : null}
                    <div className="flex flex-col items-center">
                        <div
                            className={cn(
                                "w-full font-bold leading-none tabular-nums tracking-tight",
                                compact ? "text-base md:text-lg" : "text-sm sm:text-base md:text-2xl",
                                truncateValue ? "truncate text-ellipsis overflow-hidden max-w-[12ch] md:max-w-[18ch]" : "",
                                t.value,
                                valueClassName
                            )}
                            title={typeof value === "string" ? value : undefined}
                        >
                            {value}
                        </div>
                        <div className={cn("text-[11px] md:text-xs font-medium", t.label)}>{label}</div>
                    </div>
                </div>
            </div>
        )
    }
)
CardStat.displayName = "CardStat"

export {
    Card,
    CardHeader,
    CardContent,
    CardFooter,
    CardTitle,
    CardDescription,
    CardStat,
}
