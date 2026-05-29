import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pricingRouter from "./pricing";
import woocommerceRouter from "./woocommerce";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/woocommerce", woocommerceRouter);
router.use(pricingRouter);

export default router;
