import { useEffect, useState } from "react";
import { SBOMComponent } from "./SBOMComponent/SBOMComponent";
import { Formatter } from "./Formatter/Formatter";
/** @typedef {import('@cyclonedx/cyclonedx-library/Models').Bom} Bom */

/**
 * MARK: Renderer
 * @description Renders a viewer for an SBOM
 * @param {{ SBOM: Bom | object }} props A CycloneDX Bom instance or raw SBOM object to render
 * @example <Suspence>
 * <Renderer SBOM={SBOM}
 * </Suspence>
 */
export const Renderer = ({ SBOM }) => {
  const [isFormatting, setIsFormatting] = useState(true);
  const [formattedNestedSBOM, setFormattedNestedSBOM] = useState(null);

  useEffect(() => {
    const formatSBOM = async () => {
      await setFormattedNestedSBOM(await Formatter({ rawSBOM: SBOM }));
      setIsFormatting(false);
    };
    formatSBOM();
  }, [SBOM]);

  if (isFormatting || !formattedNestedSBOM) {
    return <>Loading....</>;
  }

  return (
    <>
      {JSON.stringify(formattedNestedSBOM.statistics)}
      {formattedNestedSBOM.components.map((component, index) => (
        <div key={index}>
          <SBOMComponent Component={component} />
        </div>
      ))}
    </>
  );
};
