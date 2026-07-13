import { Router } from 'express'; import { workflowController } from '../controllers/workflowController.js'; import { requireAuth } from '../middlewares/auth.js';
const r = Router(); r.use(requireAuth); r.get('/', workflowController.get); r.post('/', workflowController.save); r.put('/', workflowController.update); export default r;
