// UserParameterEditor.tsx - Component for users to set their own model parameters
// Supports both SIR and SEIR models with real-time validation

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Play, 
  Save, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle, 
  Info,
  BarChart3,
  Users,
  Activity,
  Heart,
  Skull,
  Calendar,
  Shield
} from 'lucide-react';
import { WorkingSEIRSimulation } from './WorkingSEIRSimulation';

interface ModelParameters {
  // Basic parameters
  init_prev: number;
  beta: number;
  gamma: number;
  mu: number;
  
  // SEIR-specific parameters
  sigma?: number;
  incubation_period?: number;
  
  // Seasonal parameters
  seasonal_factor: number;
  peak_weeks: number[];
  
  // Population parameters
  population_size: number;
  duration_days: number;
  
  // Model type
  model_type: 'SIR' | 'SEIR';
  
  // Metadata
  disease_name: string;
  r0?: number;
  vaccination_coverage?: number;

  // Time controls
  start_date?: string;
  stop_date?: string;
  unit?: 'day' | 'week' | 'month';

  // Simulation controls
  n_reps?: number;
  random_seed?: number;

  // Network approximation
  network_n_contacts?: number;
  network_poisson_lam?: number;

  // Vaccination effectiveness
  booster_coverage?: number;
  vax_transmission_eff?: number;
  vax_severity_eff?: number;
  waning_days?: number;
  residual_transmission_floor?: number;
}

interface ParameterValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

interface UserParameterEditorProps {
  onParametersChange?: (parameters: ModelParameters) => void;
  onRunSimulation?: (parameters: ModelParameters) => void;
  onSaveScenario?: (parameters: any) => void;
  initialParameters?: ModelParameters;
  currentScenario?: any;
  showSaveModal?: boolean;
  setShowSaveModal?: (show: boolean) => void;
  saveScenarioName?: string;
  setSaveScenarioName?: (name: string) => void;
  saveScenarioDescription?: string;
  setSaveScenarioDescription?: (description: string) => void;
}

