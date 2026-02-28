import { useState, useEffect } from "react";
import { cn } from "../../lib/utils";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox";

interface ManifestFile {
  name: string;
  path: string;
  id: string;
  group?: string;
}

interface Manifest {
  default: string;
  files: ManifestFile[];
}

interface SbomSelectorProps {
  manifest: Manifest | null;
  currentFile: string;
  onSelect: (fileId: string) => void;
}

export function SbomSelector({
  manifest,
  currentFile,
  onSelect,
}: SbomSelectorProps) {
  const [query, setQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<ManifestFile | null>(null);

  // Sync internal state with props
  useEffect(() => {
    if (manifest) {
      const found = manifest.files.find((f) => f.id === currentFile);
      setSelectedFile(found || null);
    }
  }, [currentFile, manifest]);

  const filteredFiles =
    query === ""
      ? manifest?.files || []
      : manifest?.files.filter((file) => {
          return file.name.toLowerCase().includes(query.toLowerCase());
        }) || [];

  // Group files
  const groupedFiles = filteredFiles.reduce((acc, file) => {
    const group = file.group || "Other";
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(file);
    return acc;
  }, {} as Record<string, ManifestFile[]>);

  const isCustom = currentFile.startsWith("Local:");
  const displayValue = isCustom
    ? `Custom (${currentFile.replace("Local: ", "")})`
    : selectedFile?.name || "Select SBOM...";

  return (
    <div className="w-full">
      <Combobox
        value={selectedFile ? selectedFile.id : null}
        onValueChange={(val) => {
          if (val) {
            onSelect(val);
          }
        }}
      >
        <ComboboxInput
          placeholder={displayValue}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 text-sm"
          data-testid="sbom-selector-input"
          showTrigger={true}
        />
        <ComboboxContent 
          side="top" 
          sideOffset={8}
          className="min-w-[320px] w-(--anchor-width) max-h-[60vh] shadow-2xl border bg-popover/95 backdrop-blur-md rounded-xl p-1 overflow-hidden"
        >
          <div className="p-2 pb-1 border-b mb-1 flex items-center justify-between bg-muted/30">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">
              Available SBOMs
            </span>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
              {manifest?.files.length || 0}
            </span>
          </div>
          <ComboboxList className="p-1">
            {filteredFiles.length === 0 && (
              <ComboboxEmpty className="py-8 text-sm text-muted-foreground italic">
                No SBOMs found matching "{query}"
              </ComboboxEmpty>
            )}
            {Object.entries(groupedFiles).map(([group, files]) => (
              <ComboboxGroup key={group} className="mb-2 last:mb-0">
                <ComboboxLabel className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60">
                  {group}
                </ComboboxLabel>
                <div className="space-y-0.5">
                  {files.map((file) => (
                    <ComboboxItem 
                      key={file.id} 
                      value={file.id}
                      data-testid={`sbom-option-${file.id}`}
                      className={cn(
                        "px-3 py-2 text-sm cursor-pointer rounded-lg transition-all",
                        selectedFile?.id === file.id 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className={cn(
                          "w-8 h-8 rounded-md flex items-center justify-center shrink-0 border",
                          selectedFile?.id === file.id 
                            ? "bg-white/20 border-white/30" 
                            : "bg-muted border-border"
                        )}>
                          <span className="text-sm">📄</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium truncate leading-tight">
                            {file.name}
                          </span>
                          <span className={cn(
                            "text-[10px] truncate mt-0.5",
                            selectedFile?.id === file.id 
                              ? "text-primary-foreground/70" 
                              : "text-muted-foreground"
                          )}>
                            {file.path.split('/').pop()}
                          </span>
                        </div>
                        {selectedFile?.id === file.id && (
                          <div className="w-2 h-2 rounded-full bg-white animate-pulse shadow-sm" />
                        )}
                      </div>
                    </ComboboxItem>
                  ))}
                </div>
              </ComboboxGroup>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
