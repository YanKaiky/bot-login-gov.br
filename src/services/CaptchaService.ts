import axios from "axios";
import { wait } from "../helpers";

class CaptchaService {
  async get2Captcha() {
    try {
      const DATA_SET_KEY = "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-";

      const response: any = await axios.post(
        `https://2captcha.com/in.php?key=${process.env.TWO_CAPTCHA_API_KEY}&method=userrecaptcha&googlekey=${DATA_SET_KEY}&pageurl=https://www.google.com/recaptcha/api2/demo`
      );

      console.log({
        response: response.data,
        format: response.data.split("|")[1],
        next_url: `https://2captcha.com/res.php?key=${
          process.env.TWO_CAPTCHA_API_KEY
        }&action=get&id=${response.data.split("|")[1]}`,
      });

      await wait(30000);

      let captcha: any;

      captcha = await axios.get(
        `https://2captcha.com/res.php?key=${
          process.env.TWO_CAPTCHA_API_KEY
        }&action=get&id=${response.data.split("|")[1]}`
      );

      console.log({ data: captcha.data });

      if (captcha.data === "CAPCHA_NOT_READY") {
        let attempts: number = 12;
        let success: boolean = false;

        while (attempts > 0 && !success) {
          await wait(5000);

          captcha = await axios.get(
            `https://2captcha.com/res.php?key=${
              process.env.TWO_CAPTCHA_API_KEY
            }&action=get&id=${response.data.split("|")[1]}`
          );

          attempts--;

          console.log({ attempts });

          if (captcha.data !== "CAPCHA_NOT_READY") success = true;

          console.log({ success });
        }
      }

      return captcha.data;
    } catch (error: any) {
      console.error(error.message);
    }
  }
}

export default new CaptchaService();
