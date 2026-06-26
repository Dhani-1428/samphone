import { Router, type IRouter } from "express";
import { rateLimit } from "../middleware/rate-limit";
import healthRouter from "./health";
import pricingRouter from "./pricing";
import woocommerceRouter from "./woocommerce";

const router: IRouter = Router();

router.use(rateLimit({ windowMs: 60_000, max: 300 }));

router.use(healthRouter);
router.use("/woocommerce", woocommerceRouter);
router.use(pricingRouter);

export default router;
