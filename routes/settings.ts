//@ts-ignore
import express from "express";
import { getAdminContact } from "../controllers/settings-controller";

const router = express.Router();

router.get("/admin-contact", getAdminContact);

export default router;
