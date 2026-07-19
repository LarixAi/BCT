import { Toaster as Sonner } from "sonner";
import { CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheck className="size-4 text-primary" />,
        info: <Info className="size-4 text-primary" />,
        warning: <TriangleAlert className="size-4 text-warn" />,
        error: <TriangleAlert className="size-4 text-vor" />,
        loading: <LoaderCircle className="size-4 animate-spin text-primary" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:border-l-[3px] group-[.toaster]:border-l-primary group-[.toaster]:bg-white group-[.toaster]:text-foreground group-[.toaster]:shadow-none",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-accent group-[.toast]:text-accent-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
