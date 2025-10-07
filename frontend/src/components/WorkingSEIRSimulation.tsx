// WorkingSEIRSimulation.tsx - Component that works with the SEIR service directly
// Shows SEIR simulation results without requiring a server

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Loader2, AlertCircle, Play, BarChart3, Activity, Users, Heart, Skull } from 'lucide-react';

interface SEIRSimulationData {
  success: boolean;
  disease: string;
  model_type: string;
  population_size: number;
  duration_days: number;
  parameters: {
    init_prev: number;
    beta: number;
    sigma?: number;
    gamma: number;
    mu: number;
    seasonal_factor: number;
    peak_weeks: number[];
    r0: number;
    incubation_period?: number;
    infectious_period?: number;
    vaccination_coverage?: number;
  };
  time_series: {
    time: number[];
    susceptible: number[];
    exposed?: number[];
    infected: number[];
    recovered: number[];
    deaths: number[];
  };
  summary: {
    peak_exposed?: number;
    peak_infected: number;
    peak_exposed_day?: number;
    peak_infected_day: number;
    total_infected: number;
    total_deaths: number;
    attack_rate: number;
    case_fatality_rate: number;
    r0: number;
    incubation_period?: number;
    infectious_period?: number;
  };
  timestamp: string;
}

interface ModelParameters {
  init_prev: number;
  beta: number;
  gamma: number;
  mu: number;
  sigma?: number;
  incubation_period?: number;
  infectious_period?: number;
  seasonal_factor: number;
  peak_weeks: number[];
  vaccination_coverage?: number;
  r0?: number;
}

interface WorkingSEIRSimulationProps {
  disease: string;
  populationSize: number;
  durationDays: number;
  customParameters?: ModelParameters;
}

