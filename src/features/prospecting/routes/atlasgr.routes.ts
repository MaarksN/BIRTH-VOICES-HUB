import express from 'express';
import { voiceProspectingService } from '../services/voice.service.js';

const router = express.Router();

router.post('/webhook/atlasgr/outbound', async (req, res) => {
  try {
    const payload = req.body;
    const result = await voiceProspectingService.triggerOutboundCall(payload);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process AtlasGR webhook' });
  }
});

export default router;
