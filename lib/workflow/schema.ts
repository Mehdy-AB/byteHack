import { z } from 'zod'

export const WorkflowStepSchema = z.object({
  type: z.enum(['APPROVAL', 'INTEGRATION', 'WEBHOOK', 'SCRIPT']),
  assignedRole: z.enum(['SOC_ANALYST', 'SOC_LEAD', 'CISO', 'IT_ADMIN', 'LEGAL', 'EXEC', 'ADMIN']).optional(),
  assignedUser: z.string().uuid().optional(),
  message: z.string().optional(),
  catalogue: z.string().optional(),
  priorityLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
  scheduledTime: z.string().datetime().optional(),

  // INTEGRATION / WEBHOOK specific
  integration: z.string().optional(),
  target: z.string().optional(),
  params: z.record(z.any()).optional(),
})

export const WorkflowPayloadSchema = z.object({
  playbook_id: z.string().optional(),
  playbook_version: z.string().optional(),
  ai_confidence: z.number().min(0).max(1).optional(),
  source: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  title: z.string(),
  steps: z.array(WorkflowStepSchema),
})

export type WorkflowStepPayload = z.infer<typeof WorkflowStepSchema>
export type WorkflowPayload = z.infer<typeof WorkflowPayloadSchema>
