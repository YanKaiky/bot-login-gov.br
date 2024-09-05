import axios from "axios";
import * as puppeteer from "puppeteer";
import { wait } from "../helpers";
import chalk from "chalk";

class DetranService {
  async getDFDetran() {
    const browser = await puppeteer.launch({
      headless: false,
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on("request", (request) => {
      if (request.isInterceptResolutionHandled()) return;

      if (
        request.method() === "POST" &&
        request.url().includes("https://sso.acesso.gov.br/login?client_id=")
      ) {
        console.log(chalk.bgGreen(request.postData()));

        let body: string = `${request.postData()}${
          String(request.postData()).includes("h-captcha-response")
            ? `&operation=enter-account-id`
            : `&operation=enter-password`
        }`;

        request.continue({
          postData: body,
        });
      } else {
        request.continue();
      }
    });

    let url =
      "https://sso.acesso.gov.br/login?client_id=portal-logado.estaleiro.serpro.gov.br&authorization_id=";

    const captcha = await this.breakingCaptcha(url);

    if (captcha.success) {
      // Submitted with validate captcha
      await this.accessingPage(page, captcha.token);

      console.log("Accessed Page");

      await page.waitForNetworkIdle();

      await wait(3000);

      // Validate if CPF passed
      let passwordExists = await this.fieldExists("#password", page);

      let attempts: number = 15;

      while (attempts > 0 && !passwordExists) {
        const hcaptcha = await this.breakingCaptcha(url);

        if (hcaptcha.success) {
          const tkn = hcaptcha.token;

          console.log(tkn);

          await this.accessingPage(page, tkn);

          await page.waitForNetworkIdle();

          attempts--;

          // Validate if CPF passed
          passwordExists = await this.fieldExists("#password", page);

          console.log({ attemptsForPassword: attempts, passwordExists });
        }
      }

      if (passwordExists) {
        console.log("Field Password Exists");

        await page.waitForSelector("#password");

        await page.type("#password", String(process.env.GOV_BR_PASSWORD));

        // await this.clickButton("#submit-button", page);

        let document: any;

        await page.evaluate(() =>
          document.getElementById("loginData").submit()
        );
      }
    } else {
      console.log("NO SUCCESS");

      // Validate if CPF passed
      let passwordExists = false;

      let attempts: number = 15;

      while (attempts > 0 && !passwordExists) {
        const hcaptcha = await this.breakingCaptcha(url);
        if (hcaptcha.success) {
          const tkn = hcaptcha.token;

          console.log(tkn);

          await this.accessingPage(page, tkn);

          await page.waitForNetworkIdle();

          attempts--;

          // Validate if CPF passed
          passwordExists = await this.fieldExists("#password", page);

          console.log({
            attemptsForPasswordNotSuccess: attempts,
            passwordExists,
          });
        }
      }

      if (passwordExists) {
        console.log("Field Password Exists");

        await page.waitForSelector("#password");

        await page.type("#password", String(process.env.GOV_BR_PASSWORD));

        let document: any;

        await page.evaluate(() =>
          document.getElementById("loginData").submit()
        );
      }
    }

    return { captcha };
  }

  private async accessingPage(
    page: puppeteer.Page,
    token: string
  ): Promise<puppeteer.Page> {
    await page.goto(
      "https://sso.acesso.gov.br/login?client_id=portal-logado.estaleiro.serpro.gov.br&authorization_id=1917aeaecb9",
      {
        waitUntil: `networkidle2`,
      }
    );

    await page.waitForSelector("#accountId");

    await page.type("#accountId", String(process.env.GOV_BR_CPF_2));

    await page.type("#operation-field", "enter-account-id");

    await page.waitForSelector("textarea[id^='h-captcha-response-']");

    const hcaptcha = await page.$("textarea[id^='h-captcha-response-']");

    let document: any;

    await page.evaluate(
      (el, tkn) => {
        el.innerHTML = tkn;

        document.getElementById("loginData").submit();
      },
      hcaptcha,
      token
    );

    return page;
  }

  private async breakingCaptcha(url: string) {
    const response: any = await axios.post(
      `https://2captcha.com/in.php?key=${process.env.TWO_CAPTCHA_API_KEY}&method=hcaptcha&sitekey=${process.env.DATA_SET_KEY}&pageurl=${url}`
    );

    console.log("Waiting 8s...");

    // Wait 8s
    await wait(8000);

    let captcha: any;

    const requestId = response.data.substring(3);

    captcha = await axios.get(
      `https://2captcha.com/res.php?key=${process.env.TWO_CAPTCHA_API_KEY}&action=get&id=${requestId}`
    );

    console.log({
      success: captcha.data !== "CAPCHA_NOT_READY",
      attempts: 15,
    });

    if (captcha.data === "CAPCHA_NOT_READY") {
      let attempts: number = 15;

      console.log(
        `https://2captcha.com/res.php?key=${process.env.TWO_CAPTCHA_API_KEY}&action=get&id=${requestId}`
      );

      while (attempts > 0 && captcha.data === "CAPCHA_NOT_READY") {
        await wait(5000);

        captcha = await axios.get(
          `https://2captcha.com/res.php?key=${process.env.TWO_CAPTCHA_API_KEY}&action=get&id=${requestId}`
        );

        attempts--;

        console.log({
          success: captcha.data !== "CAPCHA_NOT_READY",
          attempts,
        });
      }
    }

    /**
     * @default OK|W1_eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.3gAHp.........
     *
     * @returns W1_eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.3gAHp.........
     */
    const token =
      captcha.data === "CAPCHA_NOT_READY"
        ? captcha.data
        : captcha.data.substring(3);

    const success = token !== "CAPCHA_NOT_READY";

    const data = { success, token };

    return data;
  }

  private async fieldExists(
    value: string,
    page: puppeteer.Page
  ): Promise<boolean> {
    let document: any;

    const captchaExists = await page.evaluate((el) => {
      return document.querySelector(el) !== null;
    }, value);

    return captchaExists;
  }

  private async brokenCaptcha() {
    console.log("Waiting 5s...");

    // Wait 5s
    await wait(5000);

    const data = {
      success: true,
      token:
        "W1_eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.3gAHp3Bhc3NrZXnFBGWuslSyU4XwTXq0oyGgkLMSNxCgVfYW1fSv8h6_wirKN2Smb-rxNbgsi3IL-T8XQ8A_zP1TYElW_J1gBrMy5vS73xFdMrMWfr8B9EtgxaFGhh3kwJljt6bjqO4CNZWa2q1aB9f1RDxyJ7tGM2gz9Q_7wZLttiwjtWT2ngw7mknbDZHhafnfUybEyUUWUi9eFfZC41rHNOXh214xHFtU_8-jyoK7p6ljE2KCgaSTa8Jb6hiqJ7LA1MVSPGZ-Hp81iJJZTQ8GAdicT7PRSLPDMg3CkVZmp5JBc9LU65taq9Dj2qiNaRKkx0R7suAYskXyLZBW3O4Z42btEMnsmgEn96vwR3u8Slcvdz7iyYr34ZRxzCFtG_gnDWDGjNJT3Rt-70Hox4Jy9k-sUyBKij-HlZtgGFOjMLazBKkpHWsnIRY2BvyQEMe0URq9d6L3ufs9PE0L6VTydXhywGL4zU4lTPhLDnpAAxypVx2vUblOkc5GC4FuAzVpRa1e6U3K5aFPrW7JDBCCYarRMAuEHJXCwkt0g9sh8jKhOkVzLdb2aO30NVIk8tIHTHTbZTDMFiUf6qbho7typoKH77RhU95766ZXGFFTH-zMF-phKWu4UpPqdChuNUA5tm69iDntNygInjrM49C-ZUumIPuIMFxjZwALJoOsuu8CWP2lvW985ST2C46ClgpaE-BWJZ1fCFl56SvmN4B2oajxarymPSelkFiXlOpgA2ftTI2zjl1HdvFXX_DgrluAzfehawUTET2AVeScCWG8sn4ta3XMFsHDJso4Yh43gEkq91yB49k2S6dAzdoerNe_RF7WwDfBoEBgmnxJ29phj5ZV6MM9YJbY1RtBbg-b3WWxqCjdEfoSK9n_suKlq1T4YsuqugSSL04msASEwabn3EfYLBKsj2VHODROwKzdCe0M8IKjUmGNIpy6oReeaZnPPjVdunfEGQPFL_qcodwWqm9h_2AU0MS4BoO8Ae_s6Sa2Rt3CGa8MsJr8Nr67hCSIZBdfHVYzvQksbJvSisj58kdqiO9PK-22-C9OD6eFuxN7neXpZTu4DJLx8_Z5mOmjnVxa6S-UrGgJuXLSrsT1BaNv1TL3En5CecrH4NoZFF-XTXKJ0pz4XMLoyWK_BXvfl9Yk4SU9qWbatMpa_hfKPgDLVeS20_eeHFd_uqG866Pq77KcY5cuJE0Ud6D4DaMsDUOULjP6uH7Wx_wpNNG-svrsh-H3AyLdzEH2jnzSngqIsLJpp3tKNWmtO_Q6E8_HvMAHQ_rJeHCBYYRJcIc4Kt0mIxNiF1wQxjW0_1eDmHVwtAC5TYqofc9YRATb2hCR7rr1JaI9wvWF4QL13wqoE68vrwHhtD9HxuVP86gqnNDFkpiwQbtsjJVUwTd0ZI7QxaHI8-xzWo6TiBRdl5HRPmAP3KaWVBwN9_njN4YBkSBOo9rVE6OT1gen_ZzABuKaCw83nmX3ovzZjjgIGxNoIqQm_nliF1l1PTXlj90DbjCnc2l0ZWtledkkOTNiMDhkNDAtZDQ2Yy00MDBhLWJhMDctNmY5MWNkYTgxNWI5o2V4cM5m2MRLonBkAKVjZGF0YdQAAKZjZGF0YTLUAACia3KoNDkwNzYzZjY.SbMIYQHEWzrjkWDBNV8qDFl4DJ3kCCApsju3Ba1QT_0",
    };

    return data;
  }

  private async clickButton(
    value: string,
    page: puppeteer.Page
  ): Promise<puppeteer.Page> {
    await page.waitForSelector(value);

    await page.click(value);

    return page;
  }
}

export default new DetranService();
