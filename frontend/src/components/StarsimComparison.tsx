// StarsimComparison.tsx - Component for comparing multiple Starsim scenarios
// Shows side-by-side comparison of different disease modeling scenarios

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ComposedChart,
  Area
} from 'recharts';
import { 
  Activity, 
  Users, 
  TrendingUp, 
  AlertCircle,
  Loader2,
  BarChart3,
  Settings
} from 'lucide-react';
import { starsimService, type StarsimScenario, type StarsimScenarioResults } from '../lib/starsim';

interface StarsimComparisonProps {
  disease: 'COVID' | 'Flu' | 'RSV';
  className?: string;
}

export function StarsimComparison({ disease, className = '' }: StarsimComparisonProps) {
  const [activeView, setActiveView] = useState<'overview' | 'detailed'>('overview');
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);

  // Define comparison scenarios
  const scenarios: StarsimScenario[] = [
    {
      name: 'Baseline',
      population_size: 5000,
      duration_days: 365,
      n_reps: 10,
    },
    {
      name: 'High Population',
      population_size: 10000,
      duration_days: 365,
      n_reps: 10,
    },
    {
      name: 'Extended Duration',
      population_size: 5000,
      duration_days: 730,
      n_reps: 10,
    },
    {
      name: 'High Contact Rate',
      population_size: 5000,
      duration_days: 365,
      n_reps: 10,
      parameters: {
        beta: 0.08, // Higher transmission rate
      }
    }
  ];

  // Run comparison scenarios
  const { data: comparisonData, isLoading, error, refetch } = useQuery({
    queryKey: ['starsim-comparison', disease],
    queryFn: () => starsimService.runScenarios(disease, scenarios),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  // Get disease colors
  const colors = starsimService.getDiseaseColors(disease);

  // Scenario colors for comparison
  const scenarioColors = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Orange
    '#ef4444', // Red
  ];

  if (isLoading) {
    return (
      <div className={`card ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Running comparison scenarios...</p>
            <p className="text-sm text-gray-500 mt-2">
              Comparing {scenarios.length} scenarios for {disease}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`card ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-gray-600">Error running comparison</p>
            <p className="text-sm text-gray-500 mt-2">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry Comparison
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prepare comparison data
  const comparisonResults = comparisonData?.scenarios || {};
  const scenarioNames = Object.keys(comparisonResults);

  // Create combined chart data
  const createCombinedData = () => {
    const maxDays = Math.max(...scenarioNames.map(name => 
      comparisonResults[name]?.results?.time_points?.length || 0
    ));
    
    const combinedData = [];
    for (let day = 0; day < maxDays; day++) {
      const dataPoint: any = { day };
      
      scenarioNames.forEach((name, index) => {
        const scenario = comparisonResults[name];
        if (scenario?.results?.infected?.[day] !== undefined) {
          dataPoint[`${name}_infected`] = scenario.results.infected[day];
          dataPoint[`${name}_deaths`] = scenario.results.deaths[day];
        }
      });
      
      combinedData.push(dataPoint);
    }
    
    return combinedData;
  };

  const combinedData = createCombinedData();

  return (
    <div className={`card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">
            Starsim Scenario Comparison - {disease}
          </h3>
        </div>
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'overview'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveView('detailed')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'detailed'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Detailed
          </button>
        </div>
      </div>

      {/* Scenario Selection */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Select Scenarios to Compare</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {scenarioNames.map((name, index) => (
            <label key={name} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedScenarios.includes(name) || selectedScenarios.length === 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedScenarios([...selectedScenarios, name]);
                  } else {
                    setSelectedScenarios(selectedScenarios.filter(s => s !== name));
                  }
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">{name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Summary Statistics Comparison */}
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">
              Scenario Summary Statistics
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scenario
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Peak Infection
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Infected
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Deaths
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attack Rate
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CFR
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {scenarioNames.map((name, index) => {
                    const scenario = comparisonResults[name];
                    const summary = scenario?.results?.summary;
                    if (!summary) return null;
                    
                    return (
                      <tr key={name}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: scenarioColors[index] }}
                            />
                            {name}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          {summary.peak_infection.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          {summary.total_infected.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          {summary.total_deaths.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          {(summary.attack_rate * 100).toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          {(summary.case_fatality_rate * 100).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Infection Comparison Chart */}
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">
              Infection Curves Comparison
            </h4>
            <div className="h-80 border rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10 }}
                    stroke="#666"
                    label={{ value: 'Days', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    stroke="#666"
                    label={{ value: 'Infected Population', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [value.toLocaleString(), name]}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Legend />
                  {scenarioNames.map((name, index) => (
                    <Line
                      key={`${name}_infected`}
                      type="monotone"
                      dataKey={`${name}_infected`}
                      stroke={scenarioColors[index]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      name={name}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeView === 'detailed' && (
        <div className="space-y-6">
          {/* Individual Scenario Details */}
          {scenarioNames.map((name, index) => {
            const scenario = comparisonResults[name];
            if (!scenario) return null;
            
            const chartData = starsimService.formatDataForChart(scenario);
            const summary = scenario.results?.summary;
            
            return (
              <div key={name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-gray-800">
                    {name} Scenario
                  </h4>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: scenarioColors[index] }}
                  />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* SIR Chart */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">SIR Compartments</h5>
                    <div className="h-64 border rounded-lg p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="day" tick={{ fontSize: 8 }} stroke="#666" />
                          <YAxis tick={{ fontSize: 8 }} stroke="#666" />
                          <Tooltip formatter={(value, name) => [value.toLocaleString(), name]} />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="susceptible"
                            stackId="1"
                            stroke="none"
                            fill="#dbeafe"
                            name="Susceptible"
                          />
                          <Area
                            type="monotone"
                            dataKey="infected"
                            stackId="1"
                            stroke="none"
                            fill={scenarioColors[index]}
                            name="Infected"
                          />
                          <Area
                            type="monotone"
                            dataKey="recovered"
                            stackId="1"
                            stroke="none"
                            fill="#10b981"
                            name="Recovered"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Summary Stats */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Summary Statistics</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Peak Infection:</span>
                        <span className="font-medium">{summary?.peak_infection.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Peak Day:</span>
                        <span className="font-medium">{summary?.peak_day}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Infected:</span>
                        <span className="font-medium">{summary?.total_infected.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Deaths:</span>
                        <span className="font-medium">{summary?.total_deaths.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Attack Rate:</span>
                        <span className="font-medium">{(summary?.attack_rate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Case Fatality Rate:</span>
                        <span className="font-medium">{(summary?.case_fatality_rate * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-gray-700 mb-2">Comparison Features</div>
            <div className="space-y-1 text-gray-600">
              <div>• Multiple scenario parameters</div>
              <div>• Side-by-side statistics</div>
              <div>• Interactive scenario selection</div>
              <div>• Detailed individual analysis</div>
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-700 mb-2">Scenario Types</div>
            <div className="space-y-1 text-gray-600">
              <div>• Baseline parameters</div>
              <div>• Population size variations</div>
              <div>• Duration extensions</div>
              <div>• Transmission rate changes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
