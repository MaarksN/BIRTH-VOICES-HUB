import { Router } from 'express'; import { onboardingController } from '../controllers/onboardingController.js'; import { requireAuth } from '../middlewares/auth.js';
const r = Router(); r.use(requireAuth); r.get('/', onboardingController.get); r.post('/', onboardingController.save); r.put('/', onboardingController.save); r.delete('/', onboardingController.delete); export default r;
