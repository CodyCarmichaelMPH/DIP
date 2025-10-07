// BackgroundStarsimSimulation.tsx - Independent Starsim simulation component
// Runs realistic disease simulations in the background without touching Scenario Builder
// Uses Pierce County parameters for COVID, Flu, and RSV
// VERSION 2.1 - Fixed starsimService reference error and population conservation - 2025-01-05 23:25

import React, { useState, useEffect } from 'react';
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
  Heart, 
  Skull, 
  TrendingUp, 
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { simulationService, SimulationParams } from '../lib/simulationService';
import { useTheme } from '../lib/theme';

interface BackgroundStarsimSimulationProps {
  disease: 'COVID' | 'Flu' | 'RSV';
  className?: string;
}

// Disease-specific parameters based on Pierce County data
const getDiseaseParameters = (disease: 'COVID' | 'Flu' | 'RSV') => {
  const baseParams = {
    population_size: 928696,
    duration_days: 30,
    start_date: "2025-09-01",
    stop_date: "2025-10-31",
    unit: 'day',
    random_seed: 42,
    disease_model_type: 'seir',
    network_n_contacts: 30,
    network_poisson_lam: 3.2,
    vaccination_coverage: 0.14,
    booster_coverage: 0.14,
    vax_transmission_eff: 0.6,
    vax_severity_eff: 0.8,
    waning_days: 180,
    residual_transmission_floor: 0.1
  };

  switch (disease) {
    case 'COVID':
      return {
        ...baseParams,
        init_prev: 0.0015,
        beta: 0.35,
        gamma: 0.10,
        sigma: 0.20,
        mu: 0.0005,
        seasonal_factor: 1.3,
        peak_weeks: [48, 49, 50, 51, 52, 1, 2, 3],
        vaccination_coverage: 0.14
      };
    case 'Flu':
      return {
        ...baseParams,
        init_prev: 0.005,
        beta: 0.26,
        gamma: 0.20,
        sigma: 0.20,
        mu: 0.0012,
        seasonal_factor: 2.1,
        peak_weeks: [1, 2, 3, 4, 5],
        vaccination_coverage: 0.265
      };
    case 'RSV':
      return {
        ...baseParams,
        init_prev: 0.0005,
        beta: 0.12,
        gamma: 0.125,
        sigma: 0.20,
        mu: 0.0003,
        seasonal_factor: 3.5,
        peak_weeks: [47, 48, 49, 50, 51, 52],
        vaccination_coverage: 0.15
      };
    default:
      return baseParams;
  }
};

// Use the same simulation service as Scenario Builder
const runBackgroundSimulation = async (disease: 'COVID' | 'Flu' | 'RSV') => {
  const params = getDiseaseParameters(disease);
  
  console.log(`=== BACKGROUND STARSIM SIMULATION FOR ${disease} ===`);
  console.log('Parameters:', params);
  
  // Convert to SimulationParams format (same as Scenario Builder)
  const simulationParams: SimulationParams = {
    disease_name: disease,
    model_type: 'Starsim', // Use Starsim model type
    population_size: params.population_size,
    duration_days: params.duration_days,
    n_reps: 1,
    start_date: params.start_date,
    stop_date: params.stop_date,
    unit: params.unit,
    random_seed: params.random_seed,
    init_prev: params.init_prev,
    beta: params.beta,
    gamma: params.gamma,
    sigma: params.sigma,
    mu: params.mu,
    seasonal_factor: params.seasonal_factor,
    peak_weeks: params.peak_weeks,
    network_n_contacts: params.network_n_contacts,
    network_poisson_lam: params.network_poisson_lam,
    vaccination_coverage: params.vaccination_coverage,
    booster_coverage: params.booster_coverage,
    vax_transmission_eff: params.vax_transmission_eff,
    vax_severity_eff: params.vax_severity_eff,
    waning_days: params.waning_days,
    residual_transmission_floor: params.residual_transmission_floor
  };

  try {
    const data = await simulationService.runSimulation(simulationParams);
    console.log(`=== ${disease} SIMULATION COMPLETE ===`);
    console.log('Response:', data);
    return data;
  } catch (error) {
    console.error(`Error running ${disease} simulation:`, error);
    throw error;
  }
};

// Note: Using direct data formatting instead of starsimService.formatDataForChart
// to avoid population inflation issues in the stacked area chart

