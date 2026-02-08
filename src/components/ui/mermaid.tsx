import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "inherit",
});

interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    if (chart && ref.current) {
      mermaid.render(`mermaid-${Date.now()}`, chart).then((result) => {
        setSvg(result.svg);
      }).catch((error) => {
        console.error("Mermaid render error:", error);
        setSvg(`<div class="text-red-500">Error rendering chart: ${error.message}</div>`);
      });
    }
  }, [chart]);

  return (
    <div 
      className="mermaid-container w-full h-full overflow-auto flex items-center justify-center p-4"
      ref={ref}
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
}
