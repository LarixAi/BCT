import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  respondToExternalNavigationPrompt,
  useExternalNavConfirmState,
} from "@/lib/navigation/externalNavConfirm";

/** Mounted once at the app root — see App.jsx. */
export default function NavigationConfirmDialog() {
  const { open, title, description, confirmLabel } = useExternalNavConfirmState();

  return (
    <AlertDialog open={open} onOpenChange={(next) => {
      if (!next) respondToExternalNavigationPrompt(false);
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => respondToExternalNavigationPrompt(false)}>
            Stay in Veyvio
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => respondToExternalNavigationPrompt(true)}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
