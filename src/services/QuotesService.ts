import * as puppeteer from "puppeteer";
import axios from "axios";
import chalk from "chalk";

class QuotesService {
  async getQuotes() {
    const url = process.env.API_URL;

    if (!url) {
      throw new Error("Unable to get the url");
    }

    let errorBatchCount = 0;
    let successBatchCount = 0;
    let totalLaps = 1000;
    let batchSize = 70;

    const requestBatch: Array<Function> = [];

    for (let i = 0; i < batchSize; i++) {
      requestBatch.push(async () =>
        axios.get(url, { timeout: batchSize * 150 })
      );
    }

    for (let i = 0; i < totalLaps; i++) {
      try {
        await Promise.all(requestBatch.map((sendRequest) => sendRequest()));

        successBatchCount++;

        console.log(
          `${chalk.bgGreen(
            "SUCCESS"
          )} sended requests amount: ${batchSize} | current lap: ${i + 1}`
        );
      } catch (error: any) {
        errorBatchCount++;

        console.log(error?.cause?.code);

        console.log(
          `${chalk.bgRed(
            "ERROR"
          )} sended requests amount: ${batchSize} | current lap: ${i + 1}`
        );
      }
    }

    const responseStats = {
      totalRequests: totalLaps * batchSize,
      errorBatchCount,
      successBatchCount,
    };

    const styledLog = chalk.black.bgWhiteBright(JSON.stringify(responseStats));

    console.log(styledLog);

    return responseStats;
  }

  async getCrawlerQuotes() {
    const response = await Promise.all([this.getUolQuote(), this.getB3Quote()]);

    const uol = response[0];
    const b3 = response[1];

    return { ...uol, ...b3 };
  }

  private async getUolQuote() {
    const browser = await puppeteer.launch({
      headless: true,
    });

    const page = await browser.newPage();

    await page.goto("https://www.uol.com.br/", {
      timeout: 20000,
      waitUntil: `networkidle2`,
    });

    const textSelector = await page.waitForSelector(
      "#app > div > header > div.exchangeBarHeader > div > div > a:nth-child(1) > span.exchangeBarHeader__item__value.exchangeBarHeader__item__value--pos"
    );

    const dolar = await textSelector?.evaluate((el) => el.textContent);

    const uolQuote = Number(dolar.replace(",", "."));

    const uolFormatted = uolQuote.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    await browser.close();

    return { uol_quote: uolQuote, uol_formatted: uolFormatted };
  }

  private async getB3Quote() {
    const browser = await puppeteer.launch({
      headless: true,
    });

    const page = await browser.newPage();

    await page.goto(
      "https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/consultas/clearing-de-cambio/indicadores/taxas-de-cambio-referencial/#:~:text=5%2C5482%20(R%24%2FUS%24)",
      {
        timeout: 30000,
        waitUntil: `networkidle2`,
      }
    );

    const frame = page.frames().find((frame) => frame.name() === "bvmf_iframe");

    if (frame) {
      const [optionsResult] = await frame.$$eval(
        "#divContainerIframeB3 > form > div > div > div > div > div > div:nth-child(1) > div.col.col-sm-12.mt-2 > h4",
        (options) => {
          const result = options.map((option) => option.innerText);

          return result;
        }
      );

      const b3Quote = Number(optionsResult.split(" ")[0].replace(",", "."));

      const b3Formatted = b3Quote.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

      await browser.close();

      return { b3_quote: b3Quote, b3_formatted: b3Formatted };
    }
  }
}

export default new QuotesService();
