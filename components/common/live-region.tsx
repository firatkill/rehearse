export function LiveRegion({ message, visible = false }: { message: string; visible?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={visible ? undefined : 'sr-only'}
    >
      {message}
    </div>
  );
}
