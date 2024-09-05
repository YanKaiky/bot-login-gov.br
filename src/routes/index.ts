import { Router } from "express";
import quotes from "./quotes";
import detran from "./detran";
import captcha from "./captcha";
import americana from "./americana";

const router = Router();

router.get("/", (_, response) =>
  response.status(200).json({
    message: `© ${new Date().getUTCFullYear()}, Scrapping - ${new Date().toLocaleString(
      "pt-BR"
    )}`,
  })
);

router.use(quotes);

router.use(detran);

router.use(captcha);

router.use(americana);

export { router };