export const WorkingSEIRSimulation: React.FC<WorkingSEIRSimulationProps> = ({ 
  disease, 
  populationSize, 
  durationDays, 
  customParameters
}) => {
  const [simulationData, setSimulationData] = useState<SEIRSimulationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate SEIR simulation (in a real app, this would call the backend)
  const runSimulation = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate realistic SEIR simulation data
      const data = generateSEIRSimulationData(disease, populationSize, durationDays, customParameters);
      setSimulationData(data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [disease, populationSize, durationDays, customParameters]);

  const generateSEIRSimulationData = (
    disease: string, 
    populationSize: number, 
    durationDays: number, 
    customParams?: ModelParameters
  ): SEIRSimulationData => {
    // Use custom parameters if provided, otherwise use disease-specific defaults
    let params: any;
    
    if (customParams) {
      params = {
        beta: customParams.beta,
        gamma: customParams.gamma,
        mu: customParams.mu,
        sigma: customParams.sigma || 0.2,
        r0: customParams.r0 || (customParams.beta / customParams.gamma),
        init_prev: customParams.init_prev,
        seasonal_factor: customParams.seasonal_factor,
        peak_weeks: customParams.peak_weeks,
        vaccination_coverage: customParams.vaccination_coverage || 0
      };
    } else {
      // Disease-specific parameters
      const diseaseParams = {
        COVID: { beta: 0.055, gamma: 0.1, mu: 0.0005, sigma: 0.2, r0: 3.0, init_prev: 0.0015, seasonal_factor: 1.3, peak_weeks: [48, 49, 50, 51, 52, 1, 2, 3], vaccination_coverage: 0.143 },
        Flu: { beta: 0.26, gamma: 0.20, mu: 0.0012, sigma: 0.33, r0: 1.3, init_prev: 0.0008, seasonal_factor: 2.1, peak_weeks: [1, 2, 3, 4, 5], vaccination_coverage: 0.106 },
        RSV: { beta: 0.12, gamma: 0.125, mu: 0.0003, sigma: 0.25, r0: 1.5, init_prev: 0.0005, seasonal_factor: 3.5, peak_weeks: [47, 48, 49, 50, 51, 52], vaccination_coverage: 0.06 }
      };
      params = diseaseParams[disease as keyof typeof diseaseParams] || diseaseParams.COVID;
    }
    
    // Generate time series data
    const time = Array.from({ length: durationDays }, (_, i) => i);
    const susceptible = [];
    const exposed = [];
    const infected = [];
    const recovered = [];
    const deaths = [];
    
    // Initial conditions
    const init_prev = params.init_prev || 0.005;
    const vax_coverage = params.vaccination_coverage || 0;
    
    let S = populationSize * (1 - init_prev - vax_coverage);
    let E = populationSize * init_prev * 0.5;
    let I = populationSize * init_prev * 0.5;
    let R = populationSize * vax_coverage;
    let D = 0;
    
    for (let day = 0; day < durationDays; day++) {
      susceptible.push(S);
      exposed.push(E);
      infected.push(I);
      recovered.push(R);
      deaths.push(D);
      
      // Calculate seasonal forcing
      const week = Math.floor(day / 7) % 52;
      const isPeakWeek = params.peak_weeks?.includes(week) || false;
      const seasonalMultiplier = isPeakWeek ? params.seasonal_factor : 1.0;
      
      // SEIR equations with seasonal forcing
      const beta_effective = params.beta * seasonalMultiplier;
      const force_of_infection = beta_effective * I / populationSize;
      const newExposed = force_of_infection * S;
      const newInfectious = params.sigma * E;
      const newRecoveries = params.gamma * I;
      const newDeaths = params.mu * I;
      
      S = Math.max(0, S - newExposed);
      E = Math.max(0, E + newExposed - newInfectious);
      I = Math.max(0, I + newInfectious - newRecoveries - newDeaths);
      R = R + newRecoveries;
      D = D + newDeaths;
    }
    
    const peakInfected = Math.max(...infected);
    const peakInfectedDay = infected.indexOf(peakInfected);
    const totalInfected = recovered[recovered.length - 1] + deaths[deaths.length - 1]; // Cumulative: R + D at end
    const totalDeaths = deaths[deaths.length - 1]; // Final cumulative deaths
    const attackRate = totalInfected / populationSize;
    const caseFatalityRate = totalInfected > 0 ? totalDeaths / totalInfected : 0;
    
    return {
      success: true,
      disease,
      model_type: 'SEIR',
      population_size: populationSize,
      duration_days: durationDays,
      parameters: {
        init_prev: params.init_prev || 0.005,
        beta: params.beta,
        sigma: params.sigma,
        gamma: params.gamma,
        mu: params.mu,
        seasonal_factor: params.seasonal_factor || 1.0,
        peak_weeks: params.peak_weeks || [],
        r0: params.r0,
        incubation_period: params.sigma ? 1 / params.sigma : undefined,
        infectious_period: 1 / params.gamma,
        vaccination_coverage: params.vaccination_coverage || 0
      },
      time_series: {
        time,
        susceptible,
        exposed,
        infected,
        recovered,
        deaths
      },
      summary: {
        peak_infected: peakInfected,
        peak_infected_day: peakInfectedDay,
        total_infected: totalInfected,
        total_deaths: totalDeaths,
        attack_rate: attackRate,
        case_fatality_rate: caseFatalityRate,
        r0: params.r0,
        incubation_period: 1 / params.sigma,
        infectious_period: 1 / params.gamma
      },
      timestamp: new Date().toISOString()
    };
  };

  const getDiseaseColor = (disease: string) => {
    switch (disease) {
      case 'COVID': return '#3b82f6';
      case 'Flu': return '#22c55e';
      case 'RSV': return '#f97316';
      default: return '#6b7280';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="ml-3 text-gray-600">Running SEIR simulation for {disease}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-lg text-red-700">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="font-medium">Error running SEIR simulation for {disease}:</p>
        <p className="text-sm text-center">{error}</p>
      </div>
    );
  }

  if (!simulationData || !simulationData.success) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>No simulation data available for {disease}.</p>
      </div>
    );
  }

  const diseaseColor = getDiseaseColor(disease);

  // Prepare chart data
  const chartData = simulationData.time_series.time.map((t, i) => ({
    day: t,
    susceptible: simulationData.time_series.susceptible[i],
    exposed: simulationData.time_series.exposed?.[i] || 0,
    infected: simulationData.time_series.infected[i],
    recovered: simulationData.time_series.recovered[i],
    deaths: simulationData.time_series.deaths[i],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Activity className="h-5 w-5 text-blue-600 mr-2" />
          <h4 className="text-lg font-semibold text-gray-800">
            {disease} SEIR Simulation Results
          </h4>
        </div>
        <button
          onClick={runSimulation}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
        >
          <Play className="h-4 w-4 inline mr-1" />
          Re-run
        </button>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <Users className="h-4 w-4 text-blue-500 mr-2" />
            <p className="text-sm text-gray-500">Population</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{simulationData.population_size.toLocaleString()}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <Activity className="h-4 w-4 text-red-500 mr-2" />
            <p className="text-sm text-gray-500">Peak Infected</p>
          </div>
          <p className="text-xl font-bold text-red-600">
            {simulationData.summary.peak_infected.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            Day {simulationData.summary.peak_infected_day}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <Heart className="h-4 w-4 text-green-500 mr-2" />
            <p className="text-sm text-gray-500">Attack Rate</p>
          </div>
          <p className="text-xl font-bold text-green-600">
            {(simulationData.summary.attack_rate * 100).toFixed(1)}%
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <Skull className="h-4 w-4 text-gray-500 mr-2" />
            <p className="text-sm text-gray-500">Total Deaths</p>
          </div>
          <p className="text-xl font-bold text-gray-600">
            {simulationData.summary.total_deaths.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            CFR: {(simulationData.summary.case_fatality_rate * 100).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Model Parameters */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h5 className="font-medium text-gray-700 mb-3">Model Parameters</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">R₀:</span>
            <span className="ml-2 font-medium">{simulationData.parameters.r0.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600">β (transmission):</span>
            <span className="ml-2 font-medium">{simulationData.parameters.beta.toFixed(3)}</span>
          </div>
          <div>
            <span className="text-gray-600">γ (recovery):</span>
            <span className="ml-2 font-medium">{simulationData.parameters.gamma.toFixed(3)}</span>
          </div>
          <div>
            <span className="text-gray-600">μ (mortality):</span>
            <span className="ml-2 font-medium">{simulationData.parameters.mu.toFixed(6)}</span>
          </div>
          {simulationData.parameters.sigma && (
            <>
              <div>
                <span className="text-gray-600">σ (incubation):</span>
                <span className="ml-2 font-medium">{simulationData.parameters.sigma.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-gray-600">Incubation Period:</span>
                <span className="ml-2 font-medium">{simulationData.parameters.incubation_period?.toFixed(1)} days</span>
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
            <Area 
              type="monotone" 
              dataKey="exposed" 
              stackId="1" 
              stroke="#ffc658" 
              fill="#ffc658" 
              name="Exposed" 
              fillOpacity={0.8} 
            />
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
    </div>
  );
};





import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Loader2, AlertCircle, Play, BarChart3, Activity, Users, Heart, Skull } from 'lucide-react';

interface SEIRSimulationData {
  success: boolean;
  disease: string;
  model_type: string;
  population_size: number;
  duration_days: number;
  parameters: {
    init_prev: number;
    beta: number;
    sigma?: number;
    gamma: number;
    mu: number;
    seasonal_factor: number;
    peak_weeks: number[];
    r0: number;
    incubation_period?: number;
    infectious_period?: number;
    vaccination_coverage?: number;
  };
  time_series: {
    time: number[];
    susceptible: number[];
    exposed?: number[];
    infected: number[];
    recovered: number[];
    deaths: number[];
  };
  summary: {
    peak_exposed?: number;
    peak_infected: number;
    peak_exposed_day?: number;
    peak_infected_day: number;
    total_infected: number;
    total_deaths: number;
    attack_rate: number;
    case_fatality_rate: number;
    r0: number;
    incubation_period?: number;
    infectious_period?: number;
  };
  timestamp: string;
}

interface ModelParameters {
  init_prev: number;
  beta: number;
  gamma: number;
  mu: number;
  sigma?: number;
  incubation_period?: number;
  infectious_period?: number;
  seasonal_factor: number;
  peak_weeks: number[];
  vaccination_coverage?: number;
  r0?: number;
}

interface WorkingSEIRSimulationProps {
  disease: string;
  populationSize: number;
  durationDays: number;
  customParameters?: ModelParameters;
}

export const WorkingSEIRSimulation: React.FC<WorkingSEIRSimulationProps> = ({ 
  disease, 
  populationSize, 
  durationDays, 
  customParameters
}) => {
  const [simulationData, setSimulationData] = useState<SEIRSimulationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate SEIR simulation (in a real app, this would call the backend)
  const runSimulation = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate realistic SEIR simulation data
      const data = generateSEIRSimulationData(disease, populationSize, durationDays, customParameters);
      setSimulationData(data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [disease, populationSize, durationDays, customParameters]);

  const generateSEIRSimulationData = (
    disease: string, 
    populationSize: number, 
    durationDays: number, 
    customParams?: ModelParameters
  ): SEIRSimulationData => {
    // Use custom parameters if provided, otherwise use disease-specific defaults
    let params: any;
    
    if (customParams) {
      params = {
        beta: customParams.beta,
        gamma: customParams.gamma,
        mu: customParams.mu,
        sigma: customParams.sigma || 0.2,
        r0: customParams.r0 || (customParams.beta / customParams.gamma),
        init_prev: customParams.init_prev,
        seasonal_factor: customParams.seasonal_factor,
        peak_weeks: customParams.peak_weeks,
        vaccination_coverage: customParams.vaccination_coverage || 0
      };
    } else {
      // Disease-specific parameters
      const diseaseParams = {
        COVID: { beta: 0.055, gamma: 0.1, mu: 0.0005, sigma: 0.2, r0: 3.0, init_prev: 0.0015, seasonal_factor: 1.3, peak_weeks: [48, 49, 50, 51, 52, 1, 2, 3], vaccination_coverage: 0.143 },
        Flu: { beta: 0.26, gamma: 0.20, mu: 0.0012, sigma: 0.33, r0: 1.3, init_prev: 0.0008, seasonal_factor: 2.1, peak_weeks: [1, 2, 3, 4, 5], vaccination_coverage: 0.106 },
        RSV: { beta: 0.12, gamma: 0.125, mu: 0.0003, sigma: 0.25, r0: 1.5, init_prev: 0.0005, seasonal_factor: 3.5, peak_weeks: [47, 48, 49, 50, 51, 52], vaccination_coverage: 0.06 }
      };
      params = diseaseParams[disease as keyof typeof diseaseParams] || diseaseParams.COVID;
    }
    
    // Generate time series data
    const time = Array.from({ length: durationDays }, (_, i) => i);
    const susceptible = [];
    const exposed = [];
    const infected = [];
    const recovered = [];
    const deaths = [];
    
    // Initial conditions
    const init_prev = params.init_prev || 0.005;
    const vax_coverage = params.vaccination_coverage || 0;
    
    let S = populationSize * (1 - init_prev - vax_coverage);
    let E = populationSize * init_prev * 0.5;
    let I = populationSize * init_prev * 0.5;
    let R = populationSize * vax_coverage;
    let D = 0;
    
    for (let day = 0; day < durationDays; day++) {
      susceptible.push(S);
      exposed.push(E);
      infected.push(I);
      recovered.push(R);
      deaths.push(D);
      
      // Calculate seasonal forcing
      const week = Math.floor(day / 7) % 52;
      const isPeakWeek = params.peak_weeks?.includes(week) || false;
      const seasonalMultiplier = isPeakWeek ? params.seasonal_factor : 1.0;
      
      // SEIR equations with seasonal forcing
      const beta_effective = params.beta * seasonalMultiplier;
      const force_of_infection = beta_effective * I / populationSize;
      const newExposed = force_of_infection * S;
      const newInfectious = params.sigma * E;
      const newRecoveries = params.gamma * I;
      const newDeaths = params.mu * I;
      
      S = Math.max(0, S - newExposed);
      E = Math.max(0, E + newExposed - newInfectious);
      I = Math.max(0, I + newInfectious - newRecoveries - newDeaths);
      R = R + newRecoveries;
      D = D + newDeaths;
    }
    
    const peakInfected = Math.max(...infected);
    const peakInfectedDay = infected.indexOf(peakInfected);
    const totalInfected = recovered[recovered.length - 1] + deaths[deaths.length - 1]; // Cumulative: R + D at end
    const totalDeaths = deaths[deaths.length - 1]; // Final cumulative deaths
    const attackRate = totalInfected / populationSize;
    const caseFatalityRate = totalInfected > 0 ? totalDeaths / totalInfected : 0;
    
    return {
      success: true,
      disease,
      model_type: 'SEIR',
      population_size: populationSize,
      duration_days: durationDays,
      parameters: {
        init_prev: params.init_prev || 0.005,
        beta: params.beta,
        sigma: params.sigma,
        gamma: params.gamma,
        mu: params.mu,
        seasonal_factor: params.seasonal_factor || 1.0,
        peak_weeks: params.peak_weeks || [],
        r0: params.r0,
        incubation_period: params.sigma ? 1 / params.sigma : undefined,
        infectious_period: 1 / params.gamma,
        vaccination_coverage: params.vaccination_coverage || 0
      },
      time_series: {
        time,
        susceptible,
        exposed,
        infected,
        recovered,
        deaths
      },
      summary: {
        peak_infected: peakInfected,
        peak_infected_day: peakInfectedDay,
        total_infected: totalInfected,
        total_deaths: totalDeaths,
        attack_rate: attackRate,
        case_fatality_rate: caseFatalityRate,
        r0: params.r0,
        incubation_period: 1 / params.sigma,
        infectious_period: 1 / params.gamma
      },
      timestamp: new Date().toISOString()
    };
  };

  const getDiseaseColor = (disease: string) => {
    switch (disease) {
      case 'COVID': return '#3b82f6';
      case 'Flu': return '#22c55e';
      case 'RSV': return '#f97316';
      default: return '#6b7280';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="ml-3 text-gray-600">Running SEIR simulation for {disease}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-lg text-red-700">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="font-medium">Error running SEIR simulation for {disease}:</p>
        <p className="text-sm text-center">{error}</p>
      </div>
    );
  }

  if (!simulationData || !simulationData.success) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>No simulation data available for {disease}.</p>
      </div>
    );
  }

  const diseaseColor = getDiseaseColor(disease);

  // Prepare chart data
  const chartData = simulationData.time_series.time.map((t, i) => ({
    day: t,
    susceptible: simulationData.time_series.susceptible[i],
    exposed: simulationData.time_series.exposed?.[i] || 0,
    infected: simulationData.time_series.infected[i],
    recovered: simulationData.time_series.recovered[i],
    deaths: simulationData.time_series.deaths[i],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Activity className="h-5 w-5 text-blue-600 mr-2" />
          <h4 className="text-lg font-semibold text-gray-800">
            {disease} SEIR Simulation Results
          </h4>
        </div>
        <button
          onClick={runSimulation}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
        >
          <Play className="h-4 w-4 inline mr-1" />
          Re-run
        </button>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <Users className="h-4 w-4 text-blue-500 mr-2" />
            <p className="text-sm text-gray-500">Population</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{simulationData.population_size.toLocaleString()}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <Activity className="h-4 w-4 text-red-500 mr-2" />
            <p className="text-sm text-gray-500">Peak Infected</p>
          </div>
          <p className="text-xl font-bold text-red-600">
            {simulationData.summary.peak_infected.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            Day {simulationData.summary.peak_infected_day}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <Heart className="h-4 w-4 text-green-500 mr-2" />
            <p className="text-sm text-gray-500">Attack Rate</p>
          </div>
          <p className="text-xl font-bold text-green-600">
            {(simulationData.summary.attack_rate * 100).toFixed(1)}%
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <Skull className="h-4 w-4 text-gray-500 mr-2" />
            <p className="text-sm text-gray-500">Total Deaths</p>
          </div>
          <p className="text-xl font-bold text-gray-600">
            {simulationData.summary.total_deaths.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            CFR: {(simulationData.summary.case_fatality_rate * 100).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Model Parameters */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h5 className="font-medium text-gray-700 mb-3">Model Parameters</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">R₀:</span>
            <span className="ml-2 font-medium">{simulationData.parameters.r0.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600">β (transmission):</span>
            <span className="ml-2 font-medium">{simulationData.parameters.beta.toFixed(3)}</span>
          </div>
          <div>
            <span className="text-gray-600">γ (recovery):</span>
            <span className="ml-2 font-medium">{simulationData.parameters.gamma.toFixed(3)}</span>
          </div>
          <div>
            <span className="text-gray-600">μ (mortality):</span>
            <span className="ml-2 font-medium">{simulationData.parameters.mu.toFixed(6)}</span>
          </div>
          {simulationData.parameters.sigma && (
            <>
              <div>
                <span className="text-gray-600">σ (incubation):</span>
                <span className="ml-2 font-medium">{simulationData.parameters.sigma.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-gray-600">Incubation Period:</span>
                <span className="ml-2 font-medium">{simulationData.parameters.incubation_period?.toFixed(1)} days</span>
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
            <Area 
              type="monotone" 
              dataKey="exposed" 
              stackId="1" 
              stroke="#ffc658" 
              fill="#ffc658" 
              name="Exposed" 
              fillOpacity={0.8} 
            />
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
    </div>
  );
};


