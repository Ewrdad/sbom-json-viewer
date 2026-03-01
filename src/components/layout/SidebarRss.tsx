import { useEffect, useState } from "react";
import { ExternalLink, Rss } from "lucide-react";

/**
 * @description Fetches and displays the single latest post from a Substack RSS feed.
 * Features sky-blue branding for visibility and a live pulse indicator.
 * Isolated by an ErrorBoundary in its parent to ensure network/parsing failures don't break the UI.
 * 
 * @example
 * <SidebarRss isCollapsed={false} />
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isCollapsed - Whether the sidebar is in its collapsed state
 * @returns {JSX.Element | null} The rendered RSS card or null if collapsed/error
 */
export function SidebarRss({ isCollapsed }: { isCollapsed: boolean }) {
  const [latestPost, setLatestPost] = useState<{ title: string; link: string; snippet: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isCollapsed) return;

    const fetchFeed = async () => {
      try {
        setLoading(true);
        // Using a CORS proxy might be necessary in production, but we'll try direct first
        // Substack feeds often don't have CORS headers. 
        // We use a public CORS proxy for demonstration/convenience if direct fails.
        const feedUrl = "https://ewrdad.substack.com/feed";
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Failed to fetch feed");
        
        const data = await response.json();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data.contents, "text/xml");
        
        const firstItem = xmlDoc.querySelector("item");
        if (firstItem) {
          const title = firstItem.querySelector("title")?.textContent || "";
          const link = firstItem.querySelector("link")?.textContent || "";
          const description = firstItem.querySelector("description")?.textContent || "";
          
          // Clean up HTML from description and get a small snippet
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = description;
          const snippet = tempDiv.textContent || tempDiv.innerText || "";
          
          setLatestPost({
            title,
            link,
            snippet: snippet.length > 60 ? snippet.substring(0, 60) + "..." : snippet
          });
        }
      } catch (err) {
        console.error("Error fetching RSS feed:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [isCollapsed]);

  if (isCollapsed || error) return null;

  return (
    <div className="px-3 py-2.5 bg-sky-500/[0.05] hover:bg-sky-500/[0.08] rounded-lg border border-sky-500/20 mx-1 mb-2 animate-in fade-in duration-700 group/rss transition-colors cursor-default shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Rss className="h-2.5 w-2.5 text-sky-400" />
          <span className="text-[8px] font-black uppercase tracking-[0.1em] text-sky-400/80">Ewrdad's Latest</span>
        </div>
        <div className="h-1 w-1 rounded-full bg-sky-400 animate-pulse" />
      </div>
      
      {loading ? (
        <div className="space-y-1.5 animate-pulse">
          <div className="h-2 w-full bg-sky-400/10 rounded-full"></div>
          <div className="h-2 w-2/3 bg-sky-400/10 rounded-full"></div>
        </div>
      ) : latestPost ? (
        <a 
          href={latestPost.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block space-y-1"
        >
          <h4 className="text-[10px] font-bold leading-snug group-hover/rss:text-sky-300 transition-colors line-clamp-2 text-foreground/90 tracking-tight">
            {latestPost.title}
          </h4>
          <div className="flex items-center justify-between items-end pt-1">
            <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-tighter italic">SUBSTACK</span>
            <div className="flex items-center gap-1 text-[8px] font-black text-sky-400 group-hover/rss:text-sky-300 transition-all transform translate-x-1 group-hover/rss:translate-x-0">
              READ <ExternalLink className="h-2 w-2" />
            </div>
          </div>
        </a>
      ) : null}
    </div>
  );
}
