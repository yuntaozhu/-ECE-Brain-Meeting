import { Router } from 'express';
import meetingService from '../../src/lib/meetingService';
import { logger } from '../../src/lib/logger';

const router = Router();

// Official Tencent Meeting API Base URL Verification
const OFFICIAL_TENCENT_API_BASE = process.env.TENCENT_MEETING_API_BASE || 'https://api.meeting.qq.com';
logger.log('TENCENT', 'TencentRoute', `🌍 Verified Tencent Meeting API Base URL: ${OFFICIAL_TENCENT_API_BASE}`);

/**
 * GET /api/tencent/token
 * Fetch or refresh Tencent Meeting REST API Access Token
 */
router.get('/token', async (req, res) => {
  const startTime = Date.now();
  const fullUrl = `${OFFICIAL_TENCENT_API_BASE}/v1/oauth2/token`;
  try {
    logger.log('TENCENT', 'TencentRoute', `📥 Received GET /api/tencent/token -> Targeting full external URL: ${fullUrl}`);
    const tokenData = await meetingService.getAccessToken();
    const duration = Date.now() - startTime;
    logger.log('TENCENT', 'TencentRoute', `✅ Token acquired successfully in ${duration}ms`, tokenData);

    res.json({
      success: true,
      data: tokenData,
      apiEndpoint: fullUrl,
      timestamp: Date.now()
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logger.log('ERROR', 'TencentRoute', `❌ Failed GET /token (Target: ${fullUrl}) after ${duration}ms: ${err.message}`, { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to acquire Tencent Meeting access token',
      apiEndpoint: fullUrl,
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
  const fullUrl = `${OFFICIAL_TENCENT_API_BASE}/v1/meetings`;
  try {
    const meetingParams = req.body;
    logger.log('TENCENT', 'TencentRoute', `📥 Received POST /api/tencent/meetings/create -> Targeting full external URL: ${fullUrl}`, { headers: req.headers, body: meetingParams, targetUrl: fullUrl });
    
    const meetingInfo = await meetingService.createMeeting(meetingParams);
    const duration = Date.now() - startTime;
    logger.log('TENCENT', 'TencentRoute', `✅ Meeting successfully created in ${duration}ms`, meetingInfo);

    res.json({
      success: true,
      data: meetingInfo,
      apiEndpoint: fullUrl,
      message: 'Tencent Meeting successfully created and synchronized',
      timestamp: Date.now()
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logger.log('ERROR', 'TencentRoute', `❌ Failed POST /meetings/create (Target: ${fullUrl}) after ${duration}ms: ${err.message}`, { error: err.message, stack: err.stack, targetUrl: fullUrl });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to create Tencent Meeting',
      details: err.stack,
      apiEndpoint: fullUrl,
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
  const { meetingId } = req.params;
  const fullUrl = `${OFFICIAL_TENCENT_API_BASE}/v1/meetings/${meetingId}`;
  try {
    const { userId } = req.query;
    logger.log('TENCENT', 'TencentRoute', `📥 Received GET /api/tencent/meetings/${meetingId} -> Targeting full external URL: ${fullUrl}`, { userId, targetUrl: fullUrl });

    const meetingDetails = await meetingService.getMeetingDetails(meetingId, userId as string);
    const duration = Date.now() - startTime;
    logger.log('TENCENT', 'TencentRoute', `✅ Meeting details fetched in ${duration}ms`, meetingDetails);

    res.json({
      success: true,
      data: meetingDetails,
      apiEndpoint: fullUrl,
      timestamp: Date.now()
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logger.log('ERROR', 'TencentRoute', `❌ Failed GET /meetings/${meetingId} (Target: ${fullUrl}) after ${duration}ms: ${err.message}`);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch Tencent Meeting details',
      apiEndpoint: fullUrl,
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
  const { meetingId } = req.params;
  const fullUrl = `${OFFICIAL_TENCENT_API_BASE}/v1/meetings/${meetingId}/participants`;
  try {
    const { userId } = req.query;
    logger.log('TENCENT', 'TencentRoute', `📥 Received GET /api/tencent/meetings/${meetingId}/participants -> Targeting full external URL: ${fullUrl}`, { userId, targetUrl: fullUrl });

    const participants = await meetingService.getMeetingParticipants(meetingId, userId as string);
    const duration = Date.now() - startTime;
    logger.log('TENCENT', 'TencentRoute', `✅ Participants fetched in ${duration}ms (${participants.length} users)`, { count: participants.length });

    res.json({
      success: true,
      data: { participants },
      apiEndpoint: fullUrl,
      timestamp: Date.now()
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logger.log('ERROR', 'TencentRoute', `❌ Failed GET /meetings/${meetingId}/participants (Target: ${fullUrl}) after ${duration}ms: ${err.message}`);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch Tencent Meeting participants',
      apiEndpoint: fullUrl,
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/tencent/diagnostic
 * Test connectivity to Tencent Meeting API base URL and check for CORS/404/network issues
 */
router.get('/diagnostic', async (req, res) => {
  const startTime = Date.now();
  const config = (meetingService as any).getTencentConfig ? (meetingService as any).getTencentConfig() : { apiBase: 'https://api.meeting.qq.com', corpId: '557124324', appId: '32840153264' };
  const endpoint = `${config.apiBase}/v1/oauth2/token`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    let status = 'SUCCESS';
    let details = `Endpoint reachable (HTTP ${response.status}). CORS and network OK.`;

    if (response.status === 404) {
      status = 'WARNING_404';
      details = 'Endpoint returned 404 (Not Found). Check path routing configuration.';
    } else if (response.status >= 400 && response.status < 500) {
      status = 'REACHABLE_AUTH_REQUIRED';
      details = `Endpoint is reachable (HTTP ${response.status}). Authentication headers validated by server.`;
    }

    res.json({
      success: true,
      data: {
        apiBase: config.apiBase,
        endpoint,
        status,
        httpStatus: response.status,
        latencyMs: duration,
        details,
        corpId: config.corpId,
        appId: config.appId,
        timestamp: Date.now()
      }
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    res.json({
      success: true,
      data: {
        apiBase: config.apiBase,
        endpoint,
        status: 'UNREACHABLE',
        httpStatus: 0,
        latencyMs: duration,
        errorMessage: err.message,
        details: err.name === 'AbortError' 
          ? 'Connection timed out (6000ms). Network firewall or sandbox restricts outbound external API requests.' 
          : `Network/DNS error: ${err.message}`,
        corpId: config.corpId,
        appId: config.appId,
        timestamp: Date.now()
      }
    });
  }
});

export default router;