export function UserParameterEditor({ 
  onParametersChange, 
  onRunSimulation, 
  onSaveScenario,
  initialParameters,
  currentScenario,
  showSaveModal,
  setShowSaveModal,
  saveScenarioName,
  setSaveScenarioName,
  saveScenarioDescription,
  setSaveScenarioDescription
}: UserParameterEditorProps) {
  const [parameters, setParameters] = useState<ModelParameters>(initialParameters || getDefaultParameters());
  const [validation, setValidation] = useState<ParameterValidation>({ valid: true, errors: [], warnings: [], suggestions: [] });
  const [activeTab, setActiveTab] = useState<'basic' | 'vaccine' | 'seasonal' | 'population' | 'simulation'>('basic');
  const [showValidation, setShowValidation] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);


  // Update parent component when parameters change
  useEffect(() => {
    if (onParametersChange) {
      onParametersChange(parameters);
    }
  }, [parameters, onParametersChange]);

  // Load scenario parameters when currentScenario changes
  useEffect(() => {
    console.log('UserParameterEditor: currentScenario changed:', currentScenario);
    if (currentScenario && currentScenario.parameters) {
      console.log('Loading scenario parameters into editor:', currentScenario.parameters);
      setParameters(currentScenario.parameters);
    } else if (currentScenario) {
      console.log('Current scenario has no parameters:', currentScenario);
    }
  }, [currentScenario]);

  function getDefaultParameters(): ModelParameters {
    return {
      init_prev: 0.005,
      beta: 0.315,
      gamma: 0.1,
      mu: 0.00126,
      sigma: 0.2,
      incubation_period: 5,
      seasonal_factor: 1.03,
      peak_weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 49, 50, 51, 52],
      population_size: 5000,
      duration_days: 365,
      model_type: 'SEIR',
      disease_name: 'Custom Disease',
      r0: 2.5,
      vaccination_coverage: 0.7,
      // time controls
      start_date: undefined,
      stop_date: undefined,
      unit: 'day',
      // simulation controls
      n_reps: 1,
      random_seed: undefined,
      // network
      network_n_contacts: 10,
      network_poisson_lam: undefined,
      // vaccination effectiveness
      booster_coverage: undefined,
      vax_transmission_eff: undefined,
      vax_severity_eff: undefined,
      waning_days: undefined,
      residual_transmission_floor: undefined
    };
  }

  const parameterDescriptions = {
    init_prev: "Initial prevalence - proportion of population initially infected",
    beta: "Transmission rate - rate of disease spread per contact",
    gamma: "Recovery rate - rate of recovery from infection (1/infectious_period)",
    mu: "Mortality rate - rate of death from infection",
    sigma: "Incubation rate - rate of progression from exposed to infected (1/incubation_period)",
    incubation_period: "Average time from exposure to becoming infectious (days)",
    seasonal_factor: "Seasonal amplification factor during peak periods",
    peak_weeks: "Epidemiological weeks when seasonal factor applies",
    population_size: "Total population size for simulation",
    duration_days: "Simulation duration in days",
    model_type: "Disease model type - SIR or SEIR",
    disease_name: "Name of the disease being modeled",
    r0: "Basic reproduction number - average secondary infections per case",
    vaccination_coverage: "Proportion of population vaccinated"
  };

  const validateParameters = (params: ModelParameters): ParameterValidation => {
    const result: ParameterValidation = { valid: true, errors: [], warnings: [], suggestions: [] };

    // Check required parameters
    const requiredParams = ['init_prev', 'beta', 'gamma', 'mu', 'population_size', 'duration_days'];
    for (const param of requiredParams) {
      if (params[param as keyof ModelParameters] === undefined || params[param as keyof ModelParameters] === null) {
        result.errors.push(`Missing required parameter: ${param}`);
        result.valid = false;
      }
    }

    // Validate parameter ranges
    if (params.init_prev < 0 || params.init_prev > 1) {
      result.errors.push('Initial prevalence must be between 0 and 1');
      result.valid = false;
    }

    if (params.beta < 0) {
      result.errors.push('Transmission rate (beta) must be non-negative');
      result.valid = false;
    }

    if (params.gamma <= 0) {
      result.errors.push('Recovery rate (gamma) must be positive');
      result.valid = false;
    }

    if (params.mu < 0) {
      result.errors.push('Mortality rate (mu) must be non-negative');
      result.valid = false;
    }

    if (params.population_size <= 0) {
      result.errors.push('Population size must be positive');
      result.valid = false;
    }

    if (params.duration_days <= 0) {
      result.errors.push('Duration must be positive');
      result.valid = false;
    }

    // SEIR-specific validation
    if (params.model_type === 'SEIR') {
      if (params.sigma !== undefined && params.sigma <= 0) {
        result.errors.push('Incubation rate (sigma) must be positive');
        result.valid = false;
      }

      if (params.incubation_period !== undefined && params.incubation_period <= 0) {
        result.errors.push('Incubation period must be positive');
        result.valid = false;
      }

    }

    // Check R0 consistency
    const r0 = params.beta / params.gamma;
    if (r0 < 0.5) {
      result.warnings.push(`R0 = ${r0.toFixed(2)} is very low, disease may not spread`);
    } else if (r0 > 5) {
      result.warnings.push(`R0 = ${r0.toFixed(2)} is very high, may cause unrealistic epidemics`);
    }

    // Check incubation period consistency
    if (params.model_type === 'SEIR' && params.sigma && params.incubation_period) {
      const expectedSigma = 1.0 / params.incubation_period;
      if (Math.abs(params.sigma - expectedSigma) > 0.1) {
        result.suggestions.push(
          `Incubation rate (${params.sigma.toFixed(3)}) doesn't match incubation period (${params.incubation_period} days). ` +
          `Expected sigma ≈ ${expectedSigma.toFixed(3)}`
        );
      }
    }

    return result;
  };

  const updateParameter = (key: keyof ModelParameters, value: any) => {
    const newParams = { ...parameters, [key]: value };
    setParameters(newParams);
    
    // Auto-validate
    const validationResult = validateParameters(newParams);
    setValidation(validationResult);
    
    // Notify parent component
    if (onParametersChange) {
      onParametersChange(newParams);
    }
  };

  const resetToDefaults = () => {
    const defaults = getDefaultParameters();
    setParameters(defaults);
    const validationResult = validateParameters(defaults);
    setValidation(validationResult);
    if (onParametersChange) {
      onParametersChange(defaults);
    }
  };

  const loadPreset = (disease: 'COVID' | 'Flu' | 'RSV') => {
    const presets = {
      COVID: {
        ...getDefaultParameters(),
        disease_name: 'COVID-19',
        init_prev: 0.005,
        beta: 0.315,
        gamma: 0.1,
        mu: 0.00126,
        sigma: 0.2,
        incubation_period: 5,
        infectious_period: 10,
        seasonal_factor: 1.03,
        r0: 2.5,
        vaccination_coverage: 0.7
      },
      Flu: {
        ...getDefaultParameters(),
        disease_name: 'Influenza',
        init_prev: 0.002,
        beta: 0.3446,
        gamma: 0.1429,
        mu: 0.000598,
        sigma: 0.5,
        incubation_period: 2,
        infectious_period: 7,
        seasonal_factor: 1.56,
        r0: 1.8,
        vaccination_coverage: 0.45
      },
      RSV: {
        ...getDefaultParameters(),
        disease_name: 'RSV',
        init_prev: 0.0005,
        beta: 0.165,
        gamma: 0.125,
        mu: 0.00011,
        sigma: 0.25,
        incubation_period: 4,
        infectious_period: 8,
        seasonal_factor: 1.91,
        r0: 1.5,
        vaccination_coverage: 0.15
      }
    };

    const preset = presets[disease];
    setParameters(preset);
    const validationResult = validateParameters(preset);
    setValidation(validationResult);
    if (onParametersChange) {
      onParametersChange(preset);
    }
  };

  // Load scenario parameters when currentScenario changes
  useEffect(() => {
    if (currentScenario && currentScenario.parameters) {
      const scenarioParams = currentScenario.parameters;
      setParameters({
        // Basic parameters
        init_prev: scenarioParams.init_prev || 0.001,
        beta: scenarioParams.beta || 0.3,
        gamma: scenarioParams.gamma || 0.1,
        mu: scenarioParams.mu || 0.001,
        sigma: scenarioParams.sigma || 0.2,
        incubation_period: scenarioParams.average_incubation_period || 5,
        
        // Seasonal parameters
        seasonal_factor: scenarioParams.seasonal_factor || 1.0,
        peak_weeks: scenarioParams.peak_weeks || [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51],
        
        // Population parameters
        population_size: scenarioParams.population_size || 10000,
        duration_days: scenarioParams.duration_days || 365,
        
        // Model type
        model_type: scenarioParams.model_type || 'SIR',
        
        // Metadata
        disease_name: scenarioParams.disease_name || 'Custom Disease',
        r0: scenarioParams.basic_reproduction_number,
        vaccination_coverage: scenarioParams.vaccination_coverage,
        
        // Time controls
        start_date: scenarioParams.start_date,
        stop_date: scenarioParams.stop_date,
        unit: scenarioParams.unit,
        random_seed: scenarioParams.random_seed,
        
        // Network parameters
        network_n_contacts: scenarioParams.network_n_contacts,
        network_poisson_lam: scenarioParams.network_poisson_lam,
        
        // Vaccination parameters
        booster_coverage: scenarioParams.booster_coverage,
        vax_transmission_eff: scenarioParams.vax_transmission_eff,
        vax_severity_eff: scenarioParams.vax_severity_eff,
        waning_days: scenarioParams.waning_days,
        residual_transmission_floor: scenarioParams.residual_transmission_floor,
        
        // Simulation parameters
        n_reps: scenarioParams.n_reps || 10
      });
    }
  }, [currentScenario]);

  useEffect(() => {
    const validationResult = validateParameters(parameters);
    setValidation(validationResult);
  }, [parameters]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return (num * 100).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-end space-x-2">
        <button
          onClick={() => setShowValidation(!showValidation)}
          className={`px-3 py-1 text-sm rounded-md ${
            showValidation ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {showValidation ? 'Hide' : 'Show'} Validation
        </button>
        <button
          onClick={resetToDefaults}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          <RotateCcw className="h-4 w-4 inline mr-1" />
          Reset
        </button>
      </div>

      {/* Preset Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={() => loadPreset('COVID')}
          className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
        >
          COVID-19 Preset
        </button>
        <button
          onClick={() => loadPreset('Flu')}
          className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
        >
          Influenza Preset
        </button>
        <button
          onClick={() => loadPreset('RSV')}
          className="px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200"
        >
          RSV Preset
        </button>
      </div>

      {/* Validation Display */}
      {showValidation && (
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center mb-3">
            {validation.valid ? (
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            )}
            <h4 className="font-medium text-gray-800">
              Parameter Validation {validation.valid ? '(Valid)' : '(Invalid)'}
            </h4>
          </div>
          
          {validation.errors.length > 0 && (
            <div className="mb-3">
              <h5 className="font-medium text-red-700 mb-2">Errors:</h5>
              <ul className="text-sm text-red-600 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.warnings.length > 0 && (
            <div className="mb-3">
              <h5 className="font-medium text-yellow-700 mb-2">Warnings:</h5>
              <ul className="text-sm text-yellow-600 space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.suggestions.length > 0 && (
            <div>
              <h5 className="font-medium text-blue-700 mb-2">Suggestions:</h5>
              <ul className="text-sm text-blue-600 space-y-1">
                {validation.suggestions.map((suggestion, index) => (
                  <li key={index}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Parameter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'basic', label: 'Basic', icon: BarChart3 },
          { id: 'vaccine', label: 'Vaccine', icon: Shield },
          { id: 'seasonal', label: 'Seasonal', icon: Calendar },
          { id: 'population', label: 'Population', icon: Users },
          { id: 'simulation', label: 'Simulation', icon: Play }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
              activeTab === id
                ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Basic Parameters */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          {/* Core Configuration */}
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Core Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Disease Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Disease Name
                </label>
                <input
                  type="text"
                  value={parameters.disease_name}
                  onChange={(e) => updateParameter('disease_name', e.target.value)}
                  placeholder="Enter disease name (e.g., COVID-19, Influenza, Measles)"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-white text-gray-900 dark:text-gray-900 placeholder-gray-500 dark:placeholder-gray-600"
                />
              </div>

              {/* Model Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model Type
                </label>
                <select
                  value={parameters.model_type}
                  onChange={(e) => updateParameter('model_type', e.target.value as 'SIR' | 'SEIR')}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 [&>option]:text-gray-900 [&>option]:bg-white"
                >
                  <option value="SIR">SIR (Susceptible-Infected-Recovered)</option>
                  <option value="SEIR">SEIR (Susceptible-Exposed-Infected-Recovered)</option>
                </select>
              </div>

              {/* Time Measured */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time Measured
                </label>
                <select
                  value={parameters.unit}
                  onChange={(e) => updateParameter('unit', e.target.value as 'day' | 'week' | 'month')}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 [&>option]:text-gray-900 [&>option]:bg-white"
                >
                  <option value="day">Days</option>
                  <option value="week">Weeks</option>
                  <option value="month">Months</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={parameters.start_date || ''}
                  onChange={(e) => {
                    const newStartDate = e.target.value || undefined;
                    updateParameter('start_date', newStartDate);
                    // Auto-calculate duration if both dates are set
                    if (newStartDate && parameters.stop_date) {
                      const start = new Date(newStartDate);
                      const stop = new Date(parameters.stop_date);
                      const duration = Math.max(1, Math.ceil((stop.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                      updateParameter('duration_days', duration);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 [&>option]:text-gray-900 [&>option]:bg-white"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={parameters.stop_date || ''}
                  onChange={(e) => {
                    const newStopDate = e.target.value || undefined;
                    updateParameter('stop_date', newStopDate);
                    // Auto-calculate duration if both dates are set
                    if (parameters.start_date && newStopDate) {
                      const start = new Date(parameters.start_date);
                      const stop = new Date(newStopDate);
                      const duration = Math.max(1, Math.ceil((stop.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                      updateParameter('duration_days', duration);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 [&>option]:text-gray-900 [&>option]:bg-white"
                />
              </div>

              {/* Calculated Duration */}
              <div className="bg-blue-50 dark:bg-white p-3 rounded-md border border-gray-300 dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-900">Calculated Duration</div>
                <div className="text-lg font-semibold text-blue-600 dark:text-gray-900">
                  {parameters.duration_days} days
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-700">
                  {parameters.start_date && parameters.stop_date 
                    ? `From ${parameters.start_date} to ${parameters.stop_date}`
                    : 'Set start and end dates to auto-calculate'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Derived Metrics Section */}
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Easy-to-Observe Metrics</h4>
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 <strong>Tip:</strong> Start with the metrics below - these are easier to understand and observe in real outbreaks. The technical parameters will update automatically.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900 flex items-center justify-between">
                  <span>Basic Reproduction Number (R₀)</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Editable</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="number"
                    min={0.1}
                    max={10}
                    step={0.1}
                    value={Number.isFinite(parameters.beta / parameters.gamma) ? (parameters.beta / parameters.gamma) : 2.5}
                    onChange={(e) => {
                      const r0 = parseFloat(e.target.value);
                      if (!isNaN(r0) && r0 > 0) {
                        // Keep gamma fixed, adjust beta: beta = R0 * gamma
                        updateParameter('beta', r0 * parameters.gamma);
                      }
                    }}
                    className="w-28 p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-white text-gray-900 dark:text-gray-900"
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Average number of people one infected person will infect in a fully susceptible population
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900 flex items-center justify-between">
                  <span>Average Infectious Period</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Editable</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="number"
                    min={0.5}
                    max={60}
                    step={0.5}
                    value={Number.isFinite(1 / parameters.gamma) ? (1 / parameters.gamma) : 10}
                    onChange={(e) => {
                      const days = parseFloat(e.target.value);
                      if (!isNaN(days) && days > 0) {
                        // gamma = 1 / infectious_period_days
                        updateParameter('gamma', 1 / days);
                      }
                    }}
                    className="w-28 p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-white text-gray-900 dark:text-gray-900"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-900">days</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  If you know roughly how long people stay infectious (e.g., 14 days), enter it here. We will set recovery rate γ = 1 / days.
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900 flex items-center justify-between">
                  <span>Initial Infected</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Editable</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    step={1}
                    value={Math.round(parameters.init_prev * parameters.population_size)}
                    onChange={(e) => {
                      const initialInfected = parseInt(e.target.value);
                      if (!isNaN(initialInfected) && initialInfected > 0) {
                        // Convert to prevalence: init_prev = initial_infected / population_size
                        updateParameter('init_prev', initialInfected / parameters.population_size);
                      }
                    }}
                    className="w-28 p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-white text-gray-900 dark:text-gray-900"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-900">people</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Number of people initially infected at the start of the simulation
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900 flex items-center justify-between">
                  <span>Case Fatality Rate</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Editable</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.01}
                    value={Number.isFinite(parameters.mu / parameters.gamma) ? (parameters.mu / parameters.gamma * 100) : 0.1}
                    onChange={(e) => {
                      const cfr = parseFloat(e.target.value) / 100; // Convert percentage to decimal
                      if (!isNaN(cfr) && cfr >= 0) {
                        // Keep gamma fixed, adjust mu: mu = CFR * gamma
                        updateParameter('mu', cfr * parameters.gamma);
                      }
                    }}
                    className="w-28 p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-white text-gray-900 dark:text-gray-900"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-900">%</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Percentage of infected people who die from the disease
                </div>
              </div>
              
              {parameters.model_type === 'SEIR' && parameters.sigma && (
                <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                  <div className="text-sm text-gray-600 dark:text-gray-900 flex items-center justify-between">
                    <span>Average Incubation Period</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Editable</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="number"
                      min={0.5}
                      max={30}
                      step={0.5}
                      value={Number.isFinite(1 / parameters.sigma) ? (1 / parameters.sigma) : 5}
                      onChange={(e) => {
                        const days = parseFloat(e.target.value);
                        if (!isNaN(days) && days > 0) {
                          // sigma = 1 / incubation_period_days
                          updateParameter('sigma', 1 / days);
                        }
                      }}
                      className="w-28 p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-white text-gray-900 dark:text-gray-900"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-900">days</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Time from exposure to becoming infectious (e.g., 5 days for COVID-19)
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Technical Parameters Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Technical Parameters</h4>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800">
                  🔧 <strong>Advanced:</strong> These are the mathematical parameters used in the model. They update automatically when you change the metrics above.
                </p>
              </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Initial Prevalence ({formatPercentage(parameters.init_prev)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.1"
                  step="0.001"
                  value={parameters.init_prev}
                  onChange={(e) => updateParameter('init_prev', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {parameterDescriptions.init_prev}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Transmission Rate (β) ({parameters.beta.toFixed(3)})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={parameters.beta}
                  onChange={(e) => updateParameter('beta', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {parameterDescriptions.beta}
                </div>
              </div>

              {/* Incubation Rate (σ) - only show for SEIR model */}
              {parameters.model_type === 'SEIR' && parameters.sigma && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                    Incubation Rate (σ) ({parameters.sigma?.toFixed(3) || 'N/A'})
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.001"
                    value={parameters.sigma || 0.2}
                    onChange={(e) => updateParameter('sigma', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {parameterDescriptions.sigma}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Recovery Rate (γ) ({parameters.gamma.toFixed(3)})
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.001"
                  value={parameters.gamma}
                  onChange={(e) => updateParameter('gamma', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {parameterDescriptions.gamma}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Mortality Rate (μ) ({parameters.mu.toFixed(6)})
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.01"
                  step="0.000001"
                  value={parameters.mu}
                  onChange={(e) => updateParameter('mu', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {parameterDescriptions.mu}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      )}


      {/* Vaccine Parameters */}
      {activeTab === 'vaccine' && (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Vaccination Parameters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Vaccination Coverage ({formatPercentage(parameters.vaccination_coverage || 0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={parameters.vaccination_coverage || 0}
                  onChange={(e) => updateParameter('vaccination_coverage', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Proportion of population vaccinated
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Booster Coverage ({formatPercentage(parameters.booster_coverage || 0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={parameters.booster_coverage || 0}
                  onChange={(e) => updateParameter('booster_coverage', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Proportion with booster shots (subset of vaccinated)
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Transmission Effectiveness ({formatPercentage(parameters.vax_transmission_eff || 0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={parameters.vax_transmission_eff || 0}
                  onChange={(e) => updateParameter('vax_transmission_eff', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  How much vaccination reduces transmission risk
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Severity Effectiveness ({formatPercentage(parameters.vax_severity_eff || 0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={parameters.vax_severity_eff || 0}
                  onChange={(e) => updateParameter('vax_severity_eff', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  How much vaccination reduces severe disease risk
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Waning Days ({parameters.waning_days || 180} days)
                </label>
                <input
                  type="range"
                  min="30"
                  max="730"
                  step="30"
                  value={parameters.waning_days || 180}
                  onChange={(e) => updateParameter('waning_days', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Days until vaccine effectiveness starts waning
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Residual Transmission Floor ({formatPercentage(parameters.residual_transmission_floor || 0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={parameters.residual_transmission_floor || 0}
                  onChange={(e) => updateParameter('residual_transmission_floor', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum protection level after waning (T-cell immunity)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seasonal Parameters */}
      {activeTab === 'seasonal' && (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Seasonal Parameters</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Seasonal Factor ({parameters.seasonal_factor.toFixed(2)}x)
                </label>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={parameters.seasonal_factor}
                  onChange={(e) => updateParameter('seasonal_factor', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {parameterDescriptions.seasonal_factor}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Peak Weeks
                </label>
                <div className="text-sm text-gray-600 mb-2">
                  {parameters.peak_weeks.join(', ')}
                </div>
                <div className="text-xs text-gray-500">
                  {parameterDescriptions.peak_weeks}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Population Parameters */}
      {activeTab === 'population' && (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Population Parameters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Population Size ({formatNumber(parameters.population_size)})
                </label>
                <input
                  type="range"
                  min="1000"
                  max="1000000"
                  step="1000"
                  value={parameters.population_size}
                  onChange={(e) => updateParameter('population_size', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {parameterDescriptions.population_size}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Duration ({parameters.duration_days} days)
                </label>
                <input
                  type="range"
                  min="30"
                  max="1095"
                  step="1"
                  value={parameters.duration_days}
                  onChange={(e) => updateParameter('duration_days', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {parameterDescriptions.duration_days}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Average Number of Contacts ({parameters.network_n_contacts || 10})
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={parameters.network_n_contacts || 10}
                  onChange={(e) => updateParameter('network_n_contacts', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Average contacts per person per day
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Poisson λ (contacts) ({parameters.network_poisson_lam ? parameters.network_poisson_lam.toFixed(1) : '0.0'})
                  <span 
                    className="text-blue-600 cursor-help ml-1" 
                    title="Poisson distribution parameter for contact variability. Higher λ = more contacts. Set to 0 to use fixed average contacts."
                  >
                    ?
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.1"
                  value={parameters.network_poisson_lam || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    updateParameter('network_poisson_lam', value === 0 ? undefined : value);
                  }}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Poisson distribution parameter for contact variability (0 = fixed contacts)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulation Tab */}
      {activeTab === 'simulation' && (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Run Simulation</h4>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="flex items-center mb-2">
                <Info className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800">Simulation Ready</span>
              </div>
              <p className="text-sm text-blue-700">
                Your parameters are configured. Click "Run Simulation" to see the results.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900">Disease</div>
                <div className="font-medium text-gray-900 dark:text-gray-900">{parameters.disease_name}</div>
              </div>
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900">Model Type</div>
                <div className="font-medium text-gray-900 dark:text-gray-900">{parameters.model_type}</div>
              </div>
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900">Population</div>
                <div className="font-medium text-gray-900 dark:text-gray-900">{formatNumber(parameters.population_size)}</div>
              </div>
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900">Duration</div>
                <div className="font-medium text-gray-900 dark:text-gray-900">{parameters.duration_days} days</div>
              </div>
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900">Time Unit</div>
                <div className="font-medium text-gray-900 dark:text-gray-900">{parameters.unit || 'day'}</div>
              </div>
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900">Repetitions</div>
                <div className="font-medium text-gray-900 dark:text-gray-900">{parameters.n_reps || 1}</div>
              </div>
            </div>
            
            {/* Simulation Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">Random Seed</label>
                <input
                  type="number"
                  step={1}
                  value={parameters.random_seed ?? ''}
                  onChange={(e) => updateParameter('random_seed', e.target.value === '' ? undefined : parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 [&>option]:text-gray-900 [&>option]:bg-white"
                  placeholder="Leave empty for random"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Set for reproducible results
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">Repetitions</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={parameters.n_reps ?? 1}
                  onChange={(e) => updateParameter('n_reps', parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 [&>option]:text-gray-900 [&>option]:bg-white"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Number of simulation runs
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">Model Type</label>
                <select
                  value={parameters.model_type || 'SEIR'}
                  onChange={(e) => updateParameter('model_type', e.target.value as any)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 [&>option]:text-gray-900 [&>option]:bg-white"
                >
                  <option value="SIR">SIR (Susceptible-Infected-Recovered)</option>
                  <option value="SEIR">SEIR (Susceptible-Exposed-Infected-Recovered)</option>
                </select>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Disease model type
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Simulation Results */}
      {showSimulation && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">Simulation Results</h4>
            <button
              onClick={() => setShowSimulation(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          <WorkingSEIRSimulation
            disease={parameters.disease_name}
            populationSize={parameters.population_size}
            durationDays={parameters.duration_days}
            customParameters={{
              init_prev: parameters.init_prev,
              beta: parameters.beta,
              gamma: parameters.gamma,
              mu: parameters.mu,
              sigma: parameters.sigma,
              incubation_period: parameters.incubation_period,
              seasonal_factor: parameters.seasonal_factor,
              peak_weeks: parameters.peak_weeks,
              vaccination_coverage: parameters.vaccination_coverage,
              r0: parameters.r0,
              // new overrides for backend
              start_date: parameters.start_date,
              stop_date: parameters.stop_date,
              unit: parameters.unit,
              n_reps: parameters.n_reps,
              random_seed: parameters.random_seed,
              n_contacts: parameters.network_n_contacts,
              n_contacts_poisson_lam: parameters.network_poisson_lam,
              booster_coverage: parameters.booster_coverage,
              vax_transmission_eff: parameters.vax_transmission_eff,
              vax_severity_eff: parameters.vax_severity_eff,
              waning_days: parameters.waning_days,
              residual_transmission_floor: parameters.residual_transmission_floor
            }}
          />
        </div>
      )}
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Play, 
  Save, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle, 
  Info,
  BarChart3,
  Users,
  Activity,
  Heart,
  Skull,
  Calendar,
  Shield
} from 'lucide-react';
import { WorkingSEIRSimulation } from './WorkingSEIRSimulation';

interface ModelParameters {
  // Basic parameters
  init_prev: number;
  beta: number;
  gamma: number;
  mu: number;
  
  // SEIR-specific parameters
  sigma?: number;
  incubation_period?: number;
  
  // Seasonal parameters
  seasonal_factor: number;
  peak_weeks: number[];
  
  // Population parameters
  population_size: number;
  duration_days: number;
  
  // Model type
  model_type: 'SIR' | 'SEIR';
  
  // Metadata
  disease_name: string;
  r0?: number;
  vaccination_coverage?: number;

  // Time controls
  start_date?: string;
  stop_date?: string;
  unit?: 'day' | 'week' | 'month';

  // Simulation controls
  n_reps?: number;
  random_seed?: number;

  // Network approximation
  network_n_contacts?: number;
  network_poisson_lam?: number;

  // Vaccination effectiveness
  booster_coverage?: number;
  vax_transmission_eff?: number;
  vax_severity_eff?: number;
  waning_days?: number;
  residual_transmission_floor?: number;
}

interface ParameterValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

interface UserParameterEditorProps {
  onParametersChange?: (parameters: ModelParameters) => void;
  onRunSimulation?: (parameters: ModelParameters) => void;
  onSaveScenario?: (parameters: any) => void;
  initialParameters?: ModelParameters;
  currentScenario?: any;
  showSaveModal?: boolean;
  setShowSaveModal?: (show: boolean) => void;
  saveScenarioName?: string;
  setSaveScenarioName?: (name: string) => void;
  saveScenarioDescription?: string;
  setSaveScenarioDescription?: (description: string) => void;
}

export function UserParameterEditor({ 
  onParametersChange, 
  onRunSimulation, 
  onSaveScenario,
  initialParameters,
  currentScenario,
  showSaveModal,
  setShowSaveModal,
  saveScenarioName,
  setSaveScenarioName,
  saveScenarioDescription,
  setSaveScenarioDescription
}: UserParameterEditorProps) {
  const [parameters, setParameters] = useState<ModelParameters>(initialParameters || getDefaultParameters());
  const [validation, setValidation] = useState<ParameterValidation>({ valid: true, errors: [], warnings: [], suggestions: [] });
  const [activeTab, setActiveTab] = useState<'basic' | 'vaccine' | 'seasonal' | 'population' | 'simulation'>('basic');
  const [showValidation, setShowValidation] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);


  // Update parent component when parameters change
  useEffect(() => {
    if (onParametersChange) {
      onParametersChange(parameters);
    }
  }, [parameters, onParametersChange]);

  // Load scenario parameters when currentScenario changes
  useEffect(() => {
    console.log('UserParameterEditor: currentScenario changed:', currentScenario);
    if (currentScenario && currentScenario.parameters) {
      console.log('Loading scenario parameters into editor:', currentScenario.parameters);
      setParameters(currentScenario.parameters);
    } else if (currentScenario) {
      console.log('Current scenario has no parameters:', currentScenario);
    }
  }, [currentScenario]);

  function getDefaultParameters(): ModelParameters {
    return {
      init_prev: 0.005,
      beta: 0.315,
      gamma: 0.1,
      mu: 0.00126,
      sigma: 0.2,
      incubation_period: 5,
      seasonal_factor: 1.03,
      peak_weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 49, 50, 51, 52],
      population_size: 5000,
      duration_days: 365,
      model_type: 'SEIR',
      disease_name: 'Custom Disease',
      r0: 2.5,
      vaccination_coverage: 0.7,
      // time controls
      start_date: undefined,
      stop_date: undefined,
      unit: 'day',
      // simulation controls
      n_reps: 1,
      random_seed: undefined,
      // network
      network_n_contacts: 10,
      network_poisson_lam: undefined,
      // vaccination effectiveness
      booster_coverage: undefined,
      vax_transmission_eff: undefined,
      vax_severity_eff: undefined,
      waning_days: undefined,
      residual_transmission_floor: undefined
    };
  }

  const parameterDescriptions = {
    init_prev: "Initial prevalence - proportion of population initially infected",
    beta: "Transmission rate - rate of disease spread per contact",
    gamma: "Recovery rate - rate of recovery from infection (1/infectious_period)",
    mu: "Mortality rate - rate of death from infection",
    sigma: "Incubation rate - rate of progression from exposed to infected (1/incubation_period)",
    incubation_period: "Average time from exposure to becoming infectious (days)",
    seasonal_factor: "Seasonal amplification factor during peak periods",
    peak_weeks: "Epidemiological weeks when seasonal factor applies",
    population_size: "Total population size for simulation",
    duration_days: "Simulation duration in days",
    model_type: "Disease model type - SIR or SEIR",
    disease_name: "Name of the disease being modeled",
    r0: "Basic reproduction number - average secondary infections per case",
    vaccination_coverage: "Proportion of population vaccinated"
  };

  const validateParameters = (params: ModelParameters): ParameterValidation => {
    const result: ParameterValidation = { valid: true, errors: [], warnings: [], suggestions: [] };

    // Check required parameters
    const requiredParams = ['init_prev', 'beta', 'gamma', 'mu', 'population_size', 'duration_days'];
    for (const param of requiredParams) {
      if (params[param as keyof ModelParameters] === undefined || params[param as keyof ModelParameters] === null) {
        result.errors.push(`Missing required parameter: ${param}`);
        result.valid = false;
      }
    }

    // Validate parameter ranges
    if (params.init_prev < 0 || params.init_prev > 1) {
      result.errors.push('Initial prevalence must be between 0 and 1');
      result.valid = false;
    }

    if (params.beta < 0) {
      result.errors.push('Transmission rate (beta) must be non-negative');
      result.valid = false;
    }

    if (params.gamma <= 0) {
      result.errors.push('Recovery rate (gamma) must be positive');
      result.valid = false;
    }

    if (params.mu < 0) {
      result.errors.push('Mortality rate (mu) must be non-negative');
      result.valid = false;
    }

    if (params.population_size <= 0) {
      result.errors.push('Population size must be positive');
      result.valid = false;
    }

    if (params.duration_days <= 0) {
      result.errors.push('Duration must be positive');
      result.valid = false;
    }

    // SEIR-specific validation
    if (params.model_type === 'SEIR') {
      if (params.sigma !== undefined && params.sigma <= 0) {
        result.errors.push('Incubation rate (sigma) must be positive');
        result.valid = false;
      }

      if (params.incubation_period !== undefined && params.incubation_period <= 0) {
        result.errors.push('Incubation period must be positive');
        result.valid = false;
      }

    }

    // Check R0 consistency
    const r0 = params.beta / params.gamma;
    if (r0 < 0.5) {
      result.warnings.push(`R0 = ${r0.toFixed(2)} is very low, disease may not spread`);
    } else if (r0 > 5) {
      result.warnings.push(`R0 = ${r0.toFixed(2)} is very high, may cause unrealistic epidemics`);
    }

    // Check incubation period consistency
    if (params.model_type === 'SEIR' && params.sigma && params.incubation_period) {
      const expectedSigma = 1.0 / params.incubation_period;
      if (Math.abs(params.sigma - expectedSigma) > 0.1) {
        result.suggestions.push(
          `Incubation rate (${params.sigma.toFixed(3)}) doesn't match incubation period (${params.incubation_period} days). ` +
          `Expected sigma ≈ ${expectedSigma.toFixed(3)}`
        );
      }
    }

    return result;
  };

  const updateParameter = (key: keyof ModelParameters, value: any) => {
    const newParams = { ...parameters, [key]: value };
    setParameters(newParams);
    
    // Auto-validate
    const validationResult = validateParameters(newParams);
    setValidation(validationResult);
    
    // Notify parent component
    if (onParametersChange) {
      onParametersChange(newParams);
    }
  };

  const resetToDefaults = () => {
    const defaults = getDefaultParameters();
    setParameters(defaults);
    const validationResult = validateParameters(defaults);
    setValidation(validationResult);
    if (onParametersChange) {
      onParametersChange(defaults);
    }
  };

  const loadPreset = (disease: 'COVID' | 'Flu' | 'RSV') => {
    const presets = {
      COVID: {
        ...getDefaultParameters(),
        disease_name: 'COVID-19',
        init_prev: 0.005,
        beta: 0.315,
        gamma: 0.1,
        mu: 0.00126,
        sigma: 0.2,
        incubation_period: 5,
        infectious_period: 10,
        seasonal_factor: 1.03,
        r0: 2.5,
        vaccination_coverage: 0.7
      },
      Flu: {
        ...getDefaultParameters(),
        disease_name: 'Influenza',
        init_prev: 0.002,
        beta: 0.3446,
        gamma: 0.1429,
        mu: 0.000598,
        sigma: 0.5,
        incubation_period: 2,
        infectious_period: 7,
        seasonal_factor: 1.56,
        r0: 1.8,
        vaccination_coverage: 0.45
      },
      RSV: {
        ...getDefaultParameters(),
        disease_name: 'RSV',
        init_prev: 0.0005,
        beta: 0.165,
        gamma: 0.125,
        mu: 0.00011,
        sigma: 0.25,
        incubation_period: 4,
        infectious_period: 8,
        seasonal_factor: 1.91,
        r0: 1.5,
        vaccination_coverage: 0.15
      }
    };

    const preset = presets[disease];
    setParameters(preset);
    const validationResult = validateParameters(preset);
    setValidation(validationResult);
    if (onParametersChange) {
      onParametersChange(preset);
    }
  };

  // Load scenario parameters when currentScenario changes
  useEffect(() => {
    if (currentScenario && currentScenario.parameters) {
      const scenarioParams = currentScenario.parameters;
      setParameters({
        // Basic parameters
        init_prev: scenarioParams.init_prev || 0.001,
        beta: scenarioParams.beta || 0.3,
        gamma: scenarioParams.gamma || 0.1,
        mu: scenarioParams.mu || 0.001,
        sigma: scenarioParams.sigma || 0.2,
        incubation_period: scenarioParams.average_incubation_period || 5,
        
        // Seasonal parameters
        seasonal_factor: scenarioParams.seasonal_factor || 1.0,
        peak_weeks: scenarioParams.peak_weeks || [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51],
        
        // Population parameters
        population_size: scenarioParams.population_size || 10000,
        duration_days: scenarioParams.duration_days || 365,
        
        // Model type
        model_type: scenarioParams.model_type || 'SIR',
        
        // Metadata
        disease_name: scenarioParams.disease_name || 'Custom Disease',
        r0: scenarioParams.basic_reproduction_number,
        vaccination_coverage: scenarioParams.vaccination_coverage,
        
        // Time controls
        start_date: scenarioParams.start_date,
        stop_date: scenarioParams.stop_date,
        unit: scenarioParams.unit,
        random_seed: scenarioParams.random_seed,
        
        // Network parameters
        network_n_contacts: scenarioParams.network_n_contacts,
        network_poisson_lam: scenarioParams.network_poisson_lam,
        
        // Vaccination parameters
        booster_coverage: scenarioParams.booster_coverage,
        vax_transmission_eff: scenarioParams.vax_transmission_eff,
        vax_severity_eff: scenarioParams.vax_severity_eff,
        waning_days: scenarioParams.waning_days,
        residual_transmission_floor: scenarioParams.residual_transmission_floor,
        
        // Simulation parameters
        n_reps: scenarioParams.n_reps || 10
      });
    }
  }, [currentScenario]);

  useEffect(() => {
    const validationResult = validateParameters(parameters);
    setValidation(validationResult);
  }, [parameters]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return (num * 100).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-end space-x-2">
        <button
          onClick={() => setShowValidation(!showValidation)}
          className={`px-3 py-1 text-sm rounded-md ${
            showValidation ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {showValidation ? 'Hide' : 'Show'} Validation
        </button>
        <button
          onClick={resetToDefaults}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          <RotateCcw className="h-4 w-4 inline mr-1" />
          Reset
        </button>
      </div>

      {/* Preset Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={() => loadPreset('COVID')}
          className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
        >
          COVID-19 Preset
        </button>
        <button
          onClick={() => loadPreset('Flu')}
          className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
        >
          Influenza Preset
        </button>
        <button
          onClick={() => loadPreset('RSV')}
          className="px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200"
        >
          RSV Preset
        </button>
      </div>

      {/* Validation Display */}
      {showValidation && (
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center mb-3">
            {validation.valid ? (
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            )}
            <h4 className="font-medium text-gray-800">
              Parameter Validation {validation.valid ? '(Valid)' : '(Invalid)'}
            </h4>
          </div>
          
          {validation.errors.length > 0 && (
            <div className="mb-3">
              <h5 className="font-medium text-red-700 mb-2">Errors:</h5>
              <ul className="text-sm text-red-600 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.warnings.length > 0 && (
            <div className="mb-3">
              <h5 className="font-medium text-yellow-700 mb-2">Warnings:</h5>
              <ul className="text-sm text-yellow-600 space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.suggestions.length > 0 && (
            <div>
              <h5 className="font-medium text-blue-700 mb-2">Suggestions:</h5>
              <ul className="text-sm text-blue-600 space-y-1">
                {validation.suggestions.map((suggestion, index) => (
                  <li key={index}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Parameter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'basic', label: 'Basic', icon: BarChart3 },
          { id: 'vaccine', label: 'Vaccine', icon: Shield },
          { id: 'seasonal', label: 'Seasonal', icon: Calendar },
          { id: 'population', label: 'Population', icon: Users },
          { id: 'simulation', label: 'Simulation', icon: Play }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
              activeTab === id
                ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Basic Parameters */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          {/* Core Configuration */}
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Core Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Disease Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Disease Name
                </label>
                <input
                  type="text"
                  value={parameters.disease_name}
                  onChange={(e) => updateParameter('disease_name', e.target.value)}
                  placeholder="Enter disease name (e.g., COVID-19, Influenza, Measles)"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-white text-gray-900 dark:text-gray-900 placeholder-gray-500 dark:placeholder-gray-600"
                />
              </div>

              {/* Model Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model Type
                </label>
                <select
                  value={parameters.model_type}
                  onChange={(e) => updateParameter('model_type', e.target.value as 'SIR' | 'SEIR')}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 [&>option]:text-gray-900 [&>option]:bg-white"
                >
                  <option value="SIR">SIR (Susceptible-Infected-Recovered)</option>
                  <option value="SEIR">SEIR (Susceptible-Exposed-Infected-Recovered)</option>
                </select>
              </div>

              {/* Time Measured */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time Measured
                </label>
                <select
                  value={parameters.unit}
                  onChange={(e) => updateParameter('unit', e.target.value as 'day' | 'week' | 'month')}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 [&>option]:text-gray-900 [&>option]:bg-white"
                >
                  <option value="day">Days</option>
                  <option value="week">Weeks</option>
                  <option value="month">Months</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={parameters.start_date || ''}
                  onChange={(e) => {
                    const newStartDate = e.target.value || undefined;
                    updateParameter('start_date', newStartDate);
                    // Auto-calculate duration if both dates are set
                    if (newStartDate && parameters.stop_date) {
                      const start = new Date(newStartDate);
                      const stop = new Date(parameters.stop_date);
                      const duration = Math.max(1, Math.ceil((stop.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                      updateParameter('duration_days', duration);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 [&>option]:text-gray-900 [&>option]:bg-white"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={parameters.stop_date || ''}
                  onChange={(e) => {
                    const newStopDate = e.target.value || undefined;
                    updateParameter('stop_date', newStopDate);
                    // Auto-calculate duration if both dates are set
                    if (parameters.start_date && newStopDate) {
                      const start = new Date(parameters.start_date);
                      const stop = new Date(newStopDate);
                      const duration = Math.max(1, Math.ceil((stop.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                      updateParameter('duration_days', duration);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 [&>option]:text-gray-900 [&>option]:bg-white"
                />
              </div>

              {/* Calculated Duration */}
              <div className="bg-blue-50 dark:bg-white p-3 rounded-md border border-gray-300 dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-900">Calculated Duration</div>
                <div className="text-lg font-semibold text-blue-600 dark:text-gray-900">
                  {parameters.duration_days} days
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-700">
                  {parameters.start_date && parameters.stop_date 
                    ? `From ${parameters.start_date} to ${parameters.stop_date}`
                    : 'Set start and end dates to auto-calculate'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Derived Metrics Section */}
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Easy-to-Observe Metrics</h4>
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 <strong>Tip:</strong> Start with the metrics below - these are easier to understand and observe in real outbreaks. The technical parameters will update automatically.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900 flex items-center justify-between">
                  <span>Basic Reproduction Number (R₀)</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Editable</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="number"
                    min={0.1}
                    max={10}
                    step={0.1}
                    value={Number.isFinite(parameters.beta / parameters.gamma) ? (parameters.beta / parameters.gamma) : 2.5}
                    onChange={(e) => {
                      const r0 = parseFloat(e.target.value);
                      if (!isNaN(r0) && r0 > 0) {
                        // Keep gamma fixed, adjust beta: beta = R0 * gamma
                        updateParameter('beta', r0 * parameters.gamma);
                      }
                    }}
                    className="w-28 p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-white text-gray-900 dark:text-gray-900"
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Average number of people one infected person will infect in a fully susceptible population
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900 flex items-center justify-between">
                  <span>Average Infectious Period</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Editable</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="number"
                    min={0.5}
                    max={60}
                    step={0.5}
                    value={Number.isFinite(1 / parameters.gamma) ? (1 / parameters.gamma) : 10}
                    onChange={(e) => {
                      const days = parseFloat(e.target.value);
                      if (!isNaN(days) && days > 0) {
                        // gamma = 1 / infectious_period_days
                        updateParameter('gamma', 1 / days);
                      }
                    }}
                    className="w-28 p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-white text-gray-900 dark:text-gray-900"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-900">days</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  If you know roughly how long people stay infectious (e.g., 14 days), enter it here. We will set recovery rate γ = 1 / days.
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900 flex items-center justify-between">
                  <span>Initial Infected</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Editable</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    step={1}
                    value={Math.round(parameters.init_prev * parameters.population_size)}
                    onChange={(e) => {
                      const initialInfected = parseInt(e.target.value);
                      if (!isNaN(initialInfected) && initialInfected > 0) {
                        // Convert to prevalence: init_prev = initial_infected / population_size
                        updateParameter('init_prev', initialInfected / parameters.population_size);
                      }
                    }}
                    className="w-28 p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-white text-gray-900 dark:text-gray-900"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-900">people</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Number of people initially infected at the start of the simulation
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900 flex items-center justify-between">
                  <span>Case Fatality Rate</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Editable</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.01}
                    value={Number.isFinite(parameters.mu / parameters.gamma) ? (parameters.mu / parameters.gamma * 100) : 0.1}
                    onChange={(e) => {
                      const cfr = parseFloat(e.target.value) / 100; // Convert percentage to decimal
                      if (!isNaN(cfr) && cfr >= 0) {
                        // Keep gamma fixed, adjust mu: mu = CFR * gamma
                        updateParameter('mu', cfr * parameters.gamma);
                      }
                    }}
                    className="w-28 p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-white text-gray-900 dark:text-gray-900"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-900">%</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Percentage of infected people who die from the disease
                </div>
              </div>
              
              {parameters.model_type === 'SEIR' && parameters.sigma && (
                <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                  <div className="text-sm text-gray-600 dark:text-gray-900 flex items-center justify-between">
                    <span>Average Incubation Period</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Editable</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="number"
                      min={0.5}
                      max={30}
                      step={0.5}
                      value={Number.isFinite(1 / parameters.sigma) ? (1 / parameters.sigma) : 5}
                      onChange={(e) => {
                        const days = parseFloat(e.target.value);
                        if (!isNaN(days) && days > 0) {
                          // sigma = 1 / incubation_period_days
                          updateParameter('sigma', 1 / days);
                        }
                      }}
                      className="w-28 p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-white text-gray-900 dark:text-gray-900"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-900">days</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Time from exposure to becoming infectious (e.g., 5 days for COVID-19)
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Technical Parameters Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Technical Parameters</h4>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800">
                  🔧 <strong>Advanced:</strong> These are the mathematical parameters used in the model. They update automatically when you change the metrics above.
                </p>
              </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Initial Prevalence ({formatPercentage(parameters.init_prev)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.1"
                  step="0.001"
                  value={parameters.init_prev}
                  onChange={(e) => updateParameter('init_prev', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {parameterDescriptions.init_prev}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Transmission Rate (β) ({parameters.beta.toFixed(3)})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={parameters.beta}
                  onChange={(e) => updateParameter('beta', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {parameterDescriptions.beta}
                </div>
              </div>

              {/* Incubation Rate (σ) - only show for SEIR model */}
              {parameters.model_type === 'SEIR' && parameters.sigma && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                    Incubation Rate (σ) ({parameters.sigma?.toFixed(3) || 'N/A'})
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.001"
                    value={parameters.sigma || 0.2}
                    onChange={(e) => updateParameter('sigma', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {parameterDescriptions.sigma}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Recovery Rate (γ) ({parameters.gamma.toFixed(3)})
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.001"
                  value={parameters.gamma}
                  onChange={(e) => updateParameter('gamma', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {parameterDescriptions.gamma}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Mortality Rate (μ) ({parameters.mu.toFixed(6)})
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.01"
                  step="0.000001"
                  value={parameters.mu}
                  onChange={(e) => updateParameter('mu', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {parameterDescriptions.mu}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      )}


      {/* Vaccine Parameters */}
      {activeTab === 'vaccine' && (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Vaccination Parameters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Vaccination Coverage ({formatPercentage(parameters.vaccination_coverage || 0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={parameters.vaccination_coverage || 0}
                  onChange={(e) => updateParameter('vaccination_coverage', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Proportion of population vaccinated
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Booster Coverage ({formatPercentage(parameters.booster_coverage || 0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={parameters.booster_coverage || 0}
                  onChange={(e) => updateParameter('booster_coverage', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Proportion with booster shots (subset of vaccinated)
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Transmission Effectiveness ({formatPercentage(parameters.vax_transmission_eff || 0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={parameters.vax_transmission_eff || 0}
                  onChange={(e) => updateParameter('vax_transmission_eff', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  How much vaccination reduces transmission risk
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Severity Effectiveness ({formatPercentage(parameters.vax_severity_eff || 0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={parameters.vax_severity_eff || 0}
                  onChange={(e) => updateParameter('vax_severity_eff', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  How much vaccination reduces severe disease risk
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Waning Days ({parameters.waning_days || 180} days)
                </label>
                <input
                  type="range"
                  min="30"
                  max="730"
                  step="30"
                  value={parameters.waning_days || 180}
                  onChange={(e) => updateParameter('waning_days', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Days until vaccine effectiveness starts waning
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Residual Transmission Floor ({formatPercentage(parameters.residual_transmission_floor || 0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={parameters.residual_transmission_floor || 0}
                  onChange={(e) => updateParameter('residual_transmission_floor', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum protection level after waning (T-cell immunity)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seasonal Parameters */}
      {activeTab === 'seasonal' && (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Seasonal Parameters</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Seasonal Factor ({parameters.seasonal_factor.toFixed(2)}x)
                </label>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={parameters.seasonal_factor}
                  onChange={(e) => updateParameter('seasonal_factor', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {parameterDescriptions.seasonal_factor}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Peak Weeks
                </label>
                <div className="text-sm text-gray-600 mb-2">
                  {parameters.peak_weeks.join(', ')}
                </div>
                <div className="text-xs text-gray-500">
                  {parameterDescriptions.peak_weeks}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Population Parameters */}
      {activeTab === 'population' && (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Population Parameters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Population Size ({formatNumber(parameters.population_size)})
                </label>
                <input
                  type="range"
                  min="1000"
                  max="1000000"
                  step="1000"
                  value={parameters.population_size}
                  onChange={(e) => updateParameter('population_size', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {parameterDescriptions.population_size}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Duration ({parameters.duration_days} days)
                </label>
                <input
                  type="range"
                  min="30"
                  max="1095"
                  step="1"
                  value={parameters.duration_days}
                  onChange={(e) => updateParameter('duration_days', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {parameterDescriptions.duration_days}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Average Number of Contacts ({parameters.network_n_contacts || 10})
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={parameters.network_n_contacts || 10}
                  onChange={(e) => updateParameter('network_n_contacts', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Average contacts per person per day
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">
                  Poisson λ (contacts) ({parameters.network_poisson_lam ? parameters.network_poisson_lam.toFixed(1) : '0.0'})
                  <span 
                    className="text-blue-600 cursor-help ml-1" 
                    title="Poisson distribution parameter for contact variability. Higher λ = more contacts. Set to 0 to use fixed average contacts."
                  >
                    ?
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.1"
                  value={parameters.network_poisson_lam || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    updateParameter('network_poisson_lam', value === 0 ? undefined : value);
                  }}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Poisson distribution parameter for contact variability (0 = fixed contacts)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulation Tab */}
      {activeTab === 'simulation' && (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Run Simulation</h4>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="flex items-center mb-2">
                <Info className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800">Simulation Ready</span>
              </div>
              <p className="text-sm text-blue-700">
                Your parameters are configured. Click "Run Simulation" to see the results.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900">Disease</div>
                <div className="font-medium text-gray-900 dark:text-gray-900">{parameters.disease_name}</div>
              </div>
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900">Model Type</div>
                <div className="font-medium text-gray-900 dark:text-gray-900">{parameters.model_type}</div>
              </div>
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900">Population</div>
                <div className="font-medium text-gray-900 dark:text-gray-900">{formatNumber(parameters.population_size)}</div>
              </div>
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900">Duration</div>
                <div className="font-medium text-gray-900 dark:text-gray-900">{parameters.duration_days} days</div>
              </div>
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900">Time Unit</div>
                <div className="font-medium text-gray-900 dark:text-gray-900">{parameters.unit || 'day'}</div>
              </div>
              <div className="bg-gray-50 dark:bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-900">Repetitions</div>
                <div className="font-medium text-gray-900 dark:text-gray-900">{parameters.n_reps || 1}</div>
              </div>
            </div>
            
            {/* Simulation Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">Random Seed</label>
                <input
                  type="number"
                  step={1}
                  value={parameters.random_seed ?? ''}
                  onChange={(e) => updateParameter('random_seed', e.target.value === '' ? undefined : parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 [&>option]:text-gray-900 [&>option]:bg-white"
                  placeholder="Leave empty for random"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Set for reproducible results
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">Repetitions</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={parameters.n_reps ?? 1}
                  onChange={(e) => updateParameter('n_reps', parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 [&>option]:text-gray-900 [&>option]:bg-white"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Number of simulation runs
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-900 mb-1">Model Type</label>
                <select
                  value={parameters.model_type || 'SEIR'}
                  onChange={(e) => updateParameter('model_type', e.target.value as any)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 [&>option]:text-gray-900 [&>option]:bg-white"
                >
                  <option value="SIR">SIR (Susceptible-Infected-Recovered)</option>
                  <option value="SEIR">SEIR (Susceptible-Exposed-Infected-Recovered)</option>
                </select>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Disease model type
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Simulation Results */}
      {showSimulation && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">Simulation Results</h4>
            <button
              onClick={() => setShowSimulation(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          <WorkingSEIRSimulation
            disease={parameters.disease_name}
            populationSize={parameters.population_size}
            durationDays={parameters.duration_days}
            customParameters={{
              init_prev: parameters.init_prev,
              beta: parameters.beta,
              gamma: parameters.gamma,
              mu: parameters.mu,
              sigma: parameters.sigma,
              incubation_period: parameters.incubation_period,
              seasonal_factor: parameters.seasonal_factor,
              peak_weeks: parameters.peak_weeks,
              vaccination_coverage: parameters.vaccination_coverage,
              r0: parameters.r0,
              // new overrides for backend
              start_date: parameters.start_date,
              stop_date: parameters.stop_date,
              unit: parameters.unit,
              n_reps: parameters.n_reps,
              random_seed: parameters.random_seed,
              n_contacts: parameters.network_n_contacts,
              n_contacts_poisson_lam: parameters.network_poisson_lam,
              booster_coverage: parameters.booster_coverage,
              vax_transmission_eff: parameters.vax_transmission_eff,
              vax_severity_eff: parameters.vax_severity_eff,
              waning_days: parameters.waning_days,
              residual_transmission_floor: parameters.residual_transmission_floor
            }}
          />
        </div>
      )}
    </div>
  );
}






