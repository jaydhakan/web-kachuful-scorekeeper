/**
 * The outline-to-fill headline (DESIGN-SYSTEM.md, Motion): the words draw as an outline, then the fill wipes in left to
 * right and holds. The fill is a pseudo-element, so the text is in the page once. Reduced motion shows it filled.
 */
export function InkFill({ text }: { text: string }) {
  return (
    <span className="ink-fill" data-text={text}>
      {text}
    </span>
  );
}
