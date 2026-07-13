import { Router } from 'express'; import { sessionController } from '../controllers/sessionController.js'; import { requireAuth } from '../middlewares/auth.js';
const r = Router(); r.use(requireAuth); r.get('/', sessionController.list); r.post('/', sessionController.create); r.put('/:id', sessionController.update); r.delete('/:id', sessionController.delete); export default r;
