import { useState, useEffect } from "react";
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
          className="h-8"
        />
        <ComboboxContent>
          <ComboboxList>
            {filteredFiles.length === 0 && (
              <ComboboxEmpty>No results found.</ComboboxEmpty>
            )}
            {Object.entries(groupedFiles).map(([group, files]) => (
              <ComboboxGroup key={group}>
                <ComboboxLabel>{group}</ComboboxLabel>
                {files.map((file) => (
                  <ComboboxItem 
                    key={file.id} 
                    value={file.id}
                    data-testid={`sbom-option-${file.id}`}
                  >
                    {file.name}
                  </ComboboxItem>
                ))}
              </ComboboxGroup>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
