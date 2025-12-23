import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  errors: number[];
}

const ConvergenceChart: React.FC<Props> = ({ errors }) => {
  const data = errors.map((val, idx) => ({ iter: idx + 1, error: val }));

  return (
    <div className="cp-border bg-[var(--cp-panel)] p-2 w-full h-full flex flex-col relative">
      <div className="absolute top-0 left-0 bg-[var(--cp-red)] text-black text-[10px] px-2 py-0.5 font-bold z-10">
        DIAGNOSTICS
      </div>
      <h3 className="text-[10px] font-bold text-[var(--cp-cyan)] mb-1 mt-1 text-right">CONVERGENCE_METRICS</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
            <XAxis 
                dataKey="iter" 
                stroke="#444" 
                fontSize={10} 
                tick={{fill: '#00f0ff'}}
                interval="preserveStartEnd"
            />
            <YAxis 
                stroke="#444" 
                fontSize={10} 
                width={30} 
                tick={{fill: '#00f0ff'}}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#000', borderColor: '#fcee0a', color: '#fcee0a', fontFamily: 'monospace', fontSize: '12px' }}
              itemStyle={{ color: '#00f0ff' }}
              formatter={(value: number) => [value.toExponential(2), 'ERR']}
              labelStyle={{ color: '#ff003c' }}
            />
            <Line 
              type="step" 
              dataKey="error" 
              stroke="#fcee0a" 
              strokeWidth={2} 
              dot={{ r: 1, fill: '#ff003c' }} 
              isAnimationActive={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ConvergenceChart;