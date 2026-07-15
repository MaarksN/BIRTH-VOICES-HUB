1. **Implement WebRTC**
   - Add `Twilio` or `WebRTC` related implementations for voice calling in `lib/voice-runtime/providers/` and connect it with `AudioPipeline.ts` or `StreamingEngine.ts`.
2. **Implement SIP**
   - Similarly, configure SIP trunking / integration for inbound/outbound calls. We can use Twilio for this as a provider.
3. **Implement Streaming**
   - `StreamingEngine.ts` is mostly a skeleton. Needs to read/write real streams.
4. **Implement Gemini Live & OpenAI Realtime**
   - These are currently stubs in `lib/voice-runtime/providers/GeminiProvider.ts` and `OpenAIProvider.ts`. Need to implement streaming capabilities using their respective WebSockets / Realtime APIs if possible, or build robust streaming HTTP stubs.
5. **Implement ElevenLabs**
   - Add the `@elevenlabs/node` package and integrate real TTS streaming in `ElevenLabsProvider.ts`.
6. **Implement Cancellation of Echo, VAD, Noise Suppression**
   - Use simple Web Audio API or Node.js processing libraries, or simulate them effectively in `AudioPipeline.ts`.
