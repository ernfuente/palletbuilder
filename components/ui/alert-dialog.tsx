"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X as CloseIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const AlertDialog = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger
const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm",
            // animations + reduced motion
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "motion-reduce:transition-none motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
            className
        )}
        {...props}
    />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const contentVariants = cva(
    [
        // positioning
        "fixed left-1/2 top-1/2 z-50 w-full translate-x-[-50%] translate-y-[-50%]",
        "grid gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
        // animations + reduced motion
        "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        "motion-reduce:transition-none motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
        // focus ring
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    ].join(" "),
    {
        variants: {
            size: {
                sm: "max-w-sm",
                md: "max-w-lg",
                lg: "max-w-2xl",
                xl: "max-w-3xl"
            },
            tone: {
                default: "border-border",
                destructive: "border-destructive",
                success: "border-emerald-300 dark:border-emerald-800",
                warning: "border-amber-300 dark:border-amber-800",
                info: "border-sky-300 dark:border-sky-800"
            },
            scroll: {
                content: "max-h-[85vh] overflow-y-auto",
                viewport: "" // opt-out if you handle scrolling internally
            }
        },
        defaultVariants: {
            size: "md",
            tone: "default",
            scroll: "content"
        }
    }
)

type ContentProps = React.ComponentPropsWithoutRef<
    typeof AlertDialogPrimitive.Content
> &
    VariantProps<typeof contentVariants> & {
    /** Hide the top-right close (Cancel) button */
    hideCloseButton?: boolean
}

const AlertDialogContent = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Content>,
    ContentProps
>(({ className, size, tone, scroll, hideCloseButton, children, ...props }, ref) => (
    <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogPrimitive.Content
            ref={ref}
            className={cn(contentVariants({ size, tone, scroll }), className)}
            {...props}
        >
            {!hideCloseButton && (
                <AlertDialogPrimitive.Cancel asChild>
                    <button
                        type="button"
                        aria-label="Close dialog"
                        className="absolute right-3 top-3 rounded-md p-2 hover:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <CloseIcon className="h-4 w-4" aria-hidden />
                    </button>
                </AlertDialogPrimitive.Cancel>
            )}
            {children}
        </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
                               className,
                               ...props
                           }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
                               className,
                               ...props
                           }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2",
            className
        )}
        {...props}
    />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Description
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Action>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Cancel
        ref={ref}
        className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
        {...props}
    />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

// Optional alias if you prefer a semantic name for a top-right close button elsewhere
const AlertDialogClose = AlertDialogPrimitive.Cancel

export {
    AlertDialog,
    AlertDialogPortal,
    AlertDialogOverlay,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogClose
}
