import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { wait } from "../helpers";
import axios from "axios";
import htmlParser from "node-html-parser";
import { InternalServerError } from "../exceptions/InternalServerError";
import chalk from "chalk";
import { Browser, Page } from "puppeteer";

class AmericanaService {
  async getData() {
    return await this.getDataByScrapping('elw9165', '00342444700');
  }

  async getDataByScrapping(plate: string, renavam: string) {
    
    puppeteer.use(StealthPlugin()) 
    const browserConfig = {
      headless: false,
      executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    };
    const browser = await puppeteer.launch(browserConfig);
    const page = await browser.newPage();

    await page.setUserAgent(`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36`);
    console.log("Going to the url...");
    const url = "https://americana.consultacidadao.com.br/";
    await page.goto(url);

    async function waitForLoading() {
      const loadingSelector = '#resultLoading';
      await page.waitForSelector(loadingSelector, {hidden: true});
    }

    await waitForLoading();

    const consulteFinesBtnSelector = "#consultaMulta";
    console.log(`Waiting for selector... (${consulteFinesBtnSelector})`);
    await page.waitForSelector(consulteFinesBtnSelector);

    console.log("Clicking and waiting for navigation...");
    await page.click(consulteFinesBtnSelector);

    await waitForLoading();

    const renvamFieldSelector = '#param1';
    await page.waitForSelector(renvamFieldSelector);
    await page.type(renvamFieldSelector, renavam);

    const plateFieldSelector = '#param2';
    await page.type(plateFieldSelector, plate);

    console.group('Getting CF token...');
    const cFToken = await this.getCFToken();
    console.groupEnd();
    
    let document: any;
    let validado: any;

    await page.evaluate((cFToken) => {
      validado = true;
      document.querySelector('input[name="cf-turnstile-response"]').value = cFToken;
    }, cFToken);
    
    const submitBtnSelector = '#btnConsultar';
    const tableSelector = '#tabmulta > table > tbody'
    await Promise.all([
      page.click(submitBtnSelector),
      page.waitForSelector(tableSelector)
    ]);
    
    const mainTableLines = await page.$eval(tableSelector, (tb: any) => {
      let linesArray = Array.from(tb.children);
      let lines = linesArray.map((ln: any) => ({autoN: ln.children[0].innerText, status: ln.children[5].innerText}));
      return lines;
    });
    
    let data = [];
    const modalSelector = '#windowPrint > div:nth-child(4) > div'
    let rowBtnSelector;
    let evaluatedData: any;
    for (let i = 1; i <= mainTableLines.length; i++) {
      await waitForLoading();

      rowBtnSelector = `${tableSelector} > tr:nth-child(${i}) > td:nth-child(7) > button:nth-child(1)`;
      console.log(`Clicking on item number ${i}`);
      await page.click(rowBtnSelector);

      console.log('Waiting for modal and network idle...');
      await Promise.all([
        page.waitForSelector(modalSelector),
        page.waitForNetworkIdle()
      ]);

      console.log('Evaluating modal...');
      evaluatedData = await page.$eval(modalSelector, modal => {

        let usedLines = [1, 3, 5];
        let nodes = usedLines.map(n => {
          return modal.querySelectorAll(`table > tbody > tr:nth-child(${n}) > td > table > tbody > tr:nth-child(2) td`)
        })
        let autoNumberElement = document.querySelector('#windowPrint > div:nth-child(2) > div > h3');
        let autoNumber = autoNumberElement.innerText.split(':')[1].trim();

        let lineData;
        if (nodes.some(n => !n.length)) {
          lineData = null;
        } else {
          lineData = {
            autoNumber,
            plate: nodes[0][0].innerText,
            date: nodes[0][1].innerText,
            location: nodes[0][2].innerText,
            infraction: nodes[1][0].innerText,
            infractionDescription: nodes[1][1].innerText,
            observation: nodes[2][0].innerText,
            status: null
          }
        }
        return lineData; 
      });

      console.log('Clicking modal close button...');
      const exitBtnSelector = '#windowPrint > a';
      await page.waitForSelector(exitBtnSelector);
      await page.$eval(exitBtnSelector, el => el.click());

      console.log('Pushing data to array...');
      data.push({...evaluatedData, status: mainTableLines.find(l => l.autoN === evaluatedData.autoNumber)?.status});
    }

    console.log('Closing...');
    await browser.close();

    console.log(chalk.bgGreenBright('SUCCESS'));
    return { data };
  }

  async getTaskResult(clientKey: string, taskId: number) {
    const body = {
      clientKey: clientKey,
      taskId: taskId,
    };
    return await axios.post("https://api.capmonster.cloud/getTaskResult", body);
  }

  async getCFToken() {
    const clientKey = process.env.CAP_MONSTER_API_KEY;
    if (!clientKey) {
      throw new InternalServerError("Error while resolving data.");
    }
    const createTaskBody = {
      clientKey: clientKey,
      task: {
        type: "TurnstileTaskProxyless",
        websiteURL: "https://americana.consultacidadao.com.br/",
        websiteKey: "0x4AAAAAAAbRWU6g1TGKS2Wl",
        pageAction: 'consulta-multas-6131'
      },
    };

    const response: any = await axios.post(
      "https://api.capmonster.cloud/createTask",
      createTaskBody
    );

    if (!response?.data?.taskId) {
      throw new InternalServerError("Error while resolving data.");
    }
    const { taskId } = response.data as any;

    let taskResultResponse: any;
    await wait(3500);
    taskResultResponse = await this.getTaskResult(clientKey, taskId);

    let c = 15;
    while (taskResultResponse?.data?.status === "processing" && c > 0) {
      await wait(500);
      taskResultResponse = await this.getTaskResult(clientKey, taskId);
      c--;
    }
    if (taskResultResponse?.data?.status !== 'ready') {
      throw new InternalServerError('Error while resolving data.')
    }
    if (!taskResultResponse?.data?.solution?.token) {
      throw new InternalServerError('Error while resolving data.');
    }
    return taskResultResponse?.data?.solution?.token;
  }

  // UNUSED
  async getDataByAxios(token: string) {

    const param1 = "00342444700";
    const param2 = "elw9165";
    const body = {
      param1, param2,
      "cf-turnstile-response": token
    }
    const headers = {
      "accept": "*/*",
      "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "priority": "u=1, i",
      "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Google Chrome\";v=\"128\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-requested-with": "XMLHttpRequest",
      "cookie": "PHPSESSID-web-2=r29he2e0q2pi9hstog0s4ohk4p; __utmc=127869341; __utmz=127869341.1725364912.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); __utma=127869341.1204815316.1725364912.1725383144.1725385993.5; __utmb=127869341.0.10.1725385993; cf_clearance=viJww7TlCd6iptbc23eOMfUDQ3UIwaIa7P7rvNg.Pek-1725385996-1.2.1.1-tB29xYkh2fUcGnPLE1.lhXvr9nMJD_DcuBzTyC.Xz7l5Dt3l2luKVBwGVyCym_QZUvcWIUi4rm7HUpGSIVMCzHkttXM_tEUIlaRKFENxkyzULQvZ0ToU7Fs2SbDjcCcsE.CpGZ3RhE8ETM0khAEIIB8E_1HDZqUC1V6ujVdz01QwgFXVMTPB1U5Gj46m8aaVOV_FIlOaKoTLmj.oKo3ztV8.tEYD.nsVhY46CN4MGk1ZkhCoQhpIzh.nJwGWpL7CqYXL69_Dwn15zsgwpkn0hCW5wUQDfgS0atE1.UIQ1GjHcHIqbYXLYBbh5wt2M_w6tbrAi1iMdb9BNiy5qJxlfq5iiPoNuOEW_EQHDyw7a1z.MHdMdcGtQ7Ku824iBGuKL7w1Cjz23fJPcv1mxzOrUg",
      "Referer": "https://americana.consultacidadao.com.br/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    }
    const url = `https://americana.consultacidadao.com.br/consultaMultas/consulta`;

    console.log(`Sending request to americana url`);
    const response = await axios.post(url, body);
    console.log(response.data)

    return htmlParser(String(response.data));
  }
}

export default new AmericanaService();
