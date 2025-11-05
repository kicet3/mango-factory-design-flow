import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      richColors
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-[var(--shadow-card)] cursor-pointer rounded-[var(--radius)] transition-[var(--transition-smooth)] hover:shadow-[var(--shadow-hover)]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-[var(--radius-sm)] group-[.toast]:transition-[var(--transition-smooth)] group-[.toast]:hover:bg-primary-hover",
          cancelButton:
            "group-[.toast]:bg-success/10 group-[.toast]:text-success group-[.toast]:border group-[.toast]:border-success/20 group-[.toast]:rounded-[var(--radius-sm)] group-[.toast]:transition-[var(--transition-smooth)] group-[.toast]:hover:bg-success/20 group-[.toast]:hover:text-success group-[.toast]:font-medium",
          closeButton:
            "group-[.toast]:bg-transparent group-[.toast]:text-muted-foreground group-[.toast]:border-none group-[.toast]:hover:bg-muted group-[.toast]:hover:text-foreground group-[.toast]:transition-[var(--transition-smooth)] group-[.toast]:rounded-[var(--radius-sm)] group-[.toast]:opacity-60 group-[.toast]:hover:opacity-100",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }