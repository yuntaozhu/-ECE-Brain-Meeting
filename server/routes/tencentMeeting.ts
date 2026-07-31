import { Router } from 'express';
import { meetingService } from '../../src/lib/meetingService';

const router = Router();

/**
 * GET /api/tencent/token
 * Fetch or refresh Tencent Meeting REST API Access Token
 */
router.get('/token', async (req, res) => {
  try {
    const tokenData = await meetingService.getAccessToken();
    res.json({
      success: true,
      data: tokenData,
      timestamp: Date.now()
    });
  } catch (err: any) {
    console.error('[Tencent Meeting Route Error] GET /token:', err);
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
  try {
    const meetingParams = req.body;
    console.log('[Tencent Meeting Route] Creating meeting with params:', meetingParams);
    
    const meetingInfo = await meetingService.createMeeting(meetingParams);
    
    res.json({
      success: true,
      data: meetingInfo,
      message: 'Tencent Meeting successfully created and synchronized',
      timestamp: Date.now()
    });
  } catch (err: any) {
    console.error('[Tencent Meeting Route Error] POST /meetings/create:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to create Tencent Meeting',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/tencent/meetings/:meetingId
 * Query Tencent Meeting details and lifecycle status
 */
router.get('/meetings/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { userId } = req.query;

    const meetingDetails = await meetingService.getMeetingDetails(meetingId, userId as string);

    res.json({
      success: true,
      data: meetingDetails,
      timestamp: Date.now()
    });
  } catch (err: any) {
    console.error(`[Tencent Meeting Route Error] GET /meetings/${req.params.meetingId}:`, err);
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
  try {
    const { meetingId } = req.params;
    const { userId } = req.query;

    const participants = await meetingService.getMeetingParticipants(meetingId, userId as string);

    res.json({
      success: true,
      data: { participants },
      timestamp: Date.now()
    });
  } catch (err: any) {
    console.error(`[Tencent Meeting Route Error] GET /meetings/${req.params.meetingId}/participants:`, err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch Tencent Meeting participants',
      timestamp: Date.now()
    });
  }
});

export default router;
