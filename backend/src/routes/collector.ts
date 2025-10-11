import { Router } from 'express';
import {
  getCollectorRoute,
  getCollectors,
  getCollectorById,
  updateCollectorStatus,
  getCollectorPickupHistory,
  startPickup,
  completePickup,
  getCollectorDashboard,
} from '../controllers/collectorController';
import { authenticate, requireAdmin, requireCollector, requireAdminOrCollector } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/collector
 * @desc    Get all collectors (Admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticate, requireAdmin, getCollectors);

/**
 * @route   GET /api/collector/dashboard
 * @desc    Get collector dashboard data
 * @access  Private (Collector)
 */
router.get('/dashboard', authenticate, requireCollector, getCollectorDashboard);

/**
 * @route   GET /api/collector/:id
 * @desc    Get collector by ID
 * @access  Private (Admin or own profile)
 */
router.get('/:id', authenticate, getCollectorById);

/**
 * @route   GET /api/collector/:id/route
 * @desc    Get optimized route for collector
 * @access  Private (Admin or own route)
 */
router.get('/:id/route', authenticate, getCollectorRoute);

/**
 * @route   GET /api/collector/:id/history
 * @desc    Get collector pickup history
 * @access  Private (Admin or own history)
 */
router.get('/:id/history', authenticate, getCollectorPickupHistory);

/**
 * @route   PUT /api/collector/:id/status
 * @desc    Update collector status (activate/deactivate)
 * @access  Private (Admin only)
 */
router.put('/:id/status', authenticate, requireAdmin, updateCollectorStatus);

/**
 * @route   POST /api/collector/pickup/start
 * @desc    Start pickup for a report
 * @access  Private (Collector)
 */
router.post('/pickup/start', authenticate, requireCollector, startPickup);

/**
 * @route   PUT /api/collector/pickup/:id/complete
 * @desc    Complete pickup
 * @access  Private (Collector)
 */
router.put('/pickup/:id/complete', authenticate, requireCollector, completePickup);

export default router;
