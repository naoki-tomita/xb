import puppeteer from "puppeteer";
import fetch from "node-fetch";

const stores: {
  [key: string]: {
    url: string;
    selector: string;
    expectedText: string;
  }
} = {
  amazon: {
    url: "https://www.amazon.co.jp/dp/B08GGKZ34Z",
    selector: "#availability",
    expectedText: `この商品は現在お取り扱いできません。`,
  },
  yodobashi: {
    url: "https://www.yodobashi.com/product-detail/100000001005829435/",
    selector: ".salesInfo",
    expectedText: "予定数の販売を終了しました",
  },
  sofmap: {
    url: "https://a.sofmap.com/product_detail.aspx?sku=21309019",
    selector: ".button.cart",
    expectedText: "注文不可",
  },
  // microsoft: {
  //   url: "https://www.microsoft.com/ja-jp/store/collections/xboxconsoles/pc?icid=Xbox_QL1_XboxConsoles_070920",
  //   selector: "#productplacementlist_1 > strong",
  //   expectedText: "在庫なし"
  // },
  // microsoft2: {
  //   url: "https://www.microsoft.com/ja-jp/store/configure/Xbox-Series-X/8WJ714N3RBTL",
  //   selector: ".oosbadge",
  //   expectedText: "在庫なし"
  // },
  rakuten: {
    url: "https://books.rakuten.co.jp/rb/16465627/?bkts=1&l-id=search-c-item-text-08",
    selector: ".status-text",
    expectedText: "ご注文できない商品"
  }
}

function sleep(time: number) {
  return new Promise(ok => setTimeout(ok, time));
}

async function waitFor(pred: () => Promise<boolean>, timeout: number = 20000) {
  for (let i = 0; i < timeout / 100; i++) {
    if (await pred()) break;
    await sleep(100);
  }
}

async function main() {
  const browser = await puppeteer.launch({ headless: false, args: ['--lang=ja-JP'] });
  async function scrape(name: string, url: string, selector: string, expectedText: string) {
    const page = await browser.newPage();
    await page.goto(url);
    const el = await page.$<HTMLSpanElement & HTMLInputElement>(selector);

    await waitFor(async () => {
      const text = await (el?.evaluate(it => it.innerText.trim() || it.value));
      return text?.trim().includes(expectedText) ?? false;
    });

    const text = await (el?.evaluate(it => it.innerText.trim() || it.value) ?? page.$<HTMLBodyElement>("body").then(it => it?.evaluate(it => it.innerText || "none")));
    console.log(name, text, expectedText);
    if (!text?.trim().includes(expectedText)) {
      await fetch(process.env.SLACK_URL ?? "", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: `${name} ---> ${text?.trim().substr(0, 80)}` })
      }).catch(e => console.error(e));
    }
  }

  try {
    await Promise.all(Object.entries(stores).map(([store, { url, selector, expectedText }]) => scrape(store, url, selector, expectedText)));
  } finally {
    await browser.close();
  }

}

main();
