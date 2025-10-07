// PierceCountyParameterInspector.tsx - Interactive component for Pierce County-calibrated parameters
// Shows the real Pierce County population and disease-specific parameters

import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Users, 
  TrendingUp, 
  Heart, 
  Skull, 
  Calendar,
  BarChart3,
  Info,
  AlertCircle,
  Shield,
  Activity
} from 'lucide-react';

interface PierceCountyDemographics {
  total_population: number;
  age_groups: {
    "0-17": { population: number; percentage: number };
    "18-64": { population: number; percentage: number };
    "65+": { population: number; percentage: number };
  };
  household_size: number;
  population_density: number;
  urban_percentage: number;
}

interface PierceCountyDiseaseParameters {
  init_prev: number | string;
  beta: number | string;
  recovery_rate: number | string;
  mortality_rate: number | string;
  seasonal_factor: number | string;
  peak_weeks: number[] | string;
  r0: number | string;
  vaccination_coverage: number | string;
  expected_annual_cases: number | string;
  expected_annual_deaths: number | string;
  age_specific_risk: {
    "0-17": number | string;
    "18-64": number | string;
    "65+": number | string;
  };
}

interface PierceCountyAnalysis {
  disease: string;
  parameters: PierceCountyDiseaseParameters;
  demographics: PierceCountyDemographics;
  interpretation: {
    r0_interpretation: string;
    severity_interpretation: string;
    seasonality_interpretation: string;
    vaccination_impact: string;
  };
}

