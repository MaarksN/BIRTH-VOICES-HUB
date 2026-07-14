import { Router } from 'express'; import { settingsController } from '../controllers/settingsController.js'; import { requireAuth } from '../middlewares/auth.js';
const r = Router(); r.use(requireAuth); r.get('/', settingsController.get); r.post('/', settingsController.create); r.put('/', settingsController.update); r.delete('/', settingsController.delete); export default r;
