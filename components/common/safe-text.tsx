export function SafeText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]\n]{1,40}\])/).map((part, index) =>
        /^\[[^\]\n]{1,40}\]$/.test(part) ? (
          <span key={`${index}:${part}`} className="placeholder">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
