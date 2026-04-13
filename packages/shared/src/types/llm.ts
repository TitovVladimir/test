export interface ICategorizeResponse {
  category: string
  confidence: number
}

export interface ISubtaskProposal {
  title: string
  description: string
}

export interface IDecomposeResponse {
  subtasks: ISubtaskProposal[]
}

export interface IPrioritizeResponse {
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  reason: string
}

export interface ISummarizeResponse {
  summary: string
}
