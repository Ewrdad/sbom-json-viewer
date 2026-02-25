import type { SbomStats } from "@/types/sbom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export function MultiSbomStatsView({ stats }: { stats?: SbomStats }) {
  if (!stats?.multiSbomStats) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center bg-muted/10 rounded-lg border border-dashed">
        <div className="flex flex-col items-center gap-2 text-muted-foreground max-w-sm">
          <p className="font-medium text-foreground">No Multi-SBOM Data Available</p>
          <p className="text-sm">You need to select and upload multiple SBOM JSON files simultaneously to view merge statistics and deduplication overlaps.</p>
        </div>
      </div>
    );
  }

  const { sources, overlap } = stats.multiSbomStats;
  const numSources = sources.length;

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const OVERLAP_COLORS = ['#6366f1', '#a855f7'];

  // Prepare data for overlap pie charts
  const componentOverlapData = [
    { name: 'Unique', value: overlap.components.unique },
    { name: 'Shared', value: overlap.components.shared }
  ];

  const vulnerabilityOverlapData = [
    { name: 'Unique', value: overlap.vulnerabilities.unique },
    { name: 'Shared', value: overlap.vulnerabilities.shared }
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Merge Statistics</h2>
          <p className="text-muted-foreground mt-1">
            Analyzing overlap across {numSources} source {numSources === 1 ? 'file' : 'files'}.
          </p>
        </div>
      </div>

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files Merged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{numSources}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Components</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overlap.components.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overlap.components.shared.toLocaleString()} shared across sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Vulnerabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overlap.vulnerabilities.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overlap.vulnerabilities.shared.toLocaleString()} shared across sources
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Breakdown Chart */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Discovery By Source</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sources}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="componentsFound" name="Components Found" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="vulnerabilitiesFound" name="Vulnerabilities Found" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deduplication/Overlap Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Component Overlap</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={componentOverlapData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {componentOverlapData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={OVERLAP_COLORS[index % OVERLAP_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vulnerability Overlap</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vulnerabilityOverlapData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {vulnerabilityOverlapData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={OVERLAP_COLORS[index % OVERLAP_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
