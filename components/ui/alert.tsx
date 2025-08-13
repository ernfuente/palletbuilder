import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { X as CloseIcon } from "lucide-react"

const alertVariants = cva(
    "relative w-full rounded-lg border transition-shadow",
    {
        variants: {
            variant: {
                default:
                    "bg-background text-foreground border-border",
                destructive:
                    "bg-destructive/10 text-destructive border-destructive/40 dark:bg-destructive/20",
                success:
                    "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
                warning:
                    "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
                info:
                    "bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800",
            },
            size: {
                sm: "p-3 text-sm",
                md: "p-4",
                lg: "p-5 text-base",
            },
            elevated: {
                true: "shadow-sm",
                false: "",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "md",
            elevated: false,
        },
    }
)

type AlertBaseProps = React.ComponentPropsWithoutRef<"div"> &
    VariantProps<typeof alertVariants> & {
    /** Optional icon component, e.g. from lucide-react */
    icon?: React.ElementType<React.SVGProps<SVGSVGElement>>
    /** Show a close (dismiss) button */
    dismissible?: boolean
    /** Called when the dismiss button is clicked */
    onClose?: () => void
    /** Politeness for screen readers */
    live?: "polite" | "assertive" | "off"
}

const Alert = React.forwardRef<React.ElementRef<"div">, AlertBaseProps>(
    (
        {
            className,
            variant,
            size,
            elevated,
            icon: Icon,
            dismissible = false,
            onClose,
            live = "polite",
            children,
            ...props
        },
        ref
    ) => {
        return (
            <div
                ref={ref}
                role="alert"
                aria-live={live}
                className={cn(alertVariants({ variant, size, elevated }), className)}
                {...props}
            >
                <div className="flex items-start gap-3">
                    {Icon ? (
                        <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
                    ) : null}

                    <div className="grid gap-1 flex-1">{children}</div>

                    {dismissible ? (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Dismiss"
                            className="ml-2 rounded-md p-1 hover:bg-foreground/5 focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            <CloseIcon className="h-4 w-4" aria-hidden />
                        </button>
                    ) : null}
                </div>
            </div>
        )
    }
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
    React.ElementRef<"h5">,
    React.ComponentPropsWithoutRef<"h5">
>(({ className, ...props }, ref) => (
    <h5
        ref={ref}
        className={cn("mb-1 font-medium leading-none tracking-tight", className)}
        {...props}
    />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "text-sm leading-relaxed",
            // optional: nice defaults for lists inside
            "[&_ul]:list-disc [&_ul]:list-inside [&_ul]:pl-5 [&_li]:mt-1",
            className
        )}
        {...props}
    />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
