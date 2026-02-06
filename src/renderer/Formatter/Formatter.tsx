import type {
  Bom,
  Component,
  License,
  Metadata,
} from "@cyclonedx/cyclonedx-library/Models";
import type { Vulnerability } from "node_modules/@cyclonedx/cyclonedx-library/dist.d/models/vulnerability";

export type formattedSBOM = {
  statistics: {
    licenses: License[]; // A list of unique licenses across all components
    vulnerabilities: {
      // aggregated unique vulnerabilities across all components
      Critical: Vulnerability[];
      High: Vulnerability[];
      Medium: Vulnerability[];
      Low: Vulnerability[];
      Informational: Vulnerability[];
    };
  };
  metadata: Metadata;
  components: NestedSBOMComponent[];
};

export interface NestedSBOMComponent extends Component {
  vulnerabilities: {
    inherent: {
      // vulnerabilities directly associated with the component
      Critical: Vulnerability[];
      High: Vulnerability[];
      Medium: Vulnerability[];
      Low: Vulnerability[];
      Informational: Vulnerability[];
    };
    transitive: {
      // vulnerabilities inherited from dependencies
      Critical: Vulnerability[];
      High: Vulnerability[];
      Medium: Vulnerability[];
      Low: Vulnerability[];
      Informational: Vulnerability[];
    };
  };
  formattedDependencies: NestedSBOMComponent[];
}

/**
 * MARK: Formatter
 * @description Formats a raw SBOM into a nested structure suitable for teired rendering
 * @param {any} props
 * @param {Bom} props.rawSBOM A raw SBOM to format
 * @param {function} props.setProgress An async function to update progress during formatting
 * @example await setFormattedNestedSBOM(await Formatter({ rawSBOM: SBOM }));
 * @returns {Promise<formattedSBOM>} A formatted nested SBOM
 */
export const Formatter = async ({
  rawSBOM,
  setProgress,
}: {
  rawSBOM: Bom;
  setProgress: ({
    progress,
    message,
  }: {
    progress: number;
    message: string;
  }) => void;
}): Promise<formattedSBOM> => {};
