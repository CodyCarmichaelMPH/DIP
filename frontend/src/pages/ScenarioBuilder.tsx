import React, { useState, useEffect } from 'react'
import { Info, Save, Trash2, Search, Share2, Globe, Users, Tag, Play } from 'lucide-react'
import { UserParameterEditor } from '../components/UserParameterEditor'
import { SEIRChart } from '../components/SEIRChart'
import { useAuth } from '../lib/auth'
import { scenarioService, Scenario, ScenarioResponse, ScenarioCreate, ScenarioParameters, ScenarioShare } from '../lib/scenarioService'
import { simulationService, SimulationResults } from '../lib/simulationService'

export function ScenarioBuilder() {
  console.log('=== ScenarioBuilder component starting ===')
  const { user } = useAuth()
  console.log('User from useAuth:', user)
  
  // Track renders to detect infinite loops
  const renderCount = React.useRef(0)
  renderCount.current += 1
  console.log('Render count:', renderCount.current)
  
  const [scenarios, setScenarios] = useState<ScenarioResponse[]>([])
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null)
  
  // Debug scenarios state changes
  useEffect(() => {
    console.log('Scenarios state changed:', scenarios)
  }, [scenarios])
  const [editingScenarioTitle, setEditingScenarioTitle] = useState<string | null>(null)
  const [newScenarioTitle, setNewScenarioTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveScenarioName, setSaveScenarioName] = useState('')
  const [saveScenarioDescription, setSaveScenarioDescription] = useState('')
  const [saveScenarioPublic, setSaveScenarioPublic] = useState(false)
  const [saveScenarioTags, setSaveScenarioTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  
  // Sharing state
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareScenarioId, setShareScenarioId] = useState<string | null>(null)
  const [shareUserIds, setShareUserIds] = useState<string[]>([])
  const [shareMessage, setShareMessage] = useState('')
  const [newShareUserId, setNewShareUserId] = useState('')
  
  // View modes
  const [viewMode, setViewMode] = useState<'my' | 'shared' | 'public'>('my')
  const [publicScenarios, setPublicScenarios] = useState<ScenarioResponse[]>([])
  const [sharedScenarios, setSharedScenarios] = useState<ScenarioResponse[]>([])
  const [currentParameters, setCurrentParameters] = useState<ScenarioParameters | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null)
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null)
  const [isRunningSimulation, setIsRunningSimulation] = useState(false)

  // Load scenarios on component mount
  useEffect(() => {
    console.log('useEffect triggered, user:', user)
    console.log('useEffect render count:', renderCount.current)
    if (user) {
      console.log('User found, calling loadScenarios')
      loadScenarios()
    } else {
      console.log('No user found in useEffect')
    }
  }, [user])


  const loadScenarios = async () => {
    console.log('loadScenarios called, user:', user)
    if (!user) {
      console.log('No user found, returning early')
      return
    }

    try {
      console.log('Attempting to load scenarios from server...')
      const serverScenarios = await scenarioService.getUserScenarios(user.uid)
      console.log('Loaded scenarios from server:', serverScenarios)
      setScenarios(serverScenarios)
    } catch (error) {
      console.warn('Error loading scenarios (backend may not be running):', error)
      
      // Try to load from local storage as fallback
      try {
        const localScenarios = localStorage.getItem(`scenarios_${user.uid}`)
        console.log('Local storage key:', `scenarios_${user.uid}`)
        console.log('Local storage value:', localScenarios)
        if (localScenarios) {
          const parsed = JSON.parse(localScenarios)
          console.log('Loaded scenarios from local storage:', parsed)
          setScenarios(parsed)
        } else {
          console.log('No local scenarios found, setting empty array')
          setScenarios([])
        }
      } catch (localError) {
        console.error('Error loading from local storage:', localError)
        setScenarios([])
      }
    }
  }


  const handleRunSimulation = async () => {
    if (!user || !currentParameters) {
      console.log('Cannot run simulation: missing user or parameters', { user: !!user, parameters: !!currentParameters })
      return
    }

    try {
      setIsRunningSimulation(true)
      setSimulationResults(null)
      
      // Record scenario run if we have a current scenario
      if (currentScenario) {
        await scenarioService.recordScenarioRun(user.uid, currentScenario.id)
        // Reload scenarios to update run count
        loadScenarios()
      }
      
      // Convert scenario parameters to simulation parameters
      const simulationParams = simulationService.convertScenarioToSimulation(currentParameters)
      
      // Run the simulation
      console.log('Running simulation with parameters:', simulationParams)
      const results = await simulationService.runSimulation(simulationParams)
      
      console.log('Simulation completed:', results)
      setSimulationResults(results)
      
    } catch (error) {
      console.error('Error running simulation:', error)
      alert(`Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunningSimulation(false)
    }
  }

  const handleLoadScenario = async (scenarioId: string) => {
    if (!user) return

    try {
      console.log('Loading scenario:', scenarioId)
      const scenario = await scenarioService.getScenario(user.uid, scenarioId)
      console.log('Loaded scenario:', scenario)
      setCurrentScenario(scenario)
    } catch (error) {
      console.error('Error loading scenario:', error)
      // Try to load from local storage as fallback
      try {
        const localScenarios = JSON.parse(localStorage.getItem(`scenarios_${user.uid}`) || '[]')
        const localScenario = localScenarios.find((s: any) => s.id === scenarioId)
        if (localScenario) {
          console.log('Loaded scenario from local storage:', localScenario)
          setCurrentScenario(localScenario)
        }
      } catch (localError) {
        console.error('Error loading from local storage:', localError)
      }
    }
  }

  const generateScenarioName = (parameters: ScenarioParameters) => {
    const diseaseName = parameters.disease_name || 'Custom Disease'
    const now = new Date()
    const dateTime = now.toISOString().replace(/[:.]/g, '-').slice(0, -5) // Format: YYYY-MM-DDTHH-MM-SS
    return `${diseaseName}-${dateTime}`
  }

  const handleSaveScenario = async (parameters: ScenarioParameters) => {
    if (!user) return

    const scenarioName = saveScenarioName.trim() || generateScenarioName(parameters)

    try {
      const scenarioData: ScenarioCreate = {
        name: scenarioName,
        description: saveScenarioDescription.trim() || undefined,
        parameters,
        is_public: saveScenarioPublic,
        tags: saveScenarioTags.length > 0 ? saveScenarioTags : undefined,
        author_name: user.displayName || user.username
      }

      const newScenario = await scenarioService.createScenario(user.uid, scenarioData)
      setCurrentScenario(newScenario)
      setShowSaveModal(false)
      setSaveScenarioName('')
      setSaveScenarioDescription('')
      setSaveScenarioPublic(false)
      setSaveScenarioTags([])
      
      // Reload scenarios list to show the new scenario
      await loadScenarios()
    } catch (error) {
      console.error('Error saving scenario to server:', error)
      
      // Fallback: Save to local storage
      try {
        const localScenario = {
          id: `local_${Date.now()}`,
          name: scenarioName,
          description: saveScenarioDescription.trim() || undefined,
          parameters,
          is_public: saveScenarioPublic,
          tags: saveScenarioTags.length > 0 ? saveScenarioTags : undefined,
          author_name: user.displayName || user.username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_run_at: undefined,
          run_count: 0,
          disease_name: parameters.disease_name,
          model_type: parameters.model_type,
          is_shared: false,
          user_id: user.uid,
          is_owner: true
        }
        
        // Save to local storage
        const existingScenarios = JSON.parse(localStorage.getItem(`scenarios_${user.uid}`) || '[]')
        existingScenarios.push(localScenario)
        localStorage.setItem(`scenarios_${user.uid}`, JSON.stringify(existingScenarios))
        
        console.log('Saved scenario to local storage:', localScenario)
        setCurrentScenario(localScenario)
        
        // Reload scenarios to show the new one
        await loadScenarios()
      } catch (localError) {
        console.error('Error saving to local storage:', localError)
      }
      
      setShowSaveModal(false)
      setSaveScenarioName('')
      setSaveScenarioDescription('')
      setSaveScenarioPublic(false)
      setSaveScenarioTags([])
    }
  }

  const handleDeleteScenario = async (scenarioId: string) => {
    if (!user) return

    console.log('=== DELETE SCENARIO DEBUG ===')
    console.log('Deleting scenario ID:', scenarioId)
    console.log('Current scenarios before delete:', scenarios)
    console.log('Public scenarios before delete:', publicScenarios)
    console.log('Shared scenarios before delete:', sharedScenarios)
    
    // Immediately update UI state
    if (currentScenario?.id === scenarioId) {
      console.log('Clearing current scenario')
      setCurrentScenario(null)
    }
    
    // Update scenarios array immediately
    console.log('Filtering scenarios array...')
    setScenarios(prev => {
      const filtered = prev.filter(s => s.id !== scenarioId)
      console.log('Scenarios after filter:', filtered)
      return filtered
    })
    
    console.log('Filtering public scenarios array...')
    setPublicScenarios(prev => {
      const filtered = prev.filter(s => s.id !== scenarioId)
      console.log('Public scenarios after filter:', filtered)
      return filtered
    })
    
    console.log('Filtering shared scenarios array...')
    setSharedScenarios(prev => {
      const filtered = prev.filter(s => s.id !== scenarioId)
      console.log('Shared scenarios after filter:', filtered)
      return filtered
    })
    
    try {
      await scenarioService.deleteScenario(user.uid, scenarioId)
      console.log('Scenario deleted from server successfully')
    } catch (error) {
      console.error('Error deleting scenario from server:', error)
      // Update localStorage as fallback
      try {
        const localScenarios = JSON.parse(localStorage.getItem(`scenarios_${user.uid}`) || '[]')
        console.log('Local scenarios before filter:', localScenarios)
        const updatedScenarios = localScenarios.filter((s: any) => s.id !== scenarioId)
        console.log('Local scenarios after filter:', updatedScenarios)
        localStorage.setItem(`scenarios_${user.uid}`, JSON.stringify(updatedScenarios))
        console.log('Deleted scenario from local storage')
      } catch (localError) {
        console.error('Error deleting from local storage:', localError)
      }
    }
  }


  // Load public scenarios
  const loadPublicScenarios = async () => {
    if (!user) return

    try {
      console.log('Loading public scenarios...')
      const publicScenarios = await scenarioService.getPublicScenarios(user.uid)
      console.log('Loaded public scenarios:', publicScenarios)
      setPublicScenarios(publicScenarios)
    } catch (error) {
      console.warn('Error loading public scenarios (backend may not be running):', error)
      // Try to load from local storage as fallback
      try {
        const localScenarios = JSON.parse(localStorage.getItem(`scenarios_${user.uid}`) || '[]')
        const publicScenarios = localScenarios.filter((s: any) => s.is_public === true)
        console.log('Loaded public scenarios from local storage:', publicScenarios)
        setPublicScenarios(publicScenarios)
      } catch (localError) {
        console.error('Error loading public scenarios from local storage:', localError)
        setPublicScenarios([])
      }
    }
  }

  const loadSharedScenarios = async () => {
    if (!user) return

    try {
      const sharedScenarios = await scenarioService.getSharedScenarios(user.uid)
      setSharedScenarios(sharedScenarios)
    } catch (error) {
      console.warn('Error loading shared scenarios (backend may not be running):', error)
      setSharedScenarios([])
    }
  }

  const handleShareScenario = async () => {
    if (!user || !shareScenarioId || shareUserIds.length === 0) return

    try {
      const shareData: ScenarioShare = {
        user_ids: shareUserIds,
        message: shareMessage.trim() || undefined
      }

      await scenarioService.shareScenario(user.uid, shareScenarioId, shareData)
      setShowShareModal(false)
      setShareScenarioId(null)
      setShareUserIds([])
      setShareMessage('')
      setNewShareUserId('')
      
      // Reload scenarios
      loadScenarios()
    } catch (error) {
      console.error('Error sharing scenario:', error)
    }
  }

  const handleAddShareUser = () => {
    if (newShareUserId.trim() && !shareUserIds.includes(newShareUserId.trim())) {
      setShareUserIds([...shareUserIds, newShareUserId.trim()])
      setNewShareUserId('')
    }
  }

  const handleRemoveShareUser = (userId: string) => {
    setShareUserIds(shareUserIds.filter(id => id !== userId))
  }

  const handleAddTag = () => {
    if (newTag.trim() && !saveScenarioTags.includes(newTag.trim())) {
      setSaveScenarioTags([...saveScenarioTags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setSaveScenarioTags(saveScenarioTags.filter(t => t !== tag))
  }

  const handleUpdateScenarioTitle = async (scenarioId: string, newTitle: string) => {
    if (!user || !newTitle.trim()) return

    try {
      await scenarioService.updateScenario(user.uid, scenarioId, {
        name: newTitle.trim()
      })
      setEditingScenarioTitle(null)
      setNewScenarioTitle('')
      
      // Reload scenarios list
      loadScenarios()
    } catch (error) {
      console.error('Error updating scenario title:', error)
    }
  }

  const getCurrentScenarios = () => {
    switch (viewMode) {
      case 'my':
        return scenarios
      case 'shared':
        return sharedScenarios
      case 'public':
        return publicScenarios
      default:
        return scenarios
    }
  }

  const currentScenarios = getCurrentScenarios()
  const filteredScenarios = currentScenarios.filter(scenario => 
    searchQuery === '' || 
    scenario.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scenario.disease_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scenario.model_type.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  console.log('Current view mode:', viewMode)
  console.log('Current scenarios for view:', currentScenarios)
  console.log('Filtered scenarios:', filteredScenarios)

  console.log('=== ScenarioBuilder about to render ===')
  console.log('Current scenarios state:', scenarios)
  console.log('Current user:', user)
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Scenario Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scenarios</h2>
            <button
              onClick={() => {
                // Create a test scenario
                if (!user) return
                const testScenario = {
                  id: `test_${Date.now()}`,
                  name: 'Test Scenario',
                  description: 'Test scenario for debugging',
                  parameters: {
                    disease_name: 'COVID-19',
                    model_type: 'SEIR',
                    init_prev: 0.001,
                    beta: 0.3,
                    gamma: 0.1,
                    mu: 0.001,
                    sigma: 0.2,
                    population_size: 10000,
                    duration_days: 365
                  },
                  is_public: true, // Make it public for testing
                  tags: ['test'],
                  author_name: user.displayName || user.username,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  last_run_at: undefined,
                  run_count: 0,
                  disease_name: 'COVID-19',
                  model_type: 'SEIR',
                  is_shared: false,
                  user_id: user.uid,
                  is_owner: true
                }
                
                // Save to local storage
                const existingScenarios = JSON.parse(localStorage.getItem(`scenarios_${user.uid}`) || '[]')
                existingScenarios.push(testScenario)
                localStorage.setItem(`scenarios_${user.uid}`, JSON.stringify(existingScenarios))
                console.log('Created test scenario:', testScenario)
                loadScenarios()
              }}
              className="btn btn-secondary btn-sm"
              title="Create test scenario"
            >
              Test
            </button>
          </div>
          
          {/* View Mode Tabs */}
          <div className="flex gap-1 mb-4">
            <button
              onClick={() => {
                setViewMode('my')
                loadScenarios()
              }}
              className={`px-3 py-1 text-sm rounded-md ${
                viewMode === 'my' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              My
            </button>
            <button
              onClick={() => {
                setViewMode('shared')
                loadSharedScenarios()
              }}
              className={`px-3 py-1 text-sm rounded-md ${
                viewMode === 'shared' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Shared
            </button>
            <button
              onClick={() => {
                setViewMode('public')
                loadPublicScenarios()
              }}
              className={`px-3 py-1 text-sm rounded-md ${
                viewMode === 'public' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Public
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          
        </div>
        
        {/* Scenario List */}
        <div className="flex-1 overflow-y-auto">
          {filteredScenarios.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No scenarios found matching your search.' : 'No scenarios yet.'}
            </div>
          ) : (
            <div className="p-2">
              {filteredScenarios.map((scenario) => {
                console.log('Rendering scenario:', scenario.id, scenario.name)
                return (
                <div
                  key={scenario.id}
                  className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                    currentScenario?.id === scenario.id
                      ? 'bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700'
                      : 'bg-gray-50 dark:bg-blue-800 hover:bg-gray-100 dark:hover:bg-blue-700 border border-gray-200 dark:border-blue-600'
                  }`}
                  onClick={() => handleLoadScenario(scenario.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {editingScenarioTitle === scenario.id ? (
                        <input
                          type="text"
                          value={newScenarioTitle}
                          onChange={(e) => setNewScenarioTitle(e.target.value)}
                          onBlur={() => {
                            if (newScenarioTitle.trim()) {
                              handleUpdateScenarioTitle(scenario.id, newScenarioTitle)
                            } else {
                              setEditingScenarioTitle(null)
                              setNewScenarioTitle('')
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (newScenarioTitle.trim()) {
                                handleUpdateScenarioTitle(scenario.id, newScenarioTitle.trim())
                              }
                              setEditingScenarioTitle(null)
                              setNewScenarioTitle('')
                            } else if (e.key === 'Escape') {
                              setEditingScenarioTitle(null)
                              setNewScenarioTitle('')
                            }
                          }}
                          className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          autoFocus
                        />
                      ) : (
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">{scenario.name}</h4>
                      )}
                      
                      {scenario.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{scenario.description}</p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{scenario.disease_name}</span>
                        <span>•</span>
                        <span>{scenario.model_type}</span>
                        {scenario.is_public && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-green-600">
                              <Globe className="h-3 w-3" />
                              Public
                            </span>
                          </>
                        )}
                        {scenario.is_shared && !scenario.is_public && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-blue-600">
                              <Users className="h-3 w-3" />
                              Shared
                            </span>
                          </>
                        )}
                      </div>
                      
                      {scenario.tags && scenario.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {scenario.tags.slice(0, 2).map((tag, index) => (
                            <span
                              key={index}
                              className="px-1 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {scenario.tags.length > 2 && (
                            <span className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded">
                              +{scenario.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 ml-2">
                      {/* Debug info */}
                      <div className="text-xs text-gray-400 dark:text-gray-500 mr-2">
                        Owner: {scenario.is_owner ? 'Yes' : 'No'}
                      </div>
                      {scenario.is_owner && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingScenarioTitle(scenario.id)
                              setNewScenarioTitle(scenario.name)
                            }}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            title="Rename"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShareScenarioId(scenario.id)
                              setShowShareModal(true)
                            }}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Share"
                          >
                            <Share2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log('=== DELETE BUTTON CLICKED ===')
                              console.log('Scenario object:', scenario)
                              console.log('Scenario ID:', scenario.id)
                              console.log('Scenario name:', scenario.name)
                              setScenarioToDelete(scenario.id)
                              setShowDeleteModal(true)
                            }}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scenario Builder</h1>
              <p className="text-gray-600 dark:text-gray-400">Run disease modeling scenarios and analyze results</p>
              {currentScenario && (
                <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                  Current Scenario: <strong>{currentScenario.name}</strong>
                  {currentScenario.description && ` - ${currentScenario.description}`}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">Configure Your Simulation</h4>
                <p className="text-sm text-blue-800">
                  Adjust disease parameters using the tabs below, then click "Run Simulation" (available in Basic and Simulation tabs) to see results. If you're unsure about specific parameter values, try the Research Assistant tab for help determining appropriate metrics for your disease.
                </p>
              </div>
            </div>
          </div>
          
          {/* Parameter Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Parameter Configuration</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">Configure your own model parameters</span>
              </div>
            </div>
            
            <div className="p-6">
              <UserParameterEditor 
                onRunSimulation={handleRunSimulation}
                onSaveScenario={handleSaveScenario}
                onParametersChange={setCurrentParameters}
                currentScenario={currentScenario}
                showSaveModal={showSaveModal}
                setShowSaveModal={setShowSaveModal}
                saveScenarioName={saveScenarioName}
                setSaveScenarioName={setSaveScenarioName}
                saveScenarioDescription={saveScenarioDescription}
                setSaveScenarioDescription={setSaveScenarioDescription}
              />
            </div>
          </div>
          
          {/* Standalone Action Buttons */}
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-8 py-3 rounded-md font-medium bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
            >
              <Save className="h-5 w-5" />
              Save Scenario
            </button>
            <button
              onClick={() => {
                // Get current parameters from UserParameterEditor and run simulation
                handleRunSimulation()
              }}
              disabled={isRunningSimulation || !currentParameters}
              className="px-8 py-3 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Play className="h-5 w-5" />
              {isRunningSimulation ? 'Running...' : 'Run Simulation'}
            </button>
          </div>
          
          {/* Simulation Results */}
          {simulationResults && (
            <div className="mt-6 space-y-6">
              {/* Key Metrics Cards */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Simulation Results</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900">Peak Infection</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.round(simulationResults.results.summary.peak_infection).toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-700">Day {simulationResults.results.summary.peak_day}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-green-900">Total Infected</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {Math.round(simulationResults.results.summary.total_infected).toLocaleString()}
                    </p>
                    <p className="text-xs text-green-700">
                      {((simulationResults.results.summary.total_infected / simulationResults.population_size) * 100).toFixed(1)}% of population
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-red-900">Total Deaths</h4>
                    <p className="text-2xl font-bold text-red-600">
                      {Math.round(simulationResults.results.summary.total_deaths).toLocaleString()}
                    </p>
                    <p className="text-xs text-red-700">
                      {((simulationResults.results.summary.total_deaths / simulationResults.population_size) * 100).toFixed(2)}% of population
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-purple-900">Attack Rate</h4>
                    <p className="text-2xl font-bold text-purple-600">
                      {(simulationResults.results.summary.attack_rate * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-purple-700">Population affected</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Simulation Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Model:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">{simulationResults.model_type}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Disease:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">{simulationResults.disease_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Population:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">{simulationResults.population_size.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">{simulationResults.duration_days} days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEIR Chart */}
              <SEIRChart results={simulationResults} />
            </div>
          )}
        </div>
      </div>

      {/* Save Scenario Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Save Scenario</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Scenario Name
                </label>
                <input
                  type="text"
                  value={saveScenarioName}
                  onChange={(e) => setSaveScenarioName(e.target.value)}
                  placeholder="Enter scenario name (leave blank for auto-generated name)..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to auto-generate: DiseaseName-DateTime
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={saveScenarioDescription}
                  onChange={(e) => setSaveScenarioDescription(e.target.value)}
                  placeholder="Enter scenario description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <input
                    type="checkbox"
                    checked={saveScenarioPublic}
                    onChange={(e) => setSaveScenarioPublic(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Globe className="h-4 w-4" />
                  Make this scenario public
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Public scenarios can be discovered and used by other users
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags (Optional)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add a tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                {saveScenarioTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {saveScenarioTags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (currentParameters) {
                    handleSaveScenario(currentParameters)
                  }
                }}
                className="btn btn-primary"
              >
                Save Scenario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Scenario Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Share Scenario</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Share with User IDs
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newShareUserId}
                    onChange={(e) => setNewShareUserId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddShareUser()}
                    placeholder="Enter user ID..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <button
                    onClick={handleAddShareUser}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                {shareUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {shareUserIds.map((userId, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1"
                      >
                        <Users className="h-3 w-3" />
                        {userId}
                        <button
                          onClick={() => handleRemoveShareUser(userId)}
                          className="ml-1 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Add a message with the share..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowShareModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleShareScenario}
                disabled={shareUserIds.length === 0}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Share Scenario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Delete Scenario</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this scenario? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setScenarioToDelete(null)
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (scenarioToDelete) {
                    console.log('Proceeding with deletion of scenario:', scenarioToDelete)
                    handleDeleteScenario(scenarioToDelete)
                  }
                  setShowDeleteModal(false)
                  setScenarioToDelete(null)
                }}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