// Disease-specific colors (inline to avoid importing starsimService) - FORCE REFRESH
const getDiseaseColorsV2 = (disease: 'COVID' | 'Flu' | 'RSV') => {
  console.log('getDiseaseColorsV2 called for disease:', disease);
  const colorMap = {
    COVID: {
      primary: '#3b82f6',
      secondary: '#1e40af',
      accent: '#dbeafe',
    },
    Flu: {
      primary: '#10b981',
      secondary: '#047857',
      accent: '#d1fae5',
    },
    RSV: {
      primary: '#f59e0b',
      secondary: '#d97706',
      accent: '#fef3c7',
    },
  };
  return colorMap[disease] || colorMap.COVID;
};

export function BackgroundStarsimSimulation({ 
  disease, 
  className = '' 
}: BackgroundStarsimSimulationProps) {
  const [retryCount, setRetryCount] = useState(0);
  const { theme } = useTheme();
  
  // Run background simulation
  const { data: simulationData, isLoading, error, refetch } = useQuery({
    queryKey: ['background-starsim', disease, retryCount],
    queryFn: () => runBackgroundSimulation(disease),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });

  // Format data for charts - use direct formatting like SEIR chart to avoid population inflation
  const chartData = simulationData ? simulationData.results.time_points.map((day: number, index: number) => ({
    day,
    susceptible: Math.round(simulationData.results.susceptible[index] || 0),
    exposed: Math.round(simulationData.results.exposed?.[index] || 0),
    infected: Math.round(simulationData.results.infected[index] || 0),
    recovered: Math.round(simulationData.results.recovered[index] || 0),
    deaths: Math.round(simulationData.results.deaths[index] || 0)
  })) : [];
  const colors = getDiseaseColorsV2(disease);

  // Calculate summary metrics
  const rawSummary = simulationData?.results?.summary || {
    peak_infection: 0,
    peak_day: 0,
    total_infected: 0,
    total_deaths: 0,
    attack_rate: 0,
    case_fatality_rate: 0
  };
  
  const isAbsolute = simulationData?.results?.susceptible?.[0] > 10000;
  const summaryMetrics = {
    peak_infection: isAbsolute ? rawSummary.peak_infection : rawSummary.peak_infection * 928696,
    peak_day: rawSummary.peak_day,
    total_infected: isAbsolute ? rawSummary.total_infected : rawSummary.total_infected * 928696,
    total_deaths: isAbsolute ? rawSummary.total_deaths : rawSummary.total_deaths * 928696,
    attack_rate: rawSummary.attack_rate,
    case_fatality_rate: rawSummary.case_fatality_rate
  };

  if (isLoading) {
    return (
      <div className={`card ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Running {disease} simulation...</p>
            <p className="text-sm text-gray-500 mt-2">
              Pierce County parameters (928,696 population, 30-day forecast)
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
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-2">Simulation Error</p>
            <p className="text-sm text-gray-500 mb-4">
              Failed to run {disease} simulation
            </p>
            <button
              onClick={() => {
                setRetryCount(prev => prev + 1);
                refetch();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!simulationData || chartData.length === 0) {
    return (
      <div className={`card ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-yellow-500" />
            <p className="text-yellow-600 mb-2">No Data</p>
            <p className="text-sm text-gray-500">
              No simulation data available for {disease}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-red-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Peak Infections</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(summaryMetrics.peak_infection).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-blue-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Infected</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(summaryMetrics.total_infected).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-green-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Attack Rate</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {(summaryMetrics.attack_rate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-gray-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Deaths</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(summaryMetrics.total_deaths).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Simulation Chart - EXACT COPY OF SEIR CHART */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {disease} Disease Progression (30-day forecast)
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#f0f0f0'} />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#666' }}
                stroke={theme === 'dark' ? '#6b7280' : '#666'}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#666' }}
                stroke={theme === 'dark' ? '#6b7280' : '#666'}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip 
                formatter={(value, name) => [value.toLocaleString(), name]}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="susceptible"
                stackId="1"
                stroke="none"
                fill="#e5e7eb"
                name="Susceptible"
              />
              {chartData.some(d => d.exposed > 0) && (
                <Area
                  type="monotone"
                  dataKey="exposed"
                  stackId="1"
                  stroke="none"
                  fill="#fbbf24"
                  name="Exposed"
                />
              )}
              <Area
                type="monotone"
                dataKey="infected"
                stackId="1"
                stroke="none"
                fill={colors.primary}
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
              <Line 
                type="monotone" 
                dataKey="deaths" 
                stroke="#6b7280" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Deaths"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Simulation Parameters Info */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Simulation Parameters</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600 dark:text-gray-300">
          <div>
            <span className="font-medium">Population:</span> 928,696
          </div>
          <div>
            <span className="font-medium">Duration:</span> 30 days
          </div>
          <div>
            <span className="font-medium">Contacts:</span> 30/person
          </div>
          <div>
            <span className="font-medium">Vaccination:</span> {getDiseaseParameters(disease).vaccination_coverage * 100}%
          </div>
        </div>
      </div>
    </div>
  );
}

// Uses Pierce County parameters for COVID, Flu, and RSV
// VERSION 2.1 - Fixed starsimService reference error and population conservation - 2025-01-05 23:25

import React, { useState, useEffect } from 'react';
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
  Heart, 
  Skull, 
  TrendingUp, 
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { simulationService, SimulationParams } from '../lib/simulationService';
import { useTheme } from '../lib/theme';

interface BackgroundStarsimSimulationProps {
  disease: 'COVID' | 'Flu' | 'RSV';
  className?: string;
}

// Disease-specific parameters based on Pierce County data
const getDiseaseParameters = (disease: 'COVID' | 'Flu' | 'RSV') => {
  const baseParams = {
    population_size: 928696,
    duration_days: 30,
    start_date: "2025-09-01",
    stop_date: "2025-10-31",
    unit: 'day',
    random_seed: 42,
    disease_model_type: 'seir',
    network_n_contacts: 30,
    network_poisson_lam: 3.2,
    vaccination_coverage: 0.14,
    booster_coverage: 0.14,
    vax_transmission_eff: 0.6,
    vax_severity_eff: 0.8,
    waning_days: 180,
    residual_transmission_floor: 0.1
  };

  switch (disease) {
    case 'COVID':
      return {
        ...baseParams,
        init_prev: 0.0015,
        beta: 0.35,
        gamma: 0.10,
        sigma: 0.20,
        mu: 0.0005,
        seasonal_factor: 1.3,
        peak_weeks: [48, 49, 50, 51, 52, 1, 2, 3],
        vaccination_coverage: 0.14
      };
    case 'Flu':
      return {
        ...baseParams,
        init_prev: 0.005,
        beta: 0.26,
        gamma: 0.20,
        sigma: 0.20,
        mu: 0.0012,
        seasonal_factor: 2.1,
        peak_weeks: [1, 2, 3, 4, 5],
        vaccination_coverage: 0.265
      };
    case 'RSV':
      return {
        ...baseParams,
        init_prev: 0.0005,
        beta: 0.12,
        gamma: 0.125,
        sigma: 0.20,
        mu: 0.0003,
        seasonal_factor: 3.5,
        peak_weeks: [47, 48, 49, 50, 51, 52],
        vaccination_coverage: 0.15
      };
    default:
      return baseParams;
  }
};

// Use the same simulation service as Scenario Builder
const runBackgroundSimulation = async (disease: 'COVID' | 'Flu' | 'RSV') => {
  const params = getDiseaseParameters(disease);
  
  console.log(`=== BACKGROUND STARSIM SIMULATION FOR ${disease} ===`);
  console.log('Parameters:', params);
  
  // Convert to SimulationParams format (same as Scenario Builder)
  const simulationParams: SimulationParams = {
    disease_name: disease,
    model_type: 'Starsim', // Use Starsim model type
    population_size: params.population_size,
    duration_days: params.duration_days,
    n_reps: 1,
    start_date: params.start_date,
    stop_date: params.stop_date,
    unit: params.unit,
    random_seed: params.random_seed,
    init_prev: params.init_prev,
    beta: params.beta,
    gamma: params.gamma,
    sigma: params.sigma,
    mu: params.mu,
    seasonal_factor: params.seasonal_factor,
    peak_weeks: params.peak_weeks,
    network_n_contacts: params.network_n_contacts,
    network_poisson_lam: params.network_poisson_lam,
    vaccination_coverage: params.vaccination_coverage,
    booster_coverage: params.booster_coverage,
    vax_transmission_eff: params.vax_transmission_eff,
    vax_severity_eff: params.vax_severity_eff,
    waning_days: params.waning_days,
    residual_transmission_floor: params.residual_transmission_floor
  };

  try {
    const data = await simulationService.runSimulation(simulationParams);
    console.log(`=== ${disease} SIMULATION COMPLETE ===`);
    console.log('Response:', data);
    return data;
  } catch (error) {
    console.error(`Error running ${disease} simulation:`, error);
    throw error;
  }
};

// Note: Using direct data formatting instead of starsimService.formatDataForChart
// to avoid population inflation issues in the stacked area chart

// Disease-specific colors (inline to avoid importing starsimService) - FORCE REFRESH
const getDiseaseColorsV2 = (disease: 'COVID' | 'Flu' | 'RSV') => {
  console.log('getDiseaseColorsV2 called for disease:', disease);
  const colorMap = {
    COVID: {
      primary: '#3b82f6',
      secondary: '#1e40af',
      accent: '#dbeafe',
    },
    Flu: {
      primary: '#10b981',
      secondary: '#047857',
      accent: '#d1fae5',
    },
    RSV: {
      primary: '#f59e0b',
      secondary: '#d97706',
      accent: '#fef3c7',
    },
  };
  return colorMap[disease] || colorMap.COVID;
};

export function BackgroundStarsimSimulation({ 
  disease, 
  className = '' 
}: BackgroundStarsimSimulationProps) {
  const [retryCount, setRetryCount] = useState(0);
  const { theme } = useTheme();
  
  // Run background simulation
  const { data: simulationData, isLoading, error, refetch } = useQuery({
    queryKey: ['background-starsim', disease, retryCount],
    queryFn: () => runBackgroundSimulation(disease),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });

  // Format data for charts - use direct formatting like SEIR chart to avoid population inflation
  const chartData = simulationData ? simulationData.results.time_points.map((day: number, index: number) => ({
    day,
    susceptible: Math.round(simulationData.results.susceptible[index] || 0),
    exposed: Math.round(simulationData.results.exposed?.[index] || 0),
    infected: Math.round(simulationData.results.infected[index] || 0),
    recovered: Math.round(simulationData.results.recovered[index] || 0),
    deaths: Math.round(simulationData.results.deaths[index] || 0)
  })) : [];
  const colors = getDiseaseColorsV2(disease);

  // Calculate summary metrics
  const rawSummary = simulationData?.results?.summary || {
    peak_infection: 0,
    peak_day: 0,
    total_infected: 0,
    total_deaths: 0,
    attack_rate: 0,
    case_fatality_rate: 0
  };
  
  const isAbsolute = simulationData?.results?.susceptible?.[0] > 10000;
  const summaryMetrics = {
    peak_infection: isAbsolute ? rawSummary.peak_infection : rawSummary.peak_infection * 928696,
    peak_day: rawSummary.peak_day,
    total_infected: isAbsolute ? rawSummary.total_infected : rawSummary.total_infected * 928696,
    total_deaths: isAbsolute ? rawSummary.total_deaths : rawSummary.total_deaths * 928696,
    attack_rate: rawSummary.attack_rate,
    case_fatality_rate: rawSummary.case_fatality_rate
  };

  if (isLoading) {
    return (
      <div className={`card ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Running {disease} simulation...</p>
            <p className="text-sm text-gray-500 mt-2">
              Pierce County parameters (928,696 population, 30-day forecast)
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
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-2">Simulation Error</p>
            <p className="text-sm text-gray-500 mb-4">
              Failed to run {disease} simulation
            </p>
            <button
              onClick={() => {
                setRetryCount(prev => prev + 1);
                refetch();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!simulationData || chartData.length === 0) {
    return (
      <div className={`card ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-yellow-500" />
            <p className="text-yellow-600 mb-2">No Data</p>
            <p className="text-sm text-gray-500">
              No simulation data available for {disease}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-red-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Peak Infections</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(summaryMetrics.peak_infection).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-blue-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Infected</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(summaryMetrics.total_infected).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-green-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Attack Rate</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {(summaryMetrics.attack_rate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-gray-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Deaths</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(summaryMetrics.total_deaths).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Simulation Chart - EXACT COPY OF SEIR CHART */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {disease} Disease Progression (30-day forecast)
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#f0f0f0'} />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#666' }}
                stroke={theme === 'dark' ? '#6b7280' : '#666'}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#666' }}
                stroke={theme === 'dark' ? '#6b7280' : '#666'}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip 
                formatter={(value, name) => [value.toLocaleString(), name]}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="susceptible"
                stackId="1"
                stroke="none"
                fill="#e5e7eb"
                name="Susceptible"
              />
              {chartData.some(d => d.exposed > 0) && (
                <Area
                  type="monotone"
                  dataKey="exposed"
                  stackId="1"
                  stroke="none"
                  fill="#fbbf24"
                  name="Exposed"
                />
              )}
              <Area
                type="monotone"
                dataKey="infected"
                stackId="1"
                stroke="none"
                fill={colors.primary}
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
              <Line 
                type="monotone" 
                dataKey="deaths" 
                stroke="#6b7280" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Deaths"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Simulation Parameters Info */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Simulation Parameters</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600 dark:text-gray-300">
          <div>
            <span className="font-medium">Population:</span> 928,696
          </div>
          <div>
            <span className="font-medium">Duration:</span> 30 days
          </div>
          <div>
            <span className="font-medium">Contacts:</span> 30/person
          </div>
          <div>
            <span className="font-medium">Vaccination:</span> {getDiseaseParameters(disease).vaccination_coverage * 100}%
          </div>
        </div>
      </div>
    </div>
  );
}