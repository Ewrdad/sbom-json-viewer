/**
 * @function HighlightText
 * @description Highlights occurrences of a search term within a text string.
 * 
 * @param {Object} props
 * @param {string} props.text - The full text to display
 * @param {string} props.highlight - The term to highlight
 * @param {string} [props.className] - Optional CSS class for the wrapper
 */
export function HighlightText({ text, highlight, className = "" }: { text: string; highlight: string; className?: string }) {
  if (!highlight.trim()) {
    return <span className={className}>{text}</span>;
  }

  // Escape special regex characters
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedHighlight})`, "gi");
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-primary/30 text-foreground rounded-sm px-0.5 border-b border-primary/50 font-inherit">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}
