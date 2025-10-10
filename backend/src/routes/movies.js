import express from 'express';
import * as controller from '../controllers/moviesController.js';

const router = express.Router();

router.get('/', controller.list);
router.get('/:id', controller.detail);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