export function PierceCountyParameterInspector() {
  const [selectedDisease, setSelectedDisease] = useState<'COVID' | 'Flu' | 'RSV'>('COVID');
  const [analysis, setAnalysis] = useState<PierceCountyAnalysis | null>(null);
  const [demographics, setDemographics] = useState<PierceCountyDemographics | null>(null);

  // Pierce County demographics (2024)
  const pierceCountyDemographics: PierceCountyDemographics = {
    total_population: 928696,
    age_groups: {
      "0-17": { population: 185739, percentage: 20.0 },
      "18-64": { population: 557218, percentage: 60.0 },
      "65+": { population: 185739, percentage: 20.0 }
    },
    household_size: 2.4,
    population_density: 570,
    urban_percentage: 85.0
  };

  // Pierce County-calibrated disease parameters
  // Data sources: WA DOH Respiratory Illness Dashboard, CDC Surveillance, Pierce County vaccination data
  // For full documentation see: Docs/Pierce_County_Disease_Parameters_2025.md
  const pierceCountyDiseaseParams = {
    COVID: {
      init_prev: 0.0015, // 0.15% initial prevalence (endemic low circulation)
      beta: 0.35, // Transmission rate for Omicron variants
      recovery_rate: 0.10, // 10 days infectious period (0.10 = 10% recover per day)
      mortality_rate: 0.0005, // 0.05% case fatality rate (2024-2025, post-vaccination era)
      seasonal_factor: 1.3, // Moderate winter seasonality
      peak_weeks: [48, 49, 50, 51, 52, 1, 2, 3], // Dec-mid-Jan (weeks 48-3)
      r0: 3.0, // R0 for Omicron variants (range 2.5-3.5)
      vaccination_coverage: 0.14, // 14.0% (WA DOH Pierce County 2024-2025)
      expected_annual_cases: 46000, // ~5% attack rate (endemic phase)
      expected_annual_deaths: 23, // 0.05% CFR
      age_specific_risk: { "0-17": 0.5, "18-64": 1.0, "65+": 3.5 } // Relative risk by age
    },
    Flu: {
      init_prev: 0.0008, // 0.08% initial prevalence (seasonal start)
      beta: 0.26, // Transmission rate for seasonal influenza
      recovery_rate: 0.20, // 5 days infectious period (0.20 = 20% recover per day)
      mortality_rate: 0.0012, // 0.12% CFR (2024-2025 severe season, H1N1/H3N2)
      seasonal_factor: 2.1, // Strong winter seasonality
      peak_weeks: [1, 2, 3, 4, 5], // Jan-early Feb (weeks 1-5)
      r0: 1.3, // R0 for seasonal influenza (range 1.2-1.4)
      vaccination_coverage: 0.265, // 26.5% (WA DOH Pierce County 2024-2025)
      expected_annual_cases: 74000, // ~8% attack rate (typical seasonal flu)
      expected_annual_deaths: 89, // Extrapolated from WA State 422 deaths
      age_specific_risk: { "0-17": 1.2, "18-64": 1.0, "65+": 4.0 } // Elderly highest risk
    },
    RSV: {
      init_prev: 0.0005, // 0.05% initial prevalence (very seasonal)
      beta: 0.12, // Lower transmission rate, shorter window
      recovery_rate: 0.125, // 8 days infectious period (0.125 = 12.5% recover per day)
      mortality_rate: 0.0003, // 0.03% CFR (primarily infants and elderly)
      seasonal_factor: 3.5, // Very strong winter seasonality (most seasonal)
      peak_weeks: [47, 48, 49, 50, 51, 52], // Mid-Nov-Dec (weeks 47-52)
      r0: 1.5, // R0 for RSV (range 1.2-1.8)
      vaccination_coverage: 0.15, // 15% overall (46.1% elderly 75+, new vaccine)
      expected_annual_cases: 23000, // ~2.5% attack rate (pediatric and elderly focus)
      expected_annual_deaths: 7, // Very low mortality, primarily infants/elderly
      age_specific_risk: { "0-17": 5.0, "18-64": 0.3, "65+": 3.0 } // Children highest risk
    }
  };

  const getInterpretation = (params: PierceCountyDiseaseParameters, disease: string) => {
    // R0 interpretation
    let r0_interpretation = '';
    if (params.r0 < 1) {
      r0_interpretation = 'Disease will die out naturally';
    } else if (params.r0 < 2) {
      r0_interpretation = 'Moderate transmission potential';
    } else {
      r0_interpretation = 'High transmission potential - epidemic potential';
    }

    // Severity interpretation
    let severity_interpretation = '';
    const cfr = params.mortality_rate / params.recovery_rate;
    if (cfr < 0.01) {
      severity_interpretation = 'Low severity disease';
    } else if (cfr < 0.05) {
      severity_interpretation = 'Medium severity disease';
    } else {
      severity_interpretation = 'High severity disease';
    }

    // Seasonality interpretation
    let seasonality_interpretation = '';
    if (params.seasonal_factor < 1.2) {
      seasonality_interpretation = 'Weak seasonality';
    } else if (params.seasonal_factor < 1.5) {
      seasonality_interpretation = 'Moderate seasonality';
    } else {
      seasonality_interpretation = 'Strong seasonality';
    }

    // Vaccination impact
    let vaccination_impact = '';
    if (params.vaccination_coverage > 0.6) {
      vaccination_impact = 'High vaccination coverage - significant protection';
    } else if (params.vaccination_coverage > 0.3) {
      vaccination_impact = 'Moderate vaccination coverage - some protection';
    } else {
      vaccination_impact = 'Low vaccination coverage - limited protection';
    }

    return {
      r0_interpretation,
      severity_interpretation,
      seasonality_interpretation,
      vaccination_impact
    };
  };

  const analyzeDisease = (disease: string) => {
    const params = pierceCountyDiseaseParams[disease as keyof typeof pierceCountyDiseaseParams];
    const interpretation = getInterpretation(params, disease);

    setAnalysis({
      disease,
      parameters: params,
      demographics: pierceCountyDemographics,
      interpretation
    });
  };

  useEffect(() => {
    setDemographics(pierceCountyDemographics);
    analyzeDisease(selectedDisease);
  }, [selectedDisease]);

  const getDiseaseColor = (disease: string) => {
    const colors = {
      COVID: 'text-blue-600',
      Flu: 'text-green-600',
      RSV: 'text-orange-600'
    };
    return colors[disease as keyof typeof colors] || 'text-black';
  };

  const getDiseaseBgColor = (disease: string) => {
    const colors = {
      COVID: 'bg-blue-50 border-blue-200',
      Flu: 'bg-green-50 border-green-200',
      RSV: 'bg-orange-50 border-orange-200'
    };
    return colors[disease as keyof typeof colors] || 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
  };

  const formatNumber = (num: number | string) => {
    if (typeof num === 'string' && num === 'XXX') return 'XXX';
    return new Intl.NumberFormat('en-US').format(Number(num));
  };

  const formatPercentage = (num: number | string) => {
    if (typeof num === 'string' && num === 'XXX') return 'XXX';
    return (Number(num) * 100).toFixed(2);
  };

  const formatDecimal = (num: number | string, decimals: number = 3) => {
    if (typeof num === 'string' && num === 'XXX') return 'XXX';
    return Number(num).toFixed(decimals);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <MapPin className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Pierce County Disease Model Parameters</h3>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Real Pierce County data & calibrated parameters
        </div>
      </div>

      {/* Pierce County Demographics */}
      <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Pierce County Demographics</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{formatNumber(demographics?.total_population || 0)}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Population</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{demographics?.household_size || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Household Size</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{demographics?.population_density || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">People per sq mi</div>
          </div>
        </div>

        <div className="mt-4">
          <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Age Distribution</h5>
          <div className="grid grid-cols-3 gap-4">
            {demographics?.age_groups && Object.entries(demographics.age_groups).map(([age, info]) => (
              <div key={age} className="text-center">
                <div className="text-lg font-semibold text-black">{formatNumber(info.population)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{age} years</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">({info.percentage}%)</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disease Selection */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
        {(['COVID', 'Flu', 'RSV'] as const).map((disease) => (
          <button
            key={disease}
            onClick={() => setSelectedDisease(disease)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedDisease === disease
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {disease}
          </button>
        ))}
      </div>

      {/* Disease Analysis */}
      {analysis && (
        <div className={`border rounded-lg p-6 ${getDiseaseBgColor(analysis.disease)}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className={`text-lg font-semibold ${getDiseaseColor(analysis.disease)}`}>
              {analysis.disease} - Pierce County Calibrated Parameters
            </h4>
            <div className="text-sm text-black">
              Real Pierce County data
            </div>
          </div>

          {/* Model Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h5 className="font-medium text-black mb-3">Calibrated Model Parameters</h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-black">Initial Prevalence:</span>
                  <span className="font-medium text-black">{formatPercentage(analysis.parameters.init_prev)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">Transmission Rate (β):</span>
                  <span className="font-medium text-black">{formatDecimal(analysis.parameters.beta, 3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">Recovery Rate:</span>
                  <span className="font-medium text-black">{formatPercentage(analysis.parameters.recovery_rate)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">Mortality Rate:</span>
                  <span className="font-medium text-black">{formatDecimal(analysis.parameters.mortality_rate, 4)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">R₀ (Reproduction Number):</span>
                  <span className="font-medium text-black">{formatDecimal(analysis.parameters.r0, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">Seasonal Factor:</span>
                  <span className="font-medium text-black">{formatDecimal(analysis.parameters.seasonal_factor, 2)}x</span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-black mb-3">Age-Specific Risk Factors</h5>
              <div className="space-y-2">
                {Object.entries(analysis.parameters.age_specific_risk).map(([age, risk]) => (
                  <div key={age} className="flex justify-between">
                    <span className="text-sm text-black">{age} years:</span>
                    <span className="font-medium text-black">{formatDecimal(risk, 1)}x</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <h6 className="font-medium text-black mb-2">Peak Weeks</h6>
                <div className="text-sm text-black">
                  {typeof analysis.parameters.peak_weeks === 'string' 
                    ? analysis.parameters.peak_weeks 
                    : analysis.parameters.peak_weeks.join(', ')}
                </div>
              </div>
            </div>
          </div>

          {/* Interpretations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-black mb-3">Parameter Interpretations</h5>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center mb-1">
                    <TrendingUp className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="text-sm font-medium text-black">Transmission Potential</span>
                  </div>
                  <div className="text-sm text-black ml-6">
                    R₀ = {formatDecimal(analysis.parameters.r0, 2)}: {analysis.interpretation.r0_interpretation}
                  </div>
                </div>
                <div>
                  <div className="flex items-center mb-1">
                    <Calendar className="h-4 w-4 text-purple-500 mr-2" />
                    <span className="text-sm font-medium text-black">Seasonality</span>
                  </div>
                  <div className="text-sm text-black ml-6">
                    {formatDecimal(analysis.parameters.seasonal_factor, 1)}x peak: {analysis.interpretation.seasonality_interpretation}
                  </div>
                </div>
                <div>
                  <div className="flex items-center mb-1">
                    <Shield className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm font-medium text-black">Vaccination Impact</span>
                  </div>
                  <div className="text-sm text-black ml-6">
                    {formatPercentage(analysis.parameters.vaccination_coverage)}% coverage: {analysis.interpretation.vaccination_impact}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-black mb-3">Pierce County Context</h5>
              <div className="space-y-2 text-sm text-black">
                <div>• <strong>Population:</strong> {formatNumber(pierceCountyDemographics.total_population)} residents</div>
                <div>• <strong>Urban:</strong> {pierceCountyDemographics.urban_percentage}% urban population</div>
                <div>• <strong>Density:</strong> {pierceCountyDemographics.population_density} people/sq mi</div>
                <div>• <strong>Households:</strong> Avg {pierceCountyDemographics.household_size} people per household</div>
                <div>• <strong>Age Structure:</strong> {pierceCountyDemographics.age_groups["65+"].percentage}% elderly population</div>
                <div>• <strong>Calibration:</strong> Based on real Pierce County health data</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Users, 
  TrendingUp, 
  Heart, 
  Skull, 
  Calendar,
  BarChart3,
  Info,
  AlertCircle,
  Shield,
  Activity
} from 'lucide-react';

interface PierceCountyDemographics {
  total_population: number;
  age_groups: {
    "0-17": { population: number; percentage: number };
    "18-64": { population: number; percentage: number };
    "65+": { population: number; percentage: number };
  };
  household_size: number;
  population_density: number;
  urban_percentage: number;
}

interface PierceCountyDiseaseParameters {
  init_prev: number | string;
  beta: number | string;
  recovery_rate: number | string;
  mortality_rate: number | string;
  seasonal_factor: number | string;
  peak_weeks: number[] | string;
  r0: number | string;
  vaccination_coverage: number | string;
  expected_annual_cases: number | string;
  expected_annual_deaths: number | string;
  age_specific_risk: {
    "0-17": number | string;
    "18-64": number | string;
    "65+": number | string;
  };
}

interface PierceCountyAnalysis {
  disease: string;
  parameters: PierceCountyDiseaseParameters;
  demographics: PierceCountyDemographics;
  interpretation: {
    r0_interpretation: string;
    severity_interpretation: string;
    seasonality_interpretation: string;
    vaccination_impact: string;
  };
}

export function PierceCountyParameterInspector() {
  const [selectedDisease, setSelectedDisease] = useState<'COVID' | 'Flu' | 'RSV'>('COVID');
  const [analysis, setAnalysis] = useState<PierceCountyAnalysis | null>(null);
  const [demographics, setDemographics] = useState<PierceCountyDemographics | null>(null);

  // Pierce County demographics (2024)
  const pierceCountyDemographics: PierceCountyDemographics = {
    total_population: 928696,
    age_groups: {
      "0-17": { population: 185739, percentage: 20.0 },
      "18-64": { population: 557218, percentage: 60.0 },
      "65+": { population: 185739, percentage: 20.0 }
    },
    household_size: 2.4,
    population_density: 570,
    urban_percentage: 85.0
  };

  // Pierce County-calibrated disease parameters
  // Data sources: WA DOH Respiratory Illness Dashboard, CDC Surveillance, Pierce County vaccination data
  // For full documentation see: Docs/Pierce_County_Disease_Parameters_2025.md
  const pierceCountyDiseaseParams = {
    COVID: {
      init_prev: 0.0015, // 0.15% initial prevalence (endemic low circulation)
      beta: 0.35, // Transmission rate for Omicron variants
      recovery_rate: 0.10, // 10 days infectious period (0.10 = 10% recover per day)
      mortality_rate: 0.0005, // 0.05% case fatality rate (2024-2025, post-vaccination era)
      seasonal_factor: 1.3, // Moderate winter seasonality
      peak_weeks: [48, 49, 50, 51, 52, 1, 2, 3], // Dec-mid-Jan (weeks 48-3)
      r0: 3.0, // R0 for Omicron variants (range 2.5-3.5)
      vaccination_coverage: 0.14, // 14.0% (WA DOH Pierce County 2024-2025)
      expected_annual_cases: 46000, // ~5% attack rate (endemic phase)
      expected_annual_deaths: 23, // 0.05% CFR
      age_specific_risk: { "0-17": 0.5, "18-64": 1.0, "65+": 3.5 } // Relative risk by age
    },
    Flu: {
      init_prev: 0.0008, // 0.08% initial prevalence (seasonal start)
      beta: 0.26, // Transmission rate for seasonal influenza
      recovery_rate: 0.20, // 5 days infectious period (0.20 = 20% recover per day)
      mortality_rate: 0.0012, // 0.12% CFR (2024-2025 severe season, H1N1/H3N2)
      seasonal_factor: 2.1, // Strong winter seasonality
      peak_weeks: [1, 2, 3, 4, 5], // Jan-early Feb (weeks 1-5)
      r0: 1.3, // R0 for seasonal influenza (range 1.2-1.4)
      vaccination_coverage: 0.265, // 26.5% (WA DOH Pierce County 2024-2025)
      expected_annual_cases: 74000, // ~8% attack rate (typical seasonal flu)
      expected_annual_deaths: 89, // Extrapolated from WA State 422 deaths
      age_specific_risk: { "0-17": 1.2, "18-64": 1.0, "65+": 4.0 } // Elderly highest risk
    },
    RSV: {
      init_prev: 0.0005, // 0.05% initial prevalence (very seasonal)
      beta: 0.12, // Lower transmission rate, shorter window
      recovery_rate: 0.125, // 8 days infectious period (0.125 = 12.5% recover per day)
      mortality_rate: 0.0003, // 0.03% CFR (primarily infants and elderly)
      seasonal_factor: 3.5, // Very strong winter seasonality (most seasonal)
      peak_weeks: [47, 48, 49, 50, 51, 52], // Mid-Nov-Dec (weeks 47-52)
      r0: 1.5, // R0 for RSV (range 1.2-1.8)
      vaccination_coverage: 0.15, // 15% overall (46.1% elderly 75+, new vaccine)
      expected_annual_cases: 23000, // ~2.5% attack rate (pediatric and elderly focus)
      expected_annual_deaths: 7, // Very low mortality, primarily infants/elderly
      age_specific_risk: { "0-17": 5.0, "18-64": 0.3, "65+": 3.0 } // Children highest risk
    }
  };

  const getInterpretation = (params: PierceCountyDiseaseParameters, disease: string) => {
    // R0 interpretation
    let r0_interpretation = '';
    if (params.r0 < 1) {
      r0_interpretation = 'Disease will die out naturally';
    } else if (params.r0 < 2) {
      r0_interpretation = 'Moderate transmission potential';
    } else {
      r0_interpretation = 'High transmission potential - epidemic potential';
    }

    // Severity interpretation
    let severity_interpretation = '';
    const cfr = params.mortality_rate / params.recovery_rate;
    if (cfr < 0.01) {
      severity_interpretation = 'Low severity disease';
    } else if (cfr < 0.05) {
      severity_interpretation = 'Medium severity disease';
    } else {
      severity_interpretation = 'High severity disease';
    }

    // Seasonality interpretation
    let seasonality_interpretation = '';
    if (params.seasonal_factor < 1.2) {
      seasonality_interpretation = 'Weak seasonality';
    } else if (params.seasonal_factor < 1.5) {
      seasonality_interpretation = 'Moderate seasonality';
    } else {
      seasonality_interpretation = 'Strong seasonality';
    }

    // Vaccination impact
    let vaccination_impact = '';
    if (params.vaccination_coverage > 0.6) {
      vaccination_impact = 'High vaccination coverage - significant protection';
    } else if (params.vaccination_coverage > 0.3) {
      vaccination_impact = 'Moderate vaccination coverage - some protection';
    } else {
      vaccination_impact = 'Low vaccination coverage - limited protection';
    }

    return {
      r0_interpretation,
      severity_interpretation,
      seasonality_interpretation,
      vaccination_impact
    };
  };

  const analyzeDisease = (disease: string) => {
    const params = pierceCountyDiseaseParams[disease as keyof typeof pierceCountyDiseaseParams];
    const interpretation = getInterpretation(params, disease);

    setAnalysis({
      disease,
      parameters: params,
      demographics: pierceCountyDemographics,
      interpretation
    });
  };

  useEffect(() => {
    setDemographics(pierceCountyDemographics);
    analyzeDisease(selectedDisease);
  }, [selectedDisease]);

  const getDiseaseColor = (disease: string) => {
    const colors = {
      COVID: 'text-blue-600',
      Flu: 'text-green-600',
      RSV: 'text-orange-600'
    };
    return colors[disease as keyof typeof colors] || 'text-black';
  };

  const getDiseaseBgColor = (disease: string) => {
    const colors = {
      COVID: 'bg-blue-50 border-blue-200',
      Flu: 'bg-green-50 border-green-200',
      RSV: 'bg-orange-50 border-orange-200'
    };
    return colors[disease as keyof typeof colors] || 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
  };

  const formatNumber = (num: number | string) => {
    if (typeof num === 'string' && num === 'XXX') return 'XXX';
    return new Intl.NumberFormat('en-US').format(Number(num));
  };

  const formatPercentage = (num: number | string) => {
    if (typeof num === 'string' && num === 'XXX') return 'XXX';
    return (Number(num) * 100).toFixed(2);
  };

  const formatDecimal = (num: number | string, decimals: number = 3) => {
    if (typeof num === 'string' && num === 'XXX') return 'XXX';
    return Number(num).toFixed(decimals);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <MapPin className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Pierce County Disease Model Parameters</h3>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Real Pierce County data & calibrated parameters
        </div>
      </div>

      {/* Pierce County Demographics */}
      <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Pierce County Demographics</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{formatNumber(demographics?.total_population || 0)}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Population</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{demographics?.household_size || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Household Size</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{demographics?.population_density || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">People per sq mi</div>
          </div>
        </div>

        <div className="mt-4">
          <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Age Distribution</h5>
          <div className="grid grid-cols-3 gap-4">
            {demographics?.age_groups && Object.entries(demographics.age_groups).map(([age, info]) => (
              <div key={age} className="text-center">
                <div className="text-lg font-semibold text-black">{formatNumber(info.population)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{age} years</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">({info.percentage}%)</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disease Selection */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
        {(['COVID', 'Flu', 'RSV'] as const).map((disease) => (
          <button
            key={disease}
            onClick={() => setSelectedDisease(disease)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedDisease === disease
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {disease}
          </button>
        ))}
      </div>

      {/* Disease Analysis */}
      {analysis && (
        <div className={`border rounded-lg p-6 ${getDiseaseBgColor(analysis.disease)}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className={`text-lg font-semibold ${getDiseaseColor(analysis.disease)}`}>
              {analysis.disease} - Pierce County Calibrated Parameters
            </h4>
            <div className="text-sm text-black">
              Real Pierce County data
            </div>
          </div>

          {/* Model Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h5 className="font-medium text-black mb-3">Calibrated Model Parameters</h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-black">Initial Prevalence:</span>
                  <span className="font-medium text-black">{formatPercentage(analysis.parameters.init_prev)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">Transmission Rate (β):</span>
                  <span className="font-medium text-black">{formatDecimal(analysis.parameters.beta, 3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">Recovery Rate:</span>
                  <span className="font-medium text-black">{formatPercentage(analysis.parameters.recovery_rate)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">Mortality Rate:</span>
                  <span className="font-medium text-black">{formatDecimal(analysis.parameters.mortality_rate, 4)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">R₀ (Reproduction Number):</span>
                  <span className="font-medium text-black">{formatDecimal(analysis.parameters.r0, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">Seasonal Factor:</span>
                  <span className="font-medium text-black">{formatDecimal(analysis.parameters.seasonal_factor, 2)}x</span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-black mb-3">Age-Specific Risk Factors</h5>
              <div className="space-y-2">
                {Object.entries(analysis.parameters.age_specific_risk).map(([age, risk]) => (
                  <div key={age} className="flex justify-between">
                    <span className="text-sm text-black">{age} years:</span>
                    <span className="font-medium text-black">{formatDecimal(risk, 1)}x</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <h6 className="font-medium text-black mb-2">Peak Weeks</h6>
                <div className="text-sm text-black">
                  {typeof analysis.parameters.peak_weeks === 'string' 
                    ? analysis.parameters.peak_weeks 
                    : analysis.parameters.peak_weeks.join(', ')}
                </div>
              </div>
            </div>
          </div>

          {/* Interpretations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-black mb-3">Parameter Interpretations</h5>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center mb-1">
                    <TrendingUp className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="text-sm font-medium text-black">Transmission Potential</span>
                  </div>
                  <div className="text-sm text-black ml-6">
                    R₀ = {formatDecimal(analysis.parameters.r0, 2)}: {analysis.interpretation.r0_interpretation}
                  </div>
                </div>
                <div>
                  <div className="flex items-center mb-1">
                    <Calendar className="h-4 w-4 text-purple-500 mr-2" />
                    <span className="text-sm font-medium text-black">Seasonality</span>
                  </div>
                  <div className="text-sm text-black ml-6">
                    {formatDecimal(analysis.parameters.seasonal_factor, 1)}x peak: {analysis.interpretation.seasonality_interpretation}
                  </div>
                </div>
                <div>
                  <div className="flex items-center mb-1">
                    <Shield className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm font-medium text-black">Vaccination Impact</span>
                  </div>
                  <div className="text-sm text-black ml-6">
                    {formatPercentage(analysis.parameters.vaccination_coverage)}% coverage: {analysis.interpretation.vaccination_impact}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-black mb-3">Pierce County Context</h5>
              <div className="space-y-2 text-sm text-black">
                <div>• <strong>Population:</strong> {formatNumber(pierceCountyDemographics.total_population)} residents</div>
                <div>• <strong>Urban:</strong> {pierceCountyDemographics.urban_percentage}% urban population</div>
                <div>• <strong>Density:</strong> {pierceCountyDemographics.population_density} people/sq mi</div>
                <div>• <strong>Households:</strong> Avg {pierceCountyDemographics.household_size} people per household</div>
                <div>• <strong>Age Structure:</strong> {pierceCountyDemographics.age_groups["65+"].percentage}% elderly population</div>
                <div>• <strong>Calibration:</strong> Based on real Pierce County health data</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}