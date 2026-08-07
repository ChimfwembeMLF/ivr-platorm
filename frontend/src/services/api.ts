import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
});

export const FlowService = {
  getFlows: (tenantId: string) => api.get(`/flows?tenant_id=${tenantId}`).then(res => res.data),
  createFlow: (tenantId: string, name: string) => api.post(`/flows?tenant_id=${tenantId}&name=${name}`).then(res => res.data),
  saveFlowDefinition: (tenantId: string, flowId: string, definition: any) => 
    api.put(`/flows/${flowId}?tenant_id=${tenantId}`, { definition }).then(res => res.data),
};
