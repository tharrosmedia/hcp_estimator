import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as estimateService from '../services/estimate.service';
import { createHcpEstimate } from '../services/hcp.service';

export const listEstimates = async (req: AuthRequest, res: Response) => {
  const estimates = await estimateService.getUserEstimates(req.user!.userId);
  res.json(estimates);
};

export const getEstimate = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const estimate = await estimateService.getEstimateById(id, req.user!.userId);
  if (!estimate) return res.status(404).json({ error: 'Not found' });
  res.json(estimate);
};

export const createEstimate = async (req: AuthRequest, res: Response) => {
  try {
    const estimate = await estimateService.createEstimate(req.body, req.user!.userId);
    res.status(201).json(estimate);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

export const updateEstimate = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const estimate = await estimateService.updateEstimate(id, req.body, req.user!.userId);
    res.json(estimate);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

export const duplicateEstimate = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const estimate = await estimateService.duplicateEstimate(id, req.user!.userId);
    res.status(201).json(estimate);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

export const finalizeAndPush = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const result = await estimateService.pushToHcp(id, req.user!.userId, { createHcpEstimate });
    res.json({ success: true, hcpResult: result });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

export const getCalculation = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const estimate = await estimateService.getEstimateById(id, req.user!.userId);
  if (!estimate) return res.status(404).json({ error: 'Not found' });

  const result = await estimateService.computeEstimateResult(estimate);
  res.json(result);
};
