export const WORKFLOW_CATALOG = [
  {
    key: 'ops',
    label: 'Ops console deploy',
    repo: 'ventify-stock-frontend',
    workflowId: 'manual-deploy-ops-console.yml',
    description: 'Build and deploy the standalone ops console to the VPS.',
    inputs: [
      {
        id: 'version_bump',
        label: 'Version bump',
        type: 'choice',
        defaultValue: 'none',
        options: ['none', 'patch', 'minor', 'major'],
      },
    ],
  },
  {
    key: 'web',
    label: 'Web platform deploy',
    repo: 'ventify-stock-frontend',
    workflowId: 'manual-deploy.yml',
    description: 'Deploy the business-facing web platform bundle.',
    inputs: [
      {
        id: 'version_bump',
        label: 'Version bump',
        type: 'choice',
        defaultValue: 'none',
        options: ['none', 'patch', 'minor', 'major'],
      },
    ],
  },
  {
    key: 'api',
    label: 'API deploy',
    repo: 'ventify-stock-api',
    workflowId: 'manual-deploy.yml',
    description: 'Run PHPUnit then deploy the Laravel API to production.',
    inputs: [
      {
        id: 'run_migrations',
        label: 'Run migrations',
        type: 'boolean',
        defaultValue: false,
      },
    ],
  },
  {
    key: 'mobile',
    label: 'Mobile release prep',
    repo: 'ventify-stock',
    workflowId: 'manual-release.yml',
    description: 'Prepare the next mobile release with synced version metadata.',
    inputs: [
      {
        id: 'version_bump',
        label: 'Version bump',
        type: 'choice',
        defaultValue: 'patch',
        options: ['none', 'patch', 'minor', 'major'],
      },
      {
        id: 'version_code_increment',
        label: 'Android code increment',
        type: 'string',
        defaultValue: '1',
      },
    ],
  },
]

export function buildInitialWorkflowInputs() {
  return WORKFLOW_CATALOG.reduce((carry, workflow) => {
    carry[workflow.key] = workflow.inputs.reduce((inputCarry, input) => {
      inputCarry[input.id] = input.defaultValue
      return inputCarry
    }, { ref: 'main' })

    return carry
  }, {})
}
