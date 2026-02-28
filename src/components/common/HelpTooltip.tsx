import { CircleHelp } from "lucide-react";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * @interface HelpTooltipProps
 * @description Properties for the HelpTooltip component
 * @property {ReactNode} text - The content to display inside the tooltip (can be string or JSX)
 * @property {number} [size=14] - The size of the help icon in pixels
 * @property {string} [className] - Additional CSS classes for the container
 */
interface HelpTooltipProps {
  text: ReactNode;
  size?: number;
  className?: string;
}

/**
 * @function HelpTooltip
 * @description Renders a help icon that shows a portal-based tooltip on hover.
 * @example <HelpTooltip text="This is a simple tooltip" />
 * @example <HelpTooltip text={<div><strong>Bold</strong> and more</div>} />
 * @param {HelpTooltipProps} props - Component props
 */
export function HelpTooltip({ text, size = 14, className }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        // Position directly above the element with slight spacing
        top: rect.top - 8, 
        // Center horizontally
        left: rect.left + rect.width / 2,
      });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      // Update position on scroll or resize to keep it attached
      // Use capture=true for scroll to detect scrolling in parent containers
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        className={cn("inline-flex items-center cursor-help", className)}
        onMouseEnter={() => {
            updatePosition();
            setIsVisible(true);
        }}
        onMouseLeave={() => setIsVisible(false)}
      >
        <CircleHelp
          size={size}
          className="text-muted-foreground hover:text-foreground transition-colors"
        />
      </div>
      {isVisible && createPortal(
        <div
          className="fixed z-[9999] px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md shadow-md border border-border pointer-events-none max-w-[200px] break-words animate-in fade-in zoom-in-95 duration-200"
          style={{ 
            top: position.top, 
            left: position.left,
            transform: "translate(-50%, -100%)" // Center horizontally and move up by own height
          }}
        >
          {text}
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-popover" />
        </div>,
        document.body
      )}
    </>
  );
}
