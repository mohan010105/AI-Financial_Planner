import { Router, type IRouter, type RequestHandler } from "express";
import {
  GetAnalyticsStatusResponse,
  GetAssistantStatusResponse,
  GetGoalsStatusResponse,
  GetProfileModuleStatusResponse,
  GetSimulatorStatusResponse,
  GetTransactionsStatusResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function moduleStatus(
  module: string,
  responseSchema: { parse: (value: unknown) => unknown },
): RequestHandler {
  return (_req, res): void => {
    res.json(responseSchema.parse({ module, phase: 1, status: "placeholder" }));
  };
}

router.get("/profile/status", moduleStatus("profile", GetProfileModuleStatusResponse));
router.get("/transactions", moduleStatus("transactions", GetTransactionsStatusResponse));
router.get("/analytics", moduleStatus("analytics", GetAnalyticsStatusResponse));
router.get("/goals", moduleStatus("goals", GetGoalsStatusResponse));
router.get("/simulator", moduleStatus("simulator", GetSimulatorStatusResponse));
router.get("/assistant", moduleStatus("assistant", GetAssistantStatusResponse));

export default router;
