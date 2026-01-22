import { create } from 'zustand';

// Step types
export const STEP_TYPES = {
  RECORDING: 'recording',
  NL: 'nl',
  RPA: 'rpa',
  SKILL_REF: 'skill_ref',
};

// Factory function to create hybrid store with injected API service
export const createHybridStore = (apiService) => create((set, get) => ({
  // Hybrid skills list
  hybridSkills: [],
  skillsLoading: false,
  skillsError: null,

  // Current skill being edited
  currentSkill: {
    name: '',
    description: '',
    inputParams: [],
    steps: [],
    outputParams: [],
  },

  // Selected step for editing
  selectedStepIndex: null,

  // Available skills for reference
  availableSkills: [],

  // Validation state
  validationErrors: [],

  // Editing mode
  isEditing: false,
  editingSkillName: null,

  // Fetch hybrid skills list
  fetchHybridSkills: async () => {
    set({ skillsLoading: true, skillsError: null });
    try {
      const response = await apiService.getHybridSkills();
      const skills = response.skills || [];
      set({ hybridSkills: skills, skillsLoading: false });
    } catch (error) {
      console.error('Failed to fetch hybrid skills:', error);
      set({ skillsError: error.message, skillsLoading: false });
    }
  },

  // Fetch available skills for reference
  fetchAvailableSkills: async () => {
    try {
      const skills = await apiService.getSkills();
      set({ availableSkills: Array.isArray(skills) ? skills : [] });
    } catch (error) {
      console.error('Failed to fetch available skills:', error);
    }
  },

  // Skill metadata management
  setSkillName: (name) => set((state) => ({
    currentSkill: { ...state.currentSkill, name }
  })),

  setSkillDescription: (description) => set((state) => ({
    currentSkill: { ...state.currentSkill, description }
  })),

  // Input parameters management
  addInputParam: (param) => set((state) => ({
    currentSkill: {
      ...state.currentSkill,
      inputParams: [...state.currentSkill.inputParams, param]
    }
  })),

  removeInputParam: (index) => set((state) => {
    const newParams = [...state.currentSkill.inputParams];
    newParams.splice(index, 1);
    return { currentSkill: { ...state.currentSkill, inputParams: newParams } };
  }),

  updateInputParam: (index, param) => set((state) => {
    const newParams = [...state.currentSkill.inputParams];
    newParams[index] = { ...newParams[index], ...param };
    return { currentSkill: { ...state.currentSkill, inputParams: newParams } };
  }),

  // Output parameters management
  addOutputParam: (paramName) => set((state) => ({
    currentSkill: {
      ...state.currentSkill,
      outputParams: [...state.currentSkill.outputParams, paramName]
    }
  })),

  removeOutputParam: (index) => set((state) => {
    const newParams = [...state.currentSkill.outputParams];
    newParams.splice(index, 1);
    return { currentSkill: { ...state.currentSkill, outputParams: newParams } };
  }),

  // Step management
  addStep: (stepType, stepData = {}) => {
    const { currentSkill } = get();
    const stepId = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newStep = {
      id: stepId,
      type: stepType,
      name: stepData.name || `Step ${currentSkill.steps.length + 1}`,
      description: stepData.description || '',
      inputMappings: stepData.inputMappings || [],
      outputVar: stepData.outputVar || '',
      skipOnError: stepData.skipOnError || false,
      retryCount: stepData.retryCount || 0,
      data: stepData.data || {},
    };

    set((state) => ({
      currentSkill: {
        ...state.currentSkill,
        steps: [...state.currentSkill.steps, newStep]
      },
      selectedStepIndex: state.currentSkill.steps.length
    }));

    return stepId;
  },

  removeStep: (index) => set((state) => {
    const newSteps = [...state.currentSkill.steps];
    newSteps.splice(index, 1);
    return {
      currentSkill: { ...state.currentSkill, steps: newSteps },
      selectedStepIndex: state.selectedStepIndex === index ? null :
        (state.selectedStepIndex > index ? state.selectedStepIndex - 1 : state.selectedStepIndex)
    };
  }),

  updateStep: (index, stepData) => set((state) => {
    const newSteps = [...state.currentSkill.steps];
    newSteps[index] = { ...newSteps[index], ...stepData };
    return { currentSkill: { ...state.currentSkill, steps: newSteps } };
  }),

  moveStep: (index, direction) => set((state) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= state.currentSkill.steps.length) return state;

    const newSteps = [...state.currentSkill.steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];

    return {
      currentSkill: { ...state.currentSkill, steps: newSteps },
      selectedStepIndex: state.selectedStepIndex === index ? newIndex : state.selectedStepIndex
    };
  }),

  selectStep: (index) => set({ selectedStepIndex: index }),

  // Variable mapping management
  addInputMapping: (stepIndex, mapping) => set((state) => {
    const newSteps = [...state.currentSkill.steps];
    const step = newSteps[stepIndex];
    step.inputMappings = [...(step.inputMappings || []), mapping];
    return { currentSkill: { ...state.currentSkill, steps: newSteps } };
  }),

  removeInputMapping: (stepIndex, mappingIndex) => set((state) => {
    const newSteps = [...state.currentSkill.steps];
    const step = newSteps[stepIndex];
    step.inputMappings = step.inputMappings.filter((_, i) => i !== mappingIndex);
    return { currentSkill: { ...state.currentSkill, steps: newSteps } };
  }),

  updateInputMapping: (stepIndex, mappingIndex, mapping) => set((state) => {
    const newSteps = [...state.currentSkill.steps];
    const step = newSteps[stepIndex];
    step.inputMappings[mappingIndex] = { ...step.inputMappings[mappingIndex], ...mapping };
    return { currentSkill: { ...state.currentSkill, steps: newSteps } };
  }),

  // Get available variables at a given step index
  getAvailableVariables: (stepIndex) => {
    const { currentSkill } = get();
    const variables = [];

    // Add input params
    currentSkill.inputParams.forEach(param => {
      variables.push({
        name: param.name,
        source: 'input',
        type: param.type || 'string',
      });
    });

    // Add output vars from previous steps
    for (let i = 0; i < stepIndex; i++) {
      const step = currentSkill.steps[i];
      if (step.outputVar) {
        variables.push({
          name: step.outputVar,
          source: `step_${i + 1}`,
          type: 'any',
        });
      }
    }

    return variables;
  },

  // Validation
  validateSkill: () => {
    const { currentSkill } = get();
    const errors = [];

    if (!currentSkill.name.trim()) {
      errors.push({ field: 'name', message: '技能名称不能为空' });
    } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(currentSkill.name)) {
      errors.push({ field: 'name', message: '名称只能包含小写字母、数字和连字符' });
    }

    if (currentSkill.steps.length === 0) {
      errors.push({ field: 'steps', message: '至少需要添加一个步骤' });
    }

    // Validate each step
    currentSkill.steps.forEach((step, index) => {
      if (!step.name.trim()) {
        errors.push({ field: `step_${index}_name`, message: `步骤 ${index + 1} 名称不能为空` });
      }

      // Type-specific validation
      if (step.type === STEP_TYPES.NL && !step.data?.instructions?.trim()) {
        errors.push({ field: `step_${index}_instructions`, message: `步骤 ${index + 1} 需要自然语言指令` });
      }

      if (step.type === STEP_TYPES.SKILL_REF && !step.data?.skillName?.trim()) {
        errors.push({ field: `step_${index}_skillName`, message: `步骤 ${index + 1} 需要选择引用的技能` });
      }
    });

    set({ validationErrors: errors });
    return errors.length === 0;
  },

  // Reset skill
  resetSkill: () => set({
    currentSkill: {
      name: '',
      description: '',
      inputParams: [],
      steps: [],
      outputParams: [],
    },
    selectedStepIndex: null,
    validationErrors: [],
    isEditing: false,
    editingSkillName: null,
  }),

  // Load existing skill for editing
  loadSkill: async (skillName) => {
    try {
      const response = await apiService.getHybridSkill(skillName);
      const skill = response;

      // Convert backend format to frontend format
      const steps = (skill.steps || []).map(step => ({
        id: step.id,
        type: step.type,
        name: step.name,
        description: step.description || '',
        inputMappings: (step.input_mappings || []).map(m => ({
          sourceVar: m.source_var,
          targetParam: m.target_param,
        })),
        outputVar: step.output_var || '',
        skipOnError: step.skip_on_error || false,
        retryCount: step.retry_count || 0,
        data: {
          // Recording step
          sessionId: step.session_id,
          scriptPath: step.script_path,
          actions: step.actions,
          startUrl: step.start_url,
          // NL step
          instructions: step.instructions,
          contextHints: step.context_hints,
          // RPA step
          workflow: step.workflow,
          workflowPath: step.workflow_path,
          // Skill ref step
          skillName: step.skill_name,
          paramOverrides: step.param_overrides,
        },
      }));

      set({
        currentSkill: {
          name: skill.name,
          description: skill.description || '',
          inputParams: skill.input_params || [],
          steps,
          outputParams: skill.output_params || [],
        },
        selectedStepIndex: null,
        validationErrors: [],
        isEditing: true,
        editingSkillName: skillName,
      });
    } catch (error) {
      console.error('Failed to load hybrid skill:', error);
      throw error;
    }
  },

  // Save skill (create or update)
  saveSkill: async () => {
    const { currentSkill, validateSkill, isEditing, editingSkillName } = get();

    if (!validateSkill()) {
      throw new Error('技能验证失败');
    }

    // Convert frontend format to backend format
    const steps = currentSkill.steps.map(step => ({
      id: step.id,
      type: step.type,
      name: step.name,
      description: step.description,
      input_mappings: (step.inputMappings || []).map(m => ({
        source_var: m.sourceVar,
        target_param: m.targetParam,
      })),
      output_var: step.outputVar || null,
      skip_on_error: step.skipOnError,
      retry_count: step.retryCount,
      data: {
        // Recording step
        session_id: step.data?.sessionId,
        script_path: step.data?.scriptPath,
        actions: step.data?.actions,
        start_url: step.data?.startUrl,
        // NL step
        instructions: step.data?.instructions,
        context_hints: step.data?.contextHints,
        // RPA step
        workflow: step.data?.workflow,
        workflow_path: step.data?.workflowPath,
        // Skill ref step
        skill_name: step.data?.skillName,
        param_overrides: step.data?.paramOverrides,
      },
    }));

    const skillData = {
      name: currentSkill.name,
      description: currentSkill.description,
      input_params: currentSkill.inputParams,
      steps,
      output_params: currentSkill.outputParams,
    };

    if (isEditing && editingSkillName) {
      return await apiService.updateHybridSkill(editingSkillName, skillData);
    } else {
      return await apiService.createHybridSkill(skillData);
    }
  },

  // Delete skill
  deleteSkill: async (skillName) => {
    await apiService.deleteHybridSkill(skillName);
    set((state) => ({
      hybridSkills: state.hybridSkills.filter(s => s.name !== skillName),
    }));
  },

  // Execute skill
  executeSkill: async (skillName, params = {}) => {
    return await apiService.executeHybridSkill(skillName, params);
  },

  // Clear errors
  clearErrors: () => set({ skillsError: null, validationErrors: [] }),
}));

// Will be initialized with services
export let useHybridStore = null;

export const initHybridStore = (apiService) => {
  useHybridStore = createHybridStore(apiService);
  return useHybridStore;
};

export default { createHybridStore, initHybridStore, STEP_TYPES };
