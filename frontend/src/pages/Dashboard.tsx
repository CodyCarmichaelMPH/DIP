import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Users, Target } from 'lucide-react'
import { dataService, type TimeseriesPoint } from '../lib/data'
import { parseISO, getWeek } from 'date-fns'
import { PierceCountyParameterInspector } from '../components/PierceCountyParameterInspector'
import { BackgroundStarsimSimulation } from '../components/BackgroundStarsimSimulation'
import { SEIRChart } from '../components/SEIRChart'
import { simulationService } from '../lib/simulationService'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Area } from 'recharts'

export function Dashboard() {
  const [activeCovidTab, setActiveCovidTab] = useState<'overall' | 'race' | 'sex' | 'age'>('overall')
  const [activeFluTab, setActiveFluTab] = useState<'overall' | 'race' | 'sex' | 'age'>('overall')
  const [activePredictionTab, setActivePredictionTab] = useState<'COVID' | 'Flu' | 'RSV'>('COVID')
  const [simulationType, setSimulationType] = useState<'starsim' | 'seir'>('starsim')
  
  // SEIR simulation for Dashboard
  const { data: seirSimulationData, isLoading: seirLoading, error: seirError } = useQuery({
    queryKey: ['seir-dashboard', activePredictionTab],
    queryFn: async () => {
      const params = simulationService.convertScenarioToSimulation({
        disease_name: activePredictionTab,
        model_type: 'SEIR',
        population_size: 928696,
        duration_days: 30,
        init_prev: activePredictionTab === 'COVID' ? 0.0015 : activePredictionTab === 'Flu' ? 0.005 : 0.0005,
        beta: activePredictionTab === 'COVID' ? 0.35 : activePredictionTab === 'Flu' ? 0.26 : 0.12,
        gamma: activePredictionTab === 'COVID' ? 0.10 : activePredictionTab === 'Flu' ? 0.20 : 0.125,
        sigma: 0.20,
        mu: activePredictionTab === 'COVID' ? 0.0005 : activePredictionTab === 'Flu' ? 0.0012 : 0.0003,
        seasonal_factor: activePredictionTab === 'COVID' ? 1.3 : activePredictionTab === 'Flu' ? 2.1 : 3.5,
        peak_weeks: activePredictionTab === 'COVID' ? [48, 49, 50, 51, 52, 1, 2, 3] : 
                   activePredictionTab === 'Flu' ? [1, 2, 3, 4, 5] : [47, 48, 49, 50, 51, 52],
        vaccination_coverage: activePredictionTab === 'COVID' ? 0.14 : activePredictionTab === 'Flu' ? 0.265 : 0.15,
        booster_coverage: 0.14,
        vax_transmission_eff: 0.6,
        vax_severity_eff: 0.8,
        waning_days: 180,
        residual_transmission_floor: 0.1
      })
      return await simulationService.runSimulation(params)
    },
    enabled: simulationType === 'seir',
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  
  // Map and facility selection state (temporarily disabled)
  // const [selectedTracts, setSelectedTracts] = useState<string[]>([])
  // const [selectedFacilities, setSelectedFacilities] = useState<any[]>([])
  // const [childCareCenters, setChildCareCenters] = useState<any[]>([])
  // const [nursingHomes, setNursingHomes] = useState<any[]>([])
  // const [censusTracts, setCensusTracts] = useState<any[]>([])

  // Load ED visits data for all diseases - use EXACT same approach as hospitalizations
  const { data: covidEdData, isLoading: covidEdLoading, error: covidEdError } = useQuery({
    queryKey: ['edVisits', 'COVID', 'v5'], // Force cache refresh again
    queryFn: async () => {
      console.log('=== STARTING COVID ED DATA LOAD ===')
      const result = await dataService.loadTimeseriesData('COVID')
      console.log('=== COVID ED DATA LOADED ===', result)
      return result
    },
    staleTime: 0, // Disable caching to force fresh load
    enabled: true // Make sure it's enabled
  })

  const { data: rsvEdData, isLoading: rsvEdLoading, error: rsvEdError } = useQuery({
    queryKey: ['edVisits', 'RSV', 'v5'], // Force cache refresh again
    queryFn: async () => {
      console.log('=== STARTING RSV ED DATA LOAD ===')
      const result = await dataService.loadTimeseriesData('RSV')
      console.log('=== RSV ED DATA LOADED ===', result)
      return result
    },
    staleTime: 0, // Disable caching to force fresh load
    enabled: true // Make sure it's enabled
  })

  const { data: fluEdData, isLoading: fluEdLoading, error: fluEdError } = useQuery({
    queryKey: ['edVisits', 'Flu', 'v5'], // Force cache refresh again
    queryFn: async () => {
      console.log('=== STARTING FLU ED DATA LOAD ===')
      const result = await dataService.loadTimeseriesData('Flu')
      console.log('=== FLU ED DATA LOADED ===', result)
      return result
    },
    staleTime: 0, // Disable caching to force fresh load
    enabled: true // Make sure it's enabled
  })

  // Load timeseries data for charts (same as ScenarioBuilder)
  const { data: covidTimeseriesData } = useQuery({
    queryKey: ['timeseries', 'COVID', 'dashboard-v1'],
    queryFn: () => {
      console.log('=== LOADING COVID TIMESERIES DATA FOR DASHBOARD ===')
      return dataService.loadTimeseriesData('COVID')
    },
    staleTime: 0, // Force fresh load
    onSuccess: (data) => {
      console.log('COVID timeseries data loaded:', data?.length || 0, 'points')
      if (data && data.length > 0) {
        console.log('COVID sample data:', data.slice(0, 3))
      }
    },
    onError: (error) => {
      console.error('COVID timeseries data loading error:', error)
    }
  })

  const { data: fluTimeseriesData } = useQuery({
    queryKey: ['timeseries', 'Flu', 'dashboard-v1'],
    queryFn: () => {
      console.log('=== LOADING FLU TIMESERIES DATA FOR DASHBOARD ===')
      return dataService.loadTimeseriesData('Flu')
    },
    staleTime: 0, // Force fresh load
    onSuccess: (data) => {
      console.log('Flu timeseries data loaded:', data?.length || 0, 'points')
      if (data && data.length > 0) {
        console.log('Flu sample data:', data.slice(0, 3))
      }
    },
    onError: (error) => {
      console.error('Flu timeseries data loading error:', error)
    }
  })

  const { data: rsvTimeseriesData } = useQuery({
    queryKey: ['timeseries', 'RSV', 'dashboard-v1'],
    queryFn: () => {
      console.log('=== LOADING RSV TIMESERIES DATA FOR DASHBOARD ===')
      return dataService.loadTimeseriesData('RSV')
    },
    staleTime: 0, // Force fresh load
    onSuccess: (data) => {
      console.log('RSV timeseries data loaded:', data?.length || 0, 'points')
      if (data && data.length > 0) {
        console.log('RSV sample data:', data.slice(0, 3))
      }
    },
    onError: (error) => {
      console.error('RSV timeseries data loading error:', error)
    }
  })

  // Calculate disease-specific metrics - show last two data points
  const calculateDiseaseMetrics = (data: TimeseriesPoint[] | undefined) => {
    if (!data || data.length === 0) {
      return {
        mostRecent: { value: 0, date: '', weekLabel: '' },
        secondMostRecent: { value: 0, date: '', weekLabel: '' },
        trend: 0
      }
    }

    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    // Get the last two data points
    const mostRecent = sortedData[sortedData.length - 1]
    const secondMostRecent = sortedData[sortedData.length - 2]
    
    // Format dates for display
    const formatWeekLabel = (dateStr: string) => {
      const date = new Date(dateStr)
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    
    // Calculate trend
    const trend = secondMostRecent && secondMostRecent.value > 0 
      ? ((mostRecent.value - secondMostRecent.value) / secondMostRecent.value) * 100 
      : 0

    return {
      mostRecent: {
        value: mostRecent?.value || 0,
        date: mostRecent?.date || '',
        weekLabel: mostRecent?.date ? formatWeekLabel(mostRecent.date) : ''
      },
      secondMostRecent: {
        value: secondMostRecent?.value || 0,
        date: secondMostRecent?.date || '',
        weekLabel: secondMostRecent?.date ? formatWeekLabel(secondMostRecent.date) : ''
      },
      trend
    }
  }

  // DEBUG: Let's see what data we're getting
  console.log('=== ED VISITS DATA DEBUG ===')
  console.log('COVID ED Loading:', covidEdLoading, 'Error:', covidEdError, 'Data:', covidEdData)
  console.log('RSV ED Loading:', rsvEdLoading, 'Error:', rsvEdError, 'Data:', rsvEdData)
  console.log('Flu ED Loading:', fluEdLoading, 'Error:', fluEdError, 'Data:', fluEdData)
  console.log('=== END DEBUG ===')
  
  // Calculate ED visit metrics
  const covidEdMetrics = calculateDiseaseMetrics(covidEdData)
  const rsvEdMetrics = calculateDiseaseMetrics(rsvEdData)
  const fluEdMetrics = calculateDiseaseMetrics(fluEdData)
  
  // DEBUG: Let's see what metrics we're calculating
  console.log('COVID ED Metrics:', covidEdMetrics)
  console.log('RSV ED Metrics:', rsvEdMetrics)
  console.log('Flu ED Metrics:', fluEdMetrics)
  

  // Load hospitalization data for all diseases
  const { data: covidHospData } = useQuery({
    queryKey: ['hospitalizations', 'COVID'],
    queryFn: () => dataService.loadHospitalizationData('COVID'),
    staleTime: 5 * 60 * 1000
  })

  const { data: rsvHospData } = useQuery({
    queryKey: ['hospitalizations', 'RSV'],
    queryFn: () => dataService.loadHospitalizationData('RSV'),
    staleTime: 5 * 60 * 1000
  })

  const { data: fluHospData } = useQuery({
    queryKey: ['hospitalizations', 'Flu'],
    queryFn: () => dataService.loadHospitalizationData('Flu'),
    staleTime: 5 * 60 * 1000
  })

  const covidHospMetrics = calculateDiseaseMetrics(covidHospData)
  const rsvHospMetrics = calculateDiseaseMetrics(rsvHospData)
  const fluHospMetrics = calculateDiseaseMetrics(fluHospData)

  // DEBUG: Check what data we have for predictions
  console.log('=== PREDICTION DATA DEBUG ===')
  console.log('COVID Timeseries Data:', covidTimeseriesData?.length || 0, 'points')
  console.log('Flu Timeseries Data:', fluTimeseriesData?.length || 0, 'points')
  console.log('RSV Timeseries Data:', rsvTimeseriesData?.length || 0, 'points')
  console.log('COVID Hosp Data:', covidHospData?.length || 0, 'points')
  console.log('Flu Hosp Data:', fluHospData?.length || 0, 'points')
  console.log('RSV Hosp Data:', rsvHospData?.length || 0, 'points')
  console.log('=== END PREDICTION DATA DEBUG ===')

  // Helper functions for timeseries charts (copied from ScenarioBuilder)
  

  // Transform real CSV data into chart format with CDC Week cycle and yearly lines
  const transformRealDataToChartFormat = (data: TimeseriesPoint[], disease: string, metric: string) => {
    console.log(`=== TRANSFORMING DATA FOR ${disease} ${metric} ===`)
    console.log(`Input data:`, data.length, 'points')
    console.log(`Input data sample:`, data.slice(0, 3))
    
    if (!data || data.length === 0) {
      console.log(`No data to transform for ${disease} ${metric}`)
      return [] // Return empty array if no real data - NO MOCK DATA
    }

    // Group data by year and CDC week
    const yearlyData = new Map<string, Map<number, number>>()
    
    // Collect all data points and group by year and CDC week
    data.forEach(point => {
      const date = parseISO(point.date)
      const year = date.getFullYear().toString()
      const cdcWeekNum = getWeek(date, { weekStartsOn: 1 })
      
      console.log(`Processing point:`, point.date, '->', year, 'week', cdcWeekNum, 'value', point.value)
      
      if (!yearlyData.has(year)) {
        yearlyData.set(year, new Map())
      }
      
      const yearData = yearlyData.get(year)!
      yearData.set(cdcWeekNum, point.value)
    })
    
    console.log(`Yearly data map:`, yearlyData)
    
    // Create CDC Week cycle (Week 25 → Week 24)
    const chartData: any[] = []
    
    // Generate weeks 25-52, then 1-24 (CDC epidemiological year)
    for (let week = 25; week <= 52; week++) {
      const weekData: any = {
        cdcWeek: week,
        weekLabel: `Week ${week}`
      }
      
      // Add data for each year at this CDC week
      yearlyData.forEach((yearData, year) => {
        weekData[year] = yearData.get(week) || 0
      })
      
      chartData.push(weekData)
    }
    
    for (let week = 1; week <= 24; week++) {
      const weekData: any = {
        cdcWeek: week,
        weekLabel: `Week ${week}`
      }
      
      // Add data for each year at this CDC week
      yearlyData.forEach((yearData, year) => {
        weekData[year] = yearData.get(week) || 0
      })
      
      chartData.push(weekData)
    }
    
    console.log(`Final chart data:`, chartData.length, 'points')
    console.log(`Final chart data sample:`, chartData.slice(0, 3))
    console.log(`=== END TRANSFORMATION FOR ${disease} ${metric} ===`)
    
    return chartData
  }

  // Get historical data for charts - ONLY real data from CSV files
  const _getHistoricalDataForChart = (disease: string, metric: string) => {
    let dataSource = null
    
    // Choose the appropriate data source based on metric
    if (metric === 'hospitalizations') {
      if (disease === 'COVID' && covidHospData) dataSource = covidHospData
      else if (disease === 'Flu' && fluHospData) dataSource = fluHospData
      else if (disease === 'RSV' && rsvHospData) dataSource = rsvHospData
    } else {
      // For ED visits and cases, use ED visits data
      if (disease === 'COVID' && covidTimeseriesData) dataSource = covidTimeseriesData
      else if (disease === 'Flu' && fluTimeseriesData) dataSource = fluTimeseriesData
      else if (disease === 'RSV' && rsvTimeseriesData) dataSource = rsvTimeseriesData
    }
    
    console.log(`=== GETTING HISTORICAL DATA FOR ${disease} ${metric} ===`)
    console.log(`Data source:`, dataSource?.length || 0, 'points')
    console.log(`Data source sample:`, dataSource?.slice(0, 3))
    
    if (!dataSource || dataSource.length === 0) {
      console.log(`No data source available for ${disease} ${metric}`)
      return [] // Return empty array if no real data available - NO MOCK DATA
    }
    
    const transformedData = transformRealDataToChartFormat(dataSource, disease, metric)
    console.log(`Transformed data for ${disease} ${metric}:`, transformedData.length, 'points')
    console.log(`=== END GETTING HISTORICAL DATA ===`)
    
    return transformedData
  }

  // Calculate Y-axis domain for charts
  const calculateYAxisDomain = (metric: string) => {
    const diseases = ['COVID', 'Flu', 'RSV']
    let maxValue = -Infinity
    
    console.log(`=== CALCULATING Y-AXIS FOR ${metric} ===`)
    
    // Check historical data - ONLY use real data, skip mock data
    diseases.forEach(disease => {
      let dataSource = null
      if (metric === 'hospitalizations') {
        if (disease === 'COVID' && covidHospData) dataSource = covidHospData
        else if (disease === 'Flu' && fluHospData) dataSource = fluHospData
        else if (disease === 'RSV' && rsvHospData) dataSource = rsvHospData
      } else {
        if (disease === 'COVID' && covidTimeseriesData) dataSource = covidTimeseriesData
        else if (disease === 'Flu' && fluTimeseriesData) dataSource = fluTimeseriesData
        else if (disease === 'RSV' && rsvTimeseriesData) dataSource = rsvTimeseriesData
      }
      
      console.log(`${disease} ${metric} dataSource:`, dataSource?.length || 0, 'points')
      
      // ONLY process real data - skip if no real data available
      if (dataSource && dataSource.length > 0) {
        const historicalData = transformRealDataToChartFormat(dataSource, disease, metric)
        console.log(`${disease} ${metric} historicalData:`, historicalData.length, 'points')
        
        historicalData.forEach(point => {
          // Check all numeric properties (years and other values)
          Object.keys(point).forEach(key => {
            const value = point[key]
            if (typeof value === 'number' && !isNaN(value) && key !== 'cdcWeek') {
              maxValue = Math.max(maxValue, value)
            }
          })
        })
      } else {
        console.log(`Skipping ${disease} ${metric} - no real data available`)
      }
    })
    
    console.log(`Max value for ${metric}:`, maxValue)
    
    // Add 10% buffer to max value, minimum of 0, ensure we have a reasonable max
    if (maxValue === -Infinity) {
      // Fallback to reasonable percentage values if no real data found
      maxValue = metric === 'edVisits' ? 5 : metric === 'hospitalizations' ? 3 : 10
    }
    const buffer = maxValue * 0.1
    const finalDomain = [0, Math.ceil(maxValue + buffer)]
    
    console.log(`Final Y-axis domain for ${metric}:`, finalDomain)
    console.log(`=== END Y-AXIS CALCULATION ===`)
    
    return finalDomain
  }

  // Generate prediction data using comprehensive timeseries analysis with seasonality
  const _generatePredictionData = (disease: string, metric: string) => {
    const data: any[] = []
    
    console.log(`=== GENERATING PREDICTIONS FOR ${disease} ${metric} ===`)
    
    // Get the actual data source
    let dataSource = null
    if (metric === 'hospitalizations') {
      if (disease === 'COVID' && covidHospData) dataSource = covidHospData
      else if (disease === 'Flu' && fluHospData) dataSource = fluHospData
      else if (disease === 'RSV' && rsvHospData) dataSource = rsvHospData
    } else {
      if (disease === 'COVID' && covidTimeseriesData) dataSource = covidTimeseriesData
      else if (disease === 'Flu' && fluTimeseriesData) dataSource = fluTimeseriesData
      else if (disease === 'RSV' && rsvTimeseriesData) dataSource = rsvTimeseriesData
    }
    
    console.log(`Data source for ${disease} ${metric}:`, dataSource?.length || 0, 'points')
    if (dataSource && dataSource.length > 0) {
      console.log(`Sample data for ${disease} ${metric}:`, dataSource.slice(0, 3))
    }
    
    if (dataSource && dataSource.length > 0) {
      console.log(`Using ${disease} ${metric} data:`, dataSource.length, 'points')
      
      // Sort data by date to get the most recent points
      const sortedData = [...dataSource].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      // Get the last 4 weeks of actual data for the prediction
      const last4Weeks = sortedData.slice(-4)
      console.log(`Last 4 weeks data for ${disease} ${metric}:`, last4Weeks)
      
      // Filter out any invalid data points (null, undefined, or extreme outliers)
      const validLast4Weeks = last4Weeks.filter(point => 
        point && 
        point.value !== null && 
        point.value !== undefined && 
        !isNaN(point.value) && 
        point.value >= 0 && 
        point.value <= 50 // Filter out extreme outliers like 28%
      )
      
      console.log(`Valid last 4 weeks data for ${disease} ${metric}:`, validLast4Weeks.length, 'points')
      
      if (validLast4Weeks.length < 2) {
        console.log(`Not enough valid data points for ${disease} ${metric} prediction`)
        return []
      }
      
      // Calculate baseline trend from recent data
      const recentValues = validLast4Weeks.map(point => point.value)
      const avgRecent = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length
      
      // Simple trend calculation
      const firstHalf = recentValues.slice(0, Math.floor(recentValues.length / 2))
      const secondHalf = recentValues.slice(Math.floor(recentValues.length / 2))
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
      const trend = firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0
      
      console.log(`Baseline average for ${disease} ${metric}:`, avgRecent, 'Trend:', trend)
      
      // Add actual data points
      validLast4Weeks.forEach((point) => {
        const date = parseISO(point.date)
        const cdcWeek = getWeek(date, { weekStartsOn: 1 })
        
        data.push({
          cdcWeek: cdcWeek,
          actual: point.value,
          predicted: null,
          high: null,
          low: null
        })
      })
      
      // Generate 8-week prediction
      const lastActualWeek = getWeek(parseISO(validLast4Weeks[validLast4Weeks.length - 1].date), { weekStartsOn: 1 })
        
        for (let i = 1; i <= 8; i++) {
          const predictionWeek = lastActualWeek + i
          
          // Seasonal factors based on disease and week
          let seasonalFactor = 1.0
          if (disease === 'Flu') {
            // Flu season typically peaks in winter (weeks 47-52, 1-12)
            if (predictionWeek >= 47 || predictionWeek <= 12) {
              seasonalFactor = 1.3 + Math.sin(((predictionWeek - 47) / 18) * Math.PI) * 0.4
            } else {
              seasonalFactor = 0.6 // Lower activity in summer
            }
          } else if (disease === 'RSV') {
            // RSV season typically peaks in late fall/early winter (weeks 45-8)
            if (predictionWeek >= 45 || predictionWeek <= 8) {
              seasonalFactor = 1.2 + Math.sin(((predictionWeek - 45) / 15) * Math.PI) * 0.3
            } else {
              seasonalFactor = 0.5 // Lower activity in summer
            }
          } else if (disease === 'COVID') {
            // COVID has less pronounced seasonality but some winter increase
            if (predictionWeek >= 45 || predictionWeek <= 12) {
              seasonalFactor = 1.1 + Math.sin(((predictionWeek - 45) / 20) * Math.PI) * 0.2
            } else {
              seasonalFactor = 0.9 // Slightly lower in summer
            }
          }
          
          // Apply trend and seasonal factors
          const basePrediction = avgRecent * (1 + trend * i * 0.1)
          const finalPrediction = Math.max(0, basePrediction * seasonalFactor)
          
          // Add confidence intervals - more uncertainty for longer predictions
          const baseVariation = 0.1 + (i * 0.03) // Increasing uncertainty over time
          const diseaseVariation = disease === 'Flu' ? 0.15 : disease === 'RSV' ? 0.12 : 0.1 // Disease-specific uncertainty
          const variation = baseVariation + diseaseVariation
          
          const high = finalPrediction * (1 + variation)
          const low = Math.max(0, finalPrediction * (1 - variation))
          
          console.log(`Week ${predictionWeek} for ${disease} ${metric}: base=${basePrediction.toFixed(2)}, seasonal=${seasonalFactor.toFixed(2)}, final=${finalPrediction.toFixed(2)}`)
          
          data.push({
            cdcWeek: predictionWeek,
            actual: null,
            predicted: Math.round(finalPrediction * 100) / 100,
            high: Math.round(high * 100) / 100,
            low: Math.round(low * 100) / 100
          })
        }
    } else {
      console.log(`No data source available for ${disease} ${metric} - returning empty array`)
      // Return empty array if no real data available - NO MOCK DATA
    }
    
    console.log(`Generated ${data.length} prediction points for ${disease} ${metric}`)
    console.log(`=== END PREDICTION GENERATION ===`)
    
    return data
  }

  // Get Y-axis domains for each metric (used for both historical and prediction charts)
  const hospitalizationsDomain = calculateYAxisDomain('hospitalizations')
  const edVisitsDomain = calculateYAxisDomain('edVisits')
  
  // Use uniform Y-axis domain for all charts - use the maximum of both metrics
  const uniformDomain = [
    0, 
    Math.max(
      hospitalizationsDomain[1] || 5, 
      edVisitsDomain[1] || 5
    )
  ]

  // Public functions for Timeseries component
  const getHistoricalDataForChart = (disease: string, metric: string) => {
    return _getHistoricalDataForChart(disease, metric)
  }

  const generatePredictionData = (disease: string, metric: string) => {
    return _generatePredictionData(disease, metric)
  }

  // Load real vaccine coverage data
  const { data: vaccineData, isLoading: vaccineLoading } = useQuery({
    queryKey: ['vaccine-coverage'],
    queryFn: () => dataService.loadVaccineCoverageData(),
    staleTime: 10 * 60 * 1000
  })

  // Fallback to comprehensive hardcoded data if loading fails
  const vaccineCoverage = vaccineData || {
    covid19: {
      statewide: { primarySeries: 70.0, coverage2023: 19.8, coverage2024: 18.9 },
      pierce: { primarySeries: 63.3, coverage2023: 14.6, coverage2024: 14.0 },
      ageGroups: { 
        '6m-4 years': { primarySeries: 7.2, coverage2023: 7.5, coverage2024: 6.9 },
        '5-11 years': { primarySeries: 26.1, coverage2023: 6.0, coverage2024: 6.0 },
        '12-17 years': { primarySeries: 50.8, coverage2023: 6.9, coverage2024: 6.8 },
        '18-34 years': { primarySeries: 59.0, coverage2023: 5.9, coverage2024: 5.4 },
        '35-49 years': { primarySeries: 69.9, coverage2023: 10.2, coverage2024: 9.4 },
        '50-64 years': { primarySeries: 76.4, coverage2023: 17.4, coverage2024: 15.0 },
        '65+ years': { primarySeries: 94.6, coverage2023: 41.7, coverage2024: 42.8 }
      },
      raceData: {
        'AIAN*': { primarySeries: 87.6, coverage2023: 15.1, coverage2024: 13.8 },
        'Asian*': { primarySeries: 68.7, coverage2023: 13.7, coverage2024: 12.3 },
        'Black/AA*': { primarySeries: 60.4, coverage2023: 11.2, coverage2024: 10.6 },
        'Hispanic/Latinx': { primarySeries: 44.1, coverage2023: 6.0, coverage2024: 5.7 },
        'NHPI*': { primarySeries: 60.0, coverage2023: 6.8, coverage2024: 6.8 },
        'White*': { primarySeries: 61.0, coverage2023: 15.6, coverage2024: 14.7 }
      },
      sexData: {
        'Female': { primarySeries: 66.5, coverage2023: 16.1, coverage2024: 15.5 },
        'Male': { primarySeries: 59.8, coverage2023: 13.0, coverage2024: 12.4 }
      },
      season: '2024-2025'
    },
    flu: {
      statewide: { coverage2024: 25.8, coverage2023: 26.4, coverage2022: 27.9, coverage2021: 26.8 },
      pierce: { coverage2024: 26.5, coverage2023: 27.3, coverage2022: 29.0, coverage2021: 28.5 },
      ageGroups: { 
        '6m-4 years': { coverage2024: 37.4, coverage2023: 40.1, coverage2022: 43.2, coverage2021: 46.6 },
        '5-12 years': { coverage2024: 25.8, coverage2023: 27.2, coverage2022: 28.9, coverage2021: 29.7 },
        '13-17 years': { coverage2024: 22.0, coverage2023: 23.2, coverage2022: 25.1, coverage2021: 24.6 },
        '18-24 years': { coverage2024: 14.8, coverage2023: 15.3, coverage2022: 16.5, coverage2021: 16.1 },
        '25-34 years': { coverage2024: 19.1, coverage2023: 20.0, coverage2022: 21.3, coverage2021: 20.3 },
        '35-49 years': { coverage2024: 24.4, coverage2023: 25.1, coverage2022: 26.8, coverage2021: 25.3 },
        '50-64 years': { coverage2024: 30.8, coverage2023: 32.6, coverage2022: 35.9, coverage2021: 34.6 },
        '65+ years': { coverage2024: 58.4, coverage2023: 58.1, coverage2022: 58.5, coverage2021: 54.9 }
      },
      sexData: {
        'Female': { coverage2024: 33.8, coverage2023: 34.8, coverage2022: 36.7, coverage2021: 35.6 },
        'Male': { coverage2024: 27.1, coverage2023: 28.0, coverage2022: 29.6, coverage2021: 28.6 }
      },
      season: '2024-2025'
    },
    rsv: {
      pierceCounty: 46.1,
      statewide: 44.8,
      ageGroup: 'Adults 75+ Years',
      season: '2024-2025'
    }
  }

  // Ensure all required properties exist with safe fallbacks
  const safeVaccineCoverage = {
    covid19: {
      statewide: {
        primarySeries: vaccineCoverage?.covid19?.statewide?.primarySeries || 70.0,
        coverage2023: vaccineCoverage?.covid19?.statewide?.coverage2023 || 19.8,
        coverage2024: vaccineCoverage?.covid19?.statewide?.coverage2024 || 18.9
      },
      pierce: {
        primarySeries: vaccineCoverage?.covid19?.pierce?.primarySeries || 63.3,
        coverage2023: vaccineCoverage?.covid19?.pierce?.coverage2023 || 14.6,
        coverage2024: vaccineCoverage?.covid19?.pierce?.coverage2024 || 14.0
      },
      ageGroups: vaccineCoverage?.covid19?.ageGroups || { 
        '6m-4 years': { primarySeries: 7.2, coverage2023: 7.5, coverage2024: 6.9 },
        '5-11 years': { primarySeries: 26.1, coverage2023: 6.0, coverage2024: 6.0 },
        '12-17 years': { primarySeries: 50.8, coverage2023: 6.9, coverage2024: 6.8 },
        '18-34 years': { primarySeries: 59.0, coverage2023: 5.9, coverage2024: 5.4 },
        '35-49 years': { primarySeries: 69.9, coverage2023: 10.2, coverage2024: 9.4 },
        '50-64 years': { primarySeries: 76.4, coverage2023: 17.4, coverage2024: 15.0 },
        '65+ years': { primarySeries: 94.6, coverage2023: 41.7, coverage2024: 42.8 }
      },
      raceData: vaccineCoverage?.covid19?.raceData || {
        'AIAN*': { primarySeries: 87.6, coverage2023: 15.1, coverage2024: 13.8 },
        'Asian*': { primarySeries: 68.7, coverage2023: 13.7, coverage2024: 12.3 },
        'Black/AA*': { primarySeries: 60.4, coverage2023: 11.2, coverage2024: 10.6 },
        'Hispanic/Latinx': { primarySeries: 44.1, coverage2023: 6.0, coverage2024: 5.7 },
        'NHPI*': { primarySeries: 60.0, coverage2023: 6.8, coverage2024: 6.8 },
        'White*': { primarySeries: 61.0, coverage2023: 15.6, coverage2024: 14.7 }
      },
      sexData: vaccineCoverage?.covid19?.sexData || {
        'Female': { primarySeries: 66.5, coverage2023: 16.1, coverage2024: 15.5 },
        'Male': { primarySeries: 59.8, coverage2023: 13.0, coverage2024: 12.4 }
      },
      season: '2024-2025'
    },
    flu: {
      statewide: {
        coverage2024: vaccineCoverage?.flu?.statewide?.coverage2024 || 25.8,
        coverage2023: vaccineCoverage?.flu?.statewide?.coverage2023 || 26.4,
        coverage2022: vaccineCoverage?.flu?.statewide?.coverage2022 || 27.9,
        coverage2021: vaccineCoverage?.flu?.statewide?.coverage2021 || 26.8
      },
      pierce: {
        coverage2024: vaccineCoverage?.flu?.pierce?.coverage2024 || 26.5,
        coverage2023: vaccineCoverage?.flu?.pierce?.coverage2023 || 27.3,
        coverage2022: vaccineCoverage?.flu?.pierce?.coverage2022 || 29.0,
        coverage2021: vaccineCoverage?.flu?.pierce?.coverage2021 || 28.5
      },
      ageGroups: vaccineCoverage?.flu?.ageGroups || { 
        '6m-4 years': { coverage2024: 37.4, coverage2023: 40.1, coverage2022: 43.2, coverage2021: 46.6 },
        '5-12 years': { coverage2024: 25.8, coverage2023: 27.2, coverage2022: 28.9, coverage2021: 29.7 },
        '13-17 years': { coverage2024: 22.0, coverage2023: 23.2, coverage2022: 25.1, coverage2021: 24.6 },
        '18-24 years': { coverage2024: 14.8, coverage2023: 15.3, coverage2022: 16.5, coverage2021: 16.1 },
        '25-34 years': { coverage2024: 19.1, coverage2023: 20.0, coverage2022: 21.3, coverage2021: 20.3 },
        '35-49 years': { coverage2024: 24.4, coverage2023: 25.1, coverage2022: 26.8, coverage2021: 25.3 },
        '50-64 years': { coverage2024: 30.8, coverage2023: 32.6, coverage2022: 35.9, coverage2021: 34.6 },
        '65+ years': { coverage2024: 58.4, coverage2023: 58.1, coverage2022: 58.5, coverage2021: 54.9 }
      },
      sexData: vaccineCoverage?.flu?.sexData || {
        'Female': { coverage2024: 33.8, coverage2023: 34.8, coverage2022: 36.7, coverage2021: 35.6 },
        'Male': { coverage2024: 27.1, coverage2023: 28.0, coverage2022: 29.6, coverage2021: 28.6 }
      },
      season: '2024-2025'
    },
    rsv: {
      pierceCounty: vaccineCoverage?.rsv?.pierceCounty || 46.1,
      statewide: vaccineCoverage?.rsv?.statewide || 44.8,
      ageGroup: 'Adults 75+ Years',
      season: '2024-2025'
    }
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Disease Intelligence Program
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor and project disease impacts across your jurisdiction
          </p>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Important Notice
            </h3>
            <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              <p>
                <strong>NOTE:</strong> CURRENT FIGURES, PARTICULARLY USED FOR THE STARSIM SIMULATIONS AND CALIBRATED PARAMETERS MAY NOT BE REPRESENTATIVE OF REALITY AND ARE BEING USED AS TESTING FIGURES AT THIS TIME.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Disease Metrics Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ED Visits Table - EXACT COPY OF HOSPITALIZATIONS TABLE */}
        <div className="card">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Emergency Department Visits (%)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Disease</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {(covidEdMetrics.secondMostRecent.weekLabel || covidEdMetrics.secondMostRecent.date) || 'Previous Week'} (%)
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {(covidEdMetrics.mostRecent.weekLabel || covidEdMetrics.mostRecent.date) || 'Most Recent Week'} (%)
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trend</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">COVID-19</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">{covidEdMetrics.secondMostRecent.value.toFixed(1)}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">{covidEdMetrics.mostRecent.value.toFixed(1)}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                    <span className={`text-xs ${covidEdMetrics.trend >= 0 ? 'text-red-600' : 'text-green-600 dark:text-green-400'}`}>
                      {covidEdMetrics.trend >= 0 ? '+' : ''}{Math.round(covidEdMetrics.trend)}%
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">RSV</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">{rsvEdMetrics.secondMostRecent.value.toFixed(1)}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">{rsvEdMetrics.mostRecent.value.toFixed(1)}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                    <span className={`text-xs ${rsvEdMetrics.trend >= 0 ? 'text-red-600' : 'text-green-600 dark:text-green-400'}`}>
                      {rsvEdMetrics.trend >= 0 ? '+' : ''}{Math.round(rsvEdMetrics.trend)}%
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">Influenza</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">{fluEdMetrics.secondMostRecent.value.toFixed(1)}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">{fluEdMetrics.mostRecent.value.toFixed(1)}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                    <span className={`text-xs ${fluEdMetrics.trend >= 0 ? 'text-red-600' : 'text-green-600 dark:text-green-400'}`}>
                      {fluEdMetrics.trend >= 0 ? '+' : ''}{Math.round(fluEdMetrics.trend)}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Hospitalizations Table */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Hospitalizations (%)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Disease</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {covidHospMetrics.secondMostRecent.weekLabel || 'Previous Week'} (%)
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {covidHospMetrics.mostRecent.weekLabel || 'Most Recent Week'} (%)
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trend</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">COVID-19</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">{covidHospMetrics.secondMostRecent.value.toFixed(1)}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">{covidHospMetrics.mostRecent.value.toFixed(1)}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                    <span className={`text-xs ${covidHospMetrics.trend >= 0 ? 'text-red-600' : 'text-green-600 dark:text-green-400'}`}>
                      {covidHospMetrics.trend >= 0 ? '+' : ''}{Math.round(covidHospMetrics.trend)}%
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">RSV</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">{rsvHospMetrics.secondMostRecent.value.toFixed(1)}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">{rsvHospMetrics.mostRecent.value.toFixed(1)}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                    <span className={`text-xs ${rsvHospMetrics.trend >= 0 ? 'text-red-600' : 'text-green-600 dark:text-green-400'}`}>
                      {rsvHospMetrics.trend >= 0 ? '+' : ''}{Math.round(rsvHospMetrics.trend)}%
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">Influenza</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">{fluHospMetrics.secondMostRecent.value.toFixed(1)}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">{fluHospMetrics.mostRecent.value.toFixed(1)}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                    <span className={`text-xs ${fluHospMetrics.trend >= 0 ? 'text-red-600' : 'text-green-600 dark:text-green-400'}`}>
                      {fluHospMetrics.trend >= 0 ? '+' : ''}{Math.round(fluHospMetrics.trend)}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Timeseries and Prediction Analysis */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Timeseries and Prediction Analysis</h3>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActivePredictionTab('COVID')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activePredictionTab === 'COVID'
                  ? 'bg-white text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-white dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              COVID
            </button>
            <button
              onClick={() => setActivePredictionTab('Flu')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activePredictionTab === 'Flu'
                  ? 'bg-white text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-white dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Flu
            </button>
            <button
              onClick={() => setActivePredictionTab('RSV')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activePredictionTab === 'RSV'
                  ? 'bg-white text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-white dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              RSV
            </button>
          </div>
        </div>

        {/* Prediction Charts - Full Width */}
        <div className="space-y-6">
          {/* Historical Data Charts */}
          <div className="space-y-6">
            <div>
              <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">Historical Data Trends</h4>
              
              {/* Hospitalizations Historical */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 dark:text-white dark:text-gray-300 mb-2">Hospitalizations - {activePredictionTab}</h5>
                <div className="h-64 border rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getHistoricalDataForChart(activePredictionTab, 'hospitalizations')}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="cdcWeek" 
                        tick={{ fontSize: 10 }}
                        stroke="#666"
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        stroke="#666"
                        domain={uniformDomain}
                      />
                      <Tooltip 
                        formatter={(value, name) => [value, name]}
                        labelFormatter={(label) => `Week ${label}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="2022" 
                        stroke="#94a3b8" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="2022"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="2023" 
                        stroke="#64748b" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="2023"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="2024" 
                        stroke="#475569" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="2024"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="2025" 
                        stroke="#1e293b" 
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        name="2025"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ED Visits Historical */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 dark:text-white dark:text-gray-300 mb-2">ED Visits - {activePredictionTab}</h5>
                <div className="h-64 border rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getHistoricalDataForChart(activePredictionTab, 'edVisits')}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="cdcWeek" 
                        tick={{ fontSize: 10 }}
                        stroke="#666"
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        stroke="#666"
                        domain={uniformDomain}
                      />
                      <Tooltip 
                        formatter={(value, name) => [value, name]}
                        labelFormatter={(label) => `Week ${label}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="2022" 
                        stroke="#94a3b8" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="2022"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="2023" 
                        stroke="#64748b" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="2023"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="2024" 
                        stroke="#475569" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="2024"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="2025" 
                        stroke="#1e293b" 
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        name="2025"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Prediction Models */}
          <div className="space-y-6">
            <div>
              <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">Prediction Models (8-week forecast)</h4>
              
              {/* Hospitalizations Regression */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 dark:text-white dark:text-gray-300 mb-2">Hospitalizations - Timeseries Regression</h5>
                <div className="h-64 border rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={generatePredictionData(activePredictionTab, 'hospitalizations')}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="cdcWeek" 
                        tick={{ fontSize: 10 }}
                        stroke="#666"
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        stroke="#666"
                        domain={uniformDomain}
                      />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'actual') return [value, 'Actual']
                          if (name === 'predicted') return [value, 'Predicted']
                          if (name === 'high') return [value, 'High']
                          if (name === 'low') return [value, 'Low Confidence']
                          return [value, name]
                        }}
                        labelFormatter={(value) => `${value}`}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="high"
                        stackId="1"
                        stroke="none"
                        fill="#3b82f6"
                        fillOpacity={0.1}
                        name="High"
                      />
                      <Area
                        type="monotone"
                        dataKey="low"
                        stackId="1"
                        stroke="none"
                        fill="#ffffff"
                        fillOpacity={1}
                        name="Low Confidence"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="actual" 
                        stroke="#1e293b" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Actual"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="predicted" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 3 }}
                        name="Predicted"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ED Visits Regression */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 dark:text-white dark:text-gray-300 mb-2">ED Visits - Timeseries Regression</h5>
                <div className="h-64 border rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={generatePredictionData(activePredictionTab, 'edVisits')}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="cdcWeek" 
                        tick={{ fontSize: 10 }}
                        stroke="#666"
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        stroke="#666"
                        domain={uniformDomain}
                      />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'actual') return [value, 'Actual']
                          if (name === 'predicted') return [value, 'Predicted']
                          if (name === 'high') return [value, 'High']
                          if (name === 'low') return [value, 'Low Confidence']
                          return [value, name]
                        }}
                        labelFormatter={(value) => `${value}`}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="high"
                        stackId="1"
                        stroke="none"
                        fill="#3b82f6"
                        fillOpacity={0.1}
                        name="High"
                      />
                      <Area
                        type="monotone"
                        dataKey="low"
                        stackId="1"
                        stroke="none"
                        fill="#ffffff"
                        fillOpacity={1}
                        name="Low Confidence"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="actual" 
                        stroke="#1e293b" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Actual"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="predicted" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 3 }}
                        name="Predicted"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Disease Modeling Simulations */}
        <div className="mt-6 border-t pt-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">
                Disease Modeling Simulations
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSimulationType('starsim')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    simulationType === 'starsim' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Starsim (Agent-Based)
                </button>
                <button
                  onClick={() => setSimulationType('seir')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    simulationType === 'seir' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  SEIR (Compartmental)
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-white dark:text-gray-400 mb-4">
              {simulationType === 'starsim' 
                ? 'Agent-based modeling using Pierce County calibrated parameters (Population: 928,696, 30 contacts/person, Poisson λ=3.2, 30-day forecast from Sep 1, 2025)'
                : 'Compartmental SEIR modeling using Pierce County calibrated parameters (Population: 928,696, 30-day forecast)'
              }
            </p>
          </div>
          
          {simulationType === 'starsim' ? (
            <BackgroundStarsimSimulation 
              disease={activePredictionTab} 
            />
          ) : (
            <div className="space-y-6">
              {seirLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-white dark:text-gray-400">Running SEIR simulation for {activePredictionTab}...</p>
                  </div>
                </div>
              )}
              
              {seirError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="text-red-600 mr-2">⚠️</div>
                    <div>
                      <p className="text-red-800 font-medium">SEIR Simulation Error</p>
                      <p className="text-red-600 text-sm">
                        {seirError instanceof Error ? seirError.message : 
                         typeof seirError === 'string' ? seirError : 
                         'Unknown error'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              
              {seirSimulationData && (
                <SEIRChart results={seirSimulationData} />
              )}
            </div>
          )}
        </div>
      </div>


      {/* Pierce County Calibrated Parameters */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Pierce County Calibrated Parameters</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">Real Pierce County data & population</span>
        </div>
        
        <PierceCountyParameterInspector />
      </div>



      {/* Vaccine Coverage */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
          <Target className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Vaccine Coverage Analysis</h3>
        </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">WA DOH Data • 2024-2025 Season</span>
        </div>
        
        {vaccineLoading ? (
          <div className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-400">Loading comprehensive vaccine coverage data...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* COVID-19 Section */}
            <div className="border rounded-lg p-4 bg-blue-50/30">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400">COVID-19 Vaccination</h4>
                <span className="text-xs text-blue-600 dark:text-blue-400">2024-2025 Season</span>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button
                  onClick={() => setActiveCovidTab('overall')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeCovidTab === 'overall'
                      ? 'bg-white dark:bg-black text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-white dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-transparent dark:bg-black'
                  }`}
                >
                  Overall
                </button>
                <button
                  onClick={() => setActiveCovidTab('race')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeCovidTab === 'race'
                      ? 'bg-white dark:bg-black text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-white dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-transparent dark:bg-black'
                  }`}
                >
                  By Race
                </button>
                <button
                  onClick={() => setActiveCovidTab('sex')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeCovidTab === 'sex'
                      ? 'bg-white dark:bg-black text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-white dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-transparent dark:bg-black'
                  }`}
                >
                  By Sex
                </button>
                <button
                  onClick={() => setActiveCovidTab('age')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeCovidTab === 'age'
                      ? 'bg-white dark:bg-black text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-white dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-transparent dark:bg-black'
                  }`}
                >
                  By Age
                </button>
              </div>

              {/* Tab Content */}
              {activeCovidTab === 'overall' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pierce County */}
                  <div className="bg-white dark:bg-black rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-900 dark:text-white">Pierce County</h5>
                      <span className="text-xs text-blue-600 dark:text-blue-400 dark:text-blue-400">Local Data</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-white dark:text-white">2024-2025 Season:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400 dark:text-blue-400">{safeVaccineCoverage.covid19.pierce.coverage2024}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-white dark:text-white">2023-2024 Season:</span>
                        <span className="text-gray-700 dark:text-white dark:text-white">{safeVaccineCoverage.covid19.pierce.coverage2023}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-white dark:text-white">Primary Series:</span>
                        <span className="text-gray-700 dark:text-white dark:text-white">{safeVaccineCoverage.covid19.pierce.primarySeries}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Statewide */}
                  <div className="bg-white dark:bg-black rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900 dark:text-white">Statewide</h5>
                    <span className="text-xs text-gray-500 dark:text-gray-400">WA Average</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-white dark:text-white">2024-2025 Season:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400 dark:text-blue-400">{safeVaccineCoverage.covid19.statewide.coverage2024}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-white dark:text-white">2023-2024 Season:</span>
                        <span className="text-gray-700 dark:text-white dark:text-white">{safeVaccineCoverage.covid19.statewide.coverage2023}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-white dark:text-white">Primary Series:</span>
                        <span className="text-gray-700 dark:text-white dark:text-white">{safeVaccineCoverage.covid19.statewide.primarySeries}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeCovidTab === 'race' && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-white mb-4">
                    COVID-19 vaccination rates by race/ethnicity • 
                    <span className="text-xs text-gray-500">* = Non-Hispanic</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(safeVaccineCoverage.covid19.raceData).map(([race, data]: [string, any]) => (
                      <div key={race} className="bg-white dark:bg-black rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                        <h6 className="font-medium text-gray-900 dark:text-white mb-3">{race}</h6>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600 dark:text-white">2024-2025:</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{data.coverage2024}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600 dark:text-white">2023-2024:</span>
                            <span className="text-gray-700 dark:text-white">{data.coverage2023}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600 dark:text-white">Primary Series:</span>
                            <span className="text-gray-700 dark:text-white">{data.primarySeries}%</span>
                          </div>
              </div>
            </div>
          ))}
                  </div>
                </div>
              )}

              {activeCovidTab === 'sex' && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-white mb-4">COVID-19 vaccination rates by sex</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(safeVaccineCoverage.covid19.sexData).map(([sex, data]: [string, any]) => (
                      <div key={sex} className="bg-white dark:bg-black rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                        <h6 className="font-medium text-gray-900 dark:text-white mb-3">{sex}</h6>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-white">2024-2025 Season:</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{data.coverage2024}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-white">2023-2024 Season:</span>
                            <span className="text-gray-700 dark:text-white">{data.coverage2023}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-white">Primary Series:</span>
                            <span className="text-gray-700 dark:text-white">{data.primarySeries}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeCovidTab === 'age' && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-white mb-4">COVID-19 vaccination rates by age group</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(safeVaccineCoverage.covid19.ageGroups).map(([ageGroup, data]: [string, any]) => (
                      <div key={ageGroup} className="bg-white dark:bg-black rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                        <h6 className="font-medium text-gray-900 dark:text-white mb-3">{ageGroup}</h6>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600 dark:text-white">2024-2025:</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{data.coverage2024}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600 dark:text-white">2023-2024:</span>
                            <span className="text-gray-700 dark:text-white">{data.coverage2023}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600 dark:text-white">Primary Series:</span>
                            <span className="text-gray-700 dark:text-white">{data.primarySeries}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Flu Section */}
            <div className="border rounded-lg p-4 bg-green-50/30">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-green-600 dark:text-green-400">Influenza Vaccination</h4>
                <span className="text-xs text-green-600 dark:text-green-400">2024-2025 Season</span>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button
                  onClick={() => setActiveFluTab('overall')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeFluTab === 'overall'
                      ? 'bg-white dark:bg-black text-green-600 dark:text-green-400 shadow-sm'
                      : 'text-gray-600 dark:text-white dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-transparent dark:bg-black'
                  }`}
                >
                  Overall
                </button>
                <button
                  onClick={() => setActiveFluTab('sex')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeFluTab === 'sex'
                      ? 'bg-white dark:bg-black text-green-600 dark:text-green-400 shadow-sm'
                      : 'text-gray-600 dark:text-white dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-transparent dark:bg-black'
                  }`}
                >
                  By Sex
                </button>
                <button
                  onClick={() => setActiveFluTab('age')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeFluTab === 'age'
                      ? 'bg-white dark:bg-black text-green-600 dark:text-green-400 shadow-sm'
                      : 'text-gray-600 dark:text-white dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-transparent dark:bg-black'
                  }`}
                >
                  By Age
                </button>
              </div>

              {/* Tab Content */}
              {activeFluTab === 'overall' && (
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pierce County */}
                <div className="bg-white dark:bg-black rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900 dark:text-white">Pierce County</h5>
                    <span className="text-xs text-green-600 dark:text-green-400 dark:text-green-400">Local Data</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-white dark:text-white">2024-2025:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400 dark:text-green-400">{safeVaccineCoverage.flu.pierce.coverage2024}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-white dark:text-white">2023-2024:</span>
                      <span className="text-gray-700 dark:text-white dark:text-white">{safeVaccineCoverage.flu.pierce.coverage2023}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-white dark:text-white">2022-2023:</span>
                      <span className="text-gray-700 dark:text-white dark:text-white">{safeVaccineCoverage.flu.pierce.coverage2022}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-white dark:text-white">2021-2022:</span>
                      <span className="text-gray-700 dark:text-white dark:text-white">{safeVaccineCoverage.flu.pierce.coverage2021}%</span>
                    </div>
                  </div>
                </div>

                {/* Statewide */}
                <div className="bg-white dark:bg-black rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900 dark:text-white">Statewide</h5>
                    <span className="text-xs text-gray-500 dark:text-gray-400">WA Average</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-white dark:text-white">2024-2025:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400 dark:text-green-400">{safeVaccineCoverage.flu.statewide.coverage2024}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-white dark:text-white">2023-2024:</span>
                      <span className="text-gray-700 dark:text-white dark:text-white">{safeVaccineCoverage.flu.statewide.coverage2023}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-white dark:text-white">2022-2023:</span>
                      <span className="text-gray-700 dark:text-white dark:text-white">{safeVaccineCoverage.flu.statewide.coverage2022}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-white dark:text-white">2021-2022:</span>
                      <span className="text-gray-700 dark:text-white dark:text-white">{safeVaccineCoverage.flu.statewide.coverage2021}%</span>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {activeFluTab === 'sex' && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-white mb-4">Influenza vaccination rates by sex</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(safeVaccineCoverage.flu.sexData).map(([sex, data]: [string, any]) => (
                      <div key={sex} className="bg-white dark:bg-black rounded-lg p-4 border border-green-200 dark:border-green-700">
                        <h6 className="font-medium text-gray-900 dark:text-white mb-3">{sex}</h6>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-white">2024-2025:</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">{data.coverage2024}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-white">2023-2024:</span>
                            <span className="text-gray-700 dark:text-white">{data.coverage2023}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-white">2022-2023:</span>
                            <span className="text-gray-700 dark:text-white">{data.coverage2022}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-white">2021-2022:</span>
                            <span className="text-gray-700 dark:text-white">{data.coverage2021}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeFluTab === 'age' && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-white mb-4">Influenza vaccination rates by age group</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(safeVaccineCoverage.flu.ageGroups).map(([ageGroup, data]: [string, any]) => (
                      <div key={ageGroup} className="bg-white dark:bg-black rounded-lg p-4 border border-green-200 dark:border-green-700">
                        <h6 className="font-medium text-gray-900 dark:text-white mb-3">{ageGroup}</h6>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600 dark:text-white">2024-2025:</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">{data.coverage2024}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600 dark:text-white">2023-2024:</span>
                            <span className="text-gray-700 dark:text-white">{data.coverage2023}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600 dark:text-white">2022-2023:</span>
                            <span className="text-gray-700 dark:text-white">{data.coverage2022}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600 dark:text-white">2021-2022:</span>
                            <span className="text-gray-700 dark:text-white">{data.coverage2021}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RSV Section */}
            <div className="border rounded-lg p-4 bg-purple-50/30">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400">RSV Vaccination</h4>
                <span className="text-xs text-purple-600 dark:text-purple-400">2024-2025 Season • Adults 75+ Years</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-black rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900 dark:text-white">Pierce County</h5>
                    <span className="text-xs text-purple-600 dark:text-purple-400 dark:text-purple-400">Local</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 dark:text-purple-400">{safeVaccineCoverage.rsv.pierceCounty}%</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Coverage Rate</div>
                </div>

                <div className="bg-white dark:bg-black rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900 dark:text-white">Statewide</h5>
                    <span className="text-xs text-gray-500 dark:text-gray-400">WA Average</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-700 dark:text-white dark:text-white">{safeVaccineCoverage.rsv.statewide}%</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Coverage Rate</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-6 text-xs text-gray-500 border-t pt-4">
          <strong>Data Sources:</strong> WA DOH COVID-19, Influenza, and RSV Surveillance Data (6/30/2025) • 
          COVID-19 data includes overall, race/ethnicity, sex, and age breakdowns • 
          Influenza data includes overall, sex, and age breakdowns • 
          RSV data limited to adults 75+ years age group • 
          <span className="text-xs text-gray-500">* = Non-Hispanic for race categories</span>
        </div>
      </div>

    </div>
  )
}


                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeFluTab === 'age' && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-white mb-4">Influenza vaccination rates by age group</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(safeVaccineCoverage.flu.ageGroups).map(([ageGroup, data]: [string, any]) => (
                      <div key={ageGroup} className="bg-white dark:bg-black rounded-lg p-4 border border-green-200 dark:border-green-700">
                        <h6 className="font-medium text-gray-900 dark:text-white mb-3">{ageGroup}</h6>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600 dark:text-white">2024-2025:</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">{data.coverage2024}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600 dark:text-white">2023-2024:</span>
                            <span className="text-gray-700 dark:text-white">{data.coverage2023}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600 dark:text-white">2022-2023:</span>
                            <span className="text-gray-700 dark:text-white">{data.coverage2022}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600 dark:text-white">2021-2022:</span>
                            <span className="text-gray-700 dark:text-white">{data.coverage2021}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RSV Section */}
            <div className="border rounded-lg p-4 bg-purple-50/30">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400">RSV Vaccination</h4>
                <span className="text-xs text-purple-600 dark:text-purple-400">2024-2025 Season • Adults 75+ Years</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-black rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900 dark:text-white">Pierce County</h5>
                    <span className="text-xs text-purple-600 dark:text-purple-400 dark:text-purple-400">Local</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 dark:text-purple-400">{safeVaccineCoverage.rsv.pierceCounty}%</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Coverage Rate</div>
                </div>

                <div className="bg-white dark:bg-black rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900 dark:text-white">Statewide</h5>
                    <span className="text-xs text-gray-500 dark:text-gray-400">WA Average</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-700 dark:text-white dark:text-white">{safeVaccineCoverage.rsv.statewide}%</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Coverage Rate</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-6 text-xs text-gray-500 border-t pt-4">
          <strong>Data Sources:</strong> WA DOH COVID-19, Influenza, and RSV Surveillance Data (6/30/2025) • 
          COVID-19 data includes overall, race/ethnicity, sex, and age breakdowns • 
          Influenza data includes overall, sex, and age breakdowns • 
          RSV data limited to adults 75+ years age group • 
          <span className="text-xs text-gray-500">* = Non-Hispanic for race categories</span>
        </div>
      </div>

    </div>
  )
}
