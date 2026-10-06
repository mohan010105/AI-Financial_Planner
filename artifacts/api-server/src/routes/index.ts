import { Router, type IRouter } from "express";
import authRouter from "./auth";
import foundationRouter from "./foundation";
import healthRouter from "./health";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(foundationRouter);
router.use((_request, response) => {
  response.status(404).json({ error: "API endpoint not found.", code: "NOT_FOUND" });
});

export default router;
