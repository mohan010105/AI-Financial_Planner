import { Router, type IRouter, type Request, type Response } from "express";
import actionsRouter from "./actions";
import analyticsRouter from "./analytics";
import assistantRouter from "./assistant";
import authRouter from "./auth";
import demoRouter from "./demo";
import billingRouter from "./billing";
import foundationRouter from "./foundation";
import goalsRouter from "./goals";
import healthRouter from "./health";
import profileRouter from "./profile";
import simulatorRouter from "./simulator";
import subscriptionRouter from "./subscription";
import transactionsRouter from "./transactions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(demoRouter);
router.use(profileRouter);
router.use(transactionsRouter);
router.use(analyticsRouter);
router.use(goalsRouter);
router.use(simulatorRouter);
router.use(assistantRouter);
router.use(actionsRouter);
router.use(billingRouter);
router.use(subscriptionRouter);
router.use(foundationRouter);
router.use((_request: Request, response: Response) => {
  response.status(404).json({ error: "API endpoint not found.", code: "NOT_FOUND" });
});

export default router;
