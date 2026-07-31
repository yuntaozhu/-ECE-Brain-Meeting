import { Router } from 'express';
import { meetingService } from '../../src/lib/meetingService';
import { logger } from '../../src/lib/logger';

const router = Router();

/**
 * GET /api/tencent/token
 * Fetch or refresh Tencent Meeting REST API Access Token
 */
router.get('/token', async (req, res) => {
  const startTime = Date.now();
  try {
    logger.log('TENCENT', 'TencentRoute', '📥 Received GET /api/tencent/token');
    const tokenData = await meetingService.getAccessToken();
    const duration = Date.now() - startTime;
    logger.log('TENCENT', 'TencentRoute', `✅ Token acquired successfully in ${duration}ms`, tokenData);

    res.json({
      success: true,
      data: tokenData,
      timestamp: Date.now()
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logger.log('ERROR', 'TencentRoute', `❌ Failed GET /token after ${duration}ms: ${err.message}`, { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to acquire Tencent Meeting access token',
      timestamp: Date.now()
    });
  }
});

/**
 * POST /api/tencent/meetings/create
 * Create a scheduled or instant Tencent Meeting
 */
router.post('/meetings/create', async (req, res) => {
  const startTime = Date.now();
  try {
    const meetingParams = req.body;
    logger.log('TENCENT', 'TencentRoute', `📥 Received POST /api/tencent/meetings/create`, { headers: req.headers, body: meetingParams });
    
    const meetingInfo = await meetingService.createMeeting(meetingParams);
    const duration = Date.now() - startTime;
    logger.log('TENCENT', 'TencentRoute', `✅ Meeting successfully created in ${duration}ms`, meetingInfo);

    res.json({
      success: true,
      data: meetingInfo,
      message: 'Tencent Meeting successfully created and synchronized',
      timestamp: Date.now()
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logger.log('ERROR', 'TencentRoute', `❌ Failed POST /meetings/create after ${duration}ms: ${err.message}`, { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to create Tencent Meeting',
      details: err.stack,
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/tencent/meetings/:meetingId
 * Query Tencent Meeting details and lifecycle status
 */
router.get('/meetings/:meetingId', async (req, res) => {
  const startTime = Date.now();
  try {
    const { meetingId } = req.params;
    const { userId } = req.query;
    logger.log('TENCENT', 'TencentRoute', `📥 Received GET /api/tencent/meetings/${meetingId}`, { userId });

    const meetingDetails = await meetingService.getMeetingDetails(meetingId, userId as string);
    const duration = Date.now() - startTime;
    logger.log('TENCENT', 'TencentRoute', `✅ Meeting details fetched in ${duration}ms`, meetingDetails);

    res.json({
      success: true,
      data: meetingDetails,
      timestamp: Date.now()
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logger.log('ERROR', 'TencentRoute', `❌ Failed GET /meetings/${req.params.meetingId} after ${duration}ms: ${err.message}`);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch Tencent Meeting details',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/tencent/meetings/:meetingId/participants
 * Query real-time participants in the Tencent Meeting
 */
router.get('/meetings/:meetingId/participants', async (req, res) => {
  const startTime = Date.now();
  try {
    const { meetingId } = req.params;
    const { userId } = req.query;
    logger.log('TENCENT', 'TencentRoute', `📥 Received GET /api/tencent/meetings/${meetingId}/participants`, { userId });

    const participants = await meetingService.getMeetingParticipants(meetingId, userId as string);
    const duration = Date.now() - startTime;
    logger.log('TENCENT', 'TencentRoute', `✅ Participants fetched in ${duration}ms (${participants.length} users)`, { count: participants.length });

    res.json({
      success: true,
      data: { participants },
      timestamp: Date.now()
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logger.log('ERROR', 'TencentRoute', `❌ Failed GET /meetings/${req.params.meetingId}/participants after ${duration}ms: ${err.message}`);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch Tencent Meeting participants',
      timestamp: Date.now()
    });
  }
});

export default router;
