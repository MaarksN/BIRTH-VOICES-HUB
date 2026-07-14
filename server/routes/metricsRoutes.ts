import { Router } from 'express'; import { metricsController } from '../controllers/metricsController.js'; import { requireAuth } from '../middlewares/auth.js';
const r = Router(); r.use(requireAuth); r.get('/', metricsController.list); r.post('/', metricsController.create); r.put('/', metricsController.update); r.delete('/', metricsController.deleteAll); export default r;
