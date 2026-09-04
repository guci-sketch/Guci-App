import { api } from './client';
import { Project } from '../types';

export interface CreateProjectInput {
  projectName: string;
  clientName?: string;
  address: string;
  latitude: number;
  longitude: number;
  radius?: number;
  workDate: string;
  workType?: string;
  scheduledStartTime?: string;
  notes?: string;
}

export async function createProject(input: CreateProjectInput) {
  return api.post<{ project: Project; workReportId: string }>('/projects', input);
}

export async function fetchMyProjects() {
  const res = await api.get<{ projects: Project[] }>('/projects/mine');
  return res.projects;
}

export async function fetchProject(id: string) {
  const res = await api.get<{ project: Project }>(`/projects/${id}`);
  return res.project;
}
