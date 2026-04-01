import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-busy="true"
      className={cn(
        "rounded-md bg-neutral-200 dark:bg-neutral-800 motion-safe:animate-pulse",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
