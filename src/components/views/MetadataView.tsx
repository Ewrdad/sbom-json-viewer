import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Info, 
  Calendar, 
  Wrench, 
  User, 
  Building2, 
  Package, 
  ExternalLink,
  Hash
} from "lucide-react";

export function MetadataView({ sbom }: { sbom: any }) {
  if (!sbom || !sbom.metadata) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground italic">
        No metadata available for this SBOM.
      </div>
    );
  }

  const { metadata } = sbom;
  
  // Robustly handle tools (can be array or object with components/services in CycloneDX)
  const rawTools = metadata.tools;
  const tools: any[] = [];
  if (Array.isArray(rawTools)) {
    tools.push(...rawTools);
  } else if (rawTools && typeof rawTools === 'object') {
    if (Array.isArray(rawTools.components)) tools.push(...rawTools.components);
    if (Array.isArray(rawTools.services)) tools.push(...rawTools.services);
  }

  // Robustly handle authors
  const authors: any[] = Array.isArray(metadata.authors) ? metadata.authors : [];
  const component = metadata.component;
  const supplier = metadata.supplier;
  const manufacture = metadata.manufacture;

  return (
    <ScrollArea className="h-full">
      <div className="pb-6 space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Metadata</h2>
          <Badge variant="outline" className="text-xs">
            {sbom.specVersion || "Unknown"} CycloneDX
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* General Info */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">General Information</CardTitle>
              <Info className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Timestamp
                </p>
                <p className="text-sm font-medium">
                  {metadata.timestamp ? new Date(metadata.timestamp).toLocaleString() : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Format</p>
                <p className="text-sm font-medium">CycloneDX</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="text-sm font-medium">{sbom.specVersion || "N/A"}</p>
              </div>
              {sbom.serialNumber && (
                <div>
                  <p className="text-xs text-muted-foreground">Serial Number</p>
                  <p className="text-xs font-mono break-all">{sbom.serialNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Root Component */}
          {component && (
            <Card className="shadow-sm border-muted-foreground/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subject Component</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium">{component.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="text-sm font-mono">{component.version || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Badge variant="secondary" className="mt-1">
                    {(component.type || "unknown").toUpperCase()}
                  </Badge>
                </div>
                {component.purl && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> PURL
                    </p>
                    <p className="text-[10px] font-mono break-all text-muted-foreground">
                      {component.purl.toString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Supplier/Manufacturer */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organization</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              {supplier && (
                <div>
                  <p className="text-xs text-muted-foreground">Supplier</p>
                  <p className="text-sm font-medium">{supplier.name}</p>
                  {supplier.url?.[0] && (
                    <a href={supplier.url[0]} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline block truncate">
                      {supplier.url[0]}
                    </a>
                  )}
                </div>
              )}
              {manufacture && (
                <div>
                  <p className="text-xs text-muted-foreground">Manufacturer</p>
                  <p className="text-sm font-medium">{manufacture.name}</p>
                  {manufacture.url?.[0] && (
                    <a href={manufacture.url[0]} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline block truncate">
                      {manufacture.url[0]}
                    </a>
                  )}
                </div>
              )}
              {!supplier && !manufacture && (
                <p className="text-sm text-muted-foreground italic">No organization data available.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Tooling */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Generating Tools</CardTitle>
              <Wrench className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tools.length > 0 ? (
                  tools.map((tool, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-muted-foreground/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm">{tool.name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {tool.version || "Unknown Version"}
                        </Badge>
                      </div>
                      {tool.vendor && (
                        <p className="text-xs text-muted-foreground">
                          Vendor: <span className="text-foreground">{tool.vendor}</span>
                        </p>
                      )}
                      {tool.hashes && Array.isArray(tool.hashes) && tool.hashes.length > 0 && (
                        <div className="pt-1">
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                            <Hash className="h-2 w-2" /> Hashes
                          </p>
                          <div className="space-y-1">
                            {tool.hashes.map((h: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-[9px] font-mono bg-background/50 p-1 rounded">
                                <span className="text-muted-foreground">{h.alg}:</span>
                                <span className="truncate ml-2">{h.content}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic py-4">No tools listed in metadata.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Authors */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Authors & Contact</CardTitle>
              <User className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {authors.length > 0 ? (
                  authors.map((author, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-muted-foreground/10">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-none">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{author.name || "Anonymous Author"}</p>
                        {author.email && (
                          <p className="text-xs text-muted-foreground underline truncate">{author.email}</p>
                        )}
                        {author.phone && (
                          <p className="text-xs text-muted-foreground">{author.phone}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic py-4">No authors listed in metadata.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
