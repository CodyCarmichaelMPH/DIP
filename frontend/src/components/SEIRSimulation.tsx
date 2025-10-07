// SEIRSimulation.tsx - Component for running SEIR simulations
// Shows both SIR and SEIR model results with interactive controls

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useSEIRSimulation, useSEIRComparison, seirService } from '../lib/seir';
import { Loader2, AlertCircle, Play, BarChart3, Activity, Users, Heart, Skull } from 'lucide-react';

interface SEIRSimulationProps {
  disease: string;
  populationSize: number;
  durationDays: number;
  showComparison?: boolean;
}

export const SEIRSimulation: React.FC<SEIRSimulationProps> = ({ 
  disease, 
  populationSize, 
  durationDays, 
  showComparison = false 
}) => {
  const [modelType, setModelType] = useState<'SIR' | 'SEIR'>('SEIR');
  
  const { data: seirData, isLoading: seirLoading, error: seirError } = useSEIRSimulation(
    disease, 
    populationSize, 
    durationDays, 
    modelType
  );
  
  const { data: comparisonData, isLoading: comparisonLoading, error: comparisonError } = useSEIRComparison(
    disease, 
    populationSize, 
    durationDays
  );

  if (seirLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="ml-3 text-gray-600">Running {modelType} simulation for {disease}...</p>
      </div>
    );
  }

  if (seirError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-lg text-red-700">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="font-medium">Error running {modelType} simulation for {disease}:</p>
        <p className="text-sm text-center">{seirError.message}</p>
      </div>
    );
  }

  if (!seirData || !seirData.success) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>No simulation data available for {disease}.</p>
      </div>
    );
  }

  const diseaseColor = seirService.getDiseaseColor(disease);
  const diseaseLightColor = seirService.getDiseaseLightColor(disease);

  // Prepare chart data
  const chartData = seirData.time_series.time.map((t, i) => ({
    day: t,
    susceptible: seirData.time_series.susceptible[i],
    exposed: seirData.time_series.exposed?.[i] || 0,
    infected: seirData.time_series.infected[i],
    recovered: seirData.time_series.recovered[i],
    deaths: seirData.time_series.deaths[i],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Activity className="h-5 w-5 text-blue-600 mr-2" />
          <h4 className="text-lg font-semibold text-gray-800">
            {disease} {modelType} Simulation Results
          </h4>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setModelType('SIR')}
            className={`px-3 py-1 text-sm rounded-md ${
              modelType === 'SIR' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            SIR Model
          </button>
          <button
            onClick={() => setModelType('SEIR')}
            className={`px-3 py-1 text-sm rounded-md ${
              modelType === 'SEIR' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            SEIR Model
          </button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <Users className="h-4 w-4 text-blue-500 mr-2" />
            <p className="text-sm text-gray-500">Population</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{seirData.population_size.toLocaleString()}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <Activity className="h-4 w-4 text-red-500 mr-2" />
            <p className="text-sm text-gray-500">Peak Infected</p>
          </div>
          <p className="text-xl font-bold text-red-600">
            {seirData.summary.peak_infected.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            Day {seirData.summary.peak_infected_day}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <Heart className="h-4 w-4 text-green-500 mr-2" />
            <p className="text-sm text-gray-500">Attack Rate</p>
          </div>
          <p className="text-xl font-bold text-green-600">
            {(seirData.summary.attack_rate * 100).toFixed(1)}%
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <Skull className="h-4 w-4 text-gray-500 mr-2" />
            <p className="text-sm text-gray-500">Total Deaths</p>
          </div>
          <p className="text-xl font-bold text-gray-600">
            {seirData.summary.total_deaths.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            CFR: {(seirData.summary.case_fatality_rate * 100).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Model Parameters */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h5 className="font-medium text-gray-700 mb-3">Model Parameters</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">R₀:</span>
            <span className="ml-2 font-medium">{seirData.parameters.r0.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600">β (transmission):</span>
            <span className="ml-2 font-medium">{seirData.parameters.beta.toFixed(3)}</span>
          </div>
          <div>
            <span className="text-gray-600">γ (recovery):</span>
            <span className="ml-2 font-medium">{seirData.parameters.gamma.toFixed(3)}</span>
          </div>
          <div>
            <span className="text-gray-600">μ (mortality):</span>
            <span className="ml-2 font-medium">{seirData.parameters.mu.toFixed(6)}</span>
          </div>
          {modelType === 'SEIR' && seirData.parameters.sigma && (
            <>
              <div>
                <span className="text-gray-600">σ (incubation):</span>
                <span className="ml-2 font-medium">{seirData.parameters.sigma.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-gray-600">Incubation Period:</span>
                <span className="ml-2 font-medium">{seirData.parameters.incubation_period} days</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compartment Chart */}
      <div className="h-80 border rounded-lg p-2 bg-white dark:bg-gray-800">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#666" />
            <YAxis tick={{ fontSize: 10 }} stroke="#666" />
            <Tooltip 
              formatter={(value: number, name: string) => [
                `${(value / populationSize * 100).toFixed(2)}%`, 
                name
              ]} 
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="susceptible" 
              stackId="1" 
              stroke="#8884d8" 
              fill="#8884d8" 
              name="Susceptible" 
              fillOpacity={0.8} 
            />
            {modelType === 'SEIR' && (
              <Area 
                type="monotone" 
                dataKey="exposed" 
                stackId="1" 
                stroke="#ffc658" 
                fill="#ffc658" 
                name="Exposed" 
                fillOpacity={0.8} 
              />
            )}
            <Area 
              type="monotone" 
              dataKey="infected" 
              stackId="1" 
              stroke="#ff7300" 
              fill="#ff7300" 
              name="Infected" 
              fillOpacity={0.8} 
            />
            <Area 
              type="monotone" 
              dataKey="recovered" 
              stackId="1" 
              stroke="#82ca9d" 
              fill="#82ca9d" 
              name="Recovered" 
              fillOpacity={0.8} 
            />
            <Area 
              type="monotone" 
              dataKey="deaths" 
              stackId="1" 
              stroke="#424242" 
              fill="#424242" 
              name="Deaths" 
              fillOpacity={0.8} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* SIR vs SEIR Comparison */}
      {showComparison && comparisonData && (
        <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
          <h5 className="font-medium text-gray-700 mb-4">SIR vs SEIR Comparison</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded-md">
              <div className="text-sm text-gray-600">Peak Infected</div>
              <div className="text-lg font-semibold">
                SIR: {comparisonData.comparison.peak_infected_sir.toLocaleString()}
              </div>
              <div className="text-lg font-semibold text-blue-600">
                SEIR: {comparisonData.comparison.peak_infected_seir.toLocaleString()}
              </div>
            </div>
            <div className="bg-white p-3 rounded-md">
              <div className="text-sm text-gray-600">Total Infected</div>
              <div className="text-lg font-semibold">
                SIR: {comparisonData.comparison.total_infected_sir.toLocaleString()}
              </div>
              <div className="text-lg font-semibold text-blue-600">
                SEIR: {comparisonData.comparison.total_infected_seir.toLocaleString()}
              </div>
            </div>
            <div className="bg-white p-3 rounded-md">
              <div className="text-sm text-gray-600">Attack Rate</div>
              <div className="text-lg font-semibold">
                SIR: {(comparisonData.comparison.attack_rate_sir * 100).toFixed(1)}%
              </div>
              <div className="text-lg font-semibold text-blue-600">
                SEIR: {(comparisonData.comparison.attack_rate_seir * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
