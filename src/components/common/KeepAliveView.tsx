import React, { useState, useEffect } from "react";

interface KeepAliveViewProps {
  activeView: string;
  viewKey: string;
  children: React.ReactNode;
}

/**
 * KeepAliveView persists its children in the DOM even when hidden.
 * It uses 'display: none' to hide inactive views, preserving their internal state.
 * Views are lazily mounted only when they first become active.
 */
export function KeepAliveView({ activeView, viewKey, children }: KeepAliveViewProps) {
  const [hasVisited, setHasVisited] = useState(false);
  const isActive = activeView === viewKey;

  useEffect(() => {
    if (isActive && !hasVisited) {
      setHasVisited(true);
    }
  }, [isActive, hasVisited]);

  // Lazy mount: don't even put it in the DOM until it's been visited at least once.
  if (!hasVisited && !isActive) {
    return null;
  }

  return (
    <div 
      className="h-full w-full" 
      style={{ display: isActive ? "block" : "none" }}
    >
      {children}
    </div>
  );
}
