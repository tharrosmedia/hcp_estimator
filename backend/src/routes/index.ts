import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller';
import * as estimateCtrl from '../controllers/estimate.controller';
import * as pricebookCtrl from '../controllers/pricebook.controller';
import * as adminCtrl from '../controllers/admin.controller';
import { authenticate, requireRole, refreshToken } from '../middleware/auth';

const router: import('express').Router = Router();

// Public auth
router.post('/auth/login', authCtrl.requestMagicLink);
router.post('/auth/verify', authCtrl.verifyMagic);
router.post('/auth/refresh', refreshToken);

// Protected
router.use(authenticate);

// Estimates
router.get('/estimates', estimateCtrl.listEstimates);
router.post('/estimates', estimateCtrl.createEstimate);
router.get('/estimates/:id', estimateCtrl.getEstimate);
router.put('/estimates/:id', estimateCtrl.updateEstimate);
router.post('/estimates/:id/duplicate', estimateCtrl.duplicateEstimate);
router.post('/estimates/:id/push', estimateCtrl.finalizeAndPush);
router.get('/estimates/:id/calc', estimateCtrl.getCalculation);

// Pricebook
router.get('/pricebook', pricebookCtrl.getPricebook);
router.post('/pricebook/refresh', requireRole(['admin', 'manager']), pricebookCtrl.refreshPricebook);

// Admin / Config
router.get('/admin/settings', requireRole(['admin', 'manager']), adminCtrl.getSettings);
router.post('/admin/settings', requireRole(['admin']), adminCtrl.updateSetting);
router.get('/admin/rules/install', requireRole(['admin', 'manager']), adminCtrl.getInstallRules);
router.post('/admin/rules/install', requireRole(['admin']), adminCtrl.upsertInstallRule);
router.get('/admin/hcp-key', adminCtrl.getUserHcpKey);
router.post('/admin/hcp-key', adminCtrl.setUserHcpKey);

export default router;
