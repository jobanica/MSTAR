"use client";

import { useFormStatus } from "react-dom";

const PRIMARY =
  "rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  /** Skip the default teal styling and treat `className` as the full look. */
  unstyled?: boolean;
  /** Show the inline loading spinner while the action runs. Default true. */
  spinner?: boolean;
  /** Optional text shown in place of children while the action is pending. */
  pendingLabel?: string;
} & Omit<
  React.ComponentProps<"button">,
  "children" | "className" | "disabled" | "type"
>;

/**
 * A submit button wired to the parent form's pending state via
 * `useFormStatus`. As soon as it's clicked it disables itself and shows a
 * spinner, so server-action round-trips give instant feedback instead of
 * feeling laggy, and the form can't be double-submitted.
 */
export function SubmitButton({
  children,
  className = "",
  unstyled = false,
  spinner = true,
  pendingLabel,
  ...rest
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50 ${
        unstyled ? "" : PRIMARY
      } ${className}`}
    >
      {pending && spinner && (
        <span
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
