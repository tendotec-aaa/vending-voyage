import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const data = [
  { name: "Operational", value: 142, color: "hsl(142, 76%, 36%)" },
  { name: "Low Stock", value: 28, color: "hsl(45, 93%, 47%)" },
  { name: "Needs Service", value: 12, color: "hsl(var(--destructive))" },
  { name: "Offline", value: 5, color: "hsl(var(--muted))" },
];

export function MachineStatusChart() {
  return (
    <Card className="p-6 bg-card border-border">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Machine Status</h3>
        <p className="text-sm text-muted-foreground">Current fleet overview</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                color: "hsl(var(--foreground))",
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center">
        <p className="text-3xl font-bold text-foreground">187</p>
        <p className="text-sm text-muted-foreground">Total Machines</p>
      </div>
    </Card>
  );
}
