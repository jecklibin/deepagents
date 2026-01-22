import { create } from 'zustand';

// Factory function to create RPA store with injected API service
export const createRPAStore = (apiService) => create((set, get) => ({
  // Available actions from backend
  availableActions: [],
  actionsLoading: false,
  actionsError: null,

  // Current workflow being edited
  workflow: {
    name: '',
    description: '',
    actions: [],
    parameters: [],
  },

  // Selected action for editing
  selectedActionIndex: null,

  // Validation state
  validationErrors: [],

  // Editing mode
  isEditing: false,
  editingSkillName: null,

  // Fetch available RPA actions from backend
  fetchActions: async () => {
    set({ actionsLoading: true, actionsError: null });
    try {
      const response = await apiService.getRPAActions();
      // Backend returns array directly
      const actions = Array.isArray(response) ? response : (response.actions || []);
      set({ availableActions: actions, actionsLoading: false });
    } catch (error) {
      console.error('Failed to fetch RPA actions:', error);
      set({ actionsError: error.message, actionsLoading: false });
    }
  },

  // Workflow management
  setWorkflowName: (name) => set((state) => ({
    workflow: { ...state.workflow, name }
  })),

  setWorkflowDescription: (description) => set((state) => ({
    workflow: { ...state.workflow, description }
  })),

  // Add action to workflow
  addAction: (actionType) => {
    const { availableActions, workflow } = get();
    const actionDef = availableActions.find(a => a.type === actionType);
    if (!actionDef) return;

    const newAction = {
      id: `action_${Date.now()}`,
      type: actionType,
      params: {},
    };

    // Initialize default params from action definition
    // Backend uses 'key' for param name
    if (actionDef.params) {
      actionDef.params.forEach(param => {
        const paramName = param.key || param.name;
        if (param.default !== undefined) {
          newAction.params[paramName] = param.default;
        } else if (param.required) {
          newAction.params[paramName] = '';
        }
      });
    }

    set((state) => ({
      workflow: {
        ...state.workflow,
        actions: [...state.workflow.actions, newAction]
      },
      selectedActionIndex: state.workflow.actions.length
    }));
  },

  // Remove action from workflow
  removeAction: (index) => set((state) => {
    const newActions = [...state.workflow.actions];
    newActions.splice(index, 1);
    return {
      workflow: { ...state.workflow, actions: newActions },
      selectedActionIndex: state.selectedActionIndex === index ? null :
        (state.selectedActionIndex > index ? state.selectedActionIndex - 1 : state.selectedActionIndex)
    };
  }),

  // Move action up/down
  moveAction: (index, direction) => set((state) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= state.workflow.actions.length) return state;

    const newActions = [...state.workflow.actions];
    [newActions[index], newActions[newIndex]] = [newActions[newIndex], newActions[index]];

    return {
      workflow: { ...state.workflow, actions: newActions },
      selectedActionIndex: state.selectedActionIndex === index ? newIndex : state.selectedActionIndex
    };
  }),

  // Update action params
  updateActionParams: (index, params) => set((state) => {
    const newActions = [...state.workflow.actions];
    newActions[index] = { ...newActions[index], params: { ...newActions[index].params, ...params } };
    return { workflow: { ...state.workflow, actions: newActions } };
  }),

  // Select action for editing
  selectAction: (index) => set({ selectedActionIndex: index }),

  // Add workflow parameter
  addParameter: (param) => set((state) => ({
    workflow: {
      ...state.workflow,
      parameters: [...state.workflow.parameters, param]
    }
  })),

  // Remove workflow parameter
  removeParameter: (index) => set((state) => {
    const newParams = [...state.workflow.parameters];
    newParams.splice(index, 1);
    return { workflow: { ...state.workflow, parameters: newParams } };
  }),

  // Update workflow parameter
  updateParameter: (index, param) => set((state) => {
    const newParams = [...state.workflow.parameters];
    newParams[index] = { ...newParams[index], ...param };
    return { workflow: { ...state.workflow, parameters: newParams } };
  }),

  // Validate workflow
  validateWorkflow: () => {
    const { workflow, availableActions } = get();
    const errors = [];

    if (!workflow.name.trim()) {
      errors.push({ field: 'name', message: '技能名称不能为空' });
    }

    if (workflow.actions.length === 0) {
      errors.push({ field: 'actions', message: '至少需要添加一个操作' });
    }

    // Validate each action's required params
    workflow.actions.forEach((action, index) => {
      const actionDef = availableActions.find(a => a.type === action.type);
      if (actionDef && actionDef.params) {
        actionDef.params.forEach(param => {
          const paramName = param.key || param.name;
          if (param.required && !action.params[paramName]) {
            errors.push({
              field: `action_${index}_${paramName}`,
              message: `操作 ${index + 1} 的 ${paramName} 参数不能为空`
            });
          }
        });
      }
    });

    set({ validationErrors: errors });
    return errors.length === 0;
  },

  // Reset workflow
  resetWorkflow: () => set({
    workflow: {
      name: '',
      description: '',
      actions: [],
      parameters: [],
    },
    selectedActionIndex: null,
    validationErrors: [],
    isEditing: false,
    editingSkillName: null,
  }),

  // Load existing workflow for editing (from local data)
  loadWorkflow: (workflowData) => set({
    workflow: {
      name: workflowData.name || '',
      description: workflowData.description || '',
      actions: workflowData.actions || [],
      parameters: workflowData.parameters || [],
    },
    selectedActionIndex: null,
    validationErrors: [],
  }),

  // Load RPA skill from backend for editing
  loadRPASkill: async (skillName) => {
    try {
      const response = await apiService.getRPASkill(skillName);
      const { skill, workflow } = response;

      if (!workflow) {
        throw new Error('该技能没有工作流配置');
      }

      // Convert backend format to frontend format
      const actions = (workflow.actions || []).map((action, index) => ({
        id: action.id || `action_${index}`,
        type: action.type,
        params: (action.params || []).reduce((acc, p) => {
          acc[p.key] = p.value;
          return acc;
        }, {}),
      }));

      const parameters = (workflow.input_params || []).map(p => ({
        name: p.key,
        type: p.type || 'string',
        default: p.value || '',
      }));

      set({
        workflow: {
          name: workflow.name || skillName,
          description: workflow.description || '',
          actions,
          parameters,
        },
        selectedActionIndex: null,
        validationErrors: [],
        isEditing: true,
        editingSkillName: skillName,
      });
    } catch (error) {
      console.error('Failed to load RPA skill:', error);
      throw error;
    }
  },

  // Save workflow (create or update RPA skill)
  saveWorkflow: async () => {
    const { workflow, validateWorkflow, isEditing, editingSkillName } = get();

    if (!validateWorkflow()) {
      throw new Error('工作流验证失败');
    }

    // Format actions for backend API
    const formattedActions = workflow.actions.map((a, index) => ({
      id: a.id || `action_${index}`,
      type: a.type,
      params: Object.entries(a.params || {}).map(([key, value]) => ({
        key,
        value,
        type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'bool' : 'string',
      })),
    }));

    const workflowData = {
      name: workflow.name,
      description: workflow.description,
      version: '1.0',
      actions: formattedActions,
      input_params: workflow.parameters.map(p => ({
        key: p.name,
        value: p.default || '',
        type: p.type || 'string',
      })),
      output_params: [],
    };

    if (isEditing && editingSkillName) {
      // Update existing skill
      return await apiService.updateRPASkill(editingSkillName, workflowData);
    } else {
      // Create new skill
      const skillData = {
        name: workflow.name,
        workflow: workflowData,
      };
      return await apiService.createRPASkill(skillData);
    }
  },

  // Clear errors
  clearErrors: () => set({ actionsError: null, validationErrors: [] }),
}));

// Will be initialized with services
export let useRPAStore = null;

export const initRPAStore = (apiService) => {
  useRPAStore = createRPAStore(apiService);
  return useRPAStore;
};

export default { createRPAStore, initRPAStore };
