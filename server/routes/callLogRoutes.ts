import { Router } from 'express'; import { callLogController } from '../controllers/callLogController.js'; import { requireAuth } from '../middlewares/auth.js';
const r = Router(); r.get('/', callLogController.list); r.post('/', callLogController.create); r.use(requireAuth); r.put('/:id', callLogController.update); r.delete('/:id', callLogController.delete); export default r;
